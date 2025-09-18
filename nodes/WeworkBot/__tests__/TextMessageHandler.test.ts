import { TextMessageHandler } from '../MessageHandler';
import { MessageType, NodeInputData } from '../types';

describe('TextMessageHandler', () => {
	let handler: TextMessageHandler;

	beforeEach(() => {
		handler = new TextMessageHandler();
	});

	describe('formatMessage', () => {
		it('应该创建基本的文本消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '这是一条测试消息',
			};

			const result = handler.formatMessage(inputData);

			expect(result.msgtype).toBe('text');
			expect(result.text.content).toBe('这是一条测试消息');
			expect(result.text.mentioned_list).toBeUndefined();
			expect(result.text.mentioned_mobile_list).toBeUndefined();
		});

		it('应该处理@提及用户功能', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '请大家注意这个重要通知',
				mentionedUsers: ['user1', 'user2', 'user3'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_list).toEqual(['user1', 'user2', 'user3']);
		});

		it('应该处理@提及手机号功能', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '紧急通知',
				mentionedMobiles: ['13800138000', '13900139000'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_mobile_list).toEqual(['13800138000', '13900139000']);
		});

		it('应该同时处理@提及用户和手机号', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '会议提醒',
				mentionedUsers: ['user1', 'user2'],
				mentionedMobiles: ['13800138000'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_list).toEqual(['user1', 'user2']);
			expect(result.text.mentioned_mobile_list).toEqual(['13800138000']);
		});

		it('应该过滤掉重复的用户ID', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试消息',
				mentionedUsers: ['user1', 'user2', 'user1', 'user3', 'user2'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_list).toEqual(['user1', 'user2', 'user3']);
		});

		it('应该过滤掉重复的手机号', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试消息',
				mentionedMobiles: ['13800138000', '13900139000', '13800138000'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_mobile_list).toEqual(['13800138000', '13900139000']);
		});

		it('应该过滤掉无效的手机号', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试消息',
				mentionedMobiles: ['13800138000', '12345678901', '13900139000', 'invalid'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_mobile_list).toEqual(['13800138000', '13900139000']);
		});

		it('应该过滤掉空的用户ID和手机号', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '测试消息',
				mentionedUsers: ['user1', '', '  ', 'user2'],
				mentionedMobiles: ['13800138000', '', '  ', '13900139000'],
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.mentioned_list).toEqual(['user1', 'user2']);
			expect(result.text.mentioned_mobile_list).toEqual(['13800138000', '13900139000']);
		});

		it('应该在内容为空时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('文本消息内容不能为空');
		});

		it('应该在内容仅包含空白字符时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: '   \n\t  ',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('文本消息内容不能为空');
		});

		it('应该截断过长的内容', () => {
			const longContent = 'a'.repeat(5000); // 超过4096字符限制
			const inputData: NodeInputData = {
				messageType: MessageType.TEXT,
				content: longContent,
			};

			const result = handler.formatMessage(inputData);

			expect(result.text.content.length).toBeLessThanOrEqual(4096);
			expect(result.text.content).toContain('...(已截断)');
		});
	});

	describe('validateMessage', () => {
		it('应该验证有效的文本消息', () => {
			const message = {
				msgtype: 'text' as const,
				text: {
					content: '这是一条有效的消息',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空内容错误', () => {
			const message = {
				msgtype: 'text' as const,
				text: {
					content: '',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('文本消息内容不能为空');
		});

		it('应该检测内容过长错误', () => {
			const message = {
				msgtype: 'text' as const,
				text: {
					content: 'a'.repeat(5000),
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('不能超过'))).toBe(true);
		});

		it('应该验证有效的@提及用户', () => {
			const message = {
				msgtype: 'text' as const,
				text: {
					content: '测试消息',
					mentioned_list: ['user1', 'user2'],
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(true);
		});

		it('应该检测无效的手机号格式', () => {
			const message = {
				msgtype: 'text' as const,
				text: {
					content: '测试消息',
					mentioned_mobile_list: ['13800138000', '12345678901'],
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('无效的手机号格式'))).toBe(true);
		});
	});

	describe('静态方法', () => {
		it('应该创建@所有人的消息', () => {
			const message = TextMessageHandler.createMentionAllMessage('重要通知');

			expect(message.msgtype).toBe('text');
			expect(message.text.content).toBe('重要通知');
			expect(message.text.mentioned_list).toEqual(['@all']);
		});

		it('应该创建@指定用户的消息', () => {
			const message = TextMessageHandler.createMentionUsersMessage('会议提醒', ['user1', 'user2']);

			expect(message.msgtype).toBe('text');
			expect(message.text.content).toBe('会议提醒');
			expect(message.text.mentioned_list).toEqual(['user1', 'user2']);
		});

		it('应该创建@指定手机号的消息', () => {
			const message = TextMessageHandler.createMentionMobilesMessage('紧急通知', ['13800138000', '13900139000']);

			expect(message.msgtype).toBe('text');
			expect(message.text.content).toBe('紧急通知');
			expect(message.text.mentioned_mobile_list).toEqual(['13800138000', '13900139000']);
		});
	});
});