# 企业微信群机器人节点

企业微信群机器人节点是一个专为n8n工作流平台设计的自定义节点，允许用户通过企业微信群机器人API向企业微信群聊发送各种类型的消息通知。

## 功能特性

- 🔐 **安全的凭据管理** - 安全存储和管理企业微信群机器人的webhook URL
- 📝 **多种消息类型** - 支持文本、Markdown、图片、图文、文件等多种消息格式
- 👥 **@提及功能** - 支持@提及特定用户或所有群成员
- 🔄 **自动重试机制** - 内置智能重试机制，提高消息发送成功率
- 📊 **详细日志记录** - 完整的执行日志和性能监控
- ⚡ **高性能处理** - 支持批量消息发送和并发处理
- 🛡️ **错误处理** - 完善的错误处理和用户友好的错误提示

## 支持的消息类型

### 1. 文本消息
发送纯文本消息，支持@提及用户功能。

**特性：**
- 支持最大4096字符的文本内容
- 支持@提及特定用户或所有群成员
- 支持通过用户ID或手机号进行@提及

### 2. Markdown消息
发送支持Markdown格式的富文本消息。

**特性：**
- 支持标准Markdown语法
- 支持标题、加粗、斜体、链接等格式
- 最大4096字符限制

### 3. 图片消息
发送图片消息，支持多种图片来源。

**特性：**
- 支持Base64编码的图片数据
- 支持通过URL自动下载图片
- 支持JPG、PNG格式
- 最大2MB文件大小限制

### 4. 图文消息
发送包含标题、描述和链接的图文卡片消息。

**特性：**
- 支持最多8篇文章
- 每篇文章包含标题、描述、链接和配图
- 标题最大128字符，描述最大512字符

### 5. 文件消息
发送文件消息（需要预先上传获取media_id）。

**特性：**
- 支持通过media_id发送文件
- 支持多种文件格式
- 最大20MB文件大小限制

## 安装和配置

### 1. 安装节点包

```bash
# 通过npm安装
npm install n8n-nodes-wework-bot

# 或通过pnpm安装
pnpm add n8n-nodes-wework-bot
```

### 2. 配置企业微信群机器人

1. 在企业微信群聊中添加群机器人
2. 获取群机器人的webhook URL
3. 在n8n中创建企业微信群机器人凭据

### 3. 创建凭据

1. 在n8n界面中，点击"凭据"菜单
2. 点击"新建凭据"
3. 选择"企业微信群机器人API"
4. 输入从企业微信获取的webhook URL
5. 点击"测试连接"验证配置
6. 保存凭据

## 使用示例

### 基础文本消息

```json
{
  "messageType": "text",
  "content": "Hello, 这是一条来自n8n工作流的通知消息！",
  "mentionedUsers": "@all"
}
```

### @提及特定用户

```json
{
  "messageType": "text",
  "content": "请注意：任务已完成，请及时查看。",
  "mentionedUsers": "user1,user2",
  "mentionedMobiles": "13800138000,13900139000"
}
```

### Markdown格式消息

```json
{
  "messageType": "markdown",
  "markdownContent": "# 工作流执行报告\n\n**执行时间**: 2024-01-15 10:30:00\n**状态**: ✅ 成功\n**处理数据**: 1,234 条记录\n\n[查看详细报告](https://example.com/report)"
}
```

### 图文消息

```json
{
  "messageType": "news",
  "articles": [
    {
      "title": "系统维护通知",
      "description": "系统将于今晚22:00-24:00进行维护，期间服务可能中断。",
      "url": "https://example.com/maintenance",
      "picurl": "https://example.com/images/maintenance.jpg"
    }
  ]
}
```

### 图片消息

```json
{
  "messageType": "image",
  "imageSource": "base64",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

## 工作流集成示例

### 示例1：定时发送日报

```yaml
工作流名称: 每日工作报告
触发器: 定时触发器 (每天18:00)
节点流程:
  1. HTTP请求 -> 获取今日数据统计
  2. 数据处理 -> 格式化统计数据
  3. 企业微信群机器人 -> 发送Markdown格式的日报
```

### 示例2：错误监控告警

```yaml
工作流名称: 系统错误监控
触发器: Webhook触发器
节点流程:
  1. Webhook -> 接收错误信息
  2. 条件判断 -> 判断错误级别
  3. 企业微信群机器人 -> 发送告警消息（@相关人员）
```

### 示例3：数据处理完成通知

```yaml
工作流名称: 数据处理通知
触发器: 文件监控触发器
节点流程:
  1. 文件监控 -> 检测新文件
  2. 数据处理 -> 处理文件数据
  3. 生成图表 -> 创建数据可视化图表
  4. 企业微信群机器人 -> 发送图文消息（包含图表）
