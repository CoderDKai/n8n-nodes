import { WeworkApiError, WeworkApiResponse } from './types';

/**
 * 重试策略配置接口
 */
export interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffFactor: number;
	jitter: boolean;
}

/**
 * 错误统计接口
 */
export interface ErrorStats {
	totalErrors: number;
	errorsByCode: Record<number, number>;
	errorsByCategory: Record<string, number>;
	lastErrorTime: number;
	retryAttempts: number;
	successfulRetries: number;
}

/**
 * 企业微信API错误处理工具类
 * 提供统一的错误处理、分类和映射功能
 */
export class ErrorHandler {
	private static errorStats: ErrorStats = {
		totalErrors: 0,
		errorsByCode: {},
		errorsByCategory: {},
		lastErrorTime: 0,
		retryAttempts: 0,
		successfulRetries: 0,
	};

	private static defaultRetryConfig: RetryConfig = {
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 30000,
		backoffFactor: 2,
		jitter: true,
	};
	/**
	 * 从API响应创建错误对象
	 */
	static createApiError(response: WeworkApiResponse): WeworkApiError {
		const errorMessage = this.getErrorMessage(response.errcode, response.errmsg);
		return new WeworkApiError(response.errcode, errorMessage, response);
	}

	/**
	 * 从通用错误创建API错误对象
	 */
	static createGenericError(error: Error, defaultCode: number = -1): WeworkApiError {
		if (error instanceof WeworkApiError) {
			return error;
		}

		let code = defaultCode;
		let message = error.message;

		// 根据错误消息判断错误类型
		if (message.includes('超时') || message.includes('timeout')) {
			code = -2;
			message = '请求超时，请检查网络连接';
		} else if (message.includes('网络') || message.includes('network') || message.includes('fetch')) {
			code = -3;
			message = '网络连接失败，请检查网络设置';
		} else if (message.includes('URL') || message.includes('url')) {
			code = -4;
			message = '无效的webhook URL格式';
		} else if (message.includes('JSON') || message.includes('parse')) {
			code = -5;
			message = '响应数据格式错误';
		}

		return new WeworkApiError(code, message);
	}

	static handleApiError(error: any): WeworkApiError {
		if (error?.response?.data) {
			return this.createApiError(error.response.data as WeworkApiResponse);
		}

		if (error instanceof Error) {
			return new WeworkApiError(-1, error.message);
		}

		const message = typeof error?.message === 'string' ? error.message : '未知错误';
		return new WeworkApiError(-1, message);
	}

	static shouldRetry(error: WeworkApiError): boolean {
		return this.isRetryableError(error);
	}

