import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { WeworkApiService } from './WeworkApiService';
import { MessageHandlerFactory } from './MessageHandler';
import { MessageType, NodeInputData, NodeOutputData } from './types';
import { createLogger, LogLevel } from './Logger';
import { WeworkBotNodeDescription } from './WeworkBot.description';

export class WeworkBot implements INodeType {
	description: INodeTypeDescription = WeworkBotNodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const executionStartTime = Date.now();

		// 获取执行上下文信息
		const executionId = this.getExecutionId();
		const nodeId = this.getNode().id;
		const workflowId = this.getWorkflow().id || 'unknown';

		// 创建日志记录器
		const logger = createLogger('WeworkBot', {
			level: LogLevel.INFO,
			enableConsole: true,
			enableStructuredLogging: true,
			includeStackTrace: true,
			maskSensitiveData: true,
		});

		// 设置执行上下文
		logger.setExecutionContext(executionId, nodeId, workflowId);

		// 记录执行开始
		logger.logExecutionStart(executionId, nodeId, workflowId, {
			itemCount: items.length,
		});

		// 获取凭据信息
		const credentials = await this.getCredentials('weworkBotApi');
		const webhookUrl = credentials.webhookUrl as string;

		// 创建API服务实例
		const apiService = new WeworkApiService(
			{
				timeout: 30000,
				maxRetries: 3,
				retryDelay: 1000,
				enableLogging: true,
			},
			logger.createChildLogger('ApiService')
		);

		// 处理每个输入项
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const itemStartTime = Date.now();
			logger.info(`开始处理第 ${itemIndex + 1}/${items.length} 个输入项`);
			
			try {
				// 获取节点参数
				const messageType = this.getNodeParameter('messageType', itemIndex) as MessageType;
				logger.debug('获取消息类型', { messageType, itemIndex });
				
				// 构建输入数据
				const inputData: NodeInputData = {
					messageType,
				};

				switch (messageType) {
					case MessageType.TEXT:
						inputData.content = this.getNodeParameter('content', itemIndex) as string;
						
						// 处理@提及用户
						const mentionedUsersStr = this.getNodeParameter('mentionedUsers', itemIndex, '') as string;
						if (mentionedUsersStr) {
							inputData.mentionedUsers = mentionedUsersStr
								.split(',')
								.map(user => user.trim())
								.filter(user => user.length > 0);
						}

						// 处理@提及手机号
						const mentionedMobilesStr = this.getNodeParameter('mentionedMobiles', itemIndex, '') as string;
						if (mentionedMobilesStr) {
							inputData.mentionedMobiles = mentionedMobilesStr
								.split(',')
								.map(mobile => mobile.trim())
								.filter(mobile => mobile.length > 0);
						}
						break;

					case MessageType.MARKDOWN:
						inputData.markdownContent = this.getNodeParameter('markdownContent', itemIndex) as string;
						break;

					case MessageType.IMAGE:
						const imageSource = this.getNodeParameter('imageSource', itemIndex) as string;
						if (imageSource === 'base64') {
							inputData.imageBase64 = this.getNodeParameter('imageBase64', itemIndex) as string;
						} else {
							inputData.imageUrl = this.getNodeParameter('imageUrl', itemIndex) as string;
						}
						break;

					case MessageType.NEWS:
						const articlesData = this.getNodeParameter('articles', itemIndex, { article: [] }) as any;
						if (articlesData && articlesData.article && Array.isArray(articlesData.article)) {
							inputData.newsArticles = articlesData.article;
						}
						break;

					case MessageType.FILE:
						inputData.fileMediaId = this.getNodeParameter('fileMediaId', itemIndex) as string;
						break;

					default:
						throw new NodeOperationError(
							this.getNode(),
							`不支持的消息类型: ${messageType}`,
							{ itemIndex }
						);
				}
				
				// 获取消息处理器并处理消息
				logger.debug('开始处理消息', { messageType, inputData });
				const messageHandler = MessageHandlerFactory.getHandler(messageType);
				const { message, validation } = messageHandler.processMessage(inputData);
				
				// 记录消息验证结果
				logger.logValidation(messageType, validation.isValid, validation.errors);
				
				// 验证消息
				if (!validation.isValid) {
					throw new NodeOperationError(
						this.getNode(),
						`消息验证失败: ${validation.errors.join(', ')}`,
						{ itemIndex }
					);
				}

				// 发送消息
				logger.info('开始发送消息', { messageType, itemIndex });
				const result = await apiService.sendMessage(webhookUrl, message);
				logger.info('消息发送完成', { success: result.success, itemIndex });
				
				// 构建输出数据
				const outputData: INodeExecutionData = {
					json: {
						...result,
						// 添加原始输入数据用于调试
						input: inputData,
					} as any,
				};

				// 如果发送失败，根据配置决定是否抛出错误
				if (!result.success) {
					const continueOnFail = this.continueOnFail();
					if (!continueOnFail) {
						throw new NodeOperationError(
							this.getNode(),
							`消息发送失败: ${result.errorMessage} (错误代码: ${result.errorCode})`,
							{ itemIndex }
						);
					}
				}

				const itemDuration = Date.now() - itemStartTime;
				logger.info(`第 ${itemIndex + 1} 个输入项处理完成`, { 
					duration: `${itemDuration}ms`,
					success: result.success 
				});

				returnData.push(outputData);

			} catch (error) {
				const itemDuration = Date.now() - itemStartTime;
				logger.error(`第 ${itemIndex + 1} 个输入项处理失败`, {
					duration: `${itemDuration}ms`,
					error: error instanceof Error ? error.message : '未知错误',
					itemIndex,
				});

				// 处理执行错误
				if (this.continueOnFail()) {
					// 如果设置了继续执行，返回错误信息
					const errorResult: NodeOutputData = {
						success: false,
						errorCode: -1,
						errorMessage: error instanceof Error ? error.message : '未知错误',
						timestamp: Date.now(),
						messageType: 'unknown',
					};

					returnData.push({
						json: errorResult as any,
					});
				} else {
					// 否则抛出错误
					if (error instanceof NodeOperationError) {
						throw error;
					}
					throw new NodeOperationError(
						this.getNode(),
						error instanceof Error ? error.message : '执行过程中发生未知错误',
						{ itemIndex }
					);
				}
			}
		}

		// 记录执行结束
		const totalDuration = Date.now() - executionStartTime;
		const successCount = returnData.filter(item => {
			const data = item.json as any;
			return data && data.success === true;
		}).length;
		const errorCount = returnData.length - successCount;

		logger.logExecutionEnd(executionId, errorCount === 0, totalDuration, {
			totalItems: items.length,
			successCount,
			errorCount,
			returnDataCount: returnData.length,
		});

		// 记录性能指标
		logger.logPerformance('nodeExecution', totalDuration, {
			itemCount: items.length,
			successRate: `${((successCount / items.length) * 100).toFixed(1)}%`,
			averageItemDuration: `${(totalDuration / items.length).toFixed(1)}ms`,
		});

		// 如果启用了调试模式，输出日志统计
		const logStats = logger.getLogStats();
		if (logStats.totalEntries > 0) {
			logger.debug('执行日志统计', logStats);
		}

		return [returnData];
	}
}
