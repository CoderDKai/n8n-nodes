import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WeworkBotApi implements ICredentialType {
	name = 'weworkBotApi';
	displayName = '企业微信群机器人 API';
	documentationUrl = 'https://developer.work.weixin.qq.com/document/path/91770';
	
	properties: INodeProperties[] = [
		{
			displayName: 'Webhook URL',
			name: 'webhookUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx',
			description: '企业微信群机器人的Webhook URL，可在群聊中添加机器人时获取',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.webhookUrl}}',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				msgtype: 'text',
				text: {
					content: '连接测试成功 - n8n企业微信群机器人节点',
				},
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'errcode',
					value: 0,
					message: 'Webhook URL无效或机器人配置错误',
				},
			},
		],
	};
}