import { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { gitLabOperations, gitLabFields } from './GitLabDescription';

export class GitLab implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitLab API',
		name: 'gitLabApi',
		icon: { light: 'file:gitlab.svg', dark: 'file:gitlab.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with GitLab API to manage projects and merge requests',
		defaults: {
			name: 'GitLab API',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'gitLabApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.domain}}/api/v4',
			url: '',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Project',
						value: 'project',
						description: 'Operations on GitLab projects',
					},
					{
						name: 'Merge Request',
						value: 'mergeRequest',
						description: 'Operations on GitLab merge requests',
					},
				],
				default: 'project',
			},
			...gitLabOperations,
			...gitLabFields,
		],
	};
}