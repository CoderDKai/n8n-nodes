import {
	WeworkMessage,
	ValidationResult,
	MessageHandlerConfig,
	NodeInputData,
	TextMessage,
	MarkdownMessage,
	ImageMessage,
	NewsMessage,
	FileMessage,
	MessageType,
} from './types';
import { MessageValidator, Utils } from './utils';

/**
 * 消息处理器基础类
 */
export abstract class BaseMessageHandler {
	protected config: MessageHandlerConfig;

	constructor(config?: Partial<MessageHandlerConfig>) {
		this.config = {
			maxContentLength: 4096,
			maxImageSize: 2 * 1024 * 1024, // 2MB
			supportedImageTypes: ['jpg', 'jpeg', 'png'],
			maxArticleCount: 8,
			maxTitleLength: 128,
			maxDescriptionLength: 512,
			...config,
		};
	}

	/**
	 * 格式化消息
	 */
	abstract formatMessage(inputData: NodeInputData): WeworkMessage;

	/**
	 * 验证消息
	 */
	abstract validateMessage(message: WeworkMessage): ValidationResult;

	/**
	 * 处理消息（格式化 + 验证）
	 */
	processMessage(inputData: NodeInputData): { message: WeworkMessage; validation: ValidationResult } {
		const message = this.formatMessage(inputData);
		const validation = this.validateMessage(message);
		
		return { message, validation };
	}
}

/**
 * 文本消息处理器
 */
export class TextMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): TextMessage {
		// 处理文本内容，确保不为空
		let content = inputData.content || '';
		
		// 如果内容为空，抛出错误
		if (Utils.isEmptyOrWhitespace(content)) {
			throw new Error('文本消息内容不能为空');
		}

		// 检查内容长度，如果超过限制则截断
		if (content.length > this.config.maxContentLength) {
			content = Utils.truncateString(content, this.config.maxContentLength - 10, '...(已截断)');
		}

		const message: TextMessage = {
			msgtype: MessageType.TEXT,
			text: {
				content,
			},
		};

		// 处理@提及用户功能
		if (inputData.mentionedUsers && inputData.mentionedUsers.length > 0) {
			// 过滤掉空值和重复值
			const uniqueUsers = [...new Set(inputData.mentionedUsers.filter(user => !Utils.isEmptyOrWhitespace(user)))];
			if (uniqueUsers.length > 0) {
				message.text.mentioned_list = uniqueUsers;
			}
		}

		// 处理@提及手机号功能
		if (inputData.mentionedMobiles && inputData.mentionedMobiles.length > 0) {
			// 过滤掉空值、重复值和无效手机号
			const uniqueMobiles = [...new Set(inputData.mentionedMobiles
				.filter(mobile => !Utils.isEmptyOrWhitespace(mobile))
				.filter(mobile => /^1[3-9]\d{9}$/.test(mobile))
			)];
			if (uniqueMobiles.length > 0) {
				message.text.mentioned_mobile_list = uniqueMobiles;
			}
		}

		return message;
	}

	validateMessage(message: WeworkMessage): ValidationResult {
		return MessageValidator.validateTextMessage(message as TextMessage);
	}

	/**
	 * 创建@所有人的文本消息
	 */
	static createMentionAllMessage(content: string): TextMessage {
		return {
			msgtype: MessageType.TEXT,
			text: {
				content,
				mentioned_list: ['@all'],
			},
		};
	}

	/**
	 * 创建带@提及用户的文本消息
	 */
	static createMentionUsersMessage(content: string, users: string[]): TextMessage {
		const handler = new TextMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.TEXT,
			content,
			mentionedUsers: users,
		});
	}

	/**
	 * 创建带@提及手机号的文本消息
	 */
	static createMentionMobilesMessage(content: string, mobiles: string[]): TextMessage {
		const handler = new TextMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.TEXT,
			content,
			mentionedMobiles: mobiles,
		});
	}
}

/**
 * Markdown消息处理器
 */
export class MarkdownMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): MarkdownMessage {
		// 处理Markdown内容，确保不为空
		let content = inputData.markdownContent || '';
		
		// 如果内容为空，抛出错误
		if (Utils.isEmptyOrWhitespace(content)) {
			throw new Error('Markdown消息内容不能为空');
		}

