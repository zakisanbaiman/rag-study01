import { getStore } from "@/lib/store";
import { embed } from "./embed";
import { loadDocuments } from "./ingest";
import { split } from "./split";
import type { ChunkRecord } from "./types";

// ingest パイプライン: (1)取り込み → (2)分割 → (3)ベクトル化 → (4)蓄積 を束ねる。
// 冪等性は「clear→全再取り込み」方式: 何度実行してもストアは常に全文書の最新状態になる。

export type IngestResult = {
  documents: number;
  chunks: number;
  perDocument: { source: string; chunks: number }[];
};

export async function runIngestPipeline(): Promise<IngestResult> {
  const docs = await loadDocuments();

  // 全文書のチャンクを平らに並べ、embed は1リクエストにまとめる
  // （上限はリクエスト合計30万トークンなのでサンプル文書規模では余裕）
  const records: Omit<ChunkRecord, "embedding">[] = docs.flatMap((doc) =>
    split(doc.content).map((text, chunkIndex) => ({
      id: `${doc.source}#${chunkIndex}`,
      text,
      metadata: { source: doc.source, chunkIndex },
    }))
  );

  const embeddings = await embed(records.map((r) => r.text));

  const store = getStore();
  await store.clear();
  await store.add(records.map((r, i) => ({ ...r, embedding: embeddings[i] })));

  return {
    documents: docs.length,
    chunks: records.length,
    perDocument: docs.map((doc) => ({
      source: doc.source,
      chunks: records.filter((r) => r.metadata.source === doc.source).length,
    })),
  };
}
