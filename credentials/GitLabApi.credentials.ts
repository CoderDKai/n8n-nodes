import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GitLabApi implements ICredentialType {
	name = 'gitLabApi';

	displayName = 'GitLab API';

	documentationUrl = 'https://docs.gitlab.com/ee/api/';

	properties: INodeProperties[] = [
		{
			displayName: 'GitLab Server URL',
			name: 'domain',
			type: 'string',
			default: 'https://gitlab.com',
			placeholder: 'https://gitlab.example.com',
			description: 'The URL of your GitLab instance',
			required: true,
		},
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Personal Access Token with API access permissions',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'PRIVATE-TOKEN': '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.domain}}/api/v4',
			url: '/user',
			method: 'GET',
		},
	};
}
