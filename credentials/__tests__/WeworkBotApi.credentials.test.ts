import { WeworkBotApi } from '../WeworkBotApi.credentials';

describe('WeworkBotApi', () => {
	let credentials: WeworkBotApi;

	beforeEach(() => {
		credentials = new WeworkBotApi();
	});

	describe('基本属性', () => {
		it('应该有正确的名称和显示名称', () => {
			expect(credentials.name).toBe('weworkBotApi');
			expect(credentials.displayName).toBe('企业微信群机器人 API');
		});

		it('应该有正确的文档URL', () => {
			expect(credentials.documentationUrl).toBe('https://developer.work.weixin.qq.com/document/path/91770');
		});


	});

	describe('属性配置', () => {
		it('应该有webhook URL属性', () => {
			expect(credentials.properties).toHaveLength(1);
			
			const webhookUrlProperty = credentials.properties[0];
			expect(webhookUrlProperty.name).toBe('webhookUrl');
			expect(webhookUrlProperty.displayName).toBe('Webhook URL');
			expect(webhookUrlProperty.type).toBe('string');
			expect(webhookUrlProperty.required).toBe(true);
		});

		it('webhook URL属性应该有正确的占位符', () => {
			const webhookUrlProperty = credentials.properties[0];
			expect(webhookUrlProperty.placeholder).toBe('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx');
		});
	});

	describe('认证配置', () => {
		it('应该有正确的认证类型', () => {
			expect(credentials.authenticate.type).toBe('generic');
			expect(credentials.authenticate.properties).toEqual({});
		});
	});

	describe('测试配置', () => {
		it('应该有正确的测试请求配置', () => {
			expect(credentials.test.request.baseURL).toBe('={{$credentials.webhookUrl}}');
			expect(credentials.test.request.method).toBe('POST');
			expect(credentials.test.request.headers).toEqual({
				'Content-Type': 'application/json'
			});
		});

		it('应该有正确的测试消息体', () => {
			expect(credentials.test.request.body).toEqual({
				msgtype: 'text',
				text: {
					content: '连接测试成功 - n8n企业微信群机器人节点'
				}
			});
		});

		it('应该有正确的验证规则', () => {
			expect(credentials.test.rules).toHaveLength(1);
			
			const rule = credentials.test.rules![0];
			expect(rule.type).toBe('responseSuccessBody');
			if ('key' in rule.properties) {
				expect(rule.properties.key).toBe('errcode');
				expect(rule.properties.value).toBe(0);
			}
			expect(rule.properties.message).toBe('Webhook URL无效或机器人配置错误');
		});
	});
});