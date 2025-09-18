import { WeworkApiClient } from '../ApiClient';
import { WeworkApiService } from '../WeworkApiService';
import { ErrorHandler } from '../ErrorHandler';
import { WeworkApiError, TextMessage } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('WeworkApiClient', () => {
	let apiClient: WeworkApiClient;
	const mockWebhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';

	beforeEach(() => {
		apiClient = new WeworkApiClient();
		jest.clearAllMocks();
	});

	describe('sendMessage', () => {
		it('应该成功发送文本消息', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: 'ok' }),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			const result = await apiClient.sendMessage(mockWebhookUrl, message);

			expect(result.errcode).toBe(0);
			expect(result.errmsg).toBe('ok');
			expect(global.fetch).toHaveBeenCalledWith(
				mockWebhookUrl,
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
					}),
					body: JSON.stringify(message),
				})
			);
		});

		it('应该处理API错误响应', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ errcode: 93000, errmsg: 'webhook地址无效' }),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			await expect(apiClient.sendMessage(mockWebhookUrl, message)).rejects.toThrow(WeworkApiError);
		});

		it('应该处理网络错误', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			// 使用短超时的客户端避免测试超时
			const shortTimeoutClient = new WeworkApiClient({ timeout: 100, maxRetries: 1 });
			await expect(shortTimeoutClient.sendMessage(mockWebhookUrl, message)).rejects.toThrow();
		}, 10000);

		it('应该处理超时错误', async () => {
			// 模拟超时
			(global.fetch as jest.Mock).mockImplementation(() => 
				new Promise((_, reject) => {
					const error = new Error('AbortError');
					error.name = 'AbortError';
					setTimeout(() => reject(error), 100);
				})
			);

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			const shortTimeoutClient = new WeworkApiClient({ timeout: 50, maxRetries: 1 });
			await expect(shortTimeoutClient.sendMessage(mockWebhookUrl, message)).rejects.toThrow();
		}, 10000);

		it('应该在可重试错误时进行重试', async () => {
			let callCount = 0;
			(global.fetch as jest.Mock).mockImplementation(() => {
				callCount++;
				if (callCount <= 2) { // 前两次失败
					return Promise.reject(new Error('Network error'));
				}
				return Promise.resolve({
					ok: true,
					status: 200,
					json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: 'ok' }),
					headers: new Headers(),
				});
			});

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			// 使用快速重试的客户端
			const retryClient = new WeworkApiClient({ maxRetries: 3, retryDelay: 10 });
			const result = await retryClient.sendMessage(mockWebhookUrl, message);
			
			expect(callCount).toBe(3);
			expect(result.errcode).toBe(0);
		}, 10000);
	});

	describe('testConnection', () => {
		it('应该成功测试连接', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: 'ok' }),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await apiClient.testConnection(mockWebhookUrl);
			expect(result).toBe(true);
		});

		it('应该处理连接测试失败', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

			const shortTimeoutClient = new WeworkApiClient({ timeout: 100, maxRetries: 1 });
			const result = await shortTimeoutClient.testConnection(mockWebhookUrl);
			expect(result).toBe(false);
		}, 10000);
	});

	describe('URL验证', () => {
		it('应该拒绝无效的URL', async () => {
			const invalidUrl = 'http://invalid-url.com';
			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			await expect(apiClient.sendMessage(invalidUrl, message)).rejects.toThrow('无效的webhook URL格式');
		});

		it('应该拒绝非HTTPS的URL', async () => {
			const httpUrl = 'http://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test';
			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			await expect(apiClient.sendMessage(httpUrl, message)).rejects.toThrow('无效的webhook URL格式');
		});
	});
});

