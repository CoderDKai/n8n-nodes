import { 
	IExecuteFunctions,
	INodeType, 
	INodeTypeDescription, 
	INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import { gitLabOperations, gitLabFields } from './GitLabDescription';

export class GitLabApi implements INodeType {
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'project') {
					if (operation === 'get') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						
						// 验证项目ID格式
						if (!projectId || projectId.trim() === '') {
							throw new NodeOperationError(
								this.getNode(),
								'项目ID不能为空',
								{ itemIndex: i }
							);
						}

						// 验证项目ID格式（数字ID或路径格式，支持多级目录）
						const isNumericId = /^\d+$/.test(projectId.trim());
						const isPathFormat = /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(projectId.trim());
						
						if (!isNumericId && !isPathFormat) {
							throw new NodeOperationError(
								this.getNode(),
								'项目ID格式无效。请使用数字ID（如：1）或项目路径格式（如：group/project 或 group/subgroup/project）',
								{ itemIndex: i }
							);
						}

						try {
							// GitLab API要求项目路径完全URL编码，包括斜杠编码为%2F
							const encodedProjectId = encodeURIComponent(projectId.trim());
							
							// 获取凭据信息
							const credentials = await this.getCredentials('gitLabApi');
							const baseUrl = credentials.domain as string;
							
							const responseData = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'gitLabApi',
								{
									method: 'GET',
									baseURL: `${baseUrl}/api/v4`,
									url: `/projects/${encodedProjectId}`,
									headers: {
										Accept: 'application/json',
										'Content-Type': 'application/json',
									},
								}
							);

						const executionData = this.helpers.returnJsonArray(responseData as any[]);
						executionData.forEach(item => {
							item.pairedItem = { item: i };
							returnData.push(item);
						});
						} catch (error: any) {
							// 处理特定的GitLab API错误
							if (error.httpCode === 404) {
								throw new NodeOperationError(
									this.getNode(),
									`项目不存在：${projectId}。请检查项目ID或路径是否正确。`,
									{ itemIndex: i }
								);
							} else if (error.httpCode === 403) {
								throw new NodeOperationError(
									this.getNode(),
									`权限不足：无法访问项目 ${projectId}。请检查您的访问令牌权限。`,
									{ itemIndex: i }
								);
							} else if (error.httpCode === 401) {
								throw new NodeOperationError(
									this.getNode(),
									'认证失败：访问令牌无效或已过期。请检查您的GitLab API凭据。',
									{ itemIndex: i }
								);
							} else {
								throw new NodeOperationError(
									this.getNode(),
									`获取项目信息失败：${error.message}`,
									{ itemIndex: i }
								);
							}
						}
					}
				} else if (resource === 'mergeRequest') {
					if (operation === 'getAll') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const state = this.getNodeParameter('state', i) as string;
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;
						const returnAll = this.getNodeParameter('returnAll', i, true) as boolean;
						const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);

						// 验证项目ID格式
						if (!projectId || projectId.trim() === '') {
							throw new NodeOperationError(
								this.getNode(),
								'项目ID不能为空',
								{ itemIndex: i }
							);
						}

						const queryParams = new URLSearchParams();
						if (state !== 'all') {
							queryParams.append('state', state);
						}
						if (additionalOptions.per_page) {
							queryParams.append('per_page', additionalOptions.per_page.toString());
						}
						if (additionalOptions.page) {
							queryParams.append('page', additionalOptions.page.toString());
						}

						const queryString = queryParams.toString();
						const encodedProjectId = encodeURIComponent(projectId.trim());
						const url = `/projects/${encodedProjectId}/merge_requests${queryString ? '?' + queryString : ''}`;

						try {
							// 获取凭据信息
							const credentials = await this.getCredentials('gitLabApi');
							const baseUrl = credentials.domain as string;
							
							const responseData = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'gitLabApi',
								{
									method: 'GET',
									baseURL: `${baseUrl}/api/v4`,
									url,
									headers: {
										Accept: 'application/json',
										'Content-Type': 'application/json',
									},
								}
							);

						const items = Array.isArray(responseData) ? responseData : [responseData];
						const slicedItems = returnAll ? items : items.slice(0, limit ?? items.length);
						const executionData = this.helpers.returnJsonArray(slicedItems as any[]);
						executionData.forEach(item => {
							item.pairedItem = { item: i };
							returnData.push(item);
						});
						} catch (error: any) {
							if (error.httpCode === 404) {
								throw new NodeOperationError(
									this.getNode(),
									`项目不存在：${projectId}。请检查项目ID或路径是否正确。`,
									{ itemIndex: i }
								);
							} else if (error.httpCode === 403) {
								throw new NodeOperationError(
									this.getNode(),
									`权限不足：无法访问项目 ${projectId} 的合并请求。请检查您的访问令牌权限。`,
									{ itemIndex: i }
								);
							} else if (error.httpCode === 401) {
								throw new NodeOperationError(
									this.getNode(),
									'认证失败：访问令牌无效或已过期。请检查您的GitLab API凭据。',
									{ itemIndex: i }
								);
							} else {
								throw new NodeOperationError(
									this.getNode(),
									`获取合并请求列表失败：${error.message}`,
									{ itemIndex: i }
								);
							}
						}
					} else if (operation === 'get') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const mergeRequestIid = this.getNodeParameter('mergeRequestIid', i) as number;

						// 验证项目ID格式
						if (!projectId || projectId.trim() === '') {
							throw new NodeOperationError(
								this.getNode(),
								'项目ID不能为空',
								{ itemIndex: i }
							);
						}

						try {
							// 获取凭据信息
							const credentials = await this.getCredentials('gitLabApi');
							const baseUrl = credentials.domain as string;
							const encodedProjectId = encodeURIComponent(projectId.trim());
							
							const responseData = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'gitLabApi',
								{
									method: 'GET',
									baseURL: `${baseUrl}/api/v4`,
									url: `/projects/${encodedProjectId}/merge_requests/${mergeRequestIid}`,
									headers: {
										Accept: 'application/json',
										'Content-Type': 'application/json',
									},
								}
							);

							returnData.push({
								json: responseData,
								pairedItem: { item: i },
							});
						} catch (error: any) {
							if (error.httpCode === 404) {
								throw new NodeOperationError(
									this.getNode(),
									`合并请求不存在：项目 ${projectId} 中的合并请求 ${mergeRequestIid}。请检查项目ID和合并请求IID是否正确。`,
									{ itemIndex: i }
								);
							} else if (error.httpCode === 403) {
								throw new NodeOperationError(
									this.getNode(),
									`权限不足：无法访问项目 ${projectId} 的合并请求 ${mergeRequestIid}。请检查您的访问令牌权限。`,
									{ itemIndex: i }
								);
							} else if (error.httpCode === 401) {
								throw new NodeOperationError(
									this.getNode(),
									'认证失败：访问令牌无效或已过期。请检查您的GitLab API凭据。',
									{ itemIndex: i }
								);
							} else {
								throw new NodeOperationError(
									this.getNode(),
									`获取合并请求详情失败：${error.message}`,
									{ itemIndex: i }
								);
							}
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