		// 检查内容长度，如果超过限制则截断
		if (content.length > this.config.maxContentLength) {
			content = Utils.truncateString(content, this.config.maxContentLength - 15, '\n\n...(内容已截断)');
		}

		// 基础的Markdown语法验证和修复
		content = this.sanitizeMarkdown(content);

		return {
			msgtype: MessageType.MARKDOWN,
			markdown: {
				content,
			},
		};
	}

	validateMessage(message: WeworkMessage): ValidationResult {
		return MessageValidator.validateMarkdownMessage(message as MarkdownMessage);
	}

	/**
	 * 清理和修复Markdown语法
	 */
	private sanitizeMarkdown(content: string): string {
		// 移除可能导致问题的HTML标签（企业微信不支持HTML）
		// 先移除script标签及其内容
		content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
		// 再移除其他HTML标签
		content = content.replace(/<[^>]*?>/g, '');

		// 确保链接格式正确
		content = content.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (match, text, url) => {
			// 验证URL格式
			if (MessageValidator.validateUrl(url)) {
				return `[${text}](${url})`;
			} else {
				// 如果URL无效，只保留文本
				return text;
			}
		});

		// 修复不完整的代码块语法（先处理代码块，避免影响其他语法）
		content = this.fixCodeBlocks(content);

		// 修复不完整的加粗语法（先处理加粗，再处理斜体）
		content = this.fixBoldSyntax(content);
		
		// 修复不完整的斜体语法
		content = this.fixItalicSyntax(content);

		return content;
	}

	/**
	 * 修复加粗语法
	 */
	private fixBoldSyntax(content: string): string {
		const boldMatches = content.match(/\*\*/g);
		if (boldMatches && boldMatches.length % 2 !== 0) {
			// 如果加粗标记数量为奇数，在末尾添加一个标记
			content += '**';
		}
		return content;
	}

	/**
	 * 修复斜体语法
	 */
	private fixItalicSyntax(content: string): string {
		// 先移除加粗部分，避免干扰斜体计算
		const contentWithoutBold = content.replace(/\*\*[^*]*\*\*/g, '');
		const italicMatches = contentWithoutBold.match(/(?<!\*)\*(?!\*)/g);
		
		if (italicMatches && italicMatches.length % 2 !== 0) {
			// 如果斜体标记数量为奇数，在末尾添加一个标记
			content += '*';
		}
		return content;
	}

	/**
	 * 修复代码块语法
	 */
	private fixCodeBlocks(content: string): string {
		// 修复三个反引号的代码块
		const tripleBacktickMatches = content.match(/```/g);
		if (tripleBacktickMatches && tripleBacktickMatches.length % 2 !== 0) {
			content += '\n```';
		}

		// 修复单个反引号的内联代码（排除代码块中的反引号）
		const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
		const singleBacktickMatches = contentWithoutCodeBlocks.match(/`/g);
		if (singleBacktickMatches && singleBacktickMatches.length % 2 !== 0) {
			content += '`';
		}

		return content;
	}

	/**
	 * 创建标准的Markdown消息
	 */
	static createMarkdownMessage(content: string): MarkdownMessage {
		const handler = new MarkdownMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.MARKDOWN,
			markdownContent: content,
		});
	}

	/**
	 * 创建带标题的Markdown消息
	 */
	static createTitledMarkdownMessage(title: string, content: string): MarkdownMessage {
		const markdownContent = `# ${title}\n\n${content}`;
		return this.createMarkdownMessage(markdownContent);
	}

	/**
	 * 创建带链接的Markdown消息
	 */
	static createMarkdownWithLink(content: string, linkText: string, linkUrl: string): MarkdownMessage {
		const markdownContent = `${content}\n\n[${linkText}](${linkUrl})`;
		return this.createMarkdownMessage(markdownContent);
	}

	/**
	 * 创建代码块Markdown消息
	 */
	static createCodeBlockMessage(code: string, language?: string): MarkdownMessage {
		const lang = language || '';
		const markdownContent = `\`\`\`${lang}\n${code}\n\`\`\``;
		return this.createMarkdownMessage(markdownContent);
	}
}

/**
 * 图片消息处理器
 */
export class ImageMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): ImageMessage {
		let base64 = inputData.imageBase64 || '';
		
