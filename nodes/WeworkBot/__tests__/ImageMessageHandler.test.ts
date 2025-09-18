import { ImageMessageHandler } from '../MessageHandler';
import { MessageType, NodeInputData } from '../types';

describe('ImageMessageHandler', () => {
	let handler: ImageMessageHandler;

	// 创建一个有效的PNG图片的base64编码（1x1像素的透明PNG）
	const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
	
	// 创建一个有效的JPEG图片的base64编码（1x1像素的白色JPEG）
	const validJpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';

	beforeEach(() => {
		handler = new ImageMessageHandler();
	});

	describe('formatMessage', () => {
		it('应该创建基本的图片消息', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validPngBase64,
			};

			const result = handler.formatMessage(inputData);

			expect(result.msgtype).toBe('image');
			expect(result.image.base64).toBe(validPngBase64);
			expect(result.image.md5).toBeDefined();
			expect(typeof result.image.md5).toBe('string');
		});

		it('应该处理带data URL前缀的base64', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: `data:image/png;base64,${validPngBase64}`,
			};

			const result = handler.formatMessage(inputData);

			expect(result.image.base64).toBe(validPngBase64);
		});

		it('应该在base64为空时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: '',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('图片base64编码不能为空');
		});

		it('应该在base64格式无效时抛出错误', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: 'invalid-base64-string!@#$',
			};

			expect(() => handler.formatMessage(inputData)).toThrow('无效的base64编码格式');
		});

		it('应该检测PNG图片类型', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validPngBase64,
			};

			// 这个测试主要验证不会抛出格式错误
			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该检测JPEG图片类型', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validJpegBase64,
			};

			// 这个测试主要验证不会抛出格式错误
			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该在图片格式不支持时抛出错误', () => {
			// 创建一个GIF格式的base64（企业微信不支持GIF）
			const gifBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: gifBase64,
			};

			expect(() => handler.formatMessage(inputData)).toThrow('不支持的图片格式');
		});

		it('应该在图片过大时抛出错误', () => {
			// 创建一个超大的有效base64字符串（模拟大图片）
			// 使用有效的base64字符填充到超过2MB
			const baseString = 'A'.repeat(1000); // 1000个A字符
			const largeBase64 = Buffer.from(baseString.repeat(3000)).toString('base64'); // 约3MB的base64
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: largeBase64,
			};

			expect(() => handler.formatMessage(inputData)).toThrow('图片大小不能超过');
		});

		it('应该移除base64中的空白字符', () => {
			const base64WithSpaces = validPngBase64.split('').join(' '); // 在每个字符间添加空格
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: base64WithSpaces,
			};

			const result = handler.formatMessage(inputData);

			expect(result.image.base64).toBe(validPngBase64);
		});

		it('应该计算正确的MD5值', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validPngBase64,
			};

			const result1 = handler.formatMessage(inputData);
			const result2 = handler.formatMessage(inputData);

			// 相同的图片应该有相同的MD5
			expect(result1.image.md5).toBe(result2.image.md5);
			expect(result1.image.md5).toHaveLength(32); // MD5应该是32位十六进制字符串
		});
	});

	describe('validateMessage', () => {
		it('应该验证有效的图片消息', () => {
			const message = {
				msgtype: 'image' as const,
				image: {
					base64: validPngBase64,
					md5: 'dummy-md5-hash',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测空base64错误', () => {
			const message = {
				msgtype: 'image' as const,
				image: {
					base64: '',
					md5: 'dummy-md5-hash',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('图片base64编码不能为空');
		});

		it('应该检测空MD5错误', () => {
			const message = {
				msgtype: 'image' as const,
				image: {
					base64: validPngBase64,
					md5: '',
				},
			};

			const result = handler.validateMessage(message);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('图片MD5值不能为空');
		});
	});

	describe('静态方法', () => {
		it('应该创建图片消息', () => {
			const message = ImageMessageHandler.createImageMessage(validPngBase64);

			expect(message.msgtype).toBe('image');
			expect(message.image.base64).toBe(validPngBase64);
			expect(message.image.md5).toBeDefined();
		});

		it('应该验证图片要求', () => {
			const result = ImageMessageHandler.validateImageRequirements(validPngBase64);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('应该检测无效图片', () => {
			const result = ImageMessageHandler.validateImageRequirements('invalid-base64');

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('从文件创建图片消息应该抛出未实现错误', () => {
			expect(() => ImageMessageHandler.createImageMessageFromFile('/path/to/image.png'))
				.toThrow('从文件创建图片消息功能将在后续任务中实现');
		});
	});

	describe('私有方法测试（通过公共接口）', () => {
		it('应该正确检测PNG格式', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validPngBase64,
			};

			// PNG格式应该被接受
			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该正确检测JPEG格式', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validJpegBase64,
			};

			// JPEG格式应该被接受
			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});

		it('应该正确计算图片大小', () => {
			const inputData: NodeInputData = {
				messageType: MessageType.IMAGE,
				imageBase64: validPngBase64,
			};

			// 小图片应该被接受
			expect(() => handler.formatMessage(inputData)).not.toThrow();
		});
	});
});