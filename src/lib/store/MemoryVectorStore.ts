import type { ChunkRecord, RetrievedChunk } from "@/lib/rag/types";
import { cosineSimilarity } from "./cosine";
import type { VectorStore } from "./VectorStore";

// メモリ実装: 配列＋全件ループのコサイン類似度。
// O(n) なので件数が増えると線形に遅くなる＝Step 7 で ANN インデックスを学ぶ動機。

export class MemoryVectorStore implements VectorStore {
  private items: ChunkRecord[] = [];

  async add(items: ChunkRecord[]): Promise<void> {
    this.items.push(...items);
  }

  async search(queryEmbedding: number[], k: number): Promise<RetrievedChunk[]> {
    return this.items
      .map((item) => ({
        id: item.id,
        text: item.text,
        metadata: item.metadata,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  async clear(): Promise<void> {
    this.items = [];
  }

  async size(): Promise<number> {
    return this.items.length;
  }
}