		// 如果提供的是URL，需要在实际实现中下载并转换为base64
		// 这里先使用占位符
		if (inputData.imageUrl && !base64) {
			// TODO: 在后续任务中实现URL到base64的转换
			throw new Error('URL到base64转换功能将在后续任务中实现');
		}

		// 验证是否提供了图片数据
		if (Utils.isEmptyOrWhitespace(base64)) {
			throw new Error('图片base64编码不能为空');
		}

		// 移除base64前缀（如果存在）
		base64 = this.cleanBase64String(base64);

		// 验证base64格式
		if (!this.isValidBase64(base64)) {
			throw new Error('无效的base64编码格式');
		}

		// 验证图片大小
		const sizeInBytes = this.calculateBase64Size(base64);
		if (sizeInBytes > this.config.maxImageSize) {
			throw new Error(`图片大小不能超过${this.config.maxImageSize / (1024 * 1024)}MB，当前大小：${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB`);
		}

		// 验证图片格式
		const imageType = this.detectImageType(base64);
		if (!this.config.supportedImageTypes.includes(imageType)) {
			throw new Error(`不支持的图片格式：${imageType}，支持的格式：${this.config.supportedImageTypes.join(', ')}`);
		}

		// 计算MD5
		const md5 = Utils.calculateBase64MD5(base64);

		return {
			msgtype: MessageType.IMAGE,
			image: {
				base64,
				md5,
			},
		};
	}

	validateMessage(message: WeworkMessage): ValidationResult {
		return MessageValidator.validateImageMessage(message as ImageMessage);
	}

	/**
	 * 清理base64字符串
	 */
	private cleanBase64String(base64: string): string {
		// 移除data URL前缀
		base64 = base64.replace(/^data:image\/[a-z]+;base64,/i, '');
		
		// 移除空白字符
		base64 = base64.replace(/\s/g, '');
		
		return base64;
	}

	/**
	 * 验证base64格式
	 */
	private isValidBase64(str: string): boolean {
		try {
			// 检查字符是否都是有效的base64字符
			if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
				return false;
			}
			
			// 尝试解码
			const decoded = Buffer.from(str, 'base64');
			const reencoded = decoded.toString('base64');
			
			// 移除可能的填充差异
			return str.replace(/=+$/, '') === reencoded.replace(/=+$/, '');
		} catch {
			return false;
		}
	}

	/**
	 * 计算base64编码的实际大小
	 */
	private calculateBase64Size(base64: string): number {
		// base64编码后的大小约为原文件大小的4/3
		// 但需要考虑填充字符
		const paddingCount = (base64.match(/=/g) || []).length;
		return (base64.length * 3) / 4 - paddingCount;
	}

	/**
	 * 检测图片类型
	 */
	private detectImageType(base64: string): string {
		try {
			const buffer = Buffer.from(base64, 'base64');
			
			// 检查文件头来确定图片类型
			if (buffer.length < 4) {
				return 'unknown';
			}

			// PNG: 89 50 4E 47
			if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
				return 'png';
			}

			// JPEG: FF D8 FF
			if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
				return 'jpg';
			}

			// GIF: 47 49 46 38
			if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
				return 'gif';
			}

			return 'unknown';
		} catch {
			return 'unknown';
		}
	}

	/**
	 * 创建图片消息
	 */
	static createImageMessage(base64: string): ImageMessage {
		const handler = new ImageMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.IMAGE,
			imageBase64: base64,
		});
	}

	/**
	 * 从文件路径创建图片消息（需要文件系统支持）
	 */
	static createImageMessageFromFile(filePath: string): ImageMessage {
		// 这个方法在实际环境中需要读取文件
		// 这里提供接口定义，实际实现将在后续任务中完成
		throw new Error('从文件创建图片消息功能将在后续任务中实现');
	}

	/**
	 * 验证图片是否符合企业微信要求
	 */
	static validateImageRequirements(base64: string): { valid: boolean; errors: string[] } {
		const handler = new ImageMessageHandler();
		const errors: string[] = [];

		try {
			// 清理base64字符串
			const cleanBase64 = handler.cleanBase64String(base64);

			// 验证格式
			if (!handler.isValidBase64(cleanBase64)) {
				errors.push('无效的base64编码格式');
			}

			// 验证大小
			const size = handler.calculateBase64Size(cleanBase64);
			if (size > handler.config.maxImageSize) {
				errors.push(`图片大小超过限制：${(size / (1024 * 1024)).toFixed(2)}MB > ${handler.config.maxImageSize / (1024 * 1024)}MB`);
			}

			// 验证类型
			const type = handler.detectImageType(cleanBase64);
			if (!handler.config.supportedImageTypes.includes(type)) {
				errors.push(`不支持的图片格式：${type}`);
			}

		} catch (error) {
			errors.push(`图片验证失败：${error instanceof Error ? error.message : '未知错误'}`);
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}

/**
 * 图文消息处理器
 */
export class NewsMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): NewsMessage {
		const articles = inputData.newsArticles || [];

