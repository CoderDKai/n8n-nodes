import { NewsMessageHandler } from '../MessageHandler';
import { MessageType, NodeInputData, NewsArticle } from '../types';

describe('NewsMessageHandler', () => {
	let handler: NewsMessageHandler;

	const validArticle: NewsArticle = {
		title: '测试文章标题',
		description: '这是一篇测试文章的描述',
		url: 'https://example.com/article',
		picurl: 'https://example.com/image.jpg',
	};

	beforeEach(() => {
		handler = new NewsMessageHandler();
	});

	describe('formatMessage', () => {
		it('应该创建基本的图文消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [validArticle],
			};

			const result = handler.formatMessage(inputData);

			expect(result.msgtype).toBe('news');
			expect(result.news.articles).toHaveLength(1);
			expect(result.news.articles[0].title).toBe(validArticle.title);
			expect(result.news.articles[0].url).toBe(validArticle.url);
		});

		it('应该处理多篇文章', () => {
			const articles = [
				validArticle,
				{
					title: '第二篇文章',
					url: 'https://example.com/article2',
					description: '第二篇文章的描述',
				},
			];

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: articles,
			};

			const result = handler.formatMessage(inputData);

			expect(result.news.articles).toHaveLength(2);
			expect(result.news.articles[0].title).toBe(articles[0].title);
			expect(result.news.articles[1].title).toBe(articles[1].title);
		});

		it('应该在没有文章时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [],
			};

			expect(() => handler.formatMessage(inputData)).toThrow('图文消息至少需要包含一篇文章');
		});

		it('应该在文章数量超过限制时抛出错误', () => {
			const articles = Array(10).fill(validArticle); // 创建10篇文章，超过8篇限制

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: articles,
			};

			expect(() => handler.formatMessage(inputData)).toThrow('图文消息文章数量不能超过8篇');
		});

		it('应该在文章标题为空时抛出错误', () => {
			const invalidArticle = {
				...validArticle,
				title: '',
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [invalidArticle],
			};

			expect(() => handler.formatMessage(inputData)).toThrow('第1篇文章的标题不能为空');
		});

		it('应该在文章URL为空时抛出错误', () => {
			const invalidArticle = {
				...validArticle,
				url: '',
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [invalidArticle],
			};

			expect(() => handler.formatMessage(inputData)).toThrow('第1篇文章的链接URL不能为空');
		});

		it('应该在文章URL格式无效时抛出错误', () => {
			const invalidArticle = {
				...validArticle,
				url: 'invalid-url',
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [invalidArticle],
			};

			expect(() => handler.formatMessage(inputData)).toThrow('第1篇文章的链接URL格式无效');
		});

		it('应该在图片URL格式无效时抛出错误', () => {
			const invalidArticle = {
				...validArticle,
				picurl: 'invalid-image-url',
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [invalidArticle],
			};

			expect(() => handler.formatMessage(inputData)).toThrow('第1篇文章的图片URL格式无效');
		});

		it('应该截断过长的标题', () => {
			const longTitle = 'a'.repeat(200); // 超过128字符限制
			const articleWithLongTitle = {
				...validArticle,
				title: longTitle,
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [articleWithLongTitle],
			};

			const result = handler.formatMessage(inputData);

			expect(result.news.articles[0].title.length).toBeLessThanOrEqual(128);
			expect(result.news.articles[0].title).toContain('...');
		});

		it('应该截断过长的描述', () => {
			const longDescription = 'a'.repeat(600); // 超过512字符限制
			const articleWithLongDescription = {
				...validArticle,
				description: longDescription,
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [articleWithLongDescription],
			};

			const result = handler.formatMessage(inputData);

			expect(result.news.articles[0].description!.length).toBeLessThanOrEqual(512);
			expect(result.news.articles[0].description).toContain('...');
		});

		it('应该处理没有描述的文章', () => {
			const articleWithoutDescription = {
				title: '无描述文章',
				url: 'https://example.com/no-desc',
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [articleWithoutDescription],
			};

			const result = handler.formatMessage(inputData);

			expect(result.news.articles[0].description).toBeUndefined();
		});

		it('应该处理没有图片的文章', () => {
			const articleWithoutImage = {
				title: '无图片文章',
				url: 'https://example.com/no-image',
				description: '这篇文章没有图片',
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [articleWithoutImage],
			};

			const result = handler.formatMessage(inputData);

			expect(result.news.articles[0].picurl).toBeUndefined();
		});

		it('应该忽略空的图片URL', () => {
			const articleWithEmptyPicurl = {
				...validArticle,
				picurl: '   ', // 只有空白字符
			};

			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [articleWithEmptyPicurl],
			};

			const result = handler.formatMessage(inputData);

			expect(result.news.articles[0].picurl).toBeUndefined();
		});
	});

	describe('validateMessage', () => {
		it('应该验证有效的图文消息', () => {
			const message = {
				msgtype: 'news' as const,
				news: {
					articles: [validArticle],
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空文章列表错误', () => {
			const message = {
				msgtype: 'news' as const,
				news: {
					articles: [],
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('图文消息至少需要包含一篇文章');
		});
	});

	describe('静态方法', () => {
		it('应该创建单篇文章消息', () => {
			const message = NewsMessageHandler.createSingleArticleMessage(
				'测试标题',
				'https://example.com',
				'测试描述',
				'https://example.com/image.jpg'
			);

			expect(message.msgtype).toBe('news');
			expect(message.news.articles).toHaveLength(1);
			expect(message.news.articles[0].title).toBe('测试标题');
			expect(message.news.articles[0].url).toBe('https://example.com');
			expect(message.news.articles[0].description).toBe('测试描述');
			expect(message.news.articles[0].picurl).toBe('https://example.com/image.jpg');
		});

		it('应该创建多篇文章消息', () => {
			const articles = [
				{
					title: '文章1',
					url: 'https://example.com/1',
					description: '描述1',
				},
				{
					title: '文章2',
					url: 'https://example.com/2',
					description: '描述2',
				},
			];

			const message = NewsMessageHandler.createMultipleArticlesMessage(articles);

			expect(message.msgtype).toBe('news');
			expect(message.news.articles).toHaveLength(2);
		});

		it('应该创建链接分享消息', () => {
			const message = NewsMessageHandler.createLinkShareMessage(
				'分享链接',
				'https://example.com',
				'链接描述'
			);

			expect(message.msgtype).toBe('news');
			expect(message.news.articles).toHaveLength(1);
			expect(message.news.articles[0].title).toBe('分享链接');
		});

		it('应该创建带图片的文章消息', () => {
			const message = NewsMessageHandler.createArticleWithImageMessage(
				'图片文章',
				'https://example.com',
				'https://example.com/image.jpg',
				'文章描述'
			);

			expect(message.msgtype).toBe('news');
			expect(message.news.articles[0].picurl).toBe('https://example.com/image.jpg');
		});

		it('应该验证文章数组', () => {
			const result = NewsMessageHandler.validateArticles([validArticle]);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测无效的文章数组', () => {
			const result = NewsMessageHandler.validateArticles([]);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('应该检测非数组格式', () => {
			const result = NewsMessageHandler.validateArticles('not-an-array' as any);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('文章列表必须是数组格式');
		});

		it('应该检测文章对象格式错误', () => {
			const result = NewsMessageHandler.validateArticles(['not-an-object'] as any);

			expect(result.valid).toBe(false);
			expect(result.errors.some(error => error.includes('必须是对象格式'))).toBe(true);
		});

		it('应该检测标题缺失', () => {
			const invalidArticle = {
				url: 'https://example.com',
			};

			const result = NewsMessageHandler.validateArticles([invalidArticle]);

			expect(result.valid).toBe(false);
			expect(result.errors.some(error => error.includes('标题不能为空'))).toBe(true);
		});

		it('应该检测URL缺失', () => {
			const invalidArticle = {
				title: '测试标题',
			};

			const result = NewsMessageHandler.validateArticles([invalidArticle]);

			expect(result.valid).toBe(false);
			expect(result.errors.some(error => error.includes('链接URL不能为空'))).toBe(true);
		});
	});
});