	/**
	 * 获取详细的错误消息
	 */
	static getErrorMessage(errcode: number, errmsg: string): string {
		const errorMessages: Record<number, string> = {
			// 成功
			0: '请求成功',

			// 系统级错误码
			'-1': '系统繁忙，此时请开发者稍候再试',
			40001: '参数错误',
			40002: '不合法的凭证类型',
			40003: '不合法的OpenID，请开发者确认OpenID（该用户）是否已关注公众号，或是否是其他公众号的OpenID',
			40004: '不合法的媒体文件类型',
			40005: '不合法的文件类型',
			40006: '不合法的文件大小',
			40007: '不合法的媒体文件id',
			40008: '不合法的消息类型',
			40009: '不合法的图片文件大小',
			40010: '不合法的语音文件大小',
			40011: '不合法的视频文件大小',
			40012: '不合法的缩略图文件大小',
			40013: '不合法的AppID，请开发者检查AppID的正确性，避免异常字符，注意大小写',
			40014: '不合法的access_token，请开发者认真比对access_token的有效性（如是否过期），或查看是否正在为恰当的公众号调用接口',
			40015: '不合法的菜单类型',
			40016: '不合法的按钮个数',
			40017: '不合法的按钮个数',
			40018: '不合法的按钮名字长度',
			40019: '不合法的按钮KEY长度',
			40020: '不合法的按钮URL长度',
			40021: '不合法的菜单版本号',
			40022: '不合法的子菜单级数',
			40023: '不合法的子菜单按钮个数',
			40024: '不合法的子菜单按钮类型',
			40025: '不合法的子菜单按钮名字长度',
			40026: '不合法的子菜单按钮KEY长度',
			40027: '不合法的子菜单按钮URL长度',
			40028: '不合法的自定义菜单使用用户',
			40029: '不合法的oauth_code',
			40030: '不合法的refresh_token',
			40031: '不合法的openid列表',
			40032: '不合法的openid列表长度',
			40033: '不合法的请求字符，不能包含\\uxxxx格式的字符',
			40035: '不合法的参数',
			40038: '不合法的请求格式',
			40039: '不合法的URL长度',
			40050: '不合法的分组id',
			40051: '分组名字不合法',
			40117: '分组名字不合法',
			40118: 'media_id大小不合法',
			40119: 'button类型错误',
			40120: 'button类型错误',
			40121: '不合法的media_id类型',
			40132: '微信号不合法',
			40137: '不支持的图片格式',

			// 访问频率限制
			41001: '缺少access_token参数',
			41002: '缺少appid参数',
			41003: '缺少refresh_token参数',
			41004: '缺少secret参数',
			41005: '缺少多媒体文件数据',
			41006: '缺少media_id参数',
			41007: '缺少子菜单数据',
			41008: '缺少oauth code',
			41009: '缺少openid',

			// access_token超时
			42001: 'access_token超时，请检查access_token的有效期，请参考基础支持-获取access_token中，对access_token的详细机制说明',
			42002: 'refresh_token超时',
			42003: 'oauth_code超时',
			42007: '用户修改微信密码，accesstoken和refreshtoken失效，需要重新授权',

			// 需要GET请求
			43001: '需要GET请求',
			43002: '需要POST请求',
			43003: '需要HTTPS请求',
			43004: '需要接收者关注',
			43005: '需要好友关系',
			43019: '需要将接收者从黑名单中移除',

			// 多媒体文件为空
			44001: '多媒体文件为空',
			44002: 'POST的数据包为空',
			44003: '图文消息内容为空',
			44004: '文本消息内容为空',

			// 多媒体文件大小超过限制
			45001: '多媒体文件大小超过限制',
			45002: '消息内容超过限制',
			45003: '标题字段超过限制',
			45004: '描述字段超过限制',
			45005: '链接字段超过限制',
			45006: '图片链接字段超过限制',
			45007: '语音播放时间超过限制',
			45008: '图文消息超过限制',
			45009: '接口调用超过限制',
			45010: '创建菜单个数超过限制',
			45015: '回复时间超过限制',
			45016: '系统分组，不允许修改',
			45017: '分组名字过长',
			45018: '分组数量超过上限',
			45047: '客服接口下行条数超过上限',

			// 不存在媒体数据
			46001: '不存在媒体数据',
			46002: '不存在的菜单版本',
			46003: '不存在的菜单数据',
			46004: '不存在的用户',

			// 解析JSON/XML内容错误
			47001: '解析JSON/XML内容错误',

			// api功能未授权
			48001: 'api功能未授权，请确认公众号已获得该接口，可以在公众平台官网-开发者中心页中查看接口权限',
			48002: '粉丝拒收消息（粉丝在公众号选项中，关闭了"接收消息"）',
			48004: 'api接口被封禁，请登录mp.weixin.qq.com查看详情',
			48005: 'api禁止删除被自动回复和自定义菜单引用的素材',
			48006: 'api禁止清零调用次数，因为清零次数达到上限',
			48008: '没有该类型消息的发送权限',

			// 用户未授权该api
			50001: '用户未授权该api',
			50002: '用户受限，可能是违规后接口被封禁',
			50005: '用户未关注公众号',

			// 参数错误
			61451: '参数错误(invalid parameter)',
			61452: '无效客服账号(invalid kf_account)',
			61453: '客服帐号已存在(kf_account exsited)',
			61454: '客服帐号名长度超过限制(仅允许10个英文字符，不包括@及@后的公众号的微信号)(invalid kf_acount length)',
			61455: '客服帐号名包含非法字符(仅允许英文+数字)(illegal character in kf_account)',
			61456: '客服帐号个数超过限制(10个客服账号)(kf_account count exceeded)',
			61457: '无效头像文件类型(invalid file type)',
			61450: '系统错误(system error)',
			61500: '日期格式错误',

			// WeWorkBot特有错误码
			93000: 'Webhook URL无效或已过期',
			300001: '缺少参数',
			300002: 'https请求',
			300003: 'userid错误',
			300004: '客户端ip非法',
			300005: '客户端未注册',
			300006: '参数错误',
			300007: '非法操作',
			300008: '非法字符',
			300009: '缺少参数',
			300010: '文件大小超限',
			300011: '非法的文件类型',
			300012: '非法的文件名',
			300013: '应用不存在',
			300014: '成员不存在',
			300015: '不合法的文件大小',
			300016: '不合法的文件名长度',
			300017: '不合法的文件内容',
			300018: '不合法的文件类型',

			// 自定义错误码
			'-2': '请求超时',
			'-3': '网络连接失败',
			'-4': 'URL格式无效',
			'-5': '响应数据格式错误',
		};

		// 如果有自定义错误消息，使用自定义消息
		const customMessage = errorMessages[errcode];
		if (customMessage) {
			return customMessage;
		}

		// 如果没有自定义消息，使用原始消息
		if (errmsg && errmsg.trim()) {
			return errmsg.trim();
		}

		// 如果原始消息也为空，返回通用错误消息
		return `未知的企业微信API错误 (错误码: ${errcode})`;
	}

