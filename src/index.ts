export interface Env {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  CLAUDE_API_KEY: string;
  CLAUDE_MODEL: string;
}

// 飞书 API 基础 URL
const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

// 获取飞书访问令牌
async function getFeishuAccessToken(env: Env): Promise<string> {
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: env.FEISHU_APP_ID,
      app_secret: env.FEISHU_APP_SECRET,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get access token: ${data.msg}`);
  }
  return data.tenant_access_token;
}

// 调用 Claude API
async function callClaudeAPI(message: string, env: Env): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// 发送消息到飞书
async function sendFeishuMessage(
  accessToken: string,
  receiveId: string,
  msgType: string,
  content: string,
  receiveIdType: string = "open_id"
): Promise<void> {
  await fetch(`${FEISHU_API_BASE}/im/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      receive_id: receiveId,
      receive_id_type: receiveIdType,
      msg_type: msgType,
      content: JSON.stringify(content),
    }),
  });
}

// 验证签名
function verifySignature(
  timestamp: string,
  nonce: string,
  signature: string,
  env: Env
): boolean {
  const crypto = require("crypto");
  const str = `${timestamp}${nonce}${env.FEISHU_APP_SECRET}`;
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return hash === signature;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 健康检查
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    // 处理飞书事件回调 (POST)
    if (request.method === "POST") {
      const headers = request.headers;
      const timestamp = headers.get("X-Lark-Request-Timestamp") || "";
      const nonce = headers.get("X-Lark-Request-Nonce") || "";
      const signature = headers.get("X-Lark-Signature") || "";

      // 验证签名
      // if (!verifySignature(timestamp, nonce, signature, env)) {
      //   return new Response("Unauthorized", { status: 401 });
      // }

      try {
        const body = await request.json();

        // 处理 URL 验证
        if (body.type === "url_verification") {
          return new Response(JSON.stringify({ challenge: body.challenge }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 处理消息事件
        if (body.event && body.event.msg_type === "text") {
          const accessToken = await getFeishuAccessToken(env);

          // 获取发送者 ID 和消息内容
          const senderId = body.event.sender.sender_id?.open_id || body.event.sender.sender_id?.user_id;
          const messageContent = JSON.parse(body.event.content).text;

          if (senderId && messageContent) {
            // 调用 Claude API
            const reply = await callClaudeAPI(messageContent, env);

            // 发送回复
            await sendFeishuMessage(accessToken, senderId, "text", { text: reply });
          }
        }

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error processing request:", error);
        return new Response("Internal Error", { status: 500 });
      }
    }

    // GET 请求返回使用说明
    if (url.pathname === "/" || url.pathname === "/usage") {
      return new Response(
        JSON.stringify({
          message: "飞书 Claude 机器人",
          usage: "在飞书中向机器人发送消息即可获得回复",
          endpoints: {
            health: "/health",
            webhook: "POST /",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
