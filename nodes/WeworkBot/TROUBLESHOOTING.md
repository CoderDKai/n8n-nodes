# 企业微信群机器人节点 - 故障排除指南

本指南提供了常见问题的解决方案和调试技巧，帮助您快速解决使用过程中遇到的问题。

## 🚨 常见错误及解决方案

### 1. 连接和认证错误

#### 错误代码: 93000
**错误信息**: "Webhook URL无效或已过期"

**可能原因**:
- Webhook URL格式不正确
- 群机器人已被删除或禁用
- URL中的key参数已过期

**解决步骤**:
1. 检查Webhook URL格式是否正确：
   ```
   https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
   ```
2. 在企业微信群中确认机器人仍然存在
3. 重新生成Webhook URL：
   - 进入群聊 → 群机器人 → 选择对应机器人 → 重新生成URL
4. 更新n8n中的凭据配置

#### 错误代码: -1
**错误信息**: "网络连接失败"

**可能原因**:
- 网络连接问题
- 防火墙阻止访问
- DNS解析失败

**解决步骤**:
1. 检查网络连接是否正常
2. 测试是否能访问企业微信API：
   ```bash
   curl -I https://qyapi.weixin.qq.com
   ```
3. 检查防火墙设置，确保允许访问企业微信域名
4. 如果使用代理，确认代理配置正确

### 2. 消息格式错误

#### 错误代码: 40001
**错误信息**: "参数错误"

**可能原因**:
- 消息内容为空
- 消息格式不符合要求
- 参数类型错误

**解决步骤**:
1. 检查必填字段是否已填写
2. 验证消息内容长度限制：
   - 文本消息：最大4096字符
   - Markdown消息：最大4096字符
   - 图文消息标题：最大128字符
   - 图文消息描述：最大512字符
3. 确认参数类型正确

#### 错误信息: "消息验证失败"

**常见验证错误**:

**文本消息**:
```javascript
// ❌ 错误：内容为空
{
  "messageType": "text",
  "content": ""
}

// ✅ 正确
{
  "messageType": "text",
  "content": "这是一条有效的文本消息"
}
```

**Markdown消息**:
```javascript
// ❌ 错误：内容为空
{
  "messageType": "markdown",
  "markdownContent": ""
}

// ✅ 正确
{
  "messageType": "markdown",
  "markdownContent": "# 标题\n\n这是**粗体**文本"
}
```

**图片消息**:
```javascript
// ❌ 错误：Base64数据无效
{
  "messageType": "image",
  "imageSource": "base64",
  "imageBase64": "invalid-base64-data"
}

// ✅ 正确
{
  "messageType": "image",
  "imageSource": "base64",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 3. 图片相关错误

#### 错误信息: "图片格式不支持"

**解决步骤**:
1. 确认图片格式为JPG或PNG
2. 检查文件扩展名是否正确
3. 验证图片文件是否损坏

#### 错误信息: "图片大小超过限制"

**解决步骤**:
1. 压缩图片至2MB以下
2. 使用图片压缩工具：
   ```bash
   # 使用ImageMagick压缩图片
   convert input.jpg -quality 80 -resize 1920x1080> output.jpg
   ```
3. 考虑使用图片URL而非Base64编码

#### 错误信息: "Base64编码错误"

**解决步骤**:
1. 确认Base64字符串不包含`data:image/`前缀
2. 验证Base64编码是否有效：
   ```javascript
   // 在浏览器控制台中测试
   try {
     atob('your-base64-string');
     console.log('Base64编码有效');
   } catch (e) {
     console.log('Base64编码无效');
   }
   ```
3. 重新生成Base64编码

### 4. @提及功能问题

#### 问题: @提及用户没有收到通知

**可能原因**:
- 用户ID不正确
- 用户不在群聊中
- 手机号格式错误

**解决步骤**:
1. 确认用户在目标群聊中
2. 使用正确的用户ID格式
3. 验证手机号格式（11位数字）
4. 测试使用`@all`提及所有人

**正确的@提及格式**:
```javascript
{
  "messageType": "text",
  "content": "请注意这条消息",
  "mentionedUsers": "user1,user2,user3",  // 用户ID，逗号分隔
  "mentionedMobiles": "13800138000,13900139000"  // 手机号，逗号分隔
}
```

### 5. 频率限制错误

#### 错误代码: 45009
**错误信息**: "接口调用超过限制"

**解决步骤**:
1. 降低消息发送频率
2. 实现发送间隔控制：
   ```javascript
   // 在Function节点中添加延迟
   await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
   ```
3. 使用批量发送功能合并消息
4. 监控发送频率，避免短时间内大量发送

## 🔍 调试技巧

### 1. 启用详细日志

在节点配置中启用调试模式：
```javascript
// 在工作流设置中启用详细日志
{
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": "",
    "timezone": "Asia/Shanghai"
  }
}
```

### 2. 检查输出数据

查看节点的输出数据了解执行结果：
```json
{
  "success": false,
  "errorCode": 93000,
  "errorMessage": "Webhook URL无效或已过期",
  "timestamp": 1642234567890,
  "messageType": "text",
  "input": {
    "messageType": "text",
    "content": "测试消息"
  }
}
```

### 3. 使用测试工具

#### 测试Webhook URL
```bash
# 使用curl测试webhook
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "msgtype": "text",
    "text": {
      "content": "测试消息"
    }
  }'
