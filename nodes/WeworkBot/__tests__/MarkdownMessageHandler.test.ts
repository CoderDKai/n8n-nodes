import { MarkdownMessageHandler } from '../MessageHandler';
import { MessageType, NodeInputData } from '../types';

describe('MarkdownMessageHandler', () => {
	let handler: MarkdownMessageHandler;

	beforeEach(() => {
		handler = new MarkdownMessageHandler();
	});

	describe('formatMessage', () => {
		it('应该创建基本的Markdown消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '# 标题\n\n这是一条**重要**的消息',
			};

			const result = handler.formatMessage(inputData);

			expect(result.msgtype).toBe('markdown');
			expect(result.markdown.content).toBe('# 标题\n\n这是一条**重要**的消息');
		});

		it('应该在内容为空时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('Markdown消息内容不能为空');
		});

		it('应该在内容仅包含空白字符时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '   \n\t  ',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('Markdown消息内容不能为空');
		});

		it('应该截断过长的内容', () => {
			const longContent = '# 标题\n\n' + 'a'.repeat(5000);
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: longContent,
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content.length).toBeLessThanOrEqual(4096);
			expect(result.markdown.content).toContain('...(内容已截断)');
		});

		it('应该移除HTML标签', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '这是一条消息<script>alert("test")</script>包含HTML',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('这是一条消息包含HTML');
		});

		it('应该修复无效的链接', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '点击[这里](invalid-url)查看详情',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('点击这里查看详情');
		});

		it('应该保留有效的链接', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '点击[这里](https://example.com)查看详情',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('点击[这里](https://example.com)查看详情');
		});

		it('应该修复不配对的加粗语法', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '这是**重要的消息',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('这是**重要的消息**');
		});

		it('应该修复不配对的斜体语法', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '这是*重要的消息',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('这是*重要的消息*');
		});

		it('应该修复不配对的代码块语法', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '```javascript\nconsole.log("hello");',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('```javascript\nconsole.log("hello");\n```');
		});

		it('应该修复不配对的内联代码语法', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.MARKDOWN,
				markdownContent: '使用`console.log()方法',
			};

			const result = handler.formatMessage(inputData);

			expect(result.markdown.content).toBe('使用`console.log()方法`');
		});
	});

	describe('validateMessage', () => {
		it('应该验证有效的Markdown消息', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: '# 标题\n\n这是一条**重要**的消息',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空内容错误', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: '',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Markdown消息内容不能为空');
		});

		it('应该检测内容过长错误', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: 'a'.repeat(5000),
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('不能超过'))).toBe(true);
		});

		it('应该检测不配对的加粗语法', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: '这是**重要的消息',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Markdown加粗语法(**) 不配对');
		});

		it('应该检测不配对的代码块语法', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: '```javascript\nconsole.log("hello");',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Markdown代码块语法(```) 不配对');
		});

		it('应该检测无效的链接URL', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: '点击[这里](invalid-url)查看',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('链接URL格式无效'))).toBe(true);
		});

		it('应该检测HTML标签', () => {
			const message = {
				msgtype: 'markdown' as const,
				markdown: {
					content: '这是<b>重要</b>的消息',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Markdown内容不应包含HTML标签，企业微信不支持HTML');
		});
	});

	describe('静态方法', () => {
		it('应该创建标准Markdown消息', () => {
			const message = MarkdownMessageHandler.createMarkdownMessage('# 标题\n\n内容');

			expect(message.msgtype).toBe('markdown');
			expect(message.markdown.content).toBe('# 标题\n\n内容');
		});

		it('应该创建带标题的Markdown消息', () => {
			const message = MarkdownMessageHandler.createTitledMarkdownMessage('重要通知', '会议时间变更');

			expect(message.msgtype).toBe('markdown');
			expect(message.markdown.content).toBe('# 重要通知\n\n会议时间变更');
		});

		it('应该创建带链接的Markdown消息', () => {
			const message = MarkdownMessageHandler.createMarkdownWithLink('查看详情', '点击这里', 'https://example.com');

			expect(message.msgtype).toBe('markdown');
			expect(message.markdown.content).toBe('查看详情\n\n[点击这里](https://example.com)');
		});

		it('应该创建代码块消息', () => {
			const message = MarkdownMessageHandler.createCodeBlockMessage('console.log("hello");', 'javascript');

			expect(message.msgtype).toBe('markdown');
			expect(message.markdown.content).toBe('```javascript\nconsole.log("hello");\n```');
		});

		it('应该创建无语言标识的代码块消息', () => {
			const message = MarkdownMessageHandler.createCodeBlockMessage('echo "hello"');

			expect(message.msgtype).toBe('markdown');
			expect(message.markdown.content).toBe('```\necho "hello"\n```');
		});
	});
});