import { ErrorHandler } from './ErrorHandler';
import { WeworkMessage, WeworkApiResponse, WeworkApiError, ApiClientConfig } from './types';
import { WeworkLogger, createLogger } from './Logger';

/**
 * 企业微信API HTTP客户端
 * 负责处理与WeWorkBot API的HTTP通信
 */
export class WeworkApiClient {
	private config: ApiClientConfig;
	private logger: WeworkLogger;

	constructor(config?: Partial<ApiClientConfig>, logger?: WeworkLogger) {
		this.config = {
			timeout: 30000, // 30秒超时
			maxRetries: 3,
			retryDelay: 1000, // 1秒重试延迟
			retryBackoffFactor: 2, // 指数退避因子
			enableLogging: true,
			...config,
		};
		this.logger = logger || createLogger('ApiClient');
	}

	/**
	 * 发送消息到企业微信群
	 */
	async sendMessage(webhookUrl: string, message: WeworkMessage): Promise<WeworkApiResponse> {
		const startTime = Date.now();
		this.logger.info('开始发送消息', { 
			messageType: message.msgtype, 
			webhookUrl: this.maskUrl(webhookUrl) 
		});

		let lastError: Error | null = null;
		let attempt = 0;

		while (attempt <= this.config.maxRetries) {
			try {
				const requestStartTime = Date.now();
				const response = await this.makeHttpRequest(webhookUrl, message);
				const requestDuration = Date.now() - requestStartTime;
				const totalDuration = Date.now() - startTime;

				this.logger.info('消息发送成功', {
					attempt: attempt + 1,
					requestDuration: `${requestDuration}ms`,
					totalDuration: `${totalDuration}ms`,
					errcode: response.errcode,
				});

				// 记录性能指标
				this.logger.logPerformance('sendMessage', totalDuration, {
					messageType: message.msgtype,
					attempts: attempt + 1,
					success: true,
				});

				return response;
			} catch (error) {
				lastError = error as Error;
				attempt++;

				this.logger.error('消息发送失败', {
					attempt,
					maxRetries: this.config.maxRetries,
					error: lastError.message,
				});

				// 如果是最后一次尝试，直接抛出错误
				if (attempt > this.config.maxRetries) {
					break;
				}

				// 检查是否应该重试
				if (!this.shouldRetry(lastError)) {
					this.logger.info('错误不支持重试，停止重试');
					break;
				}

				// 计算重试延迟（指数退避）
				const delay = this.config.retryDelay * Math.pow(this.config.retryBackoffFactor, attempt - 1);
				
				// 记录重试信息
				this.logger.logRetry(attempt, this.config.maxRetries, delay, lastError);
				
				await this.sleep(delay);
			}
		}

		// 所有重试都失败了，抛出最后的错误
		const apiError = this.createApiError(lastError!);
		const totalDuration = Date.now() - startTime;
		
		this.logger.error('所有重试都失败，抛出错误', { 
			error: apiError.message, 
			code: apiError.code,
			totalDuration: `${totalDuration}ms`,
			totalAttempts: attempt,
		});

		// 记录性能指标
		this.logger.logPerformance('sendMessage', totalDuration, {
			messageType: message.msgtype,
			attempts: attempt,
			success: false,
			errorCode: apiError.code,
		});

		throw apiError;
	}

	/**
	 * 测试连接
	 */
	async testConnection(webhookUrl: string): Promise<boolean> {
		const startTime = Date.now();
		this.logger.info('开始连接测试', { webhookUrl: this.maskUrl(webhookUrl) });
		
		try {
			const testMessage: WeworkMessage = {
				msgtype: 'text',
				text: {
					content: '连接测试成功 - WeWorkBot',
				},
			};

			const response = await this.sendMessage(webhookUrl, testMessage);
			const duration = Date.now() - startTime;
			
			const success = response.errcode === 0;
			this.logger.info('连接测试完成', { 
				success, 
				duration: `${duration}ms`,
				errcode: response.errcode 
			});
			
			return success;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error('连接测试失败', { 
				error: (error as Error).message,
				duration: `${duration}ms`
			});
			return false;
		}
	}

