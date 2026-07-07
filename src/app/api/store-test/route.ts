import { embed } from "@/lib/rag/embed";
import { retrieve } from "@/lib/rag/retrieve";
import { getStore } from "@/lib/store";

// Step 3: ストア + 検索の動作確認用の使い捨てルート。
// 初回呼び出しでシード文を投入し、以降はスキップ。
// → HMR やプロセス再起動をまたいで size がどうなるかを観察する。
// GET /api/store-test

const SEED_SENTENCES = [
  "有給休暇は入社6ヶ月後から付与され、勤怠システムから申請できます",
  "経費精算は月末締めで、領収書の写真を添付して申請します",
  "社内Wikiのアカウントは情報システム部に依頼すると発行されます",
  "リモートワークは週3日まで、前日までに上長へ連絡が必要です",
];

const QUERY = "休暇を取るにはどうすればいい？";

export async function GET() {
  try {
    const store = getStore();

    const seededNow = (await store.size()) === 0;
    if (seededNow) {
      const embeddings = await embed(SEED_SENTENCES);
      await store.add(
        SEED_SENTENCES.map((text, i) => ({
          id: `seed-${i}`,
          text,
          embedding: embeddings[i],
          metadata: { source: "seed", chunkIndex: i },
        }))
      );
    }

    const results = await retrieve(QUERY, 2);

    return Response.json({
      seededNow,
      size: await store.size(),
      query: QUERY,
      results: results.map((r) => ({
        score: Number(r.score.toFixed(4)),
        text: r.text,
        source: `${r.metadata.source}#${r.metadata.chunkIndex}`,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