		// 验证是否提供了文章
		if (!articles || articles.length === 0) {
			throw new Error('图文消息至少需要包含一篇文章');
		}

		// 验证文章数量限制
		if (articles.length > this.config.maxArticleCount) {
			throw new Error(`图文消息文章数量不能超过${this.config.maxArticleCount}篇，当前数量：${articles.length}`);
		}

		// 处理和验证每篇文章
		const processedArticles = articles.map((article, index) => {
			return this.processArticle(article, index);
		});

		return {
			msgtype: MessageType.NEWS,
			news: {
				articles: processedArticles,
			},
		};
	}

	validateMessage(message: WeworkMessage): ValidationResult {
		return MessageValidator.validateNewsMessage(message as NewsMessage);
	}

	/**
	 * 处理单篇文章
	 */
	private processArticle(article: any, index: number): any {
		const processedArticle: any = {};

		// 处理标题
		if (!article.title || Utils.isEmptyOrWhitespace(article.title)) {
			throw new Error(`第${index + 1}篇文章的标题不能为空`);
		}

		let title = article.title.trim();
		if (title.length > this.config.maxTitleLength) {
			title = Utils.truncateString(title, this.config.maxTitleLength, '...');
		}
		processedArticle.title = title;

		// 处理描述（可选）
		if (article.description) {
			let description = article.description.trim();
			if (description.length > this.config.maxDescriptionLength) {
				description = Utils.truncateString(description, this.config.maxDescriptionLength, '...');
			}
			processedArticle.description = description;
		}

		// 处理链接URL
		if (!article.url || Utils.isEmptyOrWhitespace(article.url)) {
			throw new Error(`第${index + 1}篇文章的链接URL不能为空`);
		}

		const url = article.url.trim();
		if (!MessageValidator.validateUrl(url)) {
			throw new Error(`第${index + 1}篇文章的链接URL格式无效：${url}`);
		}
		processedArticle.url = url;

		// 处理图片URL（可选）
		if (article.picurl) {
			const picurl = article.picurl.trim();
			if (!Utils.isEmptyOrWhitespace(picurl)) {
				if (!MessageValidator.validateUrl(picurl)) {
					throw new Error(`第${index + 1}篇文章的图片URL格式无效：${picurl}`);
				}
				processedArticle.picurl = picurl;
			}
		}

		return processedArticle;
	}

	/**
	 * 创建单篇文章的图文消息
	 */
	static createSingleArticleMessage(title: string, url: string, description?: string, picurl?: string): NewsMessage {
		const handler = new NewsMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.NEWS,
			newsArticles: [{
				title,
				url,
				description,
				picurl,
			}],
		});
	}

	/**
	 * 创建多篇文章的图文消息
	 */
	static createMultipleArticlesMessage(articles: Array<{
		title: string;
		url: string;
		description?: string;
		picurl?: string;
	}>): NewsMessage {
		const handler = new NewsMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.NEWS,
			newsArticles: articles,
		});
	}

	/**
	 * 创建简单的链接分享消息
	 */
	static createLinkShareMessage(title: string, url: string, description?: string): NewsMessage {
		return this.createSingleArticleMessage(title, url, description);
	}

	/**
	 * 创建带图片的文章消息
	 */
	static createArticleWithImageMessage(
		title: string,
		url: string,
		imageUrl: string,
		description?: string
	): NewsMessage {
		return this.createSingleArticleMessage(title, url, description, imageUrl);
	}

	/**
	 * 验证文章数组
	 */
	static validateArticles(articles: any[]): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!Array.isArray(articles)) {
			errors.push('文章列表必须是数组格式');
			return { valid: false, errors };
		}

		if (articles.length === 0) {
			errors.push('图文消息至少需要包含一篇文章');
		}

		if (articles.length > 8) {
			errors.push(`图文消息文章数量不能超过8篇，当前数量：${articles.length}`);
		}

		articles.forEach((article, index) => {
			const articleErrors = this.validateSingleArticle(article, index);
			errors.push(...articleErrors);
		});

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 验证单篇文章
	 */
	private static validateSingleArticle(article: any, index: number): string[] {
		const errors: string[] = [];

		if (!article || typeof article !== 'object') {
			errors.push(`第${index + 1}篇文章必须是对象格式`);
			return errors;
		}

		// 验证标题
		if (!article.title || typeof article.title !== 'string' || article.title.trim().length === 0) {
			errors.push(`第${index + 1}篇文章的标题不能为空`);
		} else if (article.title.length > 128) {
			errors.push(`第${index + 1}篇文章的标题不能超过128个字符`);
		}

		// 验证描述
		if (article.description && typeof article.description === 'string' && article.description.length > 512) {
			errors.push(`第${index + 1}篇文章的描述不能超过512个字符`);
		}

		// 验证URL
		if (!article.url || typeof article.url !== 'string' || article.url.trim().length === 0) {
			errors.push(`第${index + 1}篇文章的链接URL不能为空`);
		} else if (!MessageValidator.validateUrl(article.url)) {
			errors.push(`第${index + 1}篇文章的链接URL格式无效`);
		}

		// 验证图片URL
		if (article.picurl && typeof article.picurl === 'string' && article.picurl.trim().length > 0) {
			if (!MessageValidator.validateUrl(article.picurl)) {
				errors.push(`第${index + 1}篇文章的图片URL格式无效`);
			}
		}

		return errors;
	}
}