```

#### 验证Base64编码
```javascript
// 在浏览器控制台中验证
const base64String = 'your-base64-string';
try {
  const binaryString = atob(base64String);
  console.log('Base64有效，长度:', binaryString.length);
} catch (error) {
  console.log('Base64无效:', error.message);
}
```

### 4. 网络诊断

#### 检查DNS解析
```bash
nslookup qyapi.weixin.qq.com
```

#### 检查网络连通性
```bash
ping qyapi.weixin.qq.com
```

#### 检查端口访问
```bash
telnet qyapi.weixin.qq.com 443
```

## 🛠️ 性能优化

### 1. 批量处理优化

对于大量消息，使用批量处理：
```javascript
// 在Function节点中实现批量处理
const batchSize = 10;
const batches = [];

for (let i = 0; i < items.length; i += batchSize) {
  batches.push(items.slice(i, i + batchSize));
}

return batches.map(batch => ({
  json: { messages: batch }
}));
```

### 2. 错误重试策略

实现智能重试机制：
```javascript
// 在Function节点中实现重试逻辑
async function sendWithRetry(message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sendMessage(message);
      if (result.success) return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. 内存使用优化

处理大量数据时注意内存使用：
```javascript
// 避免在内存中保存大量数据
const processInChunks = (data, chunkSize = 100) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
};
```

## 📊 监控和维护

### 1. 设置监控告警

创建监控工作流检查消息发送状态：
```json
{
  "name": "消息发送监控",
  "trigger": "schedule",
  "schedule": "*/5 * * * *",
  "nodes": [
    {
      "type": "httpRequest",
      "name": "检查API状态",
      "url": "https://qyapi.weixin.qq.com"
    },
    {
      "type": "if",
      "name": "判断状态",
      "condition": "{{$json.status}} !== 200"
    },
    {
      "type": "weworkBot",
      "name": "发送告警",
      "messageType": "text",
      "content": "⚠️ 企业微信API异常，请检查！"
    }
  ]
}
```

### 2. 日志分析

定期分析执行日志：
```bash
# 分析错误模式
grep "ERROR" /var/log/n8n/executions.log | \
  awk '{print $4}' | sort | uniq -c | sort -nr

# 统计成功率
grep "WeworkBot" /var/log/n8n/executions.log | \
  grep -c "success.*true" && \
  grep "WeworkBot" /var/log/n8n/executions.log | wc -l
```

### 3. 性能监控

监控关键性能指标：
- 消息发送成功率
- 平均响应时间
- 错误频率
- 内存使用情况

## 🆘 获取帮助

如果以上解决方案都无法解决您的问题，请：

1. **收集信息**:
   - 错误信息的完整截图
   - 节点配置的导出文件
   - 执行日志的相关部分
   - n8n版本和环境信息

2. **检查文档**:
   - [完整文档](./README.md)
   - [快速开始指南](./QUICK_START.md)
   - [企业微信官方文档](https://developer.work.weixin.qq.com/document/path/91770)

3. **社区支持**:
   - n8n社区论坛
   - GitHub Issues
   - 技术支持邮箱

4. **提供反馈**:
   - 报告Bug
   - 功能建议
   - 文档改进建议

## 📋 检查清单

在寻求帮助前，请确认已完成以下检查：

- [ ] Webhook URL格式正确且有效
- [ ] 群机器人仍然存在且启用
- [ ] 网络连接正常
- [ ] 消息内容符合格式要求
- [ ] 参数类型和值正确
- [ ] 图片格式和大小符合限制
- [ ] @提及的用户在群聊中
- [ ] 发送频率在限制范围内
- [ ] 已查看执行日志
- [ ] 已尝试基本的故障排除步骤

---

**记住**: 大多数问题都可以通过仔细检查配置和查看错误信息来解决。保持耐心，逐步排查问题！