describe('WeworkApiService', () => {
	let apiService: WeworkApiService;
	const mockWebhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';

	beforeEach(() => {
		apiService = new WeworkApiService();
		jest.clearAllMocks();
	});

	describe('sendMessage', () => {
		it('应该返回格式化的成功结果', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: 'ok' }),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			const result = await apiService.sendMessage(mockWebhookUrl, message);

			expect(result.success).toBe(true);
			expect(result.messageType).toBe('text');
			expect(result.errorCode).toBe(0);
			expect(result.messageId).toBeDefined();
			expect(result.timestamp).toBeDefined();
		});

		it('应该返回格式化的错误结果', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const message: TextMessage = {
				msgtype: 'text',
				text: { content: '测试消息' },
			};

			// 使用短超时的服务
			const shortTimeoutService = new WeworkApiService({ timeout: 100, maxRetries: 1 });
			const result = await shortTimeoutService.sendMessage(mockWebhookUrl, message);

			expect(result.success).toBe(false);
			expect(result.messageType).toBe('text');
			expect(result.errorMessage).toBeDefined();
			expect(result.timestamp).toBeDefined();
		}, 10000);
	});

	describe('消息验证', () => {
		it('应该验证文本消息', async () => {
			const invalidMessage: TextMessage = {
				msgtype: 'text',
				text: { content: '' },
			};

			const result = await apiService.sendMessage(mockWebhookUrl, invalidMessage);
			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain('文本消息内容不能为空');
		});

		it('应该验证消息长度', async () => {
			const longContent = 'a'.repeat(5000);
			const invalidMessage: TextMessage = {
				msgtype: 'text',
				text: { content: longContent },
			};

			const result = await apiService.sendMessage(mockWebhookUrl, invalidMessage);
			expect(result.success).toBe(false);
			expect(result.errorMessage).toContain('不能超过4096个字符');
		});
	});

	describe('批量发送', () => {
		it('应该批量发送多条消息', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: 'ok' }),
				headers: new Headers(),
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const messages: TextMessage[] = [
				{ msgtype: 'text', text: { content: '消息1' } },
				{ msgtype: 'text', text: { content: '消息2' } },
			];

			const results = await apiService.sendMessages(mockWebhookUrl, messages);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);
		});
	});
});

describe('ErrorHandler', () => {
	describe('createApiError', () => {
		it('应该创建API错误对象', () => {
			const response = { errcode: 93000, errmsg: 'webhook地址无效' };
			const error = ErrorHandler.createApiError(response);

			expect(error).toBeInstanceOf(WeworkApiError);
			expect(error.code).toBe(93000);
			expect(error.message).toContain('webhook地址无效');
		});
	});

	describe('isRetryableError', () => {
		it('应该正确判断可重试错误', () => {
			const retryableError = new WeworkApiError(45009, '接口调用超过限制');
			const nonRetryableError = new WeworkApiError(93000, 'webhook地址无效');

			expect(ErrorHandler.isRetryableError(retryableError)).toBe(true);
			expect(ErrorHandler.isRetryableError(nonRetryableError)).toBe(false);
		});
	});

	describe('getErrorCategory', () => {
		it('应该正确分类错误', () => {
			const authError = new WeworkApiError(93000, 'webhook地址无效');
			const paramError = new WeworkApiError(40001, '参数错误');
			const networkError = new WeworkApiError(-3, '网络连接失败');

			expect(ErrorHandler.getErrorCategory(authError)).toBe('认证错误');
			expect(ErrorHandler.getErrorCategory(paramError)).toBe('认证错误');
			expect(ErrorHandler.getErrorCategory(networkError)).toBe('网络错误');
		});
	});

	describe('getErrorSeverity', () => {
		it('应该正确判断错误严重程度', () => {
			const criticalError = new WeworkApiError(93000, 'webhook地址无效');
			const highError = new WeworkApiError(44001, '多媒体文件为空');
			const mediumError = new WeworkApiError(45009, '接口调用超过限制');

			expect(ErrorHandler.getErrorSeverity(criticalError)).toBe('critical');
			expect(ErrorHandler.getErrorSeverity(highError)).toBe('high');
			expect(ErrorHandler.getErrorSeverity(mediumError)).toBe('medium');
		});
	});

	describe('formatErrorForDisplay', () => {
		it('应该格式化错误信息用于显示', () => {
			const error = new WeworkApiError(93000, 'webhook地址无效');
			const formatted = ErrorHandler.formatErrorForDisplay(error);

			expect(formatted.title).toBe('错误 93000');
			expect(formatted.message).toBe('webhook地址无效');
			expect(formatted.category).toBe('认证错误');
			expect(formatted.severity).toBe('critical');
			expect(formatted.retryable).toBe(false);
			expect(formatted.suggestion).toBeDefined();
		});
	});
});