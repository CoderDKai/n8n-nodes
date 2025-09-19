import { WeworkBot } from '../WeworkBot.node';
import { INodeTypeDescription, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { NodeInputData } from '../types';

// Mock the API service and message handlers
jest.mock('../WeworkApiService');
jest.mock('../MessageHandler');
jest.mock('../Logger');

describe('WeworkBot', () => {
	let weworkBot: WeworkBot;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;

	beforeEach(() => {
		weworkBot = new WeworkBot();
		
		// Setup mock execute functions
		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getCredentials: jest.fn().mockResolvedValue({ webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test' }),
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({ id: 'test-node-id' }),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
			continueOnFail: jest.fn().mockReturnValue(false),
		};
	});

	describe('节点描述', () => {
		it('应该有正确的节点描述配置', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.displayName).toBe('企业微信群机器人');
			expect(description.name).toBe('weworkBot');
			expect(description.group).toContain('communication');
			expect(description.version).toBe(1);
		});

		it('应该配置正确的输入输出', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.inputs).toEqual(['main']);
			expect(description.outputs).toEqual(['main']);
		});

		it('应该要求企业微信机器人凭据', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.credentials).toEqual([
				{
					name: 'weworkBotApi',
					required: true,
				},
			]);
		});

		it('应该有正确的图标配置', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.icon).toEqual({
				light: 'file:wework.svg',
				dark: 'file:wework.svg',
			});
		});

		it('应该有正确的消息类型选项', () => {
			const description: INodeTypeDescription = weworkBot.description;
			const messageTypeProperty = description.properties?.find(p => p.name === 'messageType');

			expect(messageTypeProperty).toBeDefined();
			expect(messageTypeProperty?.type).toBe('options');
			expect(messageTypeProperty?.options).toHaveLength(5);
			
			const optionValues = messageTypeProperty?.options?.map((opt: any) => opt.value);
			expect(optionValues).toContain('text');
			expect(optionValues).toContain('markdown');
			expect(optionValues).toContain('image');
			expect(optionValues).toContain('news');
			expect(optionValues).toContain('file');
		});

		it('应该有条件显示的属性配置', () => {
			const description: INodeTypeDescription = weworkBot.description;
			
			// 检查文本消息相关属性
			const contentProperty = description.properties?.find(p => p.name === 'content');
			expect(contentProperty?.displayOptions?.show?.messageType).toEqual(['text']);

			// 检查Markdown消息相关属性
			const markdownProperty = description.properties?.find(p => p.name === 'markdownContent');
			expect(markdownProperty?.displayOptions?.show?.messageType).toEqual(['markdown']);

			// 检查图片消息相关属性
			const imageSourceProperty = description.properties?.find(p => p.name === 'imageSource');
			expect(imageSourceProperty?.displayOptions?.show?.messageType).toEqual(['image']);
		});
	});

	describe('节点执行', () => {
		beforeEach(() => {
			// Mock the message handler factory and API service
			const { MessageHandlerFactory } = require('../MessageHandler');
			const { WeworkApiService } = require('../WeworkApiService');
			const { createLogger } = require('../Logger');

			MessageHandlerFactory.getHandler = jest.fn().mockReturnValue({
				processMessage: jest.fn().mockReturnValue({
					message: { msgtype: 'text', text: { content: 'test' } },
					validation: { isValid: true, errors: [] }
				})
			});

			WeworkApiService.prototype.sendMessage = jest.fn().mockResolvedValue({
				success: true,
				messageId: 'test-message-id',
				timestamp: Date.now(),
				messageType: 'text'
			});

			createLogger.mockReturnValue({
				info: jest.fn(),
				debug: jest.fn(),
				error: jest.fn(),
				logExecutionStart: jest.fn(),
				logExecutionEnd: jest.fn(),
				logValidation: jest.fn(),
				logPerformance: jest.fn(),
				getLogStats: jest.fn().mockReturnValue({ totalEntries: 0 }),
				createChildLogger: jest.fn().mockReturnValue({
					info: jest.fn(),
					debug: jest.fn(),
					error: jest.fn(),
				}),
				setExecutionContext: jest.fn(),
			});
		});

		it('应该成功执行文本消息发送', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('text') // messageType
				.mockReturnValueOnce('测试消息') // content
				.mockReturnValueOnce('') // mentionedUsers
				.mockReturnValueOnce(''); // mentionedMobiles

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
			expect(result[0][0].json).toHaveProperty('messageType', 'text');
		});

		it('应该成功执行Markdown消息发送', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('markdown') // messageType
				.mockReturnValueOnce('# 标题\n\n**重要内容**'); // markdownContent

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
		});

		it('应该成功执行图片消息发送', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('image') // messageType
				.mockReturnValueOnce('base64') // imageSource
				.mockReturnValueOnce('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=='); // imageBase64

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
		});

		it('应该成功执行图文消息发送', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('news') // messageType
				.mockReturnValueOnce({ // articles
					article: [{
						title: '测试文章',
						description: '测试描述',
						url: 'https://example.com',
						picurl: 'https://example.com/image.jpg'
					}]
				});

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
		});

		it('应该成功执行文件消息发送', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('file') // messageType
				.mockReturnValueOnce('test-media-id-123'); // fileMediaId

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
		});

		it('应该处理@提及用户功能', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('text') // messageType
				.mockReturnValueOnce('测试消息') // content
				.mockReturnValueOnce('user1,user2,@all') // mentionedUsers
				.mockReturnValueOnce('13800138000,13900139000'); // mentionedMobiles

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
			
			// 验证输入数据包含了正确的@提及信息
			const inputData = result[0][0].json.input as NodeInputData;
			expect(inputData.mentionedUsers).toEqual(['user1', 'user2', '@all']);
			expect(inputData.mentionedMobiles).toEqual(['13800138000', '13900139000']);
		});

		it('应该处理多个输入项', async () => {
			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([
				{ json: {} },
				{ json: {} }
			]);

			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockImplementation((paramName: string, itemIndex: number) => {
					if (paramName === 'messageType') return 'text';
					if (paramName === 'content') return '测试消息';
					if (paramName === 'mentionedUsers') return '';
					if (paramName === 'mentionedMobiles') return '';
					return '';
				});

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toHaveProperty('success', true);
			expect(result[0][1].json).toHaveProperty('success', true);
		});

		it('应该处理消息验证失败', async () => {
			const { MessageHandlerFactory } = require('../MessageHandler');
			MessageHandlerFactory.getHandler.mockReturnValue({
				processMessage: jest.fn().mockReturnValue({
					message: { msgtype: 'text', text: { content: '' } },
					validation: { isValid: false, errors: ['内容不能为空'] }
				})
			});

			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('text') // messageType
				.mockReturnValueOnce(''); // empty content

			await expect(weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions))
				.rejects.toThrow(NodeOperationError);
		});

		it('应该处理API发送失败', async () => {
			const { WeworkApiService } = require('../WeworkApiService');
			WeworkApiService.prototype.sendMessage.mockResolvedValue({
				success: false,
				errorCode: 93000,
				errorMessage: 'webhook地址无效',
				timestamp: Date.now(),
				messageType: 'text'
			});

			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('text') // messageType
				.mockReturnValueOnce('测试消息'); // content

			await expect(weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions))
				.rejects.toThrow(NodeOperationError);
		});

		it('应该在continueOnFail模式下处理错误', async () => {
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			const { WeworkApiService } = require('../WeworkApiService');
			WeworkApiService.prototype.sendMessage.mockResolvedValue({
				success: false,
				errorCode: 93000,
				errorMessage: 'webhook地址无效',
				timestamp: Date.now(),
				messageType: 'text'
			});

			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('text') // messageType
				.mockReturnValueOnce('测试消息'); // content

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', false);
			expect(result[0][0].json).toHaveProperty('errorCode', 93000);
		});

		it('应该处理不支持的消息类型', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('unsupported'); // invalid messageType

			await expect(weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions))
				.rejects.toThrow(NodeOperationError);
		});

		it('应该处理凭据获取失败', async () => {
			(mockExecuteFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('凭据获取失败'));

			await expect(weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions))
				.rejects.toThrow();
		});

		it('应该正确处理图片URL模式', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('image') // messageType
				.mockReturnValueOnce('url') // imageSource
				.mockReturnValueOnce('https://example.com/image.jpg'); // imageUrl

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
			
			// 验证输入数据包含了正确的图片URL
			const inputData = result[0][0].json.input as NodeInputData;
			expect(inputData.imageUrl).toBe('https://example.com/image.jpg');
		});

		it('应该正确处理空的@提及参数', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('text') // messageType
				.mockReturnValueOnce('测试消息') // content
				.mockReturnValueOnce('') // empty mentionedUsers
				.mockReturnValueOnce(''); // empty mentionedMobiles

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
			
			// 验证输入数据不包含@提及信息
			const inputData = result[0][0].json.input as NodeInputData;
			expect(inputData.mentionedUsers).toBeUndefined();
			expect(inputData.mentionedMobiles).toBeUndefined();
		});

		it('应该正确处理空的图文消息文章列表', async () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('news') // messageType
				.mockReturnValueOnce({ article: [] }); // empty articles

			const result = await weworkBot.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('success', true);
			
			// 验证输入数据包含了空的文章列表
			const inputData = result[0][0].json.input as NodeInputData;
			expect(inputData.newsArticles).toEqual([]);
		});
	});

	describe('参数验证', () => {
		it('应该验证必需的文本内容参数', () => {
			const description: INodeTypeDescription = weworkBot.description;
			const contentProperty = description.properties?.find(p => p.name === 'content');

			expect(contentProperty?.required).toBe(true);
			expect(contentProperty?.displayOptions?.show?.messageType).toEqual(['text']);
		});

		it('应该验证必需的Markdown内容参数', () => {
			const description: INodeTypeDescription = weworkBot.description;
			const markdownProperty = description.properties?.find(p => p.name === 'markdownContent');

			expect(markdownProperty?.required).toBe(true);
			expect(markdownProperty?.displayOptions?.show?.messageType).toEqual(['markdown']);
		});

		it('应该验证必需的文件Media ID参数', () => {
			const description: INodeTypeDescription = weworkBot.description;
			const fileProperty = description.properties?.find(p => p.name === 'fileMediaId');

			expect(fileProperty?.required).toBe(true);
			expect(fileProperty?.displayOptions?.show?.messageType).toEqual(['file']);
		});

		it('应该有正确的图片数据源选项', () => {
			const description: INodeTypeDescription = weworkBot.description;
			const imageSourceProperty = description.properties?.find(p => p.name === 'imageSource');

			expect(imageSourceProperty?.type).toBe('options');
			expect(imageSourceProperty?.options).toHaveLength(2);
			
			const optionValues = imageSourceProperty?.options?.map((opt: any) => opt.value);
			expect(optionValues).toContain('base64');
			expect(optionValues).toContain('url');
		});
	});
});