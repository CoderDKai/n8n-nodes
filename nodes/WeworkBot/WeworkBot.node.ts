import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

export class WeworkBot implements INodeType {
	description: INodeTypeDescription = {
		displayName: '企业微信群机器人',
		name: 'weworkBot',
		icon: { light: 'file:wework.svg', dark: 'file:wework.svg' },
		group: ['communication'],
		version: 1,
		subtitle: '={{$parameter["messageType"]}}',
		description: '向企业微信群发送通知消息',
		defaults: {
			name: '企业微信群机器人',
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
			// 节点属性配置将在后续任务中实现
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// 执行逻辑将在后续任务中实现
		throw new NodeOperationError(this.getNode(), '节点执行逻辑尚未实现');
	}
}