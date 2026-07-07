import { generate } from "@/lib/rag/generate";
import { retrieve } from "@/lib/rag/retrieve";
import { getStore } from "@/lib/store";

// RAG の本丸: 質問 → 検索（上位k件） → コンテキスト注入 → 出典つき回答。
// POST /api/chat  body: { "question": string }

const TOP_K = 3;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) {
      return Response.json(
        { error: "question を文字列で指定してください" },
        { status: 400 }
      );
    }

    if ((await getStore().size()) === 0) {
      return Response.json(
        { error: "ストアが空です。先に POST /api/ingest で文書を取り込んでください" },
        { status: 409 }
      );
    }

    const chunks = await retrieve(question, TOP_K);
    const { answer, usage } = await generate(question, chunks);

    return Response.json({
      answer,
      // 出典: 参照ファイル名リスト（チャンク詳細はデバッグ用に sources に含める）
      sources: chunks.map((c, i) => ({
        ref: i + 1,
        source: c.metadata.source,
        chunkIndex: c.metadata.chunkIndex,
        score: Number(c.score.toFixed(4)),
      })),
      usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
