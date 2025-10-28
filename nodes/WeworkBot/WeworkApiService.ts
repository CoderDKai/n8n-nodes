import type { IExecuteFunctions } from 'n8n-workflow';

import { WeworkApiClient } from './ApiClient';
import { ErrorHandler } from './ErrorHandler';
import { WeworkLogger, createLogger } from './Logger';
import { 
	WeworkMessage, 
	WeworkApiResponse, 
	WeworkApiError, 
	NodeOutputData, 
	MessageType,
	ApiClientConfig 
} from './types';

/**
 * 企业微信API服务类
 * 提供高级的企业微信API调用功能，包含业务逻辑处理
 */
export class WeworkApiService {
	private apiClient: WeworkApiClient;
	private logger: WeworkLogger;

	constructor(executeFunctions: IExecuteFunctions, config?: Partial<ApiClientConfig>, logger?: WeworkLogger) {
		this.logger = logger || createLogger('ApiService');
		this.apiClient = new WeworkApiClient(
			executeFunctions,
			config,
			this.logger.createChildLogger('Client')
		);
	}

	/**
	 * 发送消息并返回格式化的结果
	 */
	async sendMessage(webhookUrl: string, message: WeworkMessage): Promise<NodeOutputData> {
		const startTime = Date.now();
		
		try {
			this.logger.info('开始发送企业微信消息', {
				messageType: message.msgtype,
				timestamp: new Date().toISOString(),
			});

			// 发送前验证
			this.logger.debug('开始消息验证', { messageType: message.msgtype });
			this.validateMessage(message);
			this.validateWebhookUrl(webhookUrl);
			this.logger.debug('消息验证通过');

			// 调用API
			const response = await this.apiClient.sendMessage(webhookUrl, message);
			
			// 处理成功响应
			const result = this.createSuccessResult(message, response, startTime);
			
			this.logger.info('消息发送成功', {
				messageType: message.msgtype,
				duration: `${result.timestamp - startTime}ms`,
				errcode: response.errcode,
			});

			return result;
		} catch (error) {
			// 处理错误响应
			const result = this.createErrorResult(message, error as Error, startTime);
			
			this.logger.error('消息发送失败', {
				messageType: message.msgtype,
				duration: `${result.timestamp - startTime}ms`,
				error: result.errorMessage,
				errorCode: result.errorCode,
			});

			return result;
		}
	}

	/**
	 * 批量发送消息
	 */
	async sendMessages(webhookUrl: string, messages: WeworkMessage[]): Promise<NodeOutputData[]> {
		const batchStartTime = Date.now();
		this.logger.info(`开始批量发送 ${messages.length} 条消息`);

		const results: NodeOutputData[] = [];
		let successCount = 0;
		let failureCount = 0;

		for (let i = 0; i < messages.length; i++) {
			const message = messages[i];
			this.logger.debug(`处理第 ${i + 1}/${messages.length} 条消息`, { messageType: message.msgtype });
			
			try {
				const result = await this.sendMessage(webhookUrl, message);
				results.push(result);
				
				if (result.success) {
					successCount++;
				} else {
					failureCount++;
				}

				// 添加延迟以避免频率限制
				if (i < messages.length - 1) {
					this.logger.debug('等待500ms以避免频率限制');
					await this.sleep(500); // 500ms延迟
				}
			} catch (error) {
				const errorResult = this.createErrorResult(message, error as Error, Date.now());
				results.push(errorResult);
				failureCount++;
				this.logger.error(`第 ${i + 1} 条消息发送异常`, { error: (error as Error).message });
			}
		}

		const batchDuration = Date.now() - batchStartTime;
		this.logger.info('批量发送完成', {
			total: messages.length,
			success: successCount,
			failure: failureCount,
			duration: `${batchDuration}ms`,
			averageTime: `${(batchDuration / messages.length).toFixed(1)}ms`,
		});

		// 记录性能指标
		this.logger.logPerformance('batchSendMessages', batchDuration, {
			messageCount: messages.length,
			successRate: `${((successCount / messages.length) * 100).toFixed(1)}%`,
		});

		return results;
	}

	/**
	 * 测试webhook连接
	 */
	async testWebhookConnection(webhookUrl: string): Promise<{
		success: boolean;
		message: string;
		responseTime?: number;
	}> {
		const startTime = Date.now();
		
		try {
			this.validateWebhookUrl(webhookUrl);
			
			const isConnected = await this.apiClient.testConnection(webhookUrl);
			const responseTime = Date.now() - startTime;
			
			if (isConnected) {
				return {
					success: true,
					message: '连接测试成功',
					responseTime,
				};
			} else {
				return {
					success: false,
					message: '连接测试失败，请检查webhook URL是否正确',
					responseTime,
				};
			}
		} catch (error) {
			const responseTime = Date.now() - startTime;
			return {
				success: false,
				message: `连接测试失败: ${(error as Error).message}`,
				responseTime,
			};
		}
	}

