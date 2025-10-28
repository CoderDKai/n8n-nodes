# 优化任务清单

- [x] 拆分 `WeworkBot.node.ts` 中的节点描述与属性定义，迁移到独立描述文件保持模块化。
- [ ] 将消息处理器拆分为按消息类型的独立文件，仅通过工厂入口导出，降低单文件复杂度。
- [ ] 合并 `LogLevel`、`LogEntry`、`ErrorHandler` 等重复类型定义，维持单一来源。
- [ ] 使用 `this.helpers.httpRequest`/`httpRequestWithAuthentication` 替换自定义 `fetch`，统一接入 n8n 网络请求能力。
- [ ] 在所有输出分支设置 `pairedItem: { item: i }`，并在 `continueOnFail` 分支附带错误信息，符合返回规范。
- [ ] 为 GitLab `getAll` 操作使用 `this.helpers.returnJsonArray()` 并支持 `returnAll/limit` 参数，实现扁平化输出。
- [ ] 将 `mentionedUsers`/`mentionedMobiles` 改为数组控件或 `fixedCollection`，优化多值输入体验。
- [ ] 实现图片 URL 转 base64 功能或暂时隐藏该选项，避免暴露未完成能力。
- [ ] 对未覆盖的 GitLab `resource/operation` 组合抛出 `NodeOperationError`，确保错误可见。
- [ ] 同步 `.gitignore` 与发布流程，排除 `dist/`、`node_modules/` 等构建产物。
- [ ] 评估使用 n8n 内建日志或默认关闭自定义日志控制台输出，减少重复与体积。
