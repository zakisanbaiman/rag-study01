import { getStore } from "@/lib/store";
import { embed } from "./embed";
import type { RetrievedChunk } from "./types";

// (5) 検索: 質問文を文書チャンクと同じベクトル空間に置き（同じ embed を使う）、
// ストアから類似度上位 k 件を取り出す。

export async function retrieve(query: string, k = 3): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embed([query]);
  return getStore().search(queryEmbedding, k);
}
