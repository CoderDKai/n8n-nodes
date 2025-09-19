import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { WeworkApiService } from './WeworkApiService';
import { MessageHandlerFactory } from './MessageHandler';
import { MessageType, NodeInputData, NodeOutputData } from './types';
import { createLogger, LogLevel } from './Logger';

export class WeworkBot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeWorkBot',
		name: 'weworkBot',
		icon: { light: 'file:weworkbot.svg', dark: 'file:weworkbot.svg' },
		group: ['communication'],
		version: 1,
		subtitle: '={{$parameter["messageType"]}}',
		description: '向企业微信群发送通知消息',
		defaults: {
			name: 'WeWorkBot',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'weworkBotApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: '消息类型',
				name: 'messageType',
				type: 'options',
				options: [
					{
						name: '图片消息',
						value: 'image',
						description: '发送图片消息，支持base64编码',
					},
					{
						name: '图文消息',
						value: 'news',
						description: '发送包含标题、描述和链接的图文卡片',
					},
					{
						name: '文本消息',
						value: 'text',
						description: '发送纯文本消息，支持@提及用户',
					},
					{
						name: '文件消息',
						value: 'file',
						description: '发送文件消息，需要先上传获取media_id',
					},
					{
						name: 'Markdown消息',
						value: 'markdown',
						description: '发送Markdown格式的富文本消息',
					},
				],
				default: 'text',
				required: true,
				description: '选择要发送的消息类型',
			},
			// 文本消息配置
			{
				displayName: '消息内容',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						messageType: ['text'],
					},
				},
				default: '',
				required: true,
				placeholder: '请输入要发送的文本消息内容...',
				description: '要发送的文本消息内容，最大长度4096字符',
			},
			{
				displayName: '@提及用户',
				name: 'mentionedUsers',
				type: 'string',
				displayOptions: {
					show: {
						messageType: ['text'],
					},
				},
				default: '',
				placeholder: '@all 或用户ID，多个用逗号分隔',
				description: '要@提及的用户，使用@all提及所有人，或输入具体用户ID',
			},
			{
				displayName: '@提及手机号',
				name: 'mentionedMobiles',
				type: 'string',
				displayOptions: {
					show: {
						messageType: ['text'],
					},
				},
				default: '',
				placeholder: '手机号，多个用逗号分隔',
				description: '要@提及的用户手机号，多个手机号用逗号分隔',
			},
			// Markdown消息配置
			{
				displayName: 'Markdown内容',
				name: 'markdownContent',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				displayOptions: {
					show: {
						messageType: ['markdown'],
					},
				},
				default: '',
				required: true,
				placeholder: '# 标题\n\n**粗体文本**\n\n[链接](https://example.com)',
				description: 'Markdown格式的消息内容，支持标准Markdown语法，最大长度4096字符',
			},
			// 图片消息配置
			{
				displayName: '图片数据源',
				name: 'imageSource',
				type: 'options',
				options: [
					{
						name: 'Base64编码',
						value: 'base64',
						description: '直接提供图片的base64编码数据',
					},
					{
						name: '图片URL',
						value: 'url',
						description: '提供图片的URL地址，系统会自动下载并转换',
					},
				],
				displayOptions: {
					show: {
						messageType: ['image'],
					},
				},
				default: 'base64',
				required: true,
				description: '选择图片数据的来源方式',
			},
			{
				displayName: '图片Base64',
				name: 'imageBase64',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						messageType: ['image'],
						imageSource: ['base64'],
					},
				},
				default: '',
				required: true,
				placeholder: 'iVBORw0KGgoAAAANSUhEUgAA...',
				description: '图片的base64编码数据（不包含data:image前缀），支持jpg、png格式，最大2MB',
			},
			{
				displayName: '图片URL',
				name: 'imageUrl',
				type: 'string',
				displayOptions: {
					show: {
						messageType: ['image'],
						imageSource: ['url'],
					},
				},
				default: '',
				required: true,
				placeholder: 'https://example.com/image.jpg',
				description: '图片的URL地址，支持jpg、png格式，最大2MB',
			},
			// 图文消息配置
			{
				displayName: '文章列表',
				name: 'articles',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						messageType: ['news'],
					},
				},
				default: {},
				placeholder: '添加文章',
				description: '图文消息的文章列表，最多8篇文章',
				options: [
					{
						name: 'article',
						displayName: '文章',
						values: [
							{
								displayName: '标题',
								name: 'title',
								type: 'string',
								default: '',
								required: true,
								placeholder: '文章标题',
								description: '文章标题，最大长度128字符',
							},
							{
								displayName: '描述',
								name: 'description',
								type: 'string',
								typeOptions: {
									rows: 2,
								},
								default: '',
								placeholder: '文章描述',
								description: '文章描述，最大长度512字符',
							},
							{
								displayName: '跳转链接',
								name: 'url',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'https://example.com',
								description: '点击文章后跳转的链接地址',
							},
							{
								displayName: '图片URL',
								name: 'picurl',
								type: 'string',
								default: '',
								placeholder: 'https://example.com/image.jpg',
								description: '文章配图的URL地址',
							},
						],
					},
				],
			},
			// 文件消息配置
			{
				displayName: '文件Media ID',
				name: 'fileMediaId',
				type: 'string',
				displayOptions: {
					show: {
						messageType: ['file'],
					},
				},
				default: '',
				required: true,
				placeholder: '3a040b0c7baba0d4d10b54728bb0fdd5',
				description: '文件的media_id，需要先通过企业微信API上传文件获取',
			},
		],
	};

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