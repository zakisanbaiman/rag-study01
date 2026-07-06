import { CHAT_MODEL, getOpenAI } from "@/lib/openai";

// Step 1: OpenAI 疎通確認用の使い捨てルート。固定プロンプトで1回だけ生成する。
// GET /api/hello

export async function GET() {
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "user",
          content: "「疎通確認OK」とだけ日本語で答えてください。",
        },
      ],
    });

    return Response.json({
      model: completion.model,
      answer: completion.choices[0].message.content,
      usage: completion.usage,
    });
  } catch (err) {
    // エラーレスポンスの共通形: { error: string } + 適切な status（以降のルートもこの形に揃える）
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
