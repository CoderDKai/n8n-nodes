import type { IExecuteFunctions } from 'n8n-workflow';

import { WeworkApiClient } from '../ApiClient';
import { WeworkApiService } from '../WeworkApiService';
import { ErrorHandler } from '../ErrorHandler';
import { WeworkApiError, TextMessage, WeworkApiResponse } from '../types';

const mockWebhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';

const createExecuteFunctionsMock = () => {
	const helpers = {
		httpRequest: jest.fn(),
	};

	return {
		executeFunctions: { helpers } as unknown as IExecuteFunctions,
		helpers,
	};
};

const successResponse = {
	statusCode: 200,
	statusMessage: 'OK',
	headers: {},
	body: { errcode: 0, errmsg: 'ok' },
};

describe('WeworkApiClient', () => {
	let executeFunctions: IExecuteFunctions;
	let helpers: ReturnType<typeof createExecuteFunctionsMock>['helpers'];
	let apiClient: WeworkApiClient;

	beforeEach(() => {
		const mock = createExecuteFunctionsMock();
		executeFunctions = mock.executeFunctions;
		helpers = mock.helpers;
		apiClient = new WeworkApiClient(executeFunctions, { maxRetries: 0, retryDelay: 10 });
	});

	it('应该成功发送文本消息', async () => {
		helpers.httpRequest.mockResolvedValue(successResponse);

		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		const result = await apiClient.sendMessage(mockWebhookUrl, message);

		expect(result.errcode).toBe(0);
		expect(helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: mockWebhookUrl,
				body: message,
				json: true,
			})
		);
	});

	it('应该处理API错误响应', async () => {
		helpers.httpRequest.mockResolvedValue({
			statusCode: 200,
			statusMessage: 'OK',
			headers: {},
			body: { errcode: 93000, errmsg: 'Webhook URL无效或已过期' },
		});

		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		await expect(apiClient.sendMessage(mockWebhookUrl, message)).rejects.toBeInstanceOf(WeworkApiError);
	});

	it('应该处理网络错误并重试', async () => {
		let attempts = 0;
		helpers.httpRequest.mockImplementation(() => {
			attempts++;
			if (attempts < 3) {
				return Promise.reject(new Error('Network error'));
			}
			return Promise.resolve(successResponse);
		});

		const retryClient = new WeworkApiClient(executeFunctions, { maxRetries: 3, retryDelay: 10 }, undefined);

		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		const result = await retryClient.sendMessage(mockWebhookUrl, message);

		expect(result.errcode).toBe(0);
		expect(helpers.httpRequest).toHaveBeenCalledTimes(3);
	});

	it('应该处理超时错误', async () => {
		const timeoutError = new Error('ESOCKETTIMEDOUT');
		timeoutError.name = 'RequestError';
		timeoutError.message = 'Error: ESOCKETTIMEDOUT timeout';
		helpers.httpRequest.mockRejectedValue(timeoutError);

		const shortTimeoutClient = new WeworkApiClient(executeFunctions, { timeout: 50, maxRetries: 0 });

		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		await expect(shortTimeoutClient.sendMessage(mockWebhookUrl, message)).rejects.toThrow('请求超时');
	});

	it('应该在URL无效时抛出错误', async () => {
		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		await expect(apiClient.sendMessage('http://invalid-url.com', message)).rejects.toThrow('无效的webhook URL格式');
		expect(helpers.httpRequest).not.toHaveBeenCalled();
	});

	describe('testConnection', () => {
		it('应该成功测试连接', async () => {
			helpers.httpRequest.mockResolvedValue(successResponse);
			const result = await apiClient.testConnection(mockWebhookUrl);
			expect(result).toBe(true);
		});

		it('应该处理连接测试失败', async () => {
			helpers.httpRequest.mockRejectedValue(new Error('Connection failed'));
			const shortTimeoutClient = new WeworkApiClient(executeFunctions, { timeout: 100, maxRetries: 0 });
			const result = await shortTimeoutClient.testConnection(mockWebhookUrl);
			expect(result).toBe(false);
		});
	});
});

describe('WeworkApiService', () => {
	let executeFunctions: IExecuteFunctions;
	let helpers: ReturnType<typeof createExecuteFunctionsMock>['helpers'];
	let apiService: WeworkApiService;

	beforeEach(() => {
		const mock = createExecuteFunctionsMock();
		executeFunctions = mock.executeFunctions;
		helpers = mock.helpers;
		apiService = new WeworkApiService(
			executeFunctions,
			{
				maxRetries: 0,
				retryDelay: 10,
				enableLogging: false,
			},
			undefined
		);
	});

	it('应该返回格式化的成功结果', async () => {
		helpers.httpRequest.mockResolvedValue(successResponse);

		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		const result = await apiService.sendMessage(mockWebhookUrl, message);

		expect(result.success).toBe(true);
		expect(result.messageType).toBe('text');
		expect(result.errorCode).toBe(0);
	});

	it('应该返回格式化的错误结果', async () => {
		helpers.httpRequest.mockRejectedValue(new Error('Network error'));

		const message: TextMessage = {
			msgtype: 'text',
			text: { content: '测试消息' },
		};

		const result = await apiService.sendMessage(mockWebhookUrl, message);

		expect(result.success).toBe(false);
		expect(result.messageType).toBe('text');
		expect(result.errorMessage).toBeDefined();
	});

	it('应该批量发送多条消息', async () => {
		helpers.httpRequest.mockResolvedValue(successResponse);

		const messages: TextMessage[] = [
			{ msgtype: 'text', text: { content: '消息1' } },
			{ msgtype: 'text', text: { content: '消息2' } },
		];

		const results = await apiService.sendMessages(mockWebhookUrl, messages);

		expect(results).toHaveLength(2);
		expect(results.every(item => item.success)).toBe(true);
	});

	it('应该验证消息内容', async () => {
		const invalidMessage: TextMessage = {
			msgtype: 'text',
			text: { content: '' },
		};

		const result = await apiService.sendMessage(mockWebhookUrl, invalidMessage);
		expect(result.success).toBe(false);
		expect(result.errorMessage).toContain('文本消息内容不能为空');
	});
});

describe('ErrorHandler 基础方法', () => {
	it('createApiError 应该创建API错误对象', () => {
		const response = { errcode: 93000, errmsg: 'Webhook URL无效或已过期' } as WeworkApiResponse;
		const error = ErrorHandler.createApiError(response);

		expect(error).toBeInstanceOf(WeworkApiError);
		expect(error.code).toBe(93000);
		expect(error.message).toBe('Webhook URL无效或已过期');
	});

	it('isRetryableError 应该判断可重试错误', () => {
		const retryableError = new WeworkApiError(45009, '接口调用超过限制');
		const nonRetryableError = new WeworkApiError(93000, 'Webhook URL无效或已过期');

		expect(ErrorHandler.isRetryableError(retryableError)).toBe(true);
		expect(ErrorHandler.isRetryableError(nonRetryableError)).toBe(false);
	});
});
