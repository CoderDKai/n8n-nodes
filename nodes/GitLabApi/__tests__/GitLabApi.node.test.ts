import { IExecuteFunctions, INode } from 'n8n-workflow';
import { GitLabApi } from '../GitLabApi.node';

// Mock n8n-workflow
jest.mock('n8n-workflow', () => ({
	NodeOperationError: class extends Error {
		constructor(node: any, message: string, options?: any) {
			super(message);
			this.name = 'NodeOperationError';
		}
	},
}));

describe('GitLab Node', () => {
	let gitLabNode: GitLabApi;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;

	beforeEach(() => {
		gitLabNode = new GitLabApi();
		
		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				domain: 'https://gitlab.example.com',
				accessToken: 'test-token',
			}),
			getNode: jest.fn(() => ({
				id: 'test-node-id',
				name: 'GitLab API',
				type: 'gitLabApi',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode)),
			continueOnFail: jest.fn(() => false),
			helpers: {
				httpRequestWithAuthentication: {
					call: jest.fn(),
				},
			} as any,
		};
	});

	describe('Project Operations', () => {
		describe('Get Project', () => {
			beforeEach(() => {
				(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue([{}]);
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('project') // resource
					.mockReturnValueOnce('get'); // operation
			});

			it('should successfully get project by numeric ID', async () => {
				const projectId = '123';
				const mockProjectData = {
					id: 123,
					name: 'Test Project',
					description: 'A test project',
					web_url: 'https://gitlab.com/test/project',
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockResolvedValue(mockProjectData);

				const result = await gitLabNode.execute.call(
					mockExecuteFunctions as IExecuteFunctions
				);

				expect(result).toEqual([[{
					json: mockProjectData,
					pairedItem: { item: 0 },
				}]]);

				expect(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call)
					.toHaveBeenCalledWith(
						mockExecuteFunctions,
						'gitLabApi',
						expect.objectContaining({
							method: 'GET',
							url: '/projects/123',
							baseURL: expect.stringContaining('/api/v4'),
							headers: expect.objectContaining({
								Accept: 'application/json',
								'Content-Type': 'application/json',
							}),
						})
					);
			});

			it('should successfully get project by path format', async () => {
				const projectId = 'group/project';
				const mockProjectData = {
					id: 456,
					name: 'Group Project',
					path_with_namespace: 'group/project',
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockResolvedValue(mockProjectData);

				const result = await gitLabNode.execute.call(
					mockExecuteFunctions as IExecuteFunctions
				);

				expect(result).toEqual([[{
					json: mockProjectData,
					pairedItem: { item: 0 },
				}]]);

				expect(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call)
					.toHaveBeenCalledWith(
						mockExecuteFunctions,
						'gitLabApi',
						expect.objectContaining({
							method: 'GET',
							url: '/projects/group%2Fproject',
							baseURL: expect.stringContaining('/api/v4'),
							headers: expect.objectContaining({
								Accept: 'application/json',
								'Content-Type': 'application/json',
							}),
						})
					);
			});

			it('should successfully get project by multi-level path format', async () => {
				const projectId = 'ITFrontendTeam/web-ws/wonder-acceleration-app';
				const mockProjectData = {
					id: 789,
					name: 'Wonder Acceleration App',
					path_with_namespace: 'ITFrontendTeam/web-ws/wonder-acceleration-app',
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockResolvedValue(mockProjectData);

				const result = await gitLabNode.execute.call(
					mockExecuteFunctions as IExecuteFunctions
				);

				expect(result).toEqual([[{
					json: mockProjectData,
					pairedItem: { item: 0 },
				}]]);

				expect(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call)
					.toHaveBeenCalledWith(
						mockExecuteFunctions,
						'gitLabApi',
						expect.objectContaining({
							method: 'GET',
							url: '/projects/ITFrontendTeam%2Fweb-ws%2Fwonder-acceleration-app',
							baseURL: expect.stringContaining('/api/v4'),
							headers: expect.objectContaining({
								Accept: 'application/json',
								'Content-Type': 'application/json',
							}),
						})
					);
			});

			it('should throw error for empty project ID', async () => {
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(''); // empty projectId

				await expect(
					gitLabNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
				).rejects.toThrow('项目ID不能为空');
			});

			it('should throw error for invalid project ID format', async () => {
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce('invalid-single-name'); // invalid format - single name without slash

				await expect(
					gitLabNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
				).rejects.toThrow('项目ID格式无效');
			});

			it('should handle 404 error (project not found)', async () => {
				const projectId = '999';
				
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				const error = new Error('Not Found');
				(error as any).httpCode = 404;

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockRejectedValue(error);

				await expect(
					gitLabNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
				).rejects.toThrow('项目不存在：999');
			});

			it('should handle 403 error (permission denied)', async () => {
				const projectId = '123';
				
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				const error = new Error('Forbidden');
				(error as any).httpCode = 403;

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockRejectedValue(error);

				await expect(
					gitLabNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
				).rejects.toThrow('权限不足：无法访问项目 123');
			});

			it('should handle 401 error (authentication failed)', async () => {
				const projectId = '123';
				
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				const error = new Error('Unauthorized');
				(error as any).httpCode = 401;

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockRejectedValue(error);

				await expect(
					gitLabNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
				).rejects.toThrow('认证失败：访问令牌无效或已过期');
			});

			it('should handle generic API errors', async () => {
				const projectId = '123';
				
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId

				const error = new Error('Internal Server Error');
				(error as any).httpCode = 500;

				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockRejectedValue(error);

				await expect(
					gitLabNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
				).rejects.toThrow('获取项目信息失败：Internal Server Error');
			});

			it('should continue on fail when configured', async () => {
				const projectId = '123';
				
				(mockExecuteFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(projectId); // projectId
				
				(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

				const error = new Error('API Error');
				(mockExecuteFunctions.helpers!.httpRequestWithAuthentication.call as jest.Mock)
					.mockRejectedValue(error);

				const result = await gitLabNode.execute.call(
					mockExecuteFunctions as IExecuteFunctions
				);

				expect(result).toEqual([[{
					json: { error: '获取项目信息失败：API Error' },
					pairedItem: { item: 0 },
				}]]);
			});
		});
	});

	describe('Input Validation', () => {
		it('should accept valid numeric project IDs', () => {
			const validIds = ['1', '123', '999999'];
			
			validIds.forEach(id => {
				const isNumericId = /^\d+$/.test(id.trim());
				expect(isNumericId).toBe(true);
			});
		});

		it('should accept valid project path formats', () => {
			const validPaths = [
				'group/project',
				'my-group/my-project',
				'group.name/project.name',
				'group_name/project_name',
				'ITFrontendTeam/web-ws/wonder-acceleration-app',
				'org/team/subteam/project',
				'a/b/c/d/e/project',
			];
			
			validPaths.forEach(path => {
				const isPathFormat = /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(path.trim());
				expect(isPathFormat).toBe(true);
			});
		});

		it('should reject invalid project ID formats', () => {
			const invalidIds = [
				'',
				'   ',
				'invalid',
				'group/',
				'/project',
				'group//project',
				'/group/project',
				'group/project/',
				'group/project//subproject',
			];
			
			invalidIds.forEach(id => {
				const isNumericId = /^\d+$/.test(id.trim());
				const isPathFormat = /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(id.trim());
				expect(isNumericId || isPathFormat).toBe(false);
			});
		});
	});
});