	/**
	 * 获取API错误详细信息
	 */
	getApiErrorDetails(error: WeworkApiError): {
		code: number;
		message: string;
		category: string;
		suggestion: string;
		retryable: boolean;
		severity: string;
	} {
		const errorDetails = ErrorHandler.formatErrorForDisplay(error);
		
		return {
			code: error.code,
			message: error.message,
			category: errorDetails.category,
			suggestion: errorDetails.suggestion,
			retryable: errorDetails.retryable,
			severity: errorDetails.severity,
		};
	}

	/**
	 * 验证消息格式
	 */
	private validateMessage(message: WeworkMessage): void {
		if (!message || typeof message !== 'object') {
			throw new Error('消息对象不能为空');
		}

		if (!message.msgtype) {
			throw new Error('消息类型不能为空');
		}

		// 根据消息类型进行特定验证
		switch (message.msgtype) {
			case MessageType.TEXT:
				this.validateTextMessage(message as any);
				break;
			case MessageType.MARKDOWN:
				this.validateMarkdownMessage(message as any);
				break;
			case MessageType.IMAGE:
				this.validateImageMessage(message as any);
				break;
			case MessageType.NEWS:
				this.validateNewsMessage(message as any);
				break;
			case MessageType.FILE:
				this.validateFileMessage(message as any);
				break;
			default:
				throw new Error(`不支持的消息类型: ${message.msgtype}`);
		}
	}

	/**
	 * 验证文本消息
	 */
	private validateTextMessage(message: any): void {
		if (!message.text || !message.text.content) {
			throw new Error('文本消息内容不能为空');
		}
		
		if (message.text.content.length > 4096) {
			throw new Error('文本消息内容不能超过4096个字符');
		}
	}

	/**
	 * 验证Markdown消息
	 */
	private validateMarkdownMessage(message: any): void {
		if (!message.markdown || !message.markdown.content) {
			throw new Error('Markdown消息内容不能为空');
		}
		
		if (message.markdown.content.length > 4096) {
			throw new Error('Markdown消息内容不能超过4096个字符');
		}
	}

	/**
	 * 验证图片消息
	 */
	private validateImageMessage(message: any): void {
		if (!message.image || !message.image.base64 || !message.image.md5) {
			throw new Error('图片消息必须包含base64编码和MD5值');
		}
	}

	/**
	 * 验证图文消息
	 */
	private validateNewsMessage(message: any): void {
		if (!message.news || !message.news.articles || !Array.isArray(message.news.articles)) {
			throw new Error('图文消息必须包含文章数组');
		}
		
		if (message.news.articles.length === 0) {
			throw new Error('图文消息至少需要包含一篇文章');
		}
		
		if (message.news.articles.length > 8) {
			throw new Error('图文消息最多只能包含8篇文章');
		}
	}

	/**
	 * 验证文件消息
	 */
	private validateFileMessage(message: any): void {
		if (!message.file || !message.file.media_id) {
			throw new Error('文件消息必须包含media_id');
		}
	}

	/**
	 * 验证webhook URL
	 */
	private validateWebhookUrl(webhookUrl: string): void {
		if (!webhookUrl || typeof webhookUrl !== 'string') {
			throw new Error('Webhook URL不能为空');
		}

		try {
			const url = new URL(webhookUrl);
			
			if (url.protocol !== 'https:') {
				throw new Error('Webhook URL必须使用HTTPS协议');
			}
			
			if (!url.hostname.includes('qyapi.weixin.qq.com')) {
				throw new Error('Webhook URL必须是企业微信官方域名');
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('Invalid URL')) {
				throw new Error('Webhook URL格式无效');
			}
			throw error;
		}
	}

	/**
	 * 创建成功结果
	 */
	private createSuccessResult(
		message: WeworkMessage, 
		response: WeworkApiResponse, 
		startTime: number
	): NodeOutputData {
		return {
			success: true,
			messageId: this.generateMessageId(),
			errorCode: response.errcode,
			errorMessage: response.errcode === 0 ? undefined : response.errmsg,
			timestamp: Date.now(),
			messageType: message.msgtype,
		};
	}

	/**
	 * 创建错误结果
	 */
	private createErrorResult(
		message: WeworkMessage, 
		error: Error, 
		startTime: number
	): NodeOutputData {
		let errorCode = -1;
		let errorMessage = error.message;

		if (error instanceof WeworkApiError) {
			errorCode = error.code;
			errorMessage = error.message;
		}

		return {
			success: false,
			errorCode,
			errorMessage,
			timestamp: Date.now(),
			messageType: message.msgtype,
		};
	}

	/**
	 * 生成消息ID
	 */
	private generateMessageId(): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `msg_${timestamp}_${random}`;
	}



	/**
	 * 睡眠函数
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * 获取日志记录器
	 */
	getLogger(): WeworkLogger {
		return this.logger;
	}

	/**
	 * 获取API客户端实例（用于高级用法）
	 */
	getApiClient(): WeworkApiClient {
		return this.apiClient;
	}

	/**
	 * 更新API客户端配置
	 */
	updateConfig(config: Partial<ApiClientConfig>): void {
		this.apiClient.updateConfig(config);
	}
}