```

## 高级配置

### 错误处理配置

节点支持"出错时继续"选项：
- **启用**：当消息发送失败时，工作流继续执行，错误信息会包含在输出数据中
- **禁用**：当消息发送失败时，工作流停止执行并抛出错误

### 批量处理

节点支持处理多个输入项，每个输入项都会发送一条消息：

```json
[
  {"content": "消息1"},
  {"content": "消息2"},
  {"content": "消息3"}
]
```

### 动态内容

支持使用n8n表达式动态生成消息内容：

```json
{
  "content": "处理完成！共处理 {{$json.count}} 条记录，耗时 {{$json.duration}} 秒。"
}
```

## 故障排除

### 常见问题

#### 1. 消息发送失败

**问题**: 收到"消息发送失败"错误
**可能原因**:
- Webhook URL无效或已过期
- 网络连接问题
- 消息内容不符合格式要求

**解决方案**:
1. 检查webhook URL是否正确
2. 在企业微信中重新生成机器人webhook URL
3. 检查网络连接
4. 验证消息内容格式

#### 2. @提及功能不工作

**问题**: @提及用户没有收到通知
**可能原因**:
- 用户ID不正确
- 手机号格式错误
- 用户不在群聊中

**解决方案**:
1. 确认用户ID或手机号正确
2. 使用@all提及所有群成员
3. 检查用户是否在目标群聊中

#### 3. 图片发送失败

**问题**: 图片消息发送失败
**可能原因**:
- 图片格式不支持
- 图片大小超过限制
- Base64编码错误

**解决方案**:
1. 确保图片格式为JPG或PNG
2. 压缩图片至2MB以下
3. 检查Base64编码是否正确

#### 4. Markdown格式显示异常

**问题**: Markdown消息显示格式不正确
**可能原因**:
- Markdown语法错误
- 使用了不支持的语法

**解决方案**:
1. 检查Markdown语法是否正确
2. 使用企业微信支持的Markdown语法
3. 测试简单的Markdown格式

### 调试技巧

#### 1. 启用详细日志

在节点设置中启用"详细日志"选项，查看详细的执行信息：

```json
{
  "enableDebugLogging": true
}
```

#### 2. 使用测试webhook

使用测试工具（如RequestBin）创建测试webhook，查看发送的请求内容：

```bash
# 使用curl测试webhook
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"msgtype":"text","text":{"content":"测试消息"}}'
```

#### 3. 检查输出数据

查看节点的输出数据，了解执行结果：

```json
{
  "success": false,
  "errorCode": 93000,
  "errorMessage": "Webhook URL无效或已过期",
  "timestamp": 1642234567890,
  "messageType": "text"
}
```

### 性能优化

#### 1. 批量发送优化

对于大量消息，建议使用批量发送功能：

```javascript
// 将多个消息合并为一个批次
const messages = items.map(item => ({
  msgtype: 'text',
  text: { content: item.content }
}));
```

#### 2. 重试策略配置

根据网络环境调整重试参数：

```json
{
  "maxRetries": 3,
  "retryDelay": 1000,
  "timeout": 30000
}
```

#### 3. 内存使用优化

处理大量数据时，注意内存使用：

```javascript
// 分批处理大量数据
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  // 处理批次
}
```

## API参考

### 输入参数

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| messageType | string | 是 | 消息类型：text, markdown, image, news, file |
| content | string | 条件 | 文本消息内容（messageType为text时必需） |
| markdownContent | string | 条件 | Markdown内容（messageType为markdown时必需） |
| imageBase64 | string | 条件 | 图片Base64编码（messageType为image且imageSource为base64时必需） |
| imageUrl | string | 条件 | 图片URL（messageType为image且imageSource为url时必需） |
| newsArticles | array | 条件 | 图文文章列表（messageType为news时必需） |
| fileMediaId | string | 条件 | 文件媒体ID（messageType为file时必需） |
| mentionedUsers | string | 否 | @提及的用户ID，多个用逗号分隔 |
| mentionedMobiles | string | 否 | @提及的手机号，多个用逗号分隔 |

### 输出数据

| 字段名 | 类型 | 描述 |
|--------|------|------|
| success | boolean | 发送是否成功 |
| messageId | string | 消息ID（成功时返回） |
| errorCode | number | 错误代码（失败时返回） |
| errorMessage | string | 错误信息（失败时返回） |
| timestamp | number | 时间戳 |
| messageType | string | 消息类型 |
| input | object | 原始输入数据（调试用） |

### 错误代码

| 错误代码 | 描述 | 解决方案 |
|----------|------|----------|
| 93000 | Webhook URL无效或已过期 | 重新生成webhook URL |
| 45009 | 接口调用超过限制 | 降低调用频率，稍后重试 |
| 40001 | 参数错误 | 检查输入参数格式 |
| 40003 | 媒体文件上传失败 | 检查文件格式和大小 |
| -1 | 网络错误 | 检查网络连接 |

## 最佳实践

### 1. 消息设计

- **简洁明了**：保持消息内容简洁，突出重点信息
- **结构化**：使用Markdown格式提高可读性
- **及时性**：确保消息内容的时效性

### 2. 频率控制

- **避免频繁发送**：合理控制消息发送频率，避免打扰用户
- **批量处理**：将相关消息合并发送，减少通知次数
- **时间窗口**：在合适的时间发送消息

### 3. 错误处理

- **优雅降级**：当发送失败时，提供备用通知方式
- **重试机制**：合理设置重试次数和间隔
- **日志记录**：记录详细的执行日志，便于问题排查

### 4. 安全考虑

- **凭据保护**：妥善保管webhook URL，避免泄露
- **内容过滤**：对用户输入进行适当的过滤和验证
- **权限控制**：限制节点的使用权限

## 更新日志

### v1.0.0 (2024-01-15)
- 🎉 首次发布
- ✨ 支持文本、Markdown、图片、图文、文件消息
- ✨ 支持@提及功能
- ✨ 内置重试机制和错误处理
- ✨ 详细的日志记录和性能监控

## 许可证

MIT License

## 支持

如果您在使用过程中遇到问题或有改进建议，请：

1. 查看本文档的故障排除部分
2. 检查n8n社区论坛的相关讨论
3. 提交GitHub Issue（如果适用）

## 贡献

欢迎贡献代码和改进建议！请遵循以下步骤：

1. Fork项目仓库
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

---

**注意**：本节点需要有效的企业微信群机器人webhook URL才能正常工作。请确保您已经在企业微信中正确配置了群机器人。