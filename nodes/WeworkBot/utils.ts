import { createHash } from 'crypto';
import { 
	WeworkApiError, 
	ValidationResult, 
	MessageHandlerConfig,
	NewsArticle,
	TextMessage,
	MarkdownMessage,
	ImageMessage,
	NewsMessage,
	FileMessage
} from './types';

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
	private static readonly DEFAULT_CONFIG: MessageHandlerConfig = {
		maxContentLength: 4096,
		maxImageSize: 2 * 1024 * 1024, // 2MB
		supportedImageTypes: ['jpg', 'jpeg', 'png'],
		maxArticleCount: 8,
		maxTitleLength: 128,
		maxDescriptionLength: 512,
	};

	/**
	 * 验证文本消息
	 */
	static validateTextMessage(message: Partial<TextMessage>): ValidationResult {
		const errors: string[] = [];

		// 验证消息类型
		if (message.msgtype !== 'text') {
			errors.push('消息类型必须是text');
		}

		// 验证文本内容
		if (!message.text?.content) {
			errors.push('文本消息内容不能为空');
		} else {
			const content = message.text.content.trim();
			if (content.length === 0) {
				errors.push('文本消息内容不能仅包含空白字符');
			} else if (content.length > this.DEFAULT_CONFIG.maxContentLength) {
				errors.push(`文本消息内容不能超过${this.DEFAULT_CONFIG.maxContentLength}个字符，当前长度：${content.length}`);
			}
		}

		// 验证@提及用户列表
		if (message.text?.mentioned_list) {
			if (!Array.isArray(message.text.mentioned_list)) {
				errors.push('@提及用户列表必须是数组格式');
			} else {
				// 检查是否有重复用户
				const uniqueUsers = new Set(message.text.mentioned_list);
				if (uniqueUsers.size !== message.text.mentioned_list.length) {
					errors.push('@提及用户列表中存在重复用户');
				}

				// 检查用户ID格式（企业微信用户ID通常不为空）
				for (const user of message.text.mentioned_list) {
					if (typeof user !== 'string' || user.trim().length === 0) {
						errors.push('@提及用户ID不能为空');
						break;
					}
				}
			}
		}

		// 验证@提及手机号列表
		if (message.text?.mentioned_mobile_list) {
			if (!Array.isArray(message.text.mentioned_mobile_list)) {
				errors.push('@提及手机号列表必须是数组格式');
			} else {
				// 检查是否有重复手机号
				const uniqueMobiles = new Set(message.text.mentioned_mobile_list);
				if (uniqueMobiles.size !== message.text.mentioned_mobile_list.length) {
					errors.push('@提及手机号列表中存在重复手机号');
				}

				// 验证每个手机号格式
				for (const mobile of message.text.mentioned_mobile_list) {
					if (typeof mobile !== 'string') {
						errors.push('手机号必须是字符串格式');
						break;
					}
					if (!/^1[3-9]\d{9}$/.test(mobile)) {
						errors.push(`无效的手机号格式: ${mobile}，手机号应为11位数字且以1开头`);
					}
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证Markdown消息
	 */
	static validateMarkdownMessage(message: Partial<MarkdownMessage>): ValidationResult {
		const errors: string[] = [];

		// 验证消息类型
		if (message.msgtype !== 'markdown') {
			errors.push('消息类型必须是markdown');
		}

		// 验证Markdown内容
		if (!message.markdown?.content) {
			errors.push('Markdown消息内容不能为空');
		} else {
			const content = message.markdown.content.trim();
			if (content.length === 0) {
				errors.push('Markdown消息内容不能仅包含空白字符');
			} else if (content.length > this.DEFAULT_CONFIG.maxContentLength) {
				errors.push(`Markdown消息内容不能超过${this.DEFAULT_CONFIG.maxContentLength}个字符，当前长度：${content.length}`);
			}

			// 验证Markdown语法
			const syntaxErrors = this.validateMarkdownSyntax(content);
			errors.push(...syntaxErrors);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证Markdown语法
	 */
	private static validateMarkdownSyntax(content: string): string[] {
		const errors: string[] = [];

		// 检查加粗语法是否配对
		const boldMatches = content.match(/\*\*/g);
		if (boldMatches && boldMatches.length % 2 !== 0) {
			errors.push('Markdown加粗语法(**) 不配对');
		}

		// 检查斜体语法是否配对（排除加粗中的*）
		const contentWithoutBold = content.replace(/\*\*[^*]*\*\*/g, '');
		const italicMatches = contentWithoutBold.match(/(?<!\*)\*(?!\*)/g);
		if (italicMatches && italicMatches.length % 2 !== 0) {
			errors.push('Markdown斜体语法(*) 不配对');
		}

		// 检查代码块语法是否配对
		const codeBlockMatches = content.match(/```/g);
		if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
			errors.push('Markdown代码块语法(```) 不配对');
		}

		// 检查内联代码语法是否配对
		const inlineCodeMatches = content.match(/`/g);
		if (inlineCodeMatches && inlineCodeMatches.length % 2 !== 0) {
			errors.push('Markdown内联代码语法(`) 不配对');
		}

		// 检查链接语法
		const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
		let linkMatch;
		while ((linkMatch = linkPattern.exec(content)) !== null) {
			const [, linkText, linkUrl] = linkMatch;
			
			if (!linkText.trim()) {
				errors.push('Markdown链接文本不能为空');
			}
			
			if (!linkUrl.trim()) {
				errors.push('Markdown链接URL不能为空');
			} else if (!this.validateUrl(linkUrl.trim())) {
				errors.push(`Markdown链接URL格式无效: ${linkUrl}`);
			}
		}

		// 检查是否包含不支持的HTML标签
		const htmlTagPattern = /<[^>]+>/g;
		const htmlMatches = content.match(htmlTagPattern);
		if (htmlMatches && htmlMatches.length > 0) {
			errors.push('Markdown内容不应包含HTML标签，企业微信不支持HTML');
		}

		return errors;
	}

	/**
	 * 验证图片消息
	 */
	static validateImageMessage(message: Partial<ImageMessage>): ValidationResult {
		const errors: string[] = [];

		if (!message.image?.base64) {
			errors.push('图片base64编码不能为空');
		} else {
			// 验证base64格式
			if (!this.isValidBase64(message.image.base64)) {
				errors.push('无效的base64编码格式');
			}

			// 验证图片大小
			const sizeInBytes = (message.image.base64.length * 3) / 4;
			if (sizeInBytes > this.DEFAULT_CONFIG.maxImageSize) {
				errors.push(`图片大小不能超过${this.DEFAULT_CONFIG.maxImageSize / (1024 * 1024)}MB`);
			}
		}

		if (!message.image?.md5) {
			errors.push('图片MD5值不能为空');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证图文消息
	 */
	static validateNewsMessage(message: Partial<NewsMessage>): ValidationResult {
		const errors: string[] = [];

		if (!message.news?.articles || !Array.isArray(message.news.articles)) {
			errors.push('图文消息文章列表不能为空且必须是数组格式');
		} else {
			if (message.news.articles.length === 0) {
				errors.push('图文消息至少需要包含一篇文章');
			}

			if (message.news.articles.length > this.DEFAULT_CONFIG.maxArticleCount) {
				errors.push(`图文消息文章数量不能超过${this.DEFAULT_CONFIG.maxArticleCount}篇`);
			}

			// 验证每篇文章
			message.news.articles.forEach((article, index) => {
				const articleErrors = this.validateNewsArticle(article);
				if (!articleErrors.isValid) {
					errors.push(`第${index + 1}篇文章: ${articleErrors.errors.join(', ')}`);
				}
			});
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证文件消息
	 */
	static validateFileMessage(message: Partial<FileMessage>): ValidationResult {
		const errors: string[] = [];

		if (!message.file?.media_id) {
			errors.push('文件media_id不能为空');
		} else if (typeof message.file.media_id !== 'string') {
			errors.push('文件media_id必须是字符串格式');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证图文消息文章
	 */
	private static validateNewsArticle(article: NewsArticle): ValidationResult {
		const errors: string[] = [];

		if (!article.title) {
			errors.push('文章标题不能为空');
		} else if (article.title.length > this.DEFAULT_CONFIG.maxTitleLength) {
			errors.push(`文章标题不能超过${this.DEFAULT_CONFIG.maxTitleLength}个字符`);
		}

		if (article.description && article.description.length > this.DEFAULT_CONFIG.maxDescriptionLength) {
			errors.push(`文章描述不能超过${this.DEFAULT_CONFIG.maxDescriptionLength}个字符`);
		}

		if (!article.url) {
			errors.push('文章链接不能为空');
		} else if (!this.validateUrl(article.url)) {
			errors.push('文章链接格式无效');
		}

		if (article.picurl && !this.validateUrl(article.picurl)) {
			errors.push('文章图片链接格式无效');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证URL格式
	 */
	static validateUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
		} catch {
			return false;
		}
	}

	/**
	 * 验证base64格式
	 */
	private static isValidBase64(str: string): boolean {
		try {
			return btoa(atob(str)) === str;
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
		return createHash('md5').update(content).digest('hex');
	}

	/**
	 * 计算base64字符串的MD5哈希值
	 */
	static calculateBase64MD5(base64: string): string {
		const buffer = Buffer.from(base64, 'base64');
		return createHash('md5').update(buffer).digest('hex');
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

	/**
	 * 检查字符串是否为空或仅包含空白字符
	 */
	static isEmptyOrWhitespace(str: string | undefined | null): boolean {
		return !str || str.trim().length === 0;
	}

	/**
	 * 安全地解析JSON字符串
	 */
	static safeJsonParse<T>(jsonString: string, defaultValue: T): T {
		try {
			return JSON.parse(jsonString);
		} catch {
			return defaultValue;
		}
	}

	/**
	 * 截断字符串到指定长度
	 */
	static truncateString(str: string, maxLength: number, suffix = '...'): string {
		if (str.length <= maxLength) {
			return str;
		}
		return str.substring(0, maxLength - suffix.length) + suffix;
	}
}