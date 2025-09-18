/**
 * 企业微信群机器人消息类型定义
 */

// 基础消息接口
export interface BaseMessage {
	msgtype: string;
}

// 文本消息接口
export interface TextMessage extends BaseMessage {
	msgtype: 'text';
	text: {
		content: string;
		mentioned_list?: string[];
		mentioned_mobile_list?: string[];
	};
}

// Markdown消息接口
export interface MarkdownMessage extends BaseMessage {
	msgtype: 'markdown';
	markdown: {
		content: string;
	};
}

// 图片消息接口
export interface ImageMessage extends BaseMessage {
	msgtype: 'image';
	image: {
		base64: string;
		md5: string;
	};
}

// 图文消息接口
export interface NewsMessage extends BaseMessage {
	msgtype: 'news';
	news: {
		articles: NewsArticle[];
	};
}

// 图文消息文章接口
export interface NewsArticle {
	title: string;
	description?: string;
	url: string;
	picurl?: string;
}

// 文件消息接口
export interface FileMessage extends BaseMessage {
	msgtype: 'file';
	file: {
		media_id: string;
	};
}

// 联合消息类型
export type WeworkMessage = TextMessage | MarkdownMessage | ImageMessage | NewsMessage | FileMessage;

// 消息类型枚举
export enum MessageType {
	TEXT = 'text',
	MARKDOWN = 'markdown',
	IMAGE = 'image',
	NEWS = 'news',
	FILE = 'file',
}

// 节点输入数据接口
export interface NodeInputData {
	messageType: MessageType;
	content?: string;
	markdownContent?: string;
	imageBase64?: string;
	imageUrl?: string;
	newsArticles?: NewsArticle[];
	fileMediaId?: string;
	mentionedUsers?: string[];
	mentionedMobiles?: string[];
}

// 节点输出数据接口
export interface NodeOutputData {
	success: boolean;
	messageId?: string;
	errorCode?: number;
	errorMessage?: string;
	timestamp: number;
	messageType: string;
}

// 企业微信API响应接口
export interface WeworkApiResponse {
	errcode: number;
	errmsg: string;
}

// 企业微信API错误类
export class WeworkApiError extends Error {
	public code: number;
	public response?: any;

	constructor(code: number, message: string, response?: any) {
		super(message);
		this.name = 'WeworkApiError';
		this.code = code;
		this.response = response;
	}
}

// 消息验证结果接口
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

// 消息处理器配置接口
export interface MessageHandlerConfig {
	maxContentLength: number;
	maxImageSize: number;
	supportedImageTypes: string[];
	maxArticleCount: number;
	maxTitleLength: number;
	maxDescriptionLength: number;
}

// API客户端配置接口
export interface ApiClientConfig {
	timeout: number;
	maxRetries: number;
	retryDelay: number;
	retryBackoffFactor: number;
	enableLogging: boolean;
}