/**
 * 文件消息处理器
 */
export class FileMessageHandler extends BaseMessageHandler {
	// 支持的文件类型（企业微信支持的文件格式）
	private static readonly SUPPORTED_FILE_TYPES = [
		'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf',
		'txt', 'csv', 'zip', 'rar', '7z',
		'mp3', 'mp4', 'avi', 'mov', 'wmv',
		'jpg', 'jpeg', 'png', 'gif', 'bmp',
	];

	// 最大文件大小（20MB）
	private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024;

	formatMessage(inputData: NodeInputData): FileMessage {
		const mediaId = inputData.fileMediaId;

		// 验证是否提供了media_id
		if (!mediaId || Utils.isEmptyOrWhitespace(mediaId)) {
			throw new Error('文件media_id不能为空');
		}

		// 验证media_id格式
		const cleanMediaId = mediaId.trim();
		if (!this.isValidMediaId(cleanMediaId)) {
			throw new Error('无效的文件media_id格式');
		}

		return {
			msgtype: MessageType.FILE,
			file: {
				media_id: cleanMediaId,
			},
		};
	}

	validateMessage(message: WeworkMessage): ValidationResult {
		return MessageValidator.validateFileMessage(message as FileMessage);
	}

	/**
	 * 验证media_id格式
	 */
	private isValidMediaId(mediaId: string): boolean {
		// media_id通常是企业微信返回的字符串，包含字母、数字、下划线、连字符
		// 长度通常在10-100个字符之间
		const mediaIdPattern = /^[a-zA-Z0-9_-]{10,100}$/;
		return mediaIdPattern.test(mediaId);
	}