	/**
	 * 执行HTTP请求
	 */
	private async makeHttpRequest(webhookUrl: string, message: WeworkMessage): Promise<WeworkApiResponse> {
		// 验证URL格式
		if (!this.isValidWebhookUrl(webhookUrl)) {
			throw new Error('无效的webhook URL格式');
		}

		// 准备请求数据
		const requestBody = JSON.stringify(message);
		const requestHeaders = {
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-wework-bot/1.0',
		};

		// 记录API请求
		this.logger.logApiRequest('POST', webhookUrl, requestHeaders, message);

		// 创建AbortController用于超时控制
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

		try {
			const requestStartTime = Date.now();
			
			// 使用fetch发送请求
			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: requestHeaders,
				body: requestBody,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			const requestDuration = Date.now() - requestStartTime;

			// 记录API响应
			const responseHeaders: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});
			
			this.logger.logApiResponse(
				response.status,
				response.statusText,
				responseHeaders,
				undefined,
				requestDuration
			);

			// 检查HTTP状态码
			if (!response.ok) {
				throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
			}

			// 解析响应JSON
			const responseData = await response.json();
			
			// 验证响应格式
			const apiResponse = this.parseApiResponse(responseData);
			
			// 检查API错误码
			if (apiResponse.errcode !== 0) {
				throw this.createApiErrorFromResponse(apiResponse);
			}

			return apiResponse;
		} catch (error) {
			clearTimeout(timeoutId);
			
			// 处理不同类型的错误
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error(`请求超时 (${this.config.timeout}ms)`);
				}
				if (error.message.includes('fetch')) {
					throw new Error(`网络连接失败: ${error.message}`);
				}
			}
			
			throw error;
		}
	}

	/**
	 * 解析API响应
	 */
	private parseApiResponse(data: any): WeworkApiResponse {
		if (!data || typeof data !== 'object') {
			throw new Error('无效的API响应格式');
		}

		// 企业微信API响应格式验证
		if (typeof data.errcode !== 'number') {
			throw new Error('API响应缺少errcode字段');
		}

		if (typeof data.errmsg !== 'string') {
			throw new Error('API响应缺少errmsg字段');
		}

		return {
			errcode: data.errcode,
			errmsg: data.errmsg,
		};
	}

	/**
	 * 创建API错误对象
	 */
	private createApiError(error: Error): WeworkApiError {
		return ErrorHandler.createGenericError(error);
	}

	/**
	 * 从API响应创建错误对象
	 */
	private createApiErrorFromResponse(response: WeworkApiResponse): WeworkApiError {
		return ErrorHandler.createApiError(response);
	}

	/**
	 * 判断是否应该重试
	 */
	private shouldRetry(error: Error): boolean {
		// 网络错误可以重试
		if (error.message.includes('网络') || error.message.includes('超时') || error.message.includes('fetch')) {
			return true;
		}

		// 如果是WeworkApiError，使用ErrorHandler判断
		if (error instanceof WeworkApiError) {
			return ErrorHandler.isRetryableError(error);
		}

		// 其他错误根据消息内容判断
		const apiError = ErrorHandler.createGenericError(error);
		return ErrorHandler.isRetryableError(apiError);
	}

	/**
	 * 验证webhook URL格式
	 */
	private isValidWebhookUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			
			// 必须是HTTPS协议
			if (urlObj.protocol !== 'https:') {
				return false;
			}
			
			// 必须是企业微信域名
			if (!urlObj.hostname.includes('qyapi.weixin.qq.com')) {
				return false;
			}
			
			// 路径必须包含webhook相关信息
			if (!urlObj.pathname.includes('webhook') && !urlObj.pathname.includes('send')) {
				return false;
			}
			
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * 掩码URL（用于日志记录，隐藏敏感信息）
	 */
	private maskUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			const searchParams = new URLSearchParams(urlObj.search);
			
			// 掩码key参数
			if (searchParams.has('key')) {
				const key = searchParams.get('key')!;
				const maskedKey = key.length > 8 
					? key.substring(0, 4) + '****' + key.substring(key.length - 4)
					: '****';
				searchParams.set('key', maskedKey);
			}
			
			urlObj.search = searchParams.toString();
			return urlObj.toString();
		} catch {
			return '****';
		}
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
	 * 获取客户端配置
	 */
	getConfig(): ApiClientConfig {
		return { ...this.config };
	}

	/**
	 * 更新客户端配置
	 */
	updateConfig(config: Partial<ApiClientConfig>): void {
		this.config = { ...this.config, ...config };
	}
}