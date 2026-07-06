import { embed } from "@/lib/rag/embed";
import { cosineSimilarity } from "@/lib/store/cosine";

// Step 2: Embedding 動作確認用の使い捨てルート。
// 意味の近い2文と無関係な1文の類似度を数値で目視する。
// GET /api/embed-test

const SENTENCES = [
  "有給休暇の申請方法を教えてください",
  "休みを取りたいときはどう手続きすればいいですか？",
  "本番サーバーへのデプロイ手順を説明します",
];

export async function GET() {
  try {
    const vectors = await embed(SENTENCES);

    const pairs = [];
    for (let i = 0; i < SENTENCES.length; i++) {
      for (let j = i + 1; j < SENTENCES.length; j++) {
        pairs.push({
          a: SENTENCES[i],
          b: SENTENCES[j],
          similarity: Number(cosineSimilarity(vectors[i], vectors[j]).toFixed(4)),
        });
      }
    }

    return Response.json({
      dimensions: vectors[0].length,
      count: vectors.length,
      pairs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
