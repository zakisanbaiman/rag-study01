import type { ChunkRecord, RetrievedChunk } from "@/lib/rag/types";

// (4) 蓄積の抽象化。実装差し替え（メモリ→SQLite 等）はこの契約の裏側だけで完結させる。
// 契約は最初から async: メモリ実装には過剰だが、遅い実装（DB）に合わせて切ることで
// Step 7 の差し替えが呼び出し側に波及しない。

export interface VectorStore {
  add(items: ChunkRecord[]): Promise<void>;
  search(queryEmbedding: number[], k: number): Promise<RetrievedChunk[]>;
  // ingest の冪等性（clear→全再取り込み）とリセット・件数確認に使うため必須
  clear(): Promise<void>;
  size(): Promise<number>;
}
