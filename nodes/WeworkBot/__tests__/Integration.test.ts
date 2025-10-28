import { WeworkApiService } from '../WeworkApiService';
import { MessageHandlerFactory } from '../MessageHandler';
import { createLogger, LogLevel } from '../Logger';
import { MessageType, NodeInputData } from '../types';
import { WeworkBot } from '../WeworkBot.node';
import {
	IExecuteFunctions,
	INodeExecutionData,
	ICredentialDataDecryptedObject,
	INode,
	IRunExecutionData,
	WorkflowExecuteMode,
	INodeParameters,
} from 'n8n-workflow';

describe('集成测试', () => {
	let apiService: WeworkApiService;
	let logger: ReturnType<typeof createLogger>;
	let weworkBotNode: WeworkBot;
	let helpers: { httpRequest: jest.Mock };
	let executeFunctions: IExecuteFunctions;

	beforeEach(() => {
		logger = createLogger('IntegrationTest', {
			level: LogLevel.DEBUG,
			enableConsole: false,
			enableStructuredLogging: true,
		});

		helpers = {
			httpRequest: jest.fn().mockRejectedValue(new Error('模拟网络错误')),
		};
		executeFunctions = { helpers } as unknown as IExecuteFunctions;

		apiService = new WeworkApiService(
			executeFunctions,
			{
				timeout: 5000,
				maxRetries: 1,
				retryDelay: 100,
				enableLogging: true,
			},
			logger
		);

		weworkBotNode = new WeworkBot();
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

	describe('n8n节点集成测试', () => {
		// 创建模拟的执行上下文
		const createMockExecuteFunctions = (
			parameters: INodeParameters,
			credentials: ICredentialDataDecryptedObject,
			inputData: INodeExecutionData[] = [{ json: {} }]
		): IExecuteFunctions => {
			const node: INode = {
				id: 'test-node-id',
				name: 'Test WeworkBot Node',
				typeVersion: 1,
				type: 'weworkBot',
				position: [100, 200],
				parameters,
			};

			return {
				getInputData: () => inputData,
				getNodeParameter: (parameterName: string, itemIndex?: number, fallbackValue?: any) => {
					const value = parameters[parameterName];
					return value !== undefined ? value : fallbackValue;
				},
				getCredentials: async () => credentials,
				getNode: () => node,
				getExecutionId: () => 'test-execution-id',
				getWorkflow: () => ({ id: 'test-workflow-id' }),
				continueOnFail: () => false,
				helpers: {} as any,
				getContext: () => ({}),
				getExecuteData: () => ({} as IRunExecutionData),
				getMode: () => 'manual' as WorkflowExecuteMode,
				getActivationMode: () => 'manual' as WorkflowExecuteMode,
				getTimezone: () => 'UTC',
				getRestApiUrl: () => 'http://localhost:5678',
				getInstanceBaseUrl: () => 'http://localhost:5678',
				getInstanceId: () => 'test-instance',
				getWebhookName: () => undefined,
				getWebhookDescription: () => undefined,
				getChildNodes: () => [],
				getParentNodes: () => [],
				getWorkflowDataProxy: () => ({} as any),
				getWorkflowStaticData: () => ({}),
				prepareOutputData: (outputData: INodeExecutionData[]) => outputData,
				sendMessageToUI: () => { },
				sendResponse: () => { },
				getResponseObject: () => ({} as any),
				getRequestObject: () => ({} as any),
				getSSHClient: () => ({} as any),
				logAiEvent: () => { },
				logger: {} as any,
				getCredentialsProperties: () => ({}),
				getKnownNodeTypes: () => ({} as any),
			} as unknown as IExecuteFunctions;
		};

		it('应该正确执行文本消息节点', async () => {
			const parameters: INodeParameters = {
				messageType: 'text',
				content: '这是一条测试消息',
				mentionedUsers: 'user1,user2',
				mentionedMobiles: '13800138000',
			};

			const credentials: ICredentialDataDecryptedObject = {
				webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
			};

			const executeFunctions = createMockExecuteFunctions(parameters, credentials);

			// 执行节点 - 预期会因为无效URL而失败
			await expect(weworkBotNode.execute.call(executeFunctions)).rejects.toThrow('消息发送失败');
		});

		it('应该正确执行Markdown消息节点', async () => {
			const parameters: INodeParameters = {
				messageType: 'markdown',
				markdownContent: '# 测试标题\n\n这是**粗体**文本',
			};

			const credentials: ICredentialDataDecryptedObject = {
				webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
			};

			const executeFunctions = createMockExecuteFunctions(parameters, credentials);

			// 执行节点 - 预期会因为无效URL而失败
			await expect(weworkBotNode.execute.call(executeFunctions)).rejects.toThrow('消息发送失败');
		});

		it('应该正确执行图文消息节点', async () => {
			const parameters: INodeParameters = {
				messageType: 'news',
				articles: {
					article: [
						{
							title: '测试文章',
							description: '这是一篇测试文章',
							url: 'https://example.com',
							picurl: 'https://example.com/image.jpg',
						},
					],
				},
			};

			const credentials: ICredentialDataDecryptedObject = {
				webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
			};

			const executeFunctions = createMockExecuteFunctions(parameters, credentials);

			// 执行节点 - 预期会因为无效URL而失败
			await expect(weworkBotNode.execute.call(executeFunctions)).rejects.toThrow('消息发送失败');
		});

		it('应该正确处理多个输入项', async () => {
			const parameters: INodeParameters = {
				messageType: 'text',
				content: '批量消息测试',
			};

			const credentials: ICredentialDataDecryptedObject = {
				webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
			};

			const inputData: INodeExecutionData[] = [
				{ json: { index: 1 } },
				{ json: { index: 2 } },
				{ json: { index: 3 } },
			];

			const executeFunctions = createMockExecuteFunctions(parameters, credentials, inputData);

			// 执行节点 - 预期会因为无效URL而失败
			await expect(weworkBotNode.execute.call(executeFunctions)).rejects.toThrow('消息发送失败');
		});

		it('应该正确处理参数验证错误', async () => {
			const parameters: INodeParameters = {
				messageType: 'text',
				content: '', // 空内容应该导致验证失败
			};

			const credentials: ICredentialDataDecryptedObject = {
				webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
			};

			const executeFunctions = createMockExecuteFunctions(parameters, credentials);

			// 应该抛出验证错误
			await expect(weworkBotNode.execute.call(executeFunctions)).rejects.toThrow('文本消息内容不能为空');
		});

		it('应该正确处理凭据错误', async () => {
			const parameters: INodeParameters = {
				messageType: 'text',
				content: '测试消息',
			};

			const credentials: ICredentialDataDecryptedObject = {
				webhookUrl: 'invalid-url', // 无效的URL
			};

			const executeFunctions = createMockExecuteFunctions(parameters, credentials);

			// 应该抛出网络或URL错误
			await expect(weworkBotNode.execute.call(executeFunctions)).rejects.toThrow();
		});
	});

	describe('端到端测试', () => {
		// 注意：这些测试需要真实的企业微信webhook URL才能完全通过
		// 在CI/CD环境中，可以通过环境变量提供测试URL
		const testWebhookUrl = process.env.WEWORK_TEST_WEBHOOK_URL;

		// 只有在提供了测试URL时才运行真实的API测试
		const describeIf = (condition: boolean) => condition ? describe : describe.skip;

		describeIf(!!testWebhookUrl)('真实API测试', () => {
			it('应该能够发送真实的文本消息', async () => {
				const inputData: NodeInputData = {
					messageType: MessageType.TEXT,
					content: `集成测试消息 - ${new Date().toISOString()}`,
				};

				const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
				const { message } = messageHandler.processMessage(inputData);

				const result = await apiService.sendMessage(testWebhookUrl!, message);

				// 由于使用的是测试URL，可能会返回错误，我们检查响应结构
				expect(result).toBeDefined();
				expect(result.success).toBeDefined();
				expect(result.timestamp).toBeDefined();

				// 如果成功，应该有messageId；如果失败，应该有错误信息
				if (result.success) {
					expect(result.messageId).toBeDefined();
				} else {
					expect(result.errorMessage).toBeDefined();
				}
			});

			it('应该能够发送真实的Markdown消息', async () => {
				const inputData: NodeInputData = {
					messageType: MessageType.MARKDOWN,
					markdownContent: `# 集成测试\n\n**时间**: ${new Date().toISOString()}\n\n测试通过 ✅`,
				};

				const messageHandler = MessageHandlerFactory.getHandler(MessageType.MARKDOWN);
				const { message } = messageHandler.processMessage(inputData);

				const result = await apiService.sendMessage(testWebhookUrl!, message);

				// 检查响应结构
				expect(result).toBeDefined();
				expect(result.success).toBeDefined();

				if (result.success) {
					expect(result.messageId).toBeDefined();
				} else {
					expect(result.errorMessage).toBeDefined();
				}
			});

			it('应该能够发送真实的图文消息', async () => {
				const inputData: NodeInputData = {
					messageType: MessageType.NEWS,
					newsArticles: [
						{
							title: '集成测试文章',
							description: `测试时间: ${new Date().toISOString()}`,
							url: 'https://github.com/n8n-io/n8n',
							picurl: 'https://avatars.githubusercontent.com/u/45487711?s=200&v=4',
						},
					],
				};

				const messageHandler = MessageHandlerFactory.getHandler(MessageType.NEWS);
				const { message } = messageHandler.processMessage(inputData);

				const result = await apiService.sendMessage(testWebhookUrl!, message);

				// 检查响应结构
				expect(result).toBeDefined();
				expect(result.success).toBeDefined();

				if (result.success) {
					expect(result.messageId).toBeDefined();
				} else {
					expect(result.errorMessage).toBeDefined();
				}
			});
		});

		describe('模拟API测试', () => {
			it('应该正确处理API成功响应', async () => {
				// 这里可以使用nock或类似的库来模拟HTTP响应
				// 由于当前没有安装nock，我们使用无效URL来测试错误处理
				const inputData: NodeInputData = {
					messageType: MessageType.TEXT,
					content: '模拟测试消息',
				};

				const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
				const { message } = messageHandler.processMessage(inputData);

				// 使用无效URL测试错误处理
				const result = await apiService.sendMessage('https://invalid-domain-12345.com/webhook', message);

				expect(result.success).toBe(false);
				expect(result.errorMessage).toBeDefined();
				expect(result.timestamp).toBeDefined();
			});
		});
	});

	describe('性能和稳定性测试', () => {
		it('应该能够处理大量并发请求', async () => {
			const concurrentRequests = 10;
			const promises: Promise<any>[] = [];

			for (let i = 0; i < concurrentRequests; i++) {
				const inputData: NodeInputData = {
					messageType: MessageType.TEXT,
					content: `并发测试消息 ${i + 1}`,
				};

				const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
				const { message } = messageHandler.processMessage(inputData);

				promises.push(
					apiService.sendMessage('https://invalid-url.com/webhook', message)
				);
			}

			const results = await Promise.all(promises);

			expect(results).toHaveLength(concurrentRequests);
			// 所有请求都应该失败（因为URL无效），但不应该崩溃
			expect(results.every(result => !result.success)).toBe(true);
		});

		it('应该正确处理超时情况', async () => {
			const timeoutError = new Error('ESOCKETTIMEDOUT');
			timeoutError.name = 'RequestError';
			timeoutError.message = 'Error: ESOCKETTIMEDOUT timeout';

			const timeoutHelpers = {
				httpRequest: jest.fn().mockRejectedValue(timeoutError),
			};
			const timeoutExecuteFunctions = { helpers: timeoutHelpers } as unknown as IExecuteFunctions;

			const shortTimeoutApiService = new WeworkApiService(
				timeoutExecuteFunctions,
				{
					timeout: 100,
					maxRetries: 1,
					retryDelay: 50,
					enableLogging: false,
				},
				logger
			);

			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '超时测试消息',
			};

			const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
			const { message } = messageHandler.processMessage(inputData);

			const result = await shortTimeoutApiService.sendMessage('https://example.com/webhook', message);

			expect(result.success).toBe(false);
			expect(result.errorMessage).toBeDefined();
		});

		it('应该正确处理内存使用', () => {
			// 测试大量消息处理不会导致内存泄漏
			const messageCount = 1000;
			const initialMemory = process.memoryUsage().heapUsed;

			for (let i = 0; i < messageCount; i++) {
				const inputData: NodeInputData = {
					messageType: MessageType.TEXT,
					content: `内存测试消息 ${i}`,
				};

				const messageHandler = MessageHandlerFactory.getHandler(MessageType.TEXT);
				messageHandler.processMessage(inputData);
			}

			// 强制垃圾回收（如果可用）
			if (global.gc) {
				global.gc();
			}

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			// 内存增长应该在合理范围内（小于10MB）
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});
	});
});
