import type { FileMessage, NodeInputData, ValidationResult, WeworkMessage } from '../types';
import { MessageType } from '../types';
import { MessageValidator, Utils } from '../utils';

import { BaseMessageHandler } from './BaseMessageHandler';

export class FileMessageHandler extends BaseMessageHandler {
	private static readonly SUPPORTED_FILE_TYPES = [
		'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf',
		'txt', 'csv', 'zip', 'rar', '7z',
		'mp3', 'mp4', 'avi', 'mov', 'wmv',
		'jpg', 'jpeg', 'png', 'gif', 'bmp',
	];

	private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024;

	formatMessage(inputData: NodeInputData): FileMessage {
		const mediaId = inputData.fileMediaId;

		if (!mediaId || Utils.isEmptyOrWhitespace(mediaId)) {
			throw new Error('文件media_id不能为空');
		}

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

	private isValidMediaId(mediaId: string): boolean {
		const mediaIdPattern = /^[a-zA-Z0-9_-]{10,100}$/;
		return mediaIdPattern.test(mediaId);
	}

	static createFileMessage(mediaId: string): FileMessage {
		const handler = new FileMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.FILE,
			fileMediaId: mediaId,
		});
	}

	static isSupportedFileType(fileExtension: string): boolean {
		const ext = fileExtension.toLowerCase().replace('.', '');
		return this.SUPPORTED_FILE_TYPES.includes(ext);
	}

	static isValidFileSize(fileSizeInBytes: number): boolean {
		return fileSizeInBytes > 0 && fileSizeInBytes <= this.MAX_FILE_SIZE;
	}

	static getSupportedFileTypes(): string[] {
		return [...this.SUPPORTED_FILE_TYPES];
	}

	static getMaxFileSize(): number {
		return this.MAX_FILE_SIZE;
	}

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

	static getFileExtension(filename: string): string {
		const lastDotIndex = filename.lastIndexOf('.');
		if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
			return '';
		}
		return filename.substring(lastDotIndex + 1).toLowerCase();
	}

	static validateFileInfo(
		filename: string,
		fileSizeInBytes: number,
	): { valid: boolean; errors: string[]; warnings: string[] } {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!filename || Utils.isEmptyOrWhitespace(filename)) {
			errors.push('文件名不能为空');
		} else {
			const extension = this.getFileExtension(filename);
			if (!extension) {
				warnings.push('文件没有扩展名，可能影响识别');
			} else if (!this.isSupportedFileType(extension)) {
				errors.push(`不支持的文件类型：${extension}，支持的类型：${this.SUPPORTED_FILE_TYPES.join(', ')}`);
			}
		}

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

	static getFileUploadGuide(): { maxSize: string; supportedTypes: string[]; steps: string[] } {
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

