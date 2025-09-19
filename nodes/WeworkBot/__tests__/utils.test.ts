import { ErrorHandler, MessageValidator, Utils } from '../utils';
import { WeworkApiError, TextMessage, MarkdownMessage, ImageMessage, NewsMessage, FileMessage } from '../types';

describe('Utils', () => {
	describe('calculateMD5', () => {
		it('应该计算字符串的MD5哈希值', () => {
			const result = Utils.calculateMD5('hello world');
			expect(result).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
			expect(result).toHaveLength(32);
		});

		it('应该为相同内容返回相同的MD5', () => {
			const content = 'test content';
			const result1 = Utils.calculateMD5(content);
			const result2 = Utils.calculateMD5(content);
			expect(result1).toBe(result2);
		});

		it('应该为不同内容返回不同的MD5', () => {
			const result1 = Utils.calculateMD5('content1');
			const result2 = Utils.calculateMD5('content2');
			expect(result1).not.toBe(result2);
		});

		it('应该处理空字符串', () => {
			const result = Utils.calculateMD5('');
			expect(result).toBe('d41d8cd98f00b204e9800998ecf8427e');
		});

		it('应该处理中文字符', () => {
			const result = Utils.calculateMD5('你好世界');
			expect(result).toHaveLength(32);
			expect(typeof result).toBe('string');
		});
	});

	describe('calculateBase64MD5', () => {
		it('应该计算base64字符串的MD5哈希值', () => {
			const base64 = Buffer.from('hello world').toString('base64');
			const result = Utils.calculateBase64MD5(base64);
			expect(result).toHaveLength(32);
			expect(typeof result).toBe('string');
		});

		it('应该为相同base64返回相同的MD5', () => {
			const base64 = Buffer.from('test content').toString('base64');
			const result1 = Utils.calculateBase64MD5(base64);
			const result2 = Utils.calculateBase64MD5(base64);
			expect(result1).toBe(result2);
		});

		it('应该处理空base64字符串', () => {
			const emptyBase64 = Buffer.from('').toString('base64');
			const result = Utils.calculateBase64MD5(emptyBase64);
			expect(result).toHaveLength(32);
		});
	});

	describe('delay', () => {
		it('应该延迟指定的毫秒数', async () => {
			const startTime = Date.now();
			await Utils.delay(100);
			const endTime = Date.now();
			const elapsed = endTime - startTime;
			
			// 允许一些时间误差
			expect(elapsed).toBeGreaterThanOrEqual(90);
			expect(elapsed).toBeLessThan(150);
		});

		it('应该处理0毫秒延迟', async () => {
			const startTime = Date.now();
			await Utils.delay(0);
			const endTime = Date.now();
			const elapsed = endTime - startTime;
			
			expect(elapsed).toBeLessThan(10);
		});
	});

	describe('formatTimestamp', () => {
		it('应该格式化时间戳为ISO字符串', () => {
			const timestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
			const result = Utils.formatTimestamp(timestamp);
			expect(result).toBe('2022-01-01T00:00:00.000Z');
		});

		it('应该处理当前时间戳', () => {
			const now = Date.now();
			const result = Utils.formatTimestamp(now);
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});
	});

	describe('isEmptyOrWhitespace', () => {
		it('应该检测空字符串', () => {
			expect(Utils.isEmptyOrWhitespace('')).toBe(true);
		});

		it('应该检测null和undefined', () => {
			expect(Utils.isEmptyOrWhitespace(null)).toBe(true);
			expect(Utils.isEmptyOrWhitespace(undefined)).toBe(true);
		});

		it('应该检测仅包含空白字符的字符串', () => {
			expect(Utils.isEmptyOrWhitespace('   ')).toBe(true);
			expect(Utils.isEmptyOrWhitespace('\n\t  ')).toBe(true);
			expect(Utils.isEmptyOrWhitespace('\r\n')).toBe(true);
		});

		it('应该识别有效内容', () => {
			expect(Utils.isEmptyOrWhitespace('hello')).toBe(false);
			expect(Utils.isEmptyOrWhitespace(' hello ')).toBe(false);
			expect(Utils.isEmptyOrWhitespace('0')).toBe(false);
		});
	});

	describe('safeJsonParse', () => {
		it('应该解析有效的JSON字符串', () => {
			const jsonString = '{"name": "test", "value": 123}';
			const result = Utils.safeJsonParse(jsonString, {});
			expect(result).toEqual({ name: 'test', value: 123 });
		});

		it('应该在JSON无效时返回默认值', () => {
			const invalidJson = '{"invalid": json}';
			const defaultValue = { error: true };
			const result = Utils.safeJsonParse(invalidJson, defaultValue);
			expect(result).toBe(defaultValue);
		});

		it('应该处理空字符串', () => {
			const defaultValue = { empty: true };
			const result = Utils.safeJsonParse('', defaultValue);
			expect(result).toBe(defaultValue);
		});

		it('应该处理不同类型的默认值', () => {
			expect(Utils.safeJsonParse('invalid', null)).toBe(null);
			expect(Utils.safeJsonParse('invalid', [])).toEqual([]);
			expect(Utils.safeJsonParse('invalid', 'default')).toBe('default');
		});
	});

	describe('truncateString', () => {
		it('应该截断超长字符串', () => {
			const longString = 'a'.repeat(100);
			const result = Utils.truncateString(longString, 50);
			expect(result.length).toBe(50);
			expect(result).toContain('...');
		});

		it('应该保留短字符串不变', () => {
			const shortString = 'hello world';
			const result = Utils.truncateString(shortString, 50);
			expect(result).toBe(shortString);
		});

		it('应该使用自定义后缀', () => {
			const longString = 'a'.repeat(100);
			const result = Utils.truncateString(longString, 50, ' (truncated)');
			expect(result.length).toBe(50);
			expect(result).toContain(' (truncated)');
		});

		it('应该处理边界情况', () => {
			const string = 'hello';
			const result = Utils.truncateString(string, 5);
			expect(result).toBe('hello');
		});

		it('应该处理最大长度小于后缀长度的情况', () => {
			const string = 'hello world';
			const result = Utils.truncateString(string, 2, '...');
			// 当最大长度小于后缀长度时，应该返回截断的字符串（可能会超过maxLength）
			expect(result.length).toBeGreaterThan(0);
			expect(result).toContain('...');
		});
	});
});

