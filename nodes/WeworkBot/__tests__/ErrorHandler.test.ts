import { ErrorHandler } from '../ErrorHandler';
import { WeworkApiError, WeworkApiResponse } from '../types';

describe('ErrorHandler', () => {
	describe('错误创建', () => {
		it('应该从API响应创建错误对象', () => {
			const response: WeworkApiResponse = {
				errcode: 93000,
				errmsg: 'webhook地址无效',
			};

			const error = ErrorHandler.createApiError(response);

			expect(error).toBeInstanceOf(WeworkApiError);
			expect(error.code).toBe(93000);
			expect(error.message).toBe('webhook地址无效或已过期，请重新配置群机器人');
		});

		it('应该从通用错误创建API错误对象', () => {
			const genericError = new Error('网络连接失败');
			const apiError = ErrorHandler.createGenericError(genericError);

			expect(apiError).toBeInstanceOf(WeworkApiError);
			expect(apiError.code).toBe(-3);
			expect(apiError.message).toBe('网络连接失败，请检查网络设置');
		});
	});

	describe('错误分类', () => {
		it('应该正确判断错误是否可重试', () => {
			const retryableError = new WeworkApiError(-1, '系统繁忙');
			const nonRetryableError = new WeworkApiError(93000, 'webhook地址无效');

			expect(ErrorHandler.isRetryableError(retryableError)).toBe(true);
			expect(ErrorHandler.isRetryableError(nonRetryableError)).toBe(false);
		});

		it('应该正确获取错误严重程度', () => {
			const criticalError = new WeworkApiError(93000, 'webhook地址无效');
			const lowError = new WeworkApiError(-1, '系统繁忙');

			expect(ErrorHandler.getErrorSeverity(criticalError)).toBe('critical');
			expect(ErrorHandler.getErrorSeverity(lowError)).toBe('low');
		});

		it('应该正确获取错误分类', () => {
			const authError = new WeworkApiError(93000, 'webhook地址无效');
			const networkError = new WeworkApiError(-3, '网络连接失败');

			expect(ErrorHandler.getErrorCategory(authError)).toBe('认证错误');
			expect(ErrorHandler.getErrorCategory(networkError)).toBe('网络错误');
		});
	});

	describe('重试策略', () => {
		it('应该计算正确的重试延迟', () => {
			const delay1 = ErrorHandler.calculateRetryDelay(1);
			const delay2 = ErrorHandler.calculateRetryDelay(2);
			const delay3 = ErrorHandler.calculateRetryDelay(3);

			expect(delay1).toBeGreaterThanOrEqual(900); // 1000ms ± 10% jitter
			expect(delay1).toBeLessThanOrEqual(1100);
			expect(delay2).toBeGreaterThanOrEqual(1800); // 2000ms ± 10% jitter
			expect(delay2).toBeLessThanOrEqual(2200);
			expect(delay3).toBeGreaterThanOrEqual(3600); // 4000ms ± 10% jitter
			expect(delay3).toBeLessThanOrEqual(4400);
		});

		it('应该根据错误严重程度返回不同的重试配置', () => {
			const criticalError = new WeworkApiError(93000, 'webhook地址无效');
			const lowError = new WeworkApiError(-1, '系统繁忙');

			const criticalConfig = ErrorHandler.getRetryConfig(criticalError);
			const lowConfig = ErrorHandler.getRetryConfig(lowError);

			expect(criticalConfig.maxRetries).toBe(1);
			expect(lowConfig.maxRetries).toBe(5);
		});
	});

	describe('错误统计', () => {
		beforeEach(() => {
			ErrorHandler.resetErrorStats();
		});

		it('应该正确记录错误统计', () => {
			const error1 = new WeworkApiError(93000, 'webhook地址无效');
			const error2 = new WeworkApiError(-1, '系统繁忙');

			ErrorHandler.recordError(error1);
			ErrorHandler.recordError(error2, true);

			const stats = ErrorHandler.getErrorStats();

			expect(stats.totalErrors).toBe(2);
			expect(stats.errorsByCode[93000]).toBe(1);
			expect(stats.errorsByCode[-1]).toBe(1);
			expect(stats.retryAttempts).toBe(1);
		});

		it('应该正确记录成功的重试', () => {
			ErrorHandler.recordSuccessfulRetry();
			ErrorHandler.recordSuccessfulRetry();

			const stats = ErrorHandler.getErrorStats();
			expect(stats.successfulRetries).toBe(2);
		});
	});

	describe('错误上下文', () => {
		it('应该创建完整的错误上下文信息', () => {
			const error = new WeworkApiError(93000, 'webhook地址无效');
			const context = ErrorHandler.createErrorContext(error, { 
				requestId: 'req-123' 
			});

			expect(context.errorCode).toBe(93000);
			expect(context.errorMessage).toBe('webhook地址无效');
			expect(context.errorCategory).toBe('认证错误');
			expect(context.errorSeverity).toBe('critical');
			expect(context.isRetryable).toBe(false);
			expect(context.requestId).toBe('req-123');
			expect(context.timestamp).toBeDefined();
		});
	});

	describe('withRetry包装器', () => {
		it('应该在成功时返回结果', async () => {
			const operation = jest.fn().mockResolvedValue('success');
			
			const result = await ErrorHandler.withRetry(operation);
			
			expect(result).toBe('success');
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it('应该在可重试错误时进行重试', async () => {
			const retryableError = new WeworkApiError(-1, '系统繁忙');
			const operation = jest.fn()
				.mockRejectedValueOnce(retryableError)
				.mockRejectedValueOnce(retryableError)
				.mockResolvedValue('success');
			
			const result = await ErrorHandler.withRetry(operation, { maxRetries: 3 });
			
			expect(result).toBe('success');
			expect(operation).toHaveBeenCalledTimes(3);
		});

		it('应该在不可重试错误时立即失败', async () => {
			const nonRetryableError = new WeworkApiError(93000, 'webhook地址无效');
			const operation = jest.fn().mockRejectedValue(nonRetryableError);
			
			await expect(ErrorHandler.withRetry(operation)).rejects.toThrow(nonRetryableError);
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it('应该在达到最大重试次数后失败', async () => {
			const retryableError = new WeworkApiError(-1, '系统繁忙');
			const operation = jest.fn().mockRejectedValue(retryableError);
			
			await expect(ErrorHandler.withRetry(operation, { maxRetries: 2 })).rejects.toThrow(retryableError);
			expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
		});
	});
});