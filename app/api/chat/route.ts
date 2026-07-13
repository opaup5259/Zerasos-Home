// app/api/chat/route.ts
import { siteConfig } from '../../../siteConfig';

export const runtime = 'edge';

export async function POST(req: Request) {
  console.log("🚀 [1/5] 路由进入：开始对接 AI");

  try {
    const { message } = await req.json();

    // 🔑 读取 API Key（优先 AI_API_KEY，兼容旧名 GEMINI_API_KEY / OPENAI_API_KEY）
    const apiKey = (
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      ''
    ).trim();

    if (!apiKey) {
      console.error("❌ 找不到 API Key");
      return new Response(JSON.stringify({ error: "Key missing" }), { status: 500 });
    }

    // 📡 从 siteConfig 读取 AI 配置
    const aiConfig = siteConfig.aiConfig;
    const modelId = aiConfig.modelId;
    const baseUrl = aiConfig.baseUrl;

    console.log(`📡 [2/5] 呼叫模型: ${modelId} @ ${baseUrl}`);

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: aiConfig.systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: aiConfig.maxOutputTokens,
        temperature: aiConfig.temperature,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🚨 模型拒绝了请求:", JSON.stringify(data));
      return new Response(JSON.stringify({
        error: `模型拒绝访问: ${response.status}`,
        details: data.error?.message || "未知错误"
      }), { status: response.status });
    }

    console.log("✅ [3/5] 模型成功响应");
    const reply = data.choices?.[0]?.message?.content || "(模型没有返回内容)";

    console.log("🎉 [4/5] 回复已生成，准备传回前端");

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("🔥 [5/5] 运行时崩溃:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ status: "Ready", model: siteConfig.aiConfig.modelId }), { status: 200 });
}
