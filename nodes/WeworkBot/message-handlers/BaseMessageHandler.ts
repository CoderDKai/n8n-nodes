import type { MessageHandlerConfig, NodeInputData, ValidationResult, WeworkMessage } from '../types';

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

	abstract formatMessage(inputData: NodeInputData): WeworkMessage;

	abstract validateMessage(message: WeworkMessage): ValidationResult;

	processMessage(inputData: NodeInputData): { message: WeworkMessage; validation: ValidationResult } {
		const message = this.formatMessage(inputData);
		const validation = this.validateMessage(message);
		return { message, validation };
	}
}

