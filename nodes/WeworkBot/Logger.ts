/**
 * 企业微信群机器人日志记录器
 * 提供统一的日志记录功能，支持不同级别的日志输出
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	NONE = 4,
}

export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	data?: any;
	context?: string;
	executionId?: string;
	nodeId?: string;
	workflowId?: string;
}

export interface LoggerConfig {
	level: LogLevel;
	enableConsole: boolean;
	enableStructuredLogging: boolean;
	maxLogEntries: number;
	includeStackTrace: boolean;
	maskSensitiveData: boolean;
}

/**
 * 日志记录器类
 */
export class WeworkLogger {
	private config: LoggerConfig;
	private logEntries: LogEntry[] = [];
	private context: string;

	constructor(context: string = 'WeworkBot', config?: Partial<LoggerConfig>) {
		this.context = context;
		this.config = {
			level: LogLevel.INFO,
			enableConsole: true,
			enableStructuredLogging: true,
			maxLogEntries: 1000,
			includeStackTrace: false,
			maskSensitiveData: true,
			...config,
		};
	}

	/**
	 * 记录调试信息
	 */
	debug(message: string, data?: any): void {
		this.log(LogLevel.DEBUG, message, data);
	}

	/**
	 * 记录一般信息
	 */
	info(message: string, data?: any): void {
		this.log(LogLevel.INFO, message, data);
	}

	/**
	 * 记录警告信息
	 */
	warn(message: string, data?: any): void {
		this.log(LogLevel.WARN, message, data);
	}

	/**
	 * 记录错误信息
	 */
	error(message: string, data?: any): void {
		this.log(LogLevel.ERROR, message, data);
	}

