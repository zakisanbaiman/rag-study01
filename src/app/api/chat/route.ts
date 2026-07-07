import { generateStream } from "@/lib/rag/generate";
import { retrieve } from "@/lib/rag/retrieve";
import { getStore } from "@/lib/store";

// RAG の本丸: 質問 → 検索（上位k件） → コンテキスト注入 → 出典つき回答。
// ADR-0001 により SSE ストリーミング配信。イベント契約:
//   data: {type:"sources"} → {type:"token"}* → {type:"done"} | {type:"error"}
// エラーは2系統: ストリーム開始前は HTTP ステータス（400/409/500）、
// 開始後はステータス送信済みのため error イベントで表現する。
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
    const sources = chunks.map((c, i) => ({
      ref: i + 1,
      source: c.metadata.source,
      chunkIndex: c.metadata.chunkIndex,
      score: Number(c.score.toFixed(4)),
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

        try {
          // 出典は検索完了時点で確定している → 生成を待たず先に送る
          send({ type: "sources", sources });
          for await (const event of generateStream(question, chunks)) {
            send(event);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          send({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
