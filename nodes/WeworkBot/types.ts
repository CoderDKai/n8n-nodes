// 企业微信群机器人消息类型定义

export interface BaseMessage {
	msgtype: string;
}

export interface TextMessage extends BaseMessage {
	msgtype: 'text';
	text: {
		content: string;
		mentioned_list?: string[];
		mentioned_mobile_list?: string[];
	};
}

export interface MarkdownMessage extends BaseMessage {
	msgtype: 'markdown';
	markdown: {
		content: string;
	};
}

export interface ImageMessage extends BaseMessage {
	msgtype: 'image';
	image: {
		base64: string;
		md5: string;
	};
}

export interface NewsArticle {
	title: string;
	description?: string;
	url: string;
	picurl?: string;
}

export interface NewsMessage extends BaseMessage {
	msgtype: 'news';
	news: {
		articles: NewsArticle[];
	};
}

export interface FileMessage extends BaseMessage {
	msgtype: 'file';
	file: {
		media_id: string;
	};
}

export type WeworkMessage = TextMessage | MarkdownMessage | ImageMessage | NewsMessage | FileMessage;

// 节点输入数据接口
export interface NodeInputData {
	messageType: 'text' | 'markdown' | 'image' | 'news' | 'file';
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
	code: number;
	response?: any;

	constructor(code: number, message: string, response?: any) {
		super(message);
		this.name = 'WeworkApiError';
		this.code = code;
		this.response = response;
	}
}