	/**
	 * 判断错误是否可以重试
	 */
	static isRetryableError(error: WeworkApiError): boolean {
		const retryableCodes = [
			-1,    // 系统繁忙
			-2,    // 请求超时
			-3,    // 网络连接失败
			42001, // access_token超时
			42002, // refresh_token超时
			45009, // 接口调用超过限制
		];

		return retryableCodes.includes(error.code);
	}

	/**
	 * 获取错误的严重程度
	 */
	static getErrorSeverity(error: WeworkApiError): 'low' | 'medium' | 'high' | 'critical' {
		// 严重错误（需要立即处理）
		const criticalCodes = [93000, 40001, 40013, 40014, 48001, 50001];
		if (criticalCodes.includes(error.code)) {
			return 'critical';
		}

		// 高级错误（影响功能）
		const highCodes = [40003, 40004, 40005, 40006, 40007, 40008, 44001, 44002, 44003, 44004];
		if (highCodes.includes(error.code)) {
			return 'high';
		}

		// 中级错误（可能影响用户体验）
		const mediumCodes = [45001, 45002, 45003, 45004, 45005, 45006, 45007, 45008, 45009];
		if (mediumCodes.includes(error.code)) {
			return 'medium';
		}

		// 低级错误（临时性问题）
		return 'low';
	}

	/**
	 * 获取错误的分类
	 */
	static getErrorCategory(error: WeworkApiError): string {
		const categories: Record<number, string> = {
			// 认证相关
			93000: '认证错误',
			40001: '认证错误',
			40013: '认证错误',
			40014: '认证错误',
			42001: '认证错误',
			42002: '认证错误',

			// 参数相关
			40003: '参数错误',
			40035: '参数错误',
			41001: '参数错误',
			41002: '参数错误',
			41003: '参数错误',
			300001: '参数错误',
			300006: '参数错误',
			300009: '参数错误',

			// 内容相关
			44001: '内容错误',
			44002: '内容错误',
			44003: '内容错误',
			44004: '内容错误',
			45002: '内容错误',
			45003: '内容错误',
			45004: '内容错误',

			// 文件相关
			40004: '文件错误',
			40005: '文件错误',
			40006: '文件错误',
			40007: '文件错误',
			45001: '文件错误',
			300010: '文件错误',
			300011: '文件错误',
			300012: '文件错误',

			// 频率限制
			45009: '频率限制',

			// 权限相关
			48001: '权限错误',
			50001: '权限错误',
			50002: '权限错误',

			// 网络相关
			'-2': '网络错误',
			'-3': '网络错误',
			'-4': '网络错误',
			'-5': '网络错误',

			// 系统相关
			'-1': '系统错误',
			61450: '系统错误',
		};

		return categories[error.code] || '未知错误';
	}