describe('MessageValidator', () => {
	describe('validateTextMessage', () => {
		it('应该验证有效的文本消息', () => {
			const message: TextMessage = {
				msgtype: 'text',
				text: {
					content: '这是一条有效的消息',
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测消息类型错误', () => {
			const message = {
				msgtype: 'invalid',
				text: {
					content: '测试消息',
				},
			} as any;

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('消息类型必须是text');
		});

		it('应该检测空内容', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: '',
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('文本消息内容不能为空');
		});

		it('应该检测仅包含空白字符的内容', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: '   \n\t  ',
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('文本消息内容不能仅包含空白字符');
		});

		it('应该检测内容过长', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: 'a'.repeat(5000),
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('不能超过'))).toBe(true);
		});

		it('应该验证@提及用户列表格式', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: '测试消息',
					mentioned_list: 'not-an-array' as any,
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('@提及用户列表必须是数组格式');
		});

		it('应该检测重复的@提及用户', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: '测试消息',
					mentioned_list: ['user1', 'user2', 'user1'],
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('@提及用户列表中存在重复用户');
		});

		it('应该检测空的用户ID', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: '测试消息',
					mentioned_list: ['user1', '', 'user2'],
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('@提及用户ID不能为空');
		});

		it('应该验证手机号格式', () => {
			const message: Partial<TextMessage> = {
				msgtype: 'text',
				text: {
					content: '测试消息',
					mentioned_mobile_list: ['13800138000', '12345678901'],
				},
			};

			const result = MessageValidator.validateTextMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('无效的手机号格式'))).toBe(true);
		});
	});

	describe('validateMarkdownMessage', () => {
		it('应该验证有效的Markdown消息', () => {
			const message: MarkdownMessage = {
				msgtype: 'markdown',
				markdown: {
					content: '# 标题\n\n这是**重要**的内容',
				},
			};

			const result = MessageValidator.validateMarkdownMessage(message);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测Markdown语法错误', () => {
			const message: Partial<MarkdownMessage> = {
				msgtype: 'markdown',
				markdown: {
					content: '这是**不配对的加粗语法',
				},
			};

			const result = MessageValidator.validateMarkdownMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Markdown加粗语法(**) 不配对');
		});

		it('应该检测无效的链接URL', () => {
			const message: Partial<MarkdownMessage> = {
				msgtype: 'markdown',
				markdown: {
					content: '点击[这里](invalid-url)查看',
				},
			};

			const result = MessageValidator.validateMarkdownMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('链接URL格式无效'))).toBe(true);
		});

		it('应该检测HTML标签', () => {
			const message: Partial<MarkdownMessage> = {
				msgtype: 'markdown',
				markdown: {
					content: '这是<b>HTML</b>标签',
				},
			};

			const result = MessageValidator.validateMarkdownMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Markdown内容不应包含HTML标签，企业微信不支持HTML');
		});
	});

	describe('validateImageMessage', () => {
		it('应该验证有效的图片消息', () => {
			const message: ImageMessage = {
				msgtype: 'image',
				image: {
					base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==',
					md5: 'dummy-md5-hash',
				},
			};

			const result = MessageValidator.validateImageMessage(message);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空base64', () => {
			const message: Partial<ImageMessage> = {
				msgtype: 'image',
				image: {
					base64: '',
					md5: 'dummy-md5-hash',
				},
			};

			const result = MessageValidator.validateImageMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('图片base64编码不能为空');
		});

		it('应该检测空MD5', () => {
			const message: Partial<ImageMessage> = {
				msgtype: 'image',
				image: {
					base64: 'valid-base64',
					md5: '',
				},
			};

			const result = MessageValidator.validateImageMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('图片MD5值不能为空');
		});
	});

	describe('validateNewsMessage', () => {
		it('应该验证有效的图文消息', () => {
			const message: NewsMessage = {
				msgtype: 'news',
				news: {
					articles: [{
						title: '测试文章',
						url: 'https://example.com',
						description: '测试描述',
					}],
				},
			};

			const result = MessageValidator.validateNewsMessage(message);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空文章列表', () => {
			const message: Partial<NewsMessage> = {
				msgtype: 'news',
				news: {
					articles: [],
				},
			};

			const result = MessageValidator.validateNewsMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('图文消息至少需要包含一篇文章');
		});

		it('应该检测文章数量超限', () => {
			const message: Partial<NewsMessage> = {
				msgtype: 'news',
				news: {
					articles: Array(10).fill({
						title: '测试文章',
						url: 'https://example.com',
					}),
				},
			};

			const result = MessageValidator.validateNewsMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('不能超过8篇'))).toBe(true);
		});
	});

	describe('validateFileMessage', () => {
		it('应该验证有效的文件消息', () => {
			const message: FileMessage = {
				msgtype: 'file',
				file: {
					media_id: 'valid-media-id-123',
				},
			};

			const result = MessageValidator.validateFileMessage(message);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空media_id', () => {
			const message: Partial<FileMessage> = {
				msgtype: 'file',
				file: {
					media_id: '',
				},
			};

			const result = MessageValidator.validateFileMessage(message);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('文件media_id不能为空');
		});
	});

	describe('validateUrl', () => {
		it('应该验证有效的HTTP URL', () => {
			expect(MessageValidator.validateUrl('http://example.com')).toBe(true);
			expect(MessageValidator.validateUrl('https://example.com')).toBe(true);
			expect(MessageValidator.validateUrl('https://example.com/path?query=value')).toBe(true);
		});

		it('应该拒绝无效的URL', () => {
			expect(MessageValidator.validateUrl('invalid-url')).toBe(false);
			expect(MessageValidator.validateUrl('ftp://example.com')).toBe(false);
			expect(MessageValidator.validateUrl('')).toBe(false);
		});
	});
});

