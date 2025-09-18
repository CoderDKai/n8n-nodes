import { WeworkApiError } from './types';

/**
 * 错误处理工具类
 */
export class ErrorHandler {
	/**
	 * 处理企业微信API错误
	 */
	static handleApiError(error: any): WeworkApiError {
		const errorCode = error.response?.data?.errcode || -1;
		const errorMessage = error.response?.data?.errmsg || error.message;
		
		switch (errorCode) {
			case 93000:
				return new WeworkApiError(errorCode, 'Webhook URL无效或已过期');
			case 45009:
				return new WeworkApiError(errorCode, '接口调用超过限制');
			case 40001:
				return new WeworkApiError(errorCode, '参数错误');
			default:
				return new WeworkApiError(errorCode, errorMessage);
		}
	}

	/**
	 * 判断错误是否应该重试
	 */
	static shouldRetry(error: WeworkApiError): boolean {
		// 网络错误和临时性错误可以重试
		return error.code === -1 || error.code === 45009;
	}
}

/**
 * 消息验证工具类
 */
export class MessageValidator {
	/**
	 * 验证文本消息内容长度
	 */
	static validateTextLength(content: string): boolean {
		return content.length <= 4096;
	}

	/**
	 * 验证Markdown消息内容长度
	 */
	static validateMarkdownLength(content: string): boolean {
		return content.length <= 4096;
	}

	/**
	 * 验证图片大小
	 */
	static validateImageSize(base64: string): boolean {
		// 计算base64编码后的大小（约为原文件大小的4/3）
		const sizeInBytes = (base64.length * 3) / 4;
		return sizeInBytes <= 2 * 1024 * 1024; // 2MB
	}

	/**
	 * 验证图文消息标题长度
	 */
	static validateNewsTitle(title: string): boolean {
		return title.length <= 128;
	}

	/**
	 * 验证图文消息描述长度
	 */
	static validateNewsDescription(description: string): boolean {
		return description.length <= 512;
	}

	/**
	 * 验证URL格式
	 */
	static validateUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * 工具函数
 */
export class Utils {
	/**
	 * 计算字符串的MD5哈希值
	 */
	static calculateMD5(content: string): string {
		// 这里使用简单的实现，实际项目中应该使用crypto模块
		// 将在后续任务中完善
		return 'placeholder_md5';
	}

	/**
	 * 延迟执行
	 */
	static delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * 格式化时间戳
	 */
	static formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toISOString();
	}
}