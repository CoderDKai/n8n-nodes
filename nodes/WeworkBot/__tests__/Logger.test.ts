import { WeworkLogger, LogLevel, createLogger } from '../Logger';

describe('WeworkLogger', () => {
	let logger: WeworkLogger;

	beforeEach(() => {
		logger = createLogger('TestLogger', {
			level: LogLevel.DEBUG,
			enableConsole: false, // 禁用控制台输出以避免测试噪音
			enableStructuredLogging: true,
			maxLogEntries: 100,
			includeStackTrace: false,
			maskSensitiveData: true,
		});
	});

	describe('基本日志记录', () => {
		it('应该记录不同级别的日志', () => {
			logger.debug('Debug message');
			logger.info('Info message');
			logger.warn('Warn message');
			logger.error('Error message');

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(4);
			expect(entries[0].level).toBe('DEBUG');
			expect(entries[1].level).toBe('INFO');
			expect(entries[2].level).toBe('WARN');
			expect(entries[3].level).toBe('ERROR');
		});

		it('应该根据日志级别过滤日志', () => {
			const infoLogger = createLogger('InfoLogger', {
				level: LogLevel.INFO,
				enableConsole: false,
				enableStructuredLogging: true,
			});

			infoLogger.debug('Debug message'); // 应该被过滤
			infoLogger.info('Info message');
			infoLogger.warn('Warn message');
			infoLogger.error('Error message');

			const entries = infoLogger.getLogEntries();
			expect(entries).toHaveLength(3);
			expect(entries.find(e => e.level === 'DEBUG')).toBeUndefined();
		});
	});

	describe('执行日志记录', () => {
		it('应该记录执行开始和结束', () => {
			const executionId = 'exec-123';
			const nodeId = 'node-456';
			const workflowId = 'workflow-789';

			logger.logExecutionStart(executionId, nodeId, workflowId, { test: 'data' });
			logger.logExecutionEnd(executionId, true, 1000, { result: 'success' });

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(2);
			expect(entries[0].message).toBe('节点执行开始');
			expect(entries[1].message).toBe('节点执行成功');
		});

		it('应该记录执行失败', () => {
			const executionId = 'exec-123';
			const error = new Error('Test error');

			logger.logExecutionEnd(executionId, false, 1000, undefined, error);

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(1);
			expect(entries[0].message).toBe('节点执行失败');
			expect(entries[0].data.error.message).toBe('Test error');
		});
	});

	describe('API日志记录', () => {
		it('应该记录API请求和响应', () => {
			logger.logApiRequest('POST', 'https://api.example.com', { 'Content-Type': 'application/json' }, { test: 'data' });
			logger.logApiResponse(200, 'OK', { 'Content-Type': 'application/json' }, { result: 'success' }, 500);

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(2);
			expect(entries[0].message).toBe('发送API请求');
			expect(entries[1].message).toBe('收到API响应');
		});
	});

	describe('重试日志记录', () => {
		it('应该记录重试信息', () => {
			const error = new Error('Network error');
			logger.logRetry(2, 3, 1000, error);

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(1);
			expect(entries[0].message).toBe('重试操作');
			expect(entries[0].data.attempt).toBe(2);
			expect(entries[0].data.maxRetries).toBe(3);
			expect(entries[0].data.delay).toBe('1000ms');
		});
	});

	describe('性能日志记录', () => {
		it('应该记录性能指标', () => {
			logger.logPerformance('testOperation', 1500, { itemCount: 10 });

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(1);
			expect(entries[0].message).toBe('性能指标');
			expect(entries[0].data.operation).toBe('testOperation');
			expect(entries[0].data.duration).toBe('1500ms');
			expect(entries[0].data.itemCount).toBe(10);
		});
	});

	describe('消息验证日志记录', () => {
		it('应该记录验证成功', () => {
			logger.logValidation('text', true);

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(1);
			expect(entries[0].message).toBe('消息验证通过');
			expect(entries[0].data.messageType).toBe('text');
		});

		it('应该记录验证失败', () => {
			logger.logValidation('text', false, ['内容不能为空', '长度超限']);

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(1);
			expect(entries[0].message).toBe('消息验证失败');
			expect(entries[0].data.errors).toEqual(['内容不能为空', '长度超限']);
		});
	});

	describe('敏感数据掩码', () => {
		it('应该掩码敏感字段', () => {
			const sensitiveData = {
				webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=12345678901234567890',
				token: 'secret-token-123456',
				normalField: 'normal-value',
			};

			logger.info('Test with sensitive data', sensitiveData);

			const entries = logger.getLogEntries();
			// webhookUrl会被掩码为URL格式，所以检查是否包含****
			expect(entries[0].data.webhookUrl).toContain('****');
			expect(entries[0].data.token).toBe('secr****3456');
			expect(entries[0].data.normalField).toBe('normal-value');
		});

		it('应该掩码URL中的敏感参数', () => {
			const url = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=12345678901234567890';
			
			// 通过反射访问私有方法进行测试
			const maskedUrl = (logger as any).maskUrl(url);
			
			expect(maskedUrl).toContain('1234****7890');
		});
	});

	describe('日志统计', () => {
		it('应该提供正确的日志统计信息', () => {
			logger.debug('Debug message');
			logger.info('Info message');
			logger.warn('Warn message');
			logger.error('Error message');

			const stats = logger.getLogStats();
			expect(stats.totalEntries).toBe(4);
			expect(stats.entriesByLevel.DEBUG).toBe(1);
			expect(stats.entriesByLevel.INFO).toBe(1);
			expect(stats.entriesByLevel.WARN).toBe(1);
			expect(stats.entriesByLevel.ERROR).toBe(1);
		});

		it('应该按级别过滤日志条目', () => {
			logger.debug('Debug message');
			logger.info('Info message');
			logger.warn('Warn message');
			logger.error('Error message');

			const errorEntries = logger.getLogEntriesByLevel(LogLevel.ERROR);
			expect(errorEntries).toHaveLength(1);
			expect(errorEntries[0].level).toBe('ERROR');
		});
	});

	describe('日志导出', () => {
		it('应该导出JSON格式的日志', () => {
			logger.info('Test message', { test: 'data' });

			const jsonLogs = logger.exportLogsAsJson();
			const parsed = JSON.parse(jsonLogs);

			expect(parsed.entries).toHaveLength(1);
			expect(parsed.entries[0].message).toBe('Test message');
			expect(parsed.stats.totalEntries).toBe(1);
		});

		it('应该导出文本格式的日志', () => {
			logger.info('Test message', { test: 'data' });

			const textLogs = logger.exportLogsAsText();
			
			expect(textLogs).toContain('[INFO]');
			expect(textLogs).toContain('[TestLogger]');
			expect(textLogs).toContain('Test message');
		});
	});

	describe('子日志记录器', () => {
		it('应该创建带有正确上下文的子日志记录器', () => {
			const childLogger = logger.createChildLogger('Child');

			childLogger.info('Child message');

			const entries = childLogger.getLogEntries();
			expect(entries[0].context).toBe('TestLogger:Child');
		});
	});

	describe('执行上下文', () => {
		it('应该设置执行上下文', () => {
			logger.info('Before context');
			logger.setExecutionContext('exec-123', 'node-456', 'workflow-789');

			const entries = logger.getLogEntries();
			expect(entries[0].executionId).toBe('exec-123');
			expect(entries[0].nodeId).toBe('node-456');
			expect(entries[0].workflowId).toBe('workflow-789');
		});
	});

	describe('日志级别管理', () => {
		it('应该动态设置日志级别', () => {
			logger.setLogLevel(LogLevel.WARN);
			
			logger.debug('Debug message'); // 应该被过滤
			logger.info('Info message');   // 应该被过滤
			logger.warn('Warn message');
			logger.error('Error message');

			const entries = logger.getLogEntries();
			expect(entries).toHaveLength(2);
			expect(entries[0].level).toBe('WARN');
			expect(entries[1].level).toBe('ERROR');
		});
	});
});