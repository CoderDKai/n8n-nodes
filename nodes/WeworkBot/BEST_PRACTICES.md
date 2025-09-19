# WeWorkBot - 最佳实践指南

本指南提供了使用WeWorkBot的最佳实践，帮助您构建高效、稳定、用户友好的自动化工作流。

## 🎯 消息设计原则

### 1. 内容简洁明了

**✅ 好的做法**:
```json
{
  "messageType": "text",
  "content": "🚨 服务器CPU使用率达到85%，请立即检查！\n\n服务器: web-01\n时间: 2024-01-15 14:30\n当前负载: 85%"
}
```

**❌ 避免的做法**:
```json
{
  "messageType": "text",
  "content": "系统监控程序检测到服务器的CPU使用率指标在最近的监控周期内出现了异常情况，具体表现为CPU使用率数值超过了预设的阈值参数，建议相关技术人员尽快进行排查和处理..."
}
```

### 2. 结构化信息展示

使用Markdown格式提高可读性：

```json
{
  "messageType": "markdown",
  "markdownContent": "# 📊 每日数据报告\n\n**日期**: 2024-01-15\n**总用户数**: 12,345\n**新增用户**: 234\n**活跃用户**: 8,901\n\n---\n\n## 📈 趋势分析\n- 用户增长率: +2.1%\n- 活跃度: 72.3%\n- 留存率: 85.6%\n\n[查看详细报告](https://dashboard.example.com)"
}
```

### 3. 合理使用表情符号

表情符号可以提高消息的可读性和吸引力：

```json
{
  "messageType": "text",
  "content": "✅ 部署成功\n🚀 新版本已上线\n📊 性能提升15%\n🔧 修复3个已知问题"
}
```

## 🕐 时机和频率控制

### 1. 避免消息轰炸

**设置合理的发送间隔**:
```javascript
// 在Function节点中添加延迟
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 批量发送时添加间隔
for (let i = 0; i < messages.length; i++) {
  await sendMessage(messages[i]);
  if (i < messages.length - 1) {
    await delay(2000); // 等待2秒
  }
}
```

### 2. 工作时间发送

只在工作时间发送非紧急消息：
```javascript
// 检查当前时间是否在工作时间内
const now = new Date();
const hour = now.getHours();
const isWorkingHours = hour >= 9 && hour <= 18;
const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;

if (isWorkingHours && isWeekday) {
  // 发送消息
} else if (isUrgent) {
  // 紧急消息仍然发送
} else {
  // 延迟到工作时间发送
}
```

### 3. 消息合并

将相关消息合并发送：
```javascript
// ❌ 避免：多条单独消息
// "用户A登录了"
// "用户B登录了"  
// "用户C登录了"

// ✅ 推荐：合并消息
const loginUsers = ['用户A', '用户B', '用户C'];
const message = `📱 新用户登录通知\n\n${loginUsers.map(user => `• ${user}`).join('\n')}\n\n共${loginUsers.length}位用户登录`;
```

## 🎭 个性化和上下文

### 1. 动态内容生成

使用n8n表达式创建动态内容：
```json
{
  "messageType": "text",
  "content": "Hi {{$json.userName}}，您的{{$json.taskType}}任务已完成！\n\n✅ 处理时间: {{$json.duration}}分钟\n📊 处理结果: {{$json.result}}\n🔗 查看详情: {{$json.detailUrl}}"
}
```

### 2. 条件化消息

根据不同条件发送不同消息：
```javascript
// 在Function节点中实现条件逻辑
const status = items[0].json.status;
let message;

switch (status) {
  case 'success':
    message = {
      messageType: 'text',
      content: '✅ 任务执行成功！',
      mentionedUsers: ''
    };
    break;
  case 'warning':
    message = {
      messageType: 'text',
      content: '⚠️ 任务完成但有警告，请检查日志。',
      mentionedUsers: 'admin'
    };
    break;
  case 'error':
    message = {
      messageType: 'text',
      content: '🚨 任务执行失败！请立即处理。',
      mentionedUsers: '@all'
    };
    break;
}

return [{ json: message }];
```

### 3. 智能@提及

