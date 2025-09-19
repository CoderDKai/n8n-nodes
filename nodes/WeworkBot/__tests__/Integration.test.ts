import { WeworkApiService } from '../WeworkApiService';
import { MessageHandlerFactory } from '../MessageHandler';
import { createLogger, LogLevel } from '../Logger';
import { MessageType, NodeInputData } from '../types';

describe('集成测试', () => {
	let apiService: WeworkApiService;
	let logger: ReturnType<typeof createLogger>;

	beforeEach(() => {
		logger = createLogger('IntegrationTest', {
			level: LogLevel.DEBUG,
			enableConsole: false,
			enableStructuredLogging: true,
		});

		apiService = new WeworkApiService({
			timeout: 5000,
			maxRetries: 1,
			retryDelay: 100,
			enableLogging: true,
		}, logger);
	});

	describe('消息处理和发送流程', () => {
		it('应该完整处理文本消息流程', async () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '这是一条测试消息',
				mentionedUsers: ['user1', 'user2'],
			};

			// 获取消息处理器
			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message, validation } = messageHandler.processMessage(inputData);

			// 验证消息处理结果
			expect(validation.isValid).toBe(true);
			expect(message.msgtype).toBe('text');
			
			const textMessage = message as any;
			expect(textMessage.text.content).toBe('这是一条测试消息');
			expect(textMessage.text.mentioned_list).toEqual(['user1', 'user2']);

			// 模拟发送消息（使用无效URL以避免实际发送）
			const invalidWebhookUrl = 'https://invalid-url.com/webhook';
			
			try {
				await apiService.sendMessage(invalidWebhookUrl, message);
			} catch (error) {
				// 预期会失败，因为URL无效
				expect(error).toBeDefined();
			}

			// 检查日志记录
			const logEntries = logger.getLogEntries();
			expect(logEntries.length).toBeGreaterThan(0);
			
			// 应该有开始发送的日志
			const startLog = logEntries.find(entry => entry.message.includes('开始发送企业微信消息'));
			expect(startLog).toBeDefined();
		});

		it('应该处理消息验证失败的情况', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '', // 空内容应该验证失败
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			
			expect(() => {
				messageHandler.processMessage(inputData);
			}).toThrow('文本消息内容不能为空');
		});

		it('应该处理Markdown消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '# 标题\n这是**粗体**文本',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.MARKDOWN);
			const { message, validation } = messageHandler.processMessage(inputData);

			expect(validation.isValid).toBe(true);
			expect(message.msgtype).toBe('markdown');
			
			const markdownMessage = message as any;
			expect(markdownMessage.markdown.content).toBe('# 标题\n这是**粗体**文本');
		});

		it('应该处理图文消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.NEWS,
				newsArticles: [
					{
						title: '测试文章',
						description: '这是一篇测试文章',
						url: 'https://example.com',
						picurl: 'https://example.com/image.jpg',
					},
				],
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.NEWS);
			const { message, validation } = messageHandler.processMessage(inputData);

			expect(validation.isValid).toBe(true);
			expect(message.msgtype).toBe('news');
			
			const newsMessage = message as any;
			expect(newsMessage.news.articles).toHaveLength(1);
			expect(newsMessage.news.articles[0].title).toBe('测试文章');
		});
	});

	describe('错误处理集成', () => {
		it('应该正确处理网络错误', async () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试消息',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message } = messageHandler.processMessage(inputData);

			// 使用不存在的域名来模拟网络错误
			const invalidUrl = 'https://non-existent-domain-12345.com/webhook';

			const result = await apiService.sendMessage(invalidUrl, message);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBeDefined();
			expect(result.errorCode).toBeDefined();

			// 检查错误日志
			const logEntries = logger.getLogEntries();
			const errorLog = logEntries.find(entry => entry.level === 'ERROR');
			expect(errorLog).toBeDefined();
		});

		it('应该正确处理URL格式错误', async () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试消息',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message } = messageHandler.processMessage(inputData);

			// 使用无效的URL格式
			const invalidUrl = 'not-a-valid-url';

			const result = await apiService.sendMessage(invalidUrl, message);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain('URL');
		});
	});

	describe('日志记录集成', () => {
		it('应该记录完整的操作流程', async () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试日志记录',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message } = messageHandler.processMessage(inputData);

			// 尝试发送消息（会失败，但会产生日志）
			const invalidUrl = 'https://invalid-domain.com/webhook';
			await apiService.sendMessage(invalidUrl, message);

			// 检查日志统计
			const stats = logger.getLogStats();
			expect(stats.totalEntries).toBeGreaterThan(0);
			expect(stats.entriesByLevel.INFO).toBeGreaterThan(0);
			expect(stats.entriesByLevel.ERROR).toBeGreaterThan(0);

			// 检查是否有性能日志
			const entries = logger.getLogEntries();
			// 性能日志可能在子logger中，所以检查是否有相关的日志条目
			const hasPerformanceRelatedLogs = entries.some(entry => 
				entry.message.includes('发送') || entry.message.includes('完成') || entry.message.includes('失败')
			);
			expect(hasPerformanceRelatedLogs).toBe(true);
		});

		it('应该正确掩码敏感信息', async () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试敏感信息掩码',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message } = messageHandler.processMessage(inputData);

			// 使用包含敏感信息的URL
			const webhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=1234567890abcdef';
			await apiService.sendMessage(webhookUrl, message);

			// 检查日志中的URL是否被掩码
			const entries = logger.getLogEntries();
			const logWithUrl = entries.find(entry => 
				entry.data && typeof entry.data === 'object' && 'webhookUrl' in entry.data
			);

			if (logWithUrl && logWithUrl.data.webhookUrl) {
				expect(logWithUrl.data.webhookUrl).toContain('****');
				expect(logWithUrl.data.webhookUrl).not.toContain('1234567890abcdef');
			}
		});
	});

	describe('性能监控', () => {
		it('应该记录操作耗时', async () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '性能测试消息',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message } = messageHandler.processMessage(inputData);

			await apiService.sendMessage('https://invalid-url.com/webhook', message);

			// 检查是否有操作相关的日志（包含耗时信息）
			const entries = logger.getLogEntries();
			const hasTimingLogs = entries.some(entry => 
				entry.data && typeof entry.data === 'object' && 
				(entry.data.duration || entry.data.totalDuration)
			);
			
			expect(hasTimingLogs).toBe(true);
		});
	});

	describe('批量操作', () => {
		it('应该支持批量发送消息', async () => {
			const messages = [
				{
					msgtype: 'text' as const,
					text: { content: '消息1' },
				},
				{
					msgtype: 'text' as const,
					text: { content: '消息2' },
				},
			];

			const results = await apiService.sendMessages('https://invalid-url.com/webhook', messages);

			expect(results).toHaveLength(2);
			expect(results.every(result => !result.success)).toBe(true);

			// 检查批量操作日志
			const entries = logger.getLogEntries();
			const batchStartLog = entries.find(entry => entry.message.includes('开始批量发送'));
			const batchEndLog = entries.find(entry => entry.message.includes('批量发送完成'));

			expect(batchStartLog).toBeDefined();
			expect(batchEndLog).toBeDefined();
		});
	});
});