# 飞书 Claude 机器人

一个基于 Cloudflare Workers 的飞书机器人，连接 Claude API 实现智能对话。

## 功能特点

- ✅ 接收飞书消息
- ✅ 调用 Claude AI 生成回复
- ✅ 自动发送回复
- ✅ 免费部署（Cloudflare Workers）

## 快速部署

### 1. 准备工作

确保已安装：
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/get-started/guide/)
- [Node.js](https://nodejs.org/) (18+)

安装 Wrangler：
```bash
npm install -g wrangler
```

登录 Cloudflare：
```bash
wrangler login
```

### 2. 获取凭证

#### A. 飞书开放平台

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取应用凭证：
   - App ID
   - App Secret
4. 配置机器人能力：
   - `im:message:recv_as_bot` - 接收消息
   - `im:message:send_as_bot` - 发送消息
5. 发布应用到企业

#### B. Claude API

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 获取 API Key
3. 记录模型名称（如 `claude-sonnet-4-20250514`）

### 3. 配置环境变量

编辑 `wrangler.toml`：
```toml
[vars]
FEISHU_APP_ID = "your-app-id"
FEISHU_APP_SECRET = "your-app-secret"
CLAUDE_API_KEY = "your-claude-api-key"
CLAUDE_MODEL = "claude-sonnet-4-20250514"
```

或使用环境变量：
```bash
export FEISHU_APP_ID="your-app-id"
export FEISHU_APP_SECRET="your-app-secret"
export CLAUDE_API_KEY="your-claude-api-key"
```

### 4. 部署到 Cloudflare Workers

```bash
# 部署
wrangler deploy

# 开发模式（热重载）
npx wrangler dev
```

### 5. 配置飞书 Webhook

1. 获取 Worker URL（部署后）
2. 在飞书开放平台：
   - 进入应用管理
   - 设置"事件订阅"或"Webhook"
   - 填写 Worker URL
   - 启用接收消息权限

## 测试

1. 在飞书中找到机器人
2. 发送消息测试
3. 查看 Cloudflare Workers 日志确认请求

## 目录结构

```
feishu-claude-bot/
├── src/
│   └── index.ts        # 主要代码
├── wrangler.toml       # 配置
├── package.json        # 依赖
└── README.md           # 说明
```

## 自定义

### 修改提示词

在 `src/index.ts` 中修改系统提示：

```typescript
messages: [
  {
    role: "system",
    content: "你是黄嘉志的 AI 助手，请用中文回复...",
  },
  {
    role: "user",
    content: message,
  },
],
```

### 添加图片/富文本支持

参考飞书消息格式文档扩展 `sendFeishuMessage` 函数。

## 常见问题

Q: 消息收不到？
A: 检查 Cloudflare Workers 日飞书 Webhook URL 配置。

Q: Claude 回复太慢？
A: Cloudflare Workers 有 10 秒超时限制，考虑使用异步处理。

Q: 如何群聊中@机器人回复？
A: 在飞书开放平台启用群聊机器人权限。

## 许可

MIT License