根据消息重要性和内容智能选择@提及对象：
```javascript
const getNotificationTargets = (severity, category) => {
  const targets = {
    critical: {
      system: '@all',
      security: 'security-team,admin',
      business: 'business-team,manager'
    },
    warning: {
      system: 'ops-team',
      security: 'security-team',
      business: 'business-team'
    },
    info: {
      system: '',
      security: '',
      business: ''
    }
  };
  
  return targets[severity][category] || '';
};
```

## 🔄 错误处理和重试

### 1. 优雅的错误处理

```javascript
// 在Function节点中实现错误处理
try {
  const result = await sendMessage(message);
  return [{
    json: {
      success: true,
      messageId: result.messageId,
      timestamp: Date.now()
    }
  }];
} catch (error) {
  // 记录错误但不中断工作流
  console.error('消息发送失败:', error.message);
  
  return [{
    json: {
      success: false,
      error: error.message,
      timestamp: Date.now(),
      // 提供备用通知方式
      fallbackAction: 'email-notification'
    }
  }];
}
```

### 2. 智能重试策略

```javascript
const sendWithRetry = async (message, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendMessage(message);
      return result;
    } catch (error) {
      console.log(`发送失败，第${attempt}次尝试:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`消息发送失败，已重试${maxRetries}次: ${error.message}`);
      }
      
      // 指数退避策略
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### 3. 降级策略

当主要通知方式失败时，提供备用方案：
```javascript
const notificationFallback = async (message, primaryFailed = false) => {
  if (!primaryFailed) {
    try {
      return await sendWeworkMessage(message);
    } catch (error) {
      console.log('企业微信发送失败，使用备用方案');
      primaryFailed = true;
    }
  }
  
  if (primaryFailed) {
    // 备用方案1: 邮件通知
    try {
      return await sendEmailNotification(message);
    } catch (error) {
      console.log('邮件发送失败，使用最后备用方案');
    }
    
    // 备用方案2: 写入日志文件
    await writeToLogFile(message);
  }
};
```

## 📊 监控和分析

### 1. 消息发送统计

跟踪消息发送的成功率和性能：
```javascript
// 在Function节点中记录统计信息
const stats = {
  timestamp: Date.now(),
  messageType: message.messageType,
  success: result.success,
  responseTime: Date.now() - startTime,
  errorCode: result.errorCode || null
};

// 发送到监控系统
await sendToMonitoring(stats);
```

### 2. 用户反馈收集

定期收集用户对通知质量的反馈：
```json
{
  "messageType": "news",
  "articles": [
    {
      "title": "📋 通知质量调研",
      "description": "请花1分钟时间帮我们改进通知质量",
      "url": "https://survey.example.com/notification-feedback",
      "picurl": "https://example.com/images/survey.jpg"
    }
  ]
}
```

### 3. A/B测试

测试不同的消息格式和内容：
```javascript
// 随机选择消息版本进行A/B测试
const messageVersions = [
  {
    version: 'A',
    content: '✅ 任务完成：{{$json.taskName}}'
  },
  {
    version: 'B', 
    content: '🎉 好消息！{{$json.taskName}}已成功完成'
  }
];

const selectedVersion = messageVersions[Math.floor(Math.random() * messageVersions.length)];

// 记录使用的版本用于后续分析
const message = {
  ...selectedVersion,
  metadata: {
    abTestVersion: selectedVersion.version,
    timestamp: Date.now()
  }
};
```

## 🔒 安全和隐私

### 1. 敏感信息处理

避免在消息中暴露敏感信息：
```javascript
// ❌ 避免：直接暴露敏感信息
const message = `用户${user.email}的密码是${user.password}`;

// ✅ 推荐：脱敏处理
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

const message = `用户${maskEmail(user.email)}已完成注册`;
```

### 2. 权限控制

根据用户权限发送不同级别的信息：
```javascript
const getMessageByRole = (data, userRole) => {
  const messages = {
    admin: {
      content: `🔧 系统详情：${data.fullDetails}`,
      mentionedUsers: 'admin-team'
    },
    user: {
      content: `📢 系统通知：${data.publicInfo}`,
      mentionedUsers: ''
    }
  };
  
  return messages[userRole] || messages.user;
};
```

