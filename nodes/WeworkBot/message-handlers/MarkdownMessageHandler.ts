import type { MarkdownMessage, NodeInputData, ValidationResult, WeworkMessage } from '../types';
import { MessageType } from '../types';
import { MessageValidator, Utils } from '../utils';

import { BaseMessageHandler } from './BaseMessageHandler';

export class MarkdownMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): MarkdownMessage {
		let content = inputData.markdownContent || '';

		if (Utils.isEmptyOrWhitespace(content)) {
			throw new Error('Markdown消息内容不能为空');
		}

		if (content.length > this.config.maxContentLength) {
			content = Utils.truncateString(content, this.config.maxContentLength - 15, '\n\n...(内容已截断)');
		}

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

	private sanitizeMarkdown(content: string): string {
		content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
		content = content.replace(/<[^>]*?>/g, '');

		content = content.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (match, text, url) => {
			if (MessageValidator.validateUrl(url)) {
				return `[${text}](${url})`;
			}
			return text;
		});

		content = this.fixCodeBlocks(content);
		content = this.fixBoldSyntax(content);
		content = this.fixItalicSyntax(content);

		return content;
	}

	private fixBoldSyntax(content: string): string {
		const boldMatches = content.match(/\*\*/g);
		if (boldMatches && boldMatches.length % 2 !== 0) {
			content += '**';
		}
		return content;
	}

	private fixItalicSyntax(content: string): string {
		const contentWithoutBold = content.replace(/\*\*[^*]*\*\*/g, '');
		const italicMatches = contentWithoutBold.match(/(?<!\*)\*(?!\*)/g);

		if (italicMatches && italicMatches.length % 2 !== 0) {
			content += '*';
		}
		return content;
	}

	private fixCodeBlocks(content: string): string {
		const tripleBacktickMatches = content.match(/```/g);
		if (tripleBacktickMatches && tripleBacktickMatches.length % 2 !== 0) {
			content += '\n```';
		}

		const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
		const singleBacktickMatches = contentWithoutCodeBlocks.match(/`/g);
		if (singleBacktickMatches && singleBacktickMatches.length % 2 !== 0) {
			content += '`';
		}

		return content;
	}

	static createMarkdownMessage(content: string): MarkdownMessage {
		const handler = new MarkdownMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.MARKDOWN,
			markdownContent: content,
		});
	}

	static createTitledMarkdownMessage(title: string, content: string): MarkdownMessage {
		const markdownContent = `# ${title}\n\n${content}`;
		return this.createMarkdownMessage(markdownContent);
	}

	static createMarkdownWithLink(content: string, linkText: string, linkUrl: string): MarkdownMessage {
		const markdownContent = `${content}\n\n[${linkText}](${linkUrl})`;
		return this.createMarkdownMessage(markdownContent);
	}

	static createCodeBlockMessage(code: string, language?: string): MarkdownMessage {
		const lang = language || '';
		const markdownContent = `\`\`\`${lang}\n${code}\n\`\`\``;
		return this.createMarkdownMessage(markdownContent);
	}
}