	/**
	 * 获取错误的建议解决方案
	 */
	static getErrorSuggestion(error: WeworkApiError): string {
		const suggestions: Record<number, string> = {
			93000: '请检查webhook URL是否正确，或重新创建群机器人获取新的webhook URL',
			40001: '请检查AppSecret是否正确，或重新获取access_token',
			40003: '请检查用户ID是否正确，确认用户是否存在',
			40004: '请使用支持的媒体文件类型（如jpg、png、mp3、mp4等）',
			40005: '请检查文件类型是否正确',
			40006: '请减小文件大小，确保不超过限制',
			40013: '请检查AppID是否正确',
			40014: '请重新获取有效的access_token',
			40035: '请检查请求参数是否正确',
			42001: 'access_token已过期，请重新获取',
			44001: '请确保上传的多媒体文件不为空',
			44002: '请确保POST请求包含有效的数据',
			44003: '请确保图文消息包含有效内容',
			44004: '请确保文本消息内容不为空',
			45001: '请减小多媒体文件大小，确保不超过限制',
			45002: '请缩短消息内容，确保不超过4096个字符',
			45009: '请降低接口调用频率，稍后再试',
			48001: '请确认应用已获得该接口权限',
			50001: '请确认用户已授权该API',
			'-1': '系统繁忙，请稍后重试',
			'-2': '请求超时，请检查网络连接',
			'-3': '网络连接失败，请检查网络设置',
			'-4': '请检查URL格式是否正确',
			'-5': '响应数据格式错误，请联系技术支持',
		};

		return suggestions[error.code] || '请查看详细错误信息或联系技术支持';
	}

	/**
	 * 格式化错误信息用于显示
	 */
	static formatErrorForDisplay(error: WeworkApiError): {
		title: string;
		message: string;
		category: string;
		severity: string;
		suggestion: string;
		retryable: boolean;
	} {
		return {
			title: `错误 ${error.code}`,
			message: error.message,
			category: this.getErrorCategory(error),
			severity: this.getErrorSeverity(error),
			suggestion: this.getErrorSuggestion(error),
			retryable: this.isRetryableError(error),
		};
	}

	/**
	 * 创建用户友好的错误消息
	 */
	static createUserFriendlyMessage(error: WeworkApiError): string {
		const category = this.getErrorCategory(error);
		const suggestion = this.getErrorSuggestion(error);
		
		return `${category}: ${error.message}\n建议: ${suggestion}`;
	}

	/**
	 * 计算重试延迟时间
	 */
	static calculateRetryDelay(attempt: number, config: Partial<RetryConfig> = {}): number {
		const retryConfig = { ...this.defaultRetryConfig, ...config };
		
		// 基础延迟 * 指数退避
		let delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1);
		
		// 限制最大延迟
		delay = Math.min(delay, retryConfig.maxDelay);
		
		// 添加随机抖动以避免雷群效应
		if (retryConfig.jitter) {
			const jitterRange = delay * 0.1; // 10%的抖动
			delay += (Math.random() - 0.5) * 2 * jitterRange;
		}
		
