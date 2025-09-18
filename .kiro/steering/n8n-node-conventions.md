# n8n 节点开发规范

## 文件命名和类名规范

### 节点文件
- **文件名格式**: `{NodeName}.node.ts`
- **类名格式**: `{NodeName}` (与文件名中的NodeName部分完全一致)
- **导出**: 必须使用 `export class {NodeName}`

**示例**:
```typescript
// 文件: GitLabApi.node.ts
export class GitLabApi implements INodeType {
  // ...
}

// 文件: Slack.node.ts  
export class Slack implements INodeType {
  // ...
}

// 文件: GoogleSheets.node.ts
export class GoogleSheets implements INodeType {
  // ...
}
```

### 凭据文件
- **文件名格式**: `{ServiceName}.credentials.ts` 或 `{ServiceName}Api.credentials.ts`
- **类名格式**: 与文件名中的ServiceName部分完全一致
- **导出**: 必须使用 `export class {ServiceName}`

**示例**:
```typescript
// 文件: GitLabApi.credentials.ts
export class GitLabApi implements ICredentialType {
  // ...
}

// 文件: SlackApi.credentials.ts
export class SlackApi implements ICredentialType {
  // ...
}

// 文件: GoogleSheetsOAuth2Api.credentials.ts
export class GoogleSheetsOAuth2Api implements ICredentialType {
  // ...
}
```

## 目录结构规范

```
nodes/
├── {NodeName}/
│   ├── {NodeName}.node.ts          # 主节点文件
│   ├── {NodeName}Description.ts    # 节点描述和字段定义
│   ├── {nodename}.svg              # 节点图标 (小写)
│   └── __tests__/
│       ├── {NodeName}.node.test.ts # 单元测试
│       └── integration.test.ts     # 集成测试

credentials/
├── {ServiceName}.credentials.ts     # 凭据文件
```

**命名示例**:
- `nodes/GitLabApi/GitLabApi.node.ts` → `export class GitLabApi`
- `nodes/Slack/Slack.node.ts` → `export class Slack`  
- `nodes/GoogleSheets/GoogleSheets.node.ts` → `export class GoogleSheets`

## package.json 配置规范

### n8n 配置块
```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/{ServiceName}.credentials.js"
    ],
    "nodes": [
      "dist/nodes/{NodeName}/{NodeName}.node.js"
    ]
  }
}
```

**配置示例**:
```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/GitLabApi.credentials.js",
      "dist/credentials/SlackApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/GitLabApi/GitLabApi.node.js",
      "dist/nodes/Slack/Slack.node.js"
    ]
  }
}
```

## 节点类结构规范

### 基本结构
```typescript
export class {NodeName} implements INodeType {
  description: INodeTypeDescription = {
    displayName: '{Display Name}',
    name: '{camelCaseName}',
    icon: { light: 'file:{nodename}.svg', dark: 'file:{nodename}.svg' },
    group: ['transform'],
    version: 1,
    // ...其他配置
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // 实现逻辑
  }
}
```

### 重要字段规范
- `displayName`: 用户界面显示的名称
- `name`: 节点的唯一标识符，使用camelCase
- `icon`: 图标文件名，使用小写
- `version`: 节点版本，从1开始

## 凭据类结构规范

```typescript
export class {ServiceName} implements ICredentialType {
  name = '{camelCaseName}';
  displayName = '{Service Name}';
  documentationUrl = 'https://...';
  
  properties: INodeProperties[] = [
    // 凭据字段定义
  ];

  authenticate: IAuthenticateGeneric = {
    // 认证配置
  };

  test: ICredentialTestRequest = {
    // 测试配置
  };
}
```

**凭据命名示例**:
```typescript
// 文件: GitLabApi.credentials.ts
export class GitLabApi implements ICredentialType {
  name = 'gitLabApi';
  displayName = 'GitLab API';
  // ...
}

// 文件: SlackOAuth2Api.credentials.ts  
export class SlackOAuth2Api implements ICredentialType {
  name = 'slackOAuth2Api';
  displayName = 'Slack OAuth2 API';
  // ...
}
```

## 核心规则：类名与文件名一致性

**最重要的规则**: 类名必须与文件名中的主要部分完全一致

### 正确示例
- `GitLabApi.node.ts` → `export class GitLabApi`
- `Slack.node.ts` → `export class Slack`
- `GoogleSheets.node.ts` → `export class GoogleSheets`
- `HttpBin.node.ts` → `export class HttpBin`

### 错误示例
- `GitLabApi.node.ts` → `export class GitLab` ❌
- `Slack.node.ts` → `export class SlackNode` ❌
- `GoogleSheets.node.ts` → `export class GoogleSheetsApi` ❌

## 常见错误和解决方案

### 1. "is not a constructor" 错误
**原因**: 类名与文件名不匹配
**解决**: 确保类名与文件名中的NodeName部分完全一致
**示例**: 文件`GitLabApi.node.ts`必须导出`class GitLabApi`

### 2. 节点不显示在n8n界面中
**原因**: package.json中的路径配置错误
**解决**: 检查n8n配置块中的文件路径是否正确

### 3. 图标不显示
**原因**: 图标文件名大小写不匹配
**解决**: 确保图标文件名使用小写，与icon配置一致

## 测试规范

### 单元测试
- 文件名: `{NodeName}.node.test.ts`
- 测试所有操作和错误处理
- 使用mock进行HTTP请求测试

### 集成测试
- 文件名: `integration.test.ts`
- 测试节点配置和属性结构
- 验证参数验证逻辑

## 构建和发布检查清单

- [ ] 类名与文件名匹配
- [ ] package.json中的路径配置正确
- [ ] 图标文件存在且命名正确
- [ ] 所有测试通过
- [ ] ESLint检查通过
- [ ] TypeScript编译成功
- [ ] dist目录包含所有必要文件

## 调试技巧

### 验证导出
```javascript
// 在项目根目录运行
const { NodeName } = require('./dist/nodes/NodeName/NodeName.node.js');
console.log(typeof NodeName); // 应该输出 'function'
```

### 检查n8n加载
查看n8n日志中的错误信息，通常会指出具体的加载问题。

## 参考资源

- [n8n节点开发文档](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n社区节点指南](https://docs.n8n.io/integrations/community-nodes/)
- [TypeScript接口定义](https://github.com/n8n-io/n8n/tree/master/packages/workflow/src)