// RAG パイプライン全体で共有する型。

// 取り込み対象の文書（Step 4 で使用）
export type Document = {
  source: string; // 元ファイル名（出典表示の生命線）
  content: string;
};

// チャンクの出典メタデータ。回答に「どのファイルの何番目か」を紐付けるために必須
export type ChunkMetadata = {
  source: string;
  chunkIndex: number;
};

// ストアに蓄積する1レコード。embedding は呼び出し側で計算済みを渡す
export type ChunkRecord = {
  id: string;
  text: string;
  embedding: number[];
  metadata: ChunkMetadata;
};

// 検索結果: レコード + 類似度スコア（embedding は返さない。呼び出し側に不要なため）
export type RetrievedChunk = {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  score: number;
};
