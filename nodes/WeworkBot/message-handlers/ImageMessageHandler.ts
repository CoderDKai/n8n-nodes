import type { ImageMessage, NodeInputData, ValidationResult, WeworkMessage } from '../types';
import { MessageType } from '../types';
import { MessageValidator, Utils } from '../utils';

import { BaseMessageHandler } from './BaseMessageHandler';

export class ImageMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): ImageMessage {
		let base64 = inputData.imageBase64 || '';

		if (inputData.imageUrl && !base64) {
			throw new Error('URL到base64转换功能将在后续任务中实现');
		}

		if (Utils.isEmptyOrWhitespace(base64)) {
			throw new Error('图片base64编码不能为空');
		}

		base64 = this.cleanBase64String(base64);

		if (!this.isValidBase64(base64)) {
			throw new Error('无效的base64编码格式');
		}

		const sizeInBytes = this.calculateBase64Size(base64);
		if (sizeInBytes > this.config.maxImageSize) {
			throw new Error(`图片大小不能超过${this.config.maxImageSize / (1024 * 1024)}MB，当前大小：${(sizeInBytes / (1024 * 1024)).toFixed(2)}MB`);
		}

		const imageType = this.detectImageType(base64);
		if (!this.config.supportedImageTypes.includes(imageType)) {
			throw new Error(`不支持的图片格式：${imageType}，支持的格式：${this.config.supportedImageTypes.join(', ')}`);
		}

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

	private cleanBase64String(base64: string): string {
		base64 = base64.replace(/^data:image\/[a-z]+;base64,/i, '');
		base64 = base64.replace(/\s/g, '');
		return base64;
	}

	private isValidBase64(str: string): boolean {
		try {
			if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
				return false;
			}

			const decoded = Buffer.from(str, 'base64');
			const reencoded = decoded.toString('base64');
			return str.replace(/=+$/, '') === reencoded.replace(/=+$/, '');
		} catch {
			return false;
		}
	}

	private calculateBase64Size(base64: string): number {
		const paddingCount = (base64.match(/=/g) || []).length;
		return (base64.length * 3) / 4 - paddingCount;
	}

	private detectImageType(base64: string): string {
		try {
			const buffer = Buffer.from(base64, 'base64');

			if (buffer.length < 4) {
				return 'unknown';
			}

			if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
				return 'png';
			}

			if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
				return 'jpg';
			}

			if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
				return 'gif';
			}

			return 'unknown';
		} catch {
			return 'unknown';
		}
	}

	static createImageMessage(base64: string): ImageMessage {
		const handler = new ImageMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.IMAGE,
			imageBase64: base64,
		});
	}

	static createImageMessageFromFile(_filePath: string): ImageMessage {
		throw new Error('从文件创建图片消息功能将在后续任务中实现');
	}

	static validateImageRequirements(base64: string): { valid: boolean; errors: string[] } {
		const handler = new ImageMessageHandler();
		const errors: string[] = [];

		try {
			const cleanBase64 = handler.cleanBase64String(base64);

			if (!handler.isValidBase64(cleanBase64)) {
				errors.push('无效的base64编码格式');
			}

			const size = handler.calculateBase64Size(cleanBase64);
			if (size > handler.config.maxImageSize) {
				errors.push(`图片大小超过限制：${(size / (1024 * 1024)).toFixed(2)}MB > ${handler.config.maxImageSize / (1024 * 1024)}MB`);
			}

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
