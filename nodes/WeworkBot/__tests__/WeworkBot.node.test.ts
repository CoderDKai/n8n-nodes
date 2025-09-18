import { WeworkBot } from '../WeworkBot.node';
import { INodeTypeDescription } from 'n8n-workflow';

describe('WeworkBot', () => {
	let weworkBot: WeworkBot;

	beforeEach(() => {
		weworkBot = new WeworkBot();
	});

	describe('节点描述', () => {
		it('应该有正确的节点描述配置', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.displayName).toBe('企业微信群机器人');
			expect(description.name).toBe('weworkBot');
			expect(description.group).toContain('communication');
			expect(description.version).toBe(1);
		});

		it('应该配置正确的输入输出', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.inputs).toEqual(['main']);
			expect(description.outputs).toEqual(['main']);
		});

		it('应该要求企业微信机器人凭据', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.credentials).toEqual([
				{
					name: 'weworkBotApi',
					required: true,
				},
			]);
		});

		it('应该有正确的图标配置', () => {
			const description: INodeTypeDescription = weworkBot.description;

			expect(description.icon).toEqual({
				light: 'file:wework.svg',
				dark: 'file:wework.svg',
			});
		});
	});

	describe('节点执行', () => {
		it('应该抛出未实现错误', async () => {
			// 这个测试将在后续任务中完善
			expect(weworkBot.execute).toBeDefined();
		});
	});
});