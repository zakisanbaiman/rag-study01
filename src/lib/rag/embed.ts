import { EMBEDDING_MODEL, getOpenAI } from "@/lib/openai";

// (3) ベクトル化: 文字列の配列を embedding ベクトルの配列に変換する。
// 1リクエストにまとめてバッチ送信する（上限: 1入力8192トークン / 合計30万トークン）。

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  // index で並べ直し、入力順とベクトル順の対応を保証する
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
