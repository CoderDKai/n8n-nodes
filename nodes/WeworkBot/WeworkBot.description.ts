import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export const WeworkBotNodeDescription: INodeTypeDescription = {
	displayName: 'WeWorkBot',
	name: 'weworkBot',
	icon: { light: 'file:weworkbot.svg', dark: 'file:weworkbot.svg' },
	group: ['communication'],
	version: 1,
	subtitle: '={{$parameter["messageType"]}}',
	description: '向企业微信群发送通知消息',
	defaults: {
		name: 'WeWorkBot',
	},
	inputs: [NodeConnectionType.Main],
	outputs: [NodeConnectionType.Main],
	credentials: [
		{
			name: 'weworkBotApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: '消息类型',
			name: 'messageType',
			type: 'options',
			options: [
				{
					name: '图片消息',
					value: 'image',
					description: '发送图片消息，支持base64编码',
				},
				{
					name: '图文消息',
					value: 'news',
					description: '发送包含标题、描述和链接的图文卡片',
				},
				{
					name: '文本消息',
					value: 'text',
					description: '发送纯文本消息，支持@提及用户',
				},
				{
					name: '文件消息',
					value: 'file',
					description: '发送文件消息，需要先上传获取media_id',
				},
				{
					name: 'Markdown消息',
					value: 'markdown',
					description: '发送Markdown格式的富文本消息',
				},
			],
			default: 'text',
			required: true,
			description: '选择要发送的消息类型',
		},
		{
			displayName: '消息内容',
			name: 'content',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			displayOptions: {
				show: {
					messageType: ['text'],
				},
			},
			default: '',
			required: true,
			placeholder: '请输入要发送的文本消息内容...',
			description: '要发送的文本消息内容，最大长度4096字符',
		},
		{
			displayName: '@提及用户',
			name: 'mentionedUsers',
			type: 'string',
			displayOptions: {
				show: {
					messageType: ['text'],
				},
			},
			default: '',
			placeholder: '@all 或用户ID，多个用逗号分隔',
			description: '要@提及的用户，使用@all提及所有人，或输入具体用户ID',
		},
		{
			displayName: '@提及手机号',
			name: 'mentionedMobiles',
			type: 'string',
			displayOptions: {
				show: {
					messageType: ['text'],
				},
			},
			default: '',
			placeholder: '手机号，多个用逗号分隔',
			description: '要@提及的用户手机号，多个手机号用逗号分隔',
		},
		{
			displayName: 'Markdown内容',
			name: 'markdownContent',
			type: 'string',
			typeOptions: {
				rows: 6,
			},
			displayOptions: {
				show: {
					messageType: ['markdown'],
				},
			},
			default: '',
			required: true,
			placeholder: '# 标题\n\n**粗体文本**\n\n[链接](https://example.com)',
			description: 'Markdown格式的消息内容，支持标准Markdown语法，最大长度4096字符',
		},
		{
			displayName: '图片数据源',
			name: 'imageSource',
			type: 'options',
			options: [
				{
					name: 'Base64编码',
					value: 'base64',
					description: '直接提供图片的base64编码数据',
				},
				{
					name: '图片URL',
					value: 'url',
					description: '提供图片的URL地址，系统会自动下载并转换',
				},
			],
			displayOptions: {
				show: {
					messageType: ['image'],
				},
			},
			default: 'base64',
			required: true,
			description: '选择图片数据的来源方式',
		},
		{
			displayName: '图片Base64',
			name: 'imageBase64',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			displayOptions: {
				show: {
					messageType: ['image'],
					imageSource: ['base64'],
				},
			},
			default: '',
			required: true,
			placeholder: 'iVBORw0KGgoAAAANSUhEUgAA...',
			description: '图片的base64编码数据（不包含data:image前缀），支持jpg、png格式，最大2MB',
		},
		{
			displayName: '图片URL',
			name: 'imageUrl',
			type: 'string',
			displayOptions: {
				show: {
					messageType: ['image'],
					imageSource: ['url'],
				},
			},
			default: '',
			required: true,
			placeholder: 'https://example.com/image.jpg',
			description: '图片的URL地址，支持jpg、png格式，最大2MB',
		},
		{
			displayName: '文章列表',
			name: 'articles',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			displayOptions: {
				show: {
					messageType: ['news'],
				},
			},
			default: {},
			placeholder: '添加文章',
			description: '图文消息的文章列表，最多8篇文章',
			options: [
				{
					name: 'article',
					displayName: '文章',
					values: [
						{
							displayName: '标题',
							name: 'title',
							type: 'string',
							default: '',
							required: true,
							placeholder: '文章标题',
							description: '文章标题，最大长度128字符',
						},
						{
							displayName: '描述',
							name: 'description',
							type: 'string',
							typeOptions: {
								rows: 2,
							},
							default: '',
							placeholder: '文章描述',
							description: '文章描述，最大长度512字符',
						},
						{
							displayName: '跳转链接',
							name: 'url',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'https://example.com',
							description: '点击文章后跳转的链接地址',
						},
						{
							displayName: '图片URL',
							name: 'picurl',
							type: 'string',
							default: '',
							placeholder: 'https://example.com/image.jpg',
							description: '文章配图的URL地址',
						},
					],
				},
			],
		},
		{
			displayName: '文件Media ID',
			name: 'fileMediaId',
			type: 'string',
			displayOptions: {
				show: {
					messageType: ['file'],
				},
			},
			default: '',
			required: true,
			placeholder: '3a040b0c7baba0d4d10b54728bb0fdd5',
			description: '文件的media_id，需要先通过企业微信API上传文件获取',
		},
	],
};