	/**
	 * 创建文件消息
	 */
	static createFileMessage(mediaId: string): FileMessage {
		const handler = new FileMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.FILE,
			fileMediaId: mediaId,
		});
	}

	/**
	 * 验证文件类型是否支持
	 */
	static isSupportedFileType(fileExtension: string): boolean {
		const ext = fileExtension.toLowerCase().replace('.', '');
		return this.SUPPORTED_FILE_TYPES.includes(ext);
	}

	/**
	 * 验证文件大小是否符合要求
	 */
	static isValidFileSize(fileSizeInBytes: number): boolean {
		return fileSizeInBytes > 0 && fileSizeInBytes <= this.MAX_FILE_SIZE;
	}

	/**
	 * 获取支持的文件类型列表
	 */
	static getSupportedFileTypes(): string[] {
		return [...this.SUPPORTED_FILE_TYPES];
	}

	/**
	 * 获取最大文件大小（字节）
	 */
	static getMaxFileSize(): number {
		return this.MAX_FILE_SIZE;
	}

	/**
	 * 格式化文件大小为可读字符串
	 */
	static formatFileSize(sizeInBytes: number): string {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = sizeInBytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`;
	}

	/**
	 * 从文件名提取扩展名
	 */
	static getFileExtension(filename: string): string {
		const lastDotIndex = filename.lastIndexOf('.');
		if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
			return '';
		}
		return filename.substring(lastDotIndex + 1).toLowerCase();
	}

	/**
	 * 验证文件信息
	 */
	static validateFileInfo(filename: string, fileSizeInBytes: number): {
		valid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 验证文件名
		if (!filename || Utils.isEmptyOrWhitespace(filename)) {
			errors.push('文件名不能为空');
		} else {
			// 验证文件扩展名
			const extension = this.getFileExtension(filename);
			if (!extension) {
				warnings.push('文件没有扩展名，可能影响识别');
			} else if (!this.isSupportedFileType(extension)) {
				errors.push(`不支持的文件类型：${extension}，支持的类型：${this.SUPPORTED_FILE_TYPES.join(', ')}`);
			}
		}

		// 验证文件大小
		if (fileSizeInBytes <= 0) {
			errors.push('文件大小必须大于0');
		} else if (!this.isValidFileSize(fileSizeInBytes)) {
			errors.push(`文件大小不能超过${this.formatFileSize(this.MAX_FILE_SIZE)}，当前大小：${this.formatFileSize(fileSizeInBytes)}`);
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * 验证media_id格式
	 */
	static validateMediaId(mediaId: string): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!mediaId || Utils.isEmptyOrWhitespace(mediaId)) {
			errors.push('media_id不能为空');
		} else {
			const cleanMediaId = mediaId.trim();
			const handler = new FileMessageHandler();
			
			if (!handler.isValidMediaId(cleanMediaId)) {
				errors.push('无效的media_id格式，应为10-100位的字母、数字、下划线或连字符组合');
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 生成文件上传指南
	 */
	static getFileUploadGuide(): {
		maxSize: string;
		supportedTypes: string[];
		steps: string[];
	} {
		return {
			maxSize: this.formatFileSize(this.MAX_FILE_SIZE),
			supportedTypes: this.getSupportedFileTypes(),
			steps: [
				'1. 确保文件大小不超过20MB',
				'2. 确保文件类型在支持列表中',
				'3. 先通过企业微信API上传文件获取media_id',
				'4. 使用获取的media_id发送文件消息',
				'5. media_id有效期为3天，过期需重新上传',
			],
		};
	}
}

/**
 * 消息处理器工厂类
 */
export class MessageHandlerFactory {
	private static handlers: Map<MessageType, BaseMessageHandler> = new Map();

	/**
	 * 获取消息处理器
	 */
	static getHandler(messageType: MessageType, config?: Partial<MessageHandlerConfig>): BaseMessageHandler {
		// 如果已存在且配置相同，返回缓存的处理器
		if (this.handlers.has(messageType) && !config) {
			return this.handlers.get(messageType)!;
		}

		let handler: BaseMessageHandler;

		switch (messageType) {
			case MessageType.TEXT:
				handler = new TextMessageHandler(config);
				break;
			case MessageType.MARKDOWN:
				handler = new MarkdownMessageHandler(config);
				break;
			case MessageType.IMAGE:
				handler = new ImageMessageHandler(config);
				break;
			case MessageType.NEWS:
				handler = new NewsMessageHandler(config);
				break;
			case MessageType.FILE:
				handler = new FileMessageHandler(config);
				break;
			default:
				throw new Error(`不支持的消息类型: ${messageType}`);
		}

		// 缓存处理器（仅在没有自定义配置时）
		if (!config) {
			this.handlers.set(messageType, handler);
		}

		return handler;
	}

	/**
	 * 清除缓存的处理器
	 */
	static clearCache(): void {
		this.handlers.clear();
	}
}