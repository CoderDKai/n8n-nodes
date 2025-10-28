import type {
	NewsMessage,
	NodeInputData,
	ValidationResult,
	WeworkMessage,
} from '../types';
import { MessageType } from '../types';
import { MessageValidator, Utils } from '../utils';

import { BaseMessageHandler } from './BaseMessageHandler';

export class NewsMessageHandler extends BaseMessageHandler {
	formatMessage(inputData: NodeInputData): NewsMessage {
		const articles = inputData.newsArticles || [];

		if (!articles || articles.length === 0) {
			throw new Error('图文消息至少需要包含一篇文章');
		}

		if (articles.length > this.config.maxArticleCount) {
			throw new Error(`图文消息文章数量不能超过${this.config.maxArticleCount}篇，当前数量：${articles.length}`);
		}

		const processedArticles = articles.map((article, index) => this.processArticle(article, index));

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

	private processArticle(article: any, index: number): any {
		const processedArticle: any = {};

		if (!article.title || Utils.isEmptyOrWhitespace(article.title)) {
			throw new Error(`第${index + 1}篇文章的标题不能为空`);
		}

		let title = article.title.trim();
		if (title.length > this.config.maxTitleLength) {
			title = Utils.truncateString(title, this.config.maxTitleLength, '...');
		}
		processedArticle.title = title;

		if (article.description) {
			let description = article.description.trim();
			if (description.length > this.config.maxDescriptionLength) {
				description = Utils.truncateString(
					description,
					this.config.maxDescriptionLength,
					'...'
				);
			}
			processedArticle.description = description;
		}

		if (!article.url || Utils.isEmptyOrWhitespace(article.url)) {
			throw new Error(`第${index + 1}篇文章的链接URL不能为空`);
		}

		const url = article.url.trim();
		if (!MessageValidator.validateUrl(url)) {
			throw new Error(`第${index + 1}篇文章的链接URL格式无效：${url}`);
		}
		processedArticle.url = url;

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

	static createSingleArticleMessage(
		title: string,
		url: string,
		description?: string,
		picurl?: string,
	): NewsMessage {
		const handler = new NewsMessageHandler();
		return handler.formatMessage({
			messageType: MessageType.NEWS,
			newsArticles: [
				{
					title,
					url,
					description,
					picurl,
				},
			],
		});
	}

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

	static createLinkShareMessage(title: string, url: string, description?: string): NewsMessage {
		return this.createSingleArticleMessage(title, url, description);
	}

	static createArticleWithImageMessage(
		title: string,
		url: string,
		imageUrl: string,
		description?: string,
	): NewsMessage {
		return this.createSingleArticleMessage(title, url, description, imageUrl);
	}

	static createArticlesFromDataSource(
		dataSource: Array<{
			title: string;
			url: string;
			description?: string;
			picurl?: string;
		}>,
		transformer?: (article: any) => any,
	): NewsMessage {
		const articles = transformer ? dataSource.map(transformer) : dataSource;
		return this.createMultipleArticlesMessage(articles);
	}

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

	private static validateSingleArticle(article: any, index: number): string[] {
		const errors: string[] = [];

		if (!article || typeof article !== 'object') {
			errors.push(`第${index + 1}篇文章必须是对象格式`);
			return errors;
		}

		if (!article.title || typeof article.title !== 'string' || article.title.trim().length === 0) {
			errors.push(`第${index + 1}篇文章的标题不能为空`);
		} else if (article.title.length > 128) {
			errors.push(`第${index + 1}篇文章的标题不能超过128个字符`);
		}

		if (article.description && typeof article.description === 'string' && article.description.length > 512) {
			errors.push(`第${index + 1}篇文章的描述不能超过512个字符`);
		}

		if (!article.url || typeof article.url !== 'string' || article.url.trim().length === 0) {
			errors.push(`第${index + 1}篇文章的链接URL不能为空`);
		} else if (!MessageValidator.validateUrl(article.url)) {
			errors.push(`第${index + 1}篇文章的链接URL格式无效`);
		}

		if (article.picurl && typeof article.picurl === 'string' && article.picurl.trim().length > 0) {
			if (!MessageValidator.validateUrl(article.picurl)) {
				errors.push(`第${index + 1}篇文章的图片URL格式无效`);
			}
		}

		return errors;
	}
}