### 3. 审计日志

记录所有消息发送活动：
```javascript
const auditLog = {
  timestamp: Date.now(),
  userId: executionContext.userId,
  workflowId: executionContext.workflowId,
  messageType: message.messageType,
  recipients: message.mentionedUsers,
  success: result.success,
  ipAddress: executionContext.ipAddress
};

await saveAuditLog(auditLog);
```

## 🚀 性能优化

### 1. 批量处理

对于大量消息，使用批量处理提高效率：
```javascript
const processBatch = async (messages, batchSize = 10) => {
  const results = [];
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const batchPromises = batch.map(msg => sendMessage(msg));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`批次 ${Math.floor(i/batchSize) + 1} 处理失败:`, error);
    }
    
    // 批次间添加延迟
    if (i + batchSize < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};
```

### 2. 缓存优化

缓存常用的消息模板和配置：
```javascript
// 消息模板缓存
const messageTemplates = new Map();

const getTemplate = (templateName) => {
  if (!messageTemplates.has(templateName)) {
    const template = loadTemplate(templateName);
    messageTemplates.set(templateName, template);
  }
  return messageTemplates.get(templateName);
};

// 使用模板
const template = getTemplate('daily-report');
const message = template.render(data);
```

### 3. 连接池管理

复用HTTP连接提高性能：
```javascript
// 使用连接池
const https = require('https');

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000
});

const sendMessage = async (message) => {
  return await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
    agent: agent
  });
};
```

## 📱 用户体验优化

### 1. 消息分类和标识

使用一致的图标和格式标识不同类型的消息：
```javascript
const messageIcons = {
  success: '✅',
  warning: '⚠️',
  error: '🚨',
  info: 'ℹ️',
  update: '🔄',
  security: '🔒',
  performance: '📊'
};

const formatMessage = (type, content) => {
  return `${messageIcons[type]} ${content}`;
};
```

### 2. 交互式消息

提供可点击的链接和操作：
```json
{
  "messageType": "news",
  "articles": [
    {
      "title": "🚨 服务器告警",
      "description": "CPU使用率过高，点击查看详情和处理建议",
      "url": "https://monitoring.example.com/alerts/cpu-high?server=web-01&action=investigate",
      "picurl": "https://example.com/images/alert-cpu.jpg"
    }
  ]
}
```

### 3. 上下文相关的帮助

在消息中提供相关的帮助信息：
```json
{
  "messageType": "markdown",
  "markdownContent": "🚨 **数据库连接失败**\n\n**可能原因**:\n• 数据库服务器宕机\n• 网络连接问题\n• 认证信息过期\n\n**处理步骤**:\n1. [检查服务器状态](https://status.example.com)\n2. [查看错误日志](https://logs.example.com)\n3. [联系DBA团队](mailto:dba@example.com)\n\n**紧急联系**: 13800138000"
}
```

## 📋 检查清单

在部署到生产环境前，请确认：

### 消息内容
- [ ] 消息内容简洁明了
- [ ] 使用了合适的格式和结构
- [ ] 包含了必要的上下文信息
- [ ] 敏感信息已脱敏处理

### 发送策略
- [ ] 设置了合理的发送频率
- [ ] 考虑了用户的工作时间
- [ ] 实现了消息合并逻辑
- [ ] 配置了智能@提及规则

### 错误处理
- [ ] 实现了重试机制
- [ ] 配置了降级策略
- [ ] 添加了详细的错误日志
- [ ] 设置了监控告警

### 性能优化
- [ ] 使用了批量处理
- [ ] 实现了连接复用
- [ ] 添加了缓存机制
- [ ] 优化了内存使用

### 安全考虑
- [ ] 保护了敏感信息
- [ ] 实现了权限控制
- [ ] 添加了审计日志
- [ ] 验证了输入数据

### 用户体验
- [ ] 消息分类清晰
- [ ] 提供了交互功能
- [ ] 包含了帮助信息
- [ ] 支持多语言（如需要）

---

遵循这些最佳实践，您可以构建出高效、稳定、用户友好的企业微信通知系统。记住，好的通知系统不仅要能发送消息，更要发送有价值的消息！