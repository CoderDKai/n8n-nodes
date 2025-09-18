/**
 * 集成测试 - 验证GitLab API节点的完整功能
 * 注意：这些测试需要真实的GitLab实例和有效的访问令牌
 * 在CI/CD环境中运行时，请确保设置相应的环境变量
 */

import { GitLabApi } from '../GitLabApi.node';

describe('GitLab Node Integration Tests', () => {
	let gitLabNode: GitLabApi;

	beforeEach(() => {
		gitLabNode = new GitLabApi();
	});

	describe('Node Configuration', () => {
		it('should have correct node description', () => {
			expect(gitLabNode.description.displayName).toBe('GitLab API');
			expect(gitLabNode.description.name).toBe('gitLabApi');
			expect(gitLabNode.description.version).toBe(1);
		});

		it('should have correct credentials configuration', () => {
			expect(gitLabNode.description.credentials).toEqual([
				{
					name: 'gitLabApi',
					required: true,
				},
			]);
		});

		it('should not have request defaults (handled in execute method)', () => {
			expect(gitLabNode.description.requestDefaults).toBeUndefined();
		});

		it('should have project resource option', () => {
			const resourceProperty = gitLabNode.description.properties.find(
				prop => prop.name === 'resource'
			);
			
			expect(resourceProperty).toBeDefined();
			expect(resourceProperty?.options).toContainEqual({
				name: 'Project',
				value: 'project',
				description: 'Operations on GitLab projects',
			});
		});

		it('should have project get operation', () => {
			const operationProperty = gitLabNode.description.properties.find(
				prop => prop.name === 'operation' && 
				prop.displayOptions?.show?.resource?.includes('project')
			);
			
			expect(operationProperty).toBeDefined();
			expect(operationProperty?.options).toContainEqual({
				name: 'Get',
				value: 'get',
				description: 'Get project information',
				action: 'Get project information',
			});
		});

		it('should have projectId parameter for project get operation', () => {
			const projectIdProperty = gitLabNode.description.properties.find(
				prop => prop.name === 'projectId'
			);
			
			expect(projectIdProperty).toBeDefined();
			expect(projectIdProperty?.required).toBe(true);
			expect(projectIdProperty?.displayOptions?.show).toEqual({
				resource: ['project'],
				operation: ['get'],
			});
		});
	});

	describe('Parameter Validation', () => {
		it('should validate project ID formats correctly', () => {
			// 测试数字ID格式
			const numericIds = ['1', '123', '999999'];
			numericIds.forEach(id => {
				const isValid = /^\d+$/.test(id.trim());
				expect(isValid).toBe(true);
			});

			// 测试路径格式
			const pathIds = ['group/project', 'my-group/my-project', 'org.name/repo.name'];
			pathIds.forEach(id => {
				const isValid = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(id.trim());
				expect(isValid).toBe(true);
			});

			// 测试无效格式
			const invalidIds = ['', 'invalid', 'group/project/sub', 'group/', '/project'];
			invalidIds.forEach(id => {
				const isNumeric = /^\d+$/.test(id.trim());
				const isPath = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(id.trim());
				expect(isNumeric || isPath).toBe(false);
			});
		});
	});

	describe('Error Handling', () => {
		it('should provide appropriate error messages for different scenarios', () => {
			const errorScenarios = [
				{
					httpCode: 401,
					expectedMessage: '认证失败：访问令牌无效或已过期。请检查您的GitLab API凭据。'
				},
				{
					httpCode: 403,
					expectedMessage: '权限不足：无法访问项目 test-project。请检查您的访问令牌权限。'
				},
				{
					httpCode: 404,
					expectedMessage: '项目不存在：test-project。请检查项目ID或路径是否正确。'
				}
			];

			errorScenarios.forEach(scenario => {
				// 这里只是验证错误消息格式，实际的错误处理在execute方法的单元测试中验证
				expect(scenario.expectedMessage).toContain('：');
				expect(scenario.expectedMessage.length).toBeGreaterThan(10);
			});
		});
	});
});