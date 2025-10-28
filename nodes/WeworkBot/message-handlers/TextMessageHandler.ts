import type { NodeInputData, TextMessage, ValidationResult, WeworkMessage } from '../types';
import { MessageType } from '../types';
import { MessageValidator, Utils } from '../utils';

import { BaseMessageHandler } from './BaseMessageHandler';

export class TextMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): TextMessage {
		let content = inputData.content || '';

		if (Utils.isEmptyOrWhitespace(content)) {
			throw new Error('文本消息内容不能为空');
		}

		if (content.length > this.config.maxContentLength) {
			content = Utils.truncateString(content, this.config.maxContentLength - 10, '...(已截断)');
		}

		const message: TextMessage = {
			msgtype: MessageType.TEXT,
			text: {
				content,
			},
		};

		if (inputData.mentionedUsers && inputData.mentionedUsers.length > 0) {
			const filteredUsers = inputData.mentionedUsers.filter(user => !Utils.isEmptyOrWhitespace(user));
			const uniqueUsers = Array.from(new Set(filteredUsers));
			if (uniqueUsers.length > 0) {
				message.text.mentioned_list = uniqueUsers;
			}
		}

		if (inputData.mentionedMobiles && inputData.mentionedMobiles.length > 0) {
			const filteredMobiles = inputData.mentionedMobiles
				.filter(mobile => !Utils.isEmptyOrWhitespace(mobile))
				.filter(mobile => /^1[3-9]\d{9}$/.test(mobile));
			const uniqueMobiles = Array.from(new Set(filteredMobiles));
			if (uniqueMobiles.length > 0) {
				message.text.mentioned_mobile_list = uniqueMobiles;
			}
		}

		return message;
	}

	validateMessage(message: WeworkMessage): ValidationResult {
		return MessageValidator.validateTextMessage(message as TextMessage);
	}

	static createMentionAllMessage(content: string): TextMessage {
		return {
			msgtype: MessageType.TEXT,
			text: {
				content,
				mentioned_list: ['@all'],
			},
		};
	}

	static createMentionUsersMessage(content: string, users: string[]): TextMessage {
		const handler = new TextMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.TEXT,
			content,
			mentionedUsers: users,
		});
	}

	static createMentionMobilesMessage(content: string, mobiles: string[]): TextMessage {
		const handler = new TextMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.TEXT,
			content,
			mentionedMobiles: mobiles,
		});
	}
}

