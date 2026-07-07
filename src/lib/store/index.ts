import { MemoryVectorStore } from "./MemoryVectorStore";
import type { VectorStore } from "./VectorStore";

// 実装差し替え点: ストアを変えるときはこのファイルだけを変更する。

// dev の HMR はモジュールを再評価するためモジュールスコープの変数は消えるが、
// globalThis はプロセスが生きている限り残る。ここにキャッシュしてストアを延命する。
// （プロセス再起動では消える＝メモリストアの限界。Step 7 の永続化で解決）
const g = globalThis as unknown as { __vectorStore?: VectorStore };

export function getStore(): VectorStore {
  g.__vectorStore ??= new MemoryVectorStore();
  return g.__vectorStore;
}
