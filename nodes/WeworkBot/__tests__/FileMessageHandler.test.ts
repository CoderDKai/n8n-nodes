import { FileMessageHandler } from '../MessageHandler';
import { MessageType, NodeInputData } from '../types';

describe('FileMessageHandler', () => {
	let handler: FileMessageHandler;

	const validMediaId = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

	beforeEach(() => {
		handler = new FileMessageHandler();
	});

	describe('formatMessage', () => {
		it('应该创建基本的文件消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: validMediaId,
			};

			const result = handler.formatMessage(inputData);

			expect(result.msgtype).toBe('file');
			expect(result.file.media_id).toBe(validMediaId);
		});

		it('应该在media_id为空时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: '',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('文件media_id不能为空');
		});

		it('应该在media_id仅包含空白字符时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: '   \n\t  ',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('文件media_id不能为空');
		});

		it('应该在media_id格式无效时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: 'invalid@media#id!',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('无效的文件media_id格式');
		});

		it('应该在media_id过短时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: 'short',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('无效的文件media_id格式');
		});

		it('应该在media_id过长时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: 'a'.repeat(101), // 超过100字符限制
			};

			expect(() => handler.formatMessage(inputData)).toThrow('无效的文件media_id格式');
		});

		it('应该接受有效的media_id格式', () => {
			const validMediaIds = [
				'abc123def456ghi789',
				'media_id_with_underscores',
				'media-id-with-hyphens',
				'MixedCaseMediaId123',
				'1234567890abcdef',
			];

			validMediaIds.forEach(mediaId => {
				const inputData: NodeInputData = {
					messageType: MessageType.FILE,
					fileMediaId: mediaId,
				};

				expect(() => handler.formatMessage(inputData)).not.toThrow();
			});
		});

		it('应该去除media_id前后的空白字符', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: `  ${validMediaId}  `,
			};

			const result = handler.formatMessage(inputData);

			expect(result.file.media_id).toBe(validMediaId);
		});
	});

	describe('validateMessage', () => {
		it('应该验证有效的文件消息', () => {
			const message = {
				msgtype: 'file' as const,
				file: {
					media_id: validMediaId,
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空media_id错误', () => {
			const message = {
				msgtype: 'file' as const,
				file: {
					media_id: '',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('文件media_id不能为空');
		});
	});

	describe('静态方法', () => {
		it('应该创建文件消息', () => {
			const message = FileMessageHandler.createFileMessage(validMediaId);

			expect(message.msgtype).toBe('file');
			expect(message.file.media_id).toBe(validMediaId);
		});

		it('应该验证支持的文件类型', () => {
			const supportedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
			const unsupportedTypes = ['exe', 'bat', 'sh', 'unknown'];

			supportedTypes.forEach(type => {
				expect(FileMessageHandler.isSupportedFileType(type)).toBe(true);
			});

			unsupportedTypes.forEach(type => {
				expect(FileMessageHandler.isSupportedFileType(type)).toBe(false);
			});
		});

		it('应该验证文件大小', () => {
			const validSize = 10 * 1024 * 1024; // 10MB
			const invalidSize = 25 * 1024 * 1024; // 25MB

			expect(FileMessageHandler.isValidFileSize(validSize)).toBe(true);
			expect(FileMessageHandler.isValidFileSize(invalidSize)).toBe(false);
		});

		it('应该获取支持的文件类型列表', () => {
			const types = FileMessageHandler.getSupportedFileTypes();

			expect(Array.isArray(types)).toBe(true);
			expect(types.length).toBeGreaterThan(0);
			expect(types).toContain('pdf');
			expect(types).toContain('doc');
		});

		it('应该获取最大文件大小', () => {
			const maxSize = FileMessageHandler.getMaxFileSize();

			expect(typeof maxSize).toBe('number');
			expect(maxSize).toBe(20 * 1024 * 1024);
		});

		it('应该格式化文件大小', () => {
			expect(FileMessageHandler.formatFileSize(1024)).toBe('1.00 KB');
			expect(FileMessageHandler.formatFileSize(1024 * 1024)).toBe('1.00 MB');
			expect(FileMessageHandler.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
			expect(FileMessageHandler.formatFileSize(500)).toBe('500.00 B');
		});

		it('应该提取文件扩展名', () => {
			expect(FileMessageHandler.getFileExtension('document.pdf')).toBe('pdf');
			expect(FileMessageHandler.getFileExtension('image.JPG')).toBe('jpg');
			expect(FileMessageHandler.getFileExtension('file.name.with.dots.txt')).toBe('txt');
			expect(FileMessageHandler.getFileExtension('noextension')).toBe('');
			expect(FileMessageHandler.getFileExtension('ending.dot.')).toBe('');
		});

		it('应该验证文件信息', () => {
			const validResult = FileMessageHandler.validateFileInfo('document.pdf', 5 * 1024 * 1024);
			expect(validResult.valid).toBe(true);
			expect(validResult.errors).toHaveLength(0);

			const invalidSizeResult = FileMessageHandler.validateFileInfo('document.pdf', 25 * 1024 * 1024);
			expect(invalidSizeResult.valid).toBe(false);
			expect(invalidSizeResult.errors.some(error => error.includes('文件大小不能超过'))).toBe(true);

			const invalidTypeResult = FileMessageHandler.validateFileInfo('malware.exe', 1024);
			expect(invalidTypeResult.valid).toBe(false);
			expect(invalidTypeResult.errors.some(error => error.includes('不支持的文件类型'))).toBe(true);

			const noExtensionResult = FileMessageHandler.validateFileInfo('filename', 1024);
			expect(noExtensionResult.warnings.some(warning => warning.includes('没有扩展名'))).toBe(true);
		});

		it('应该验证media_id', () => {
			const validResult = FileMessageHandler.validateMediaId(validMediaId);
			expect(validResult.valid).toBe(true);
			expect(validResult.errors).toHaveLength(0);

			const emptyResult = FileMessageHandler.validateMediaId('');
			expect(emptyResult.valid).toBe(false);
			expect(emptyResult.errors).toContain('media_id不能为空');

			const invalidResult = FileMessageHandler.validateMediaId('invalid@id');
			expect(invalidResult.valid).toBe(false);
			expect(invalidResult.errors.some(error => error.includes('无效的media_id格式'))).toBe(true);
		});

		it('应该生成文件上传指南', () => {
			const guide = FileMessageHandler.getFileUploadGuide();

			expect(guide.maxSize).toBeDefined();
			expect(Array.isArray(guide.supportedTypes)).toBe(true);
			expect(Array.isArray(guide.steps)).toBe(true);
			expect(guide.steps.length).toBeGreaterThan(0);
		});
	});

	describe('边界情况', () => {
		it('应该处理最小长度的有效media_id', () => {
			const minValidMediaId = 'a'.repeat(10);
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: minValidMediaId,
			};

			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该处理最大长度的有效media_id', () => {
			const maxValidMediaId = 'a'.repeat(100);
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: maxValidMediaId,
			};

			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该处理包含所有有效字符的media_id', () => {
			const allValidCharsMediaId = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
			const inputData: NodeInputData = {
				messageType: MessageType.FILE,
				fileMediaId: allValidCharsMediaId,
			};

			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该正确处理文件大小边界值', () => {
			const maxSize = FileMessageHandler.getMaxFileSize();
			
			expect(FileMessageHandler.isValidFileSize(maxSize)).toBe(true);
			expect(FileMessageHandler.isValidFileSize(maxSize + 1)).toBe(false);
			expect(FileMessageHandler.isValidFileSize(0)).toBe(false);
			expect(FileMessageHandler.isValidFileSize(1)).toBe(true);
		});
	});
});