	/**
	 * 记录执行开始
	 */
	logExecutionStart(executionId: string, nodeId: string, workflowId: string, inputData: any): void {
		this.info('节点执行开始', {
			executionId,
			nodeId,
			workflowId,
			inputData: this.maskSensitiveData(inputData),
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * 记录执行结束
	 */
	logExecutionEnd(executionId: string, success: boolean, duration: number, outputData?: any, error?: Error): void {
		const logData = {
			executionId,
			success,
			duration: `${duration}ms`,
			timestamp: new Date().toISOString(),
		};

		if (success && outputData) {
			this.info('节点执行成功', {
				...logData,
				outputData: this.maskSensitiveData(outputData),
			});
		} else if (error) {
			this.error('节点执行失败', {
				...logData,
				error: {
					name: error.name,
					message: error.message,
					stack: this.config.includeStackTrace ? error.stack : undefined,
				},
			});
		}
	}

	/**
	 * 记录API请求
	 */
	logApiRequest(method: string, url: string, headers: Record<string, string>, body?: any): void {
		this.debug('发送API请求', {
			method,
			url: this.maskUrl(url),
			headers: this.maskSensitiveHeaders(headers),
			bodySize: body ? `${JSON.stringify(body).length} bytes` : 0,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * 记录API响应
	 */
	logApiResponse(status: number, statusText: string, headers: Record<string, string>, body?: any, duration?: number): void {
		this.debug('收到API响应', {
			status,
			statusText,
			headers: this.maskSensitiveHeaders(headers),
			bodySize: body ? `${JSON.stringify(body).length} bytes` : 0,
			duration: duration ? `${duration}ms` : undefined,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * 记录重试信息
	 */
	logRetry(attempt: number, maxRetries: number, delay: number, error: Error): void {
		this.warn('重试操作', {
			attempt,
			maxRetries,
			delay: `${delay}ms`,
			error: {
				name: error.name,
				message: error.message,
			},
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * 记录性能指标
	 */
	logPerformance(operation: string, duration: number, additionalMetrics?: Record<string, any>): void {
		this.info('性能指标', {
			operation,
			duration: `${duration}ms`,
			...additionalMetrics,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * 记录消息验证结果
	 */
	logValidation(messageType: string, isValid: boolean, errors?: string[]): void {
		if (isValid) {
			this.debug('消息验证通过', {
				messageType,
				timestamp: new Date().toISOString(),
			});
		} else {
			this.warn('消息验证失败', {
				messageType,
				errors,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * 核心日志记录方法
	 */
	private log(level: LogLevel, message: string, data?: any): void {
		// 检查日志级别
		if (level < this.config.level) {
			return;
		}

		const timestamp = new Date().toISOString();
		const levelName = LogLevel[level];

		const logEntry: LogEntry = {
			timestamp,
			level: levelName,
			message,
			data: data ? this.maskSensitiveData(data) : undefined,
			context: this.context,
		};

		// 存储日志条目
		if (this.config.enableStructuredLogging) {
			this.storeLogEntry(logEntry);
		}

		// 控制台输出
		if (this.config.enableConsole) {
			this.outputToConsole(logEntry);
		}
	}

	/**
	 * 存储日志条目
	 */
	private storeLogEntry(entry: LogEntry): void {
		this.logEntries.push(entry);

		// 限制日志条目数量
		if (this.logEntries.length > this.config.maxLogEntries) {
			this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
		}
	}

	/**
	 * 输出到控制台
	 */
	private outputToConsole(entry: LogEntry): void {
		const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.context}]`;
		const message = `${prefix} ${entry.message}`;

		switch (entry.level) {
			case 'DEBUG':
				console.debug(message, entry.data || '');
				break;
			case 'INFO':
				console.info(message, entry.data || '');
				break;
			case 'WARN':
				console.warn(message, entry.data || '');
				break;
			case 'ERROR':
				console.error(message, entry.data || '');
				break;
		}
	}

	/**
	 * 掩码敏感数据
	 */
	private maskSensitiveData(data: any): any {
		if (!this.config.maskSensitiveData) {
			return data;
		}

		if (typeof data !== 'object' || data === null) {
			return data;
		}

		const sensitiveKeys = [
			'webhook', 'webhookUrl', 'key', 'token', 'secret', 'password',
			'authorization', 'auth', 'credential', 'api_key', 'apiKey'
		];

		const masked = Array.isArray(data) ? [...data] : { ...data };

		for (const key in masked) {
			if (sensitiveKeys.some(sensitiveKey => 
				key.toLowerCase().includes(sensitiveKey.toLowerCase())
			)) {
				const value = masked[key];
				if (typeof value === 'string' && value.length > 8) {
					masked[key] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
				} else {
					masked[key] = '****';
				}
			} else if (typeof masked[key] === 'object' && masked[key] !== null) {
				masked[key] = this.maskSensitiveData(masked[key]);
			}
		}

		return masked;
	}

	/**
	 * 掩码URL中的敏感信息
	 */
	private maskUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			const searchParams = new URLSearchParams(urlObj.search);
			
			// 掩码key参数
			if (searchParams.has('key')) {
				const key = searchParams.get('key')!;
				const maskedKey = key.length > 8 
					? key.substring(0, 4) + '****' + key.substring(key.length - 4)
					: '****';
				searchParams.set('key', maskedKey);
			}
			
			urlObj.search = searchParams.toString();
			return urlObj.toString();
		} catch {
			return '****';
		}
	}

	/**
	 * 掩码HTTP头中的敏感信息
	 */
	private maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
		const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
		const masked = { ...headers };

		for (const key in masked) {
			if (sensitiveHeaders.includes(key.toLowerCase())) {
				masked[key] = '****';
			}
		}

		return masked;
	}

	/**
	 * 获取所有日志条目
	 */
	getLogEntries(): LogEntry[] {
		return [...this.logEntries];
	}

	/**
	 * 获取指定级别的日志条目
	 */
	getLogEntriesByLevel(level: LogLevel): LogEntry[] {
		const levelName = LogLevel[level];
		return this.logEntries.filter(entry => entry.level === levelName);
	}

	/**
	 * 清空日志条目
	 */
	clearLogEntries(): void {
		this.logEntries = [];
	}

	/**
	 * 获取日志统计信息
	 */
	getLogStats(): {
		totalEntries: number;
		entriesByLevel: Record<string, number>;
		oldestEntry?: string;
		newestEntry?: string;
	} {
		const entriesByLevel: Record<string, number> = {};
		
		for (const entry of this.logEntries) {
			entriesByLevel[entry.level] = (entriesByLevel[entry.level] || 0) + 1;
		}

		return {
			totalEntries: this.logEntries.length,
			entriesByLevel,
			oldestEntry: this.logEntries[0]?.timestamp,
			newestEntry: this.logEntries[this.logEntries.length - 1]?.timestamp,
		};
	}

	/**
	 * 设置日志级别
	 */
	setLogLevel(level: LogLevel): void {
		this.config.level = level;
	}

	/**
	 * 设置执行上下文
	 */
	setExecutionContext(executionId: string, nodeId: string, workflowId: string): void {
		this.logEntries.forEach(entry => {
			if (!entry.executionId) {
				entry.executionId = executionId;
				entry.nodeId = nodeId;
				entry.workflowId = workflowId;
			}
		});
	}

	/**
	 * 创建子日志记录器
	 */
	createChildLogger(context: string): WeworkLogger {
		return new WeworkLogger(`${this.context}:${context}`, this.config);
	}

	/**
	 * 导出日志为JSON格式
	 */
	exportLogsAsJson(): string {
		return JSON.stringify({
			config: this.config,
			stats: this.getLogStats(),
			entries: this.logEntries,
		}, null, 2);
	}

	/**
	 * 导出日志为文本格式
	 */
	exportLogsAsText(): string {
		return this.logEntries
			.map(entry => {
				const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
				return `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}${data}`;
			})
			.join('\n');
	}
}

/**
 * 创建默认日志记录器实例
 */
export function createLogger(context: string = 'WeworkBot', config?: Partial<LoggerConfig>): WeworkLogger {
	return new WeworkLogger(context, config);
}

/**
 * 全局日志记录器实例
 */
export const defaultLogger = createLogger();