		return Math.max(delay, 0);
	}

	/**
	 * 获取重试策略配置
	 */
	static getRetryConfig(error: WeworkApiError): Partial<RetryConfig> {
		const severity = this.getErrorSeverity(error);
		
		switch (severity) {
			case 'critical':
				// 严重错误：不重试或只重试一次
				return { maxRetries: 1, baseDelay: 5000 };
			
			case 'high':
				// 高级错误：少量重试
				return { maxRetries: 2, baseDelay: 2000 };
			
			case 'medium':
				// 中级错误：正常重试
				return { maxRetries: 3, baseDelay: 1000 };
			
			case 'low':
				// 低级错误：更多重试
				return { maxRetries: 5, baseDelay: 500 };
			
			default:
				return this.defaultRetryConfig;
		}
	}

	/**
	 * 记录错误统计
	 */
	static recordError(error: WeworkApiError, isRetry: boolean = false): void {
		this.errorStats.totalErrors++;
		this.errorStats.lastErrorTime = Date.now();
		
		// 按错误码统计
		this.errorStats.errorsByCode[error.code] = (this.errorStats.errorsByCode[error.code] || 0) + 1;
		
		// 按错误分类统计
		const category = this.getErrorCategory(error);
		this.errorStats.errorsByCategory[category] = (this.errorStats.errorsByCategory[category] || 0) + 1;
		
		// 重试统计
		if (isRetry) {
			this.errorStats.retryAttempts++;
		}
	}

	/**
	 * 记录成功的重试
	 */
	static recordSuccessfulRetry(): void {
		this.errorStats.successfulRetries++;
	}

	/**
	 * 获取错误统计信息
	 */
	static getErrorStats(): ErrorStats {
		return { ...this.errorStats };
	}

	/**
	 * 重置错误统计
	 */
	static resetErrorStats(): void {
		this.errorStats = {
			totalErrors: 0,
			errorsByCode: {},
			errorsByCategory: {},
			lastErrorTime: 0,
			retryAttempts: 0,
			successfulRetries: 0,
		};
	}

	/**
	 * 检查是否应该启用断路器模式
	 */
	static shouldEnableCircuitBreaker(): boolean {
		const stats = this.errorStats;
		const now = Date.now();
		const fiveMinutesAgo = now - 5 * 60 * 1000;
		
		// 如果最近5分钟内没有错误，不启用断路器
		if (stats.lastErrorTime < fiveMinutesAgo) {
			return false;
		}
		
		// 如果错误率过高，启用断路器
		const totalRequests = stats.totalErrors + stats.successfulRetries;
		if (totalRequests > 10) {
			const errorRate = stats.totalErrors / totalRequests;
			return errorRate > 0.5; // 错误率超过50%
		}
		
		return false;
	}

	/**
	 * 创建错误上下文信息
	 */
	static createErrorContext(error: WeworkApiError, additionalInfo?: Record<string, any>): Record<string, any> {
		return {
			errorCode: error.code,
			errorMessage: error.message,
			errorCategory: this.getErrorCategory(error),
			errorSeverity: this.getErrorSeverity(error),
			isRetryable: this.isRetryableError(error),
			suggestion: this.getErrorSuggestion(error),
			timestamp: new Date().toISOString(),
			...additionalInfo,
		};
	}

	/**
	 * 验证错误对象
	 */
	static validateError(error: any): error is WeworkApiError {
		return error instanceof WeworkApiError && 
			   typeof error.code === 'number' && 
			   typeof error.message === 'string';
	}

	/**
	 * 包装异步操作，自动处理错误和重试
	 */
	static async withRetry<T>(
		operation: () => Promise<T>,
		config: Partial<RetryConfig> = {},
		onRetry?: (attempt: number, error: WeworkApiError) => void
	): Promise<T> {
		const retryConfig = { ...this.defaultRetryConfig, ...config };
		let lastError: WeworkApiError | null = null;
		
		for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
			try {
				const result = await operation();
				
				// 如果之前有重试，记录成功的重试
				if (attempt > 1) {
					this.recordSuccessfulRetry();
				}
				
				return result;
			} catch (error) {
				// 转换为WeworkApiError
				lastError = error instanceof WeworkApiError 
					? error 
					: this.createGenericError(error as Error);
				
				// 记录错误
				this.recordError(lastError, attempt > 1);
				
				// 如果是最后一次尝试，直接抛出错误
				if (attempt > retryConfig.maxRetries) {
					break;
				}
				
				// 检查是否应该重试
				if (!this.isRetryableError(lastError)) {
					break;
				}
				
				// 调用重试回调
				if (onRetry) {
					onRetry(attempt, lastError);
				}
				
				// 等待重试延迟
				const delay = this.calculateRetryDelay(attempt, retryConfig);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError!;
	}
}
