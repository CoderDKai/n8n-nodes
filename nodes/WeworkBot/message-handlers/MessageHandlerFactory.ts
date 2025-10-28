import type { MessageHandlerConfig } from '../types';
import { MessageType } from '../types';

import { BaseMessageHandler } from './BaseMessageHandler';
import { FileMessageHandler } from './FileMessageHandler';
import { ImageMessageHandler } from './ImageMessageHandler';
import { MarkdownMessageHandler } from './MarkdownMessageHandler';
import { NewsMessageHandler } from './NewsMessageHandler';
import { TextMessageHandler } from './TextMessageHandler';

export class MessageHandlerFactory {
	private static handlers: Map<MessageType, BaseMessageHandler> = new Map();

	static getHandler(messageType: MessageType, config?: Partial<MessageHandlerConfig>): BaseMessageHandler {
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

		if (!config) {
			this.handlers.set(messageType, handler);
		}

		return handler;
	}

	static clearCache(): void {
		this.handlers.clear();
	}
}