describe('ErrorHandler', () => {
	describe('handleApiError', () => {
		it('应该处理已知的API错误码', () => {
			const error = {
				response: {
					data: {
						errcode: 93000,
						errmsg: 'webhook地址无效',
					},
				},
			};

			const result = ErrorHandler.handleApiError(error);
			expect(result).toBeInstanceOf(WeworkApiError);
			expect(result.code).toBe(93000);
			expect(result.message).toBe('Webhook URL无效或已过期');
		});

		it('应该处理未知的API错误码', () => {
			const error = {
				response: {
					data: {
						errcode: 99999,
						errmsg: '未知错误',
					},
				},
			};

			const result = ErrorHandler.handleApiError(error);
			expect(result).toBeInstanceOf(WeworkApiError);
			expect(result.code).toBe(99999);
			expect(result.message).toBe('未知错误');
		});

		it('应该处理没有响应数据的错误', () => {
			const error = new Error('网络连接失败');

			const result = ErrorHandler.handleApiError(error);
			expect(result).toBeInstanceOf(WeworkApiError);
			expect(result.code).toBe(-1);
			expect(result.message).toBe('网络连接失败');
		});

		it('应该处理特定的错误码映射', () => {
			const testCases = [
				{ code: 45009, expectedMessage: '接口调用超过限制' },
				{ code: 40001, expectedMessage: '参数错误' },
			];

			testCases.forEach(({ code, expectedMessage }) => {
				const error = {
					response: {
						data: {
							errcode: code,
							errmsg: 'original message',
						},
					},
				};

				const result = ErrorHandler.handleApiError(error);
				expect(result.code).toBe(code);
				expect(result.message).toBe(expectedMessage);
			});
		});
	});

	describe('shouldRetry', () => {
		it('应该判断可重试的错误', () => {
			const retryableErrors = [
				new WeworkApiError(-1, '系统繁忙'),
				new WeworkApiError(45009, '接口调用超过限制'),
			];

			retryableErrors.forEach(error => {
				expect(ErrorHandler.shouldRetry(error)).toBe(true);
			});
		});

		it('应该判断不可重试的错误', () => {
			const nonRetryableErrors = [
				new WeworkApiError(93000, 'Webhook URL无效'),
				new WeworkApiError(40001, '参数错误'),
			];

			nonRetryableErrors.forEach(error => {
				expect(ErrorHandler.shouldRetry(error)).toBe(false);
			});
		});
	});
});