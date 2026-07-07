import { CHAT_MODEL, getOpenAI } from "@/lib/openai";
import type { RetrievedChunk } from "./types";

// (6) 生成: 検索で得たチャンクをコンテキストとしてプロンプトに注入し、出典つき回答を作る。
// モデルと生成APIの知識はこのファイルに閉じる（差し替え時はここだけ変える）。
// ADR-0001 により SSE ストリーミング化: 戻り値は「完成した文字列」ではなく「イベントの非同期列」。

// 検索は無関係な質問でも必ず上位k件を返すため、
// 「コンテキストに無ければ分からないと答える」指示がハルシネーション抑制の生命線。
const SYSTEM_PROMPT = `あなたは社内ドキュメントQ&Aアシスタントです。以下のルールを厳守してください。

- 回答は「コンテキスト」に含まれる情報だけを根拠にすること
- コンテキストに答えが無い場合は「提供された文書からは分かりません」と答えること。一般知識や推測で補わない
- 回答は日本語で簡潔に。根拠にした出典番号を文末に [1] のように付けること`;

export type GenerateEvent =
  | { type: "token"; content: string }
  | { type: "done"; usage: { promptTokens: number; completionTokens: number } };

export async function* generateStream(
  question: string,
  chunks: RetrievedChunk[]
): AsyncGenerator<GenerateEvent> {
  const context = chunks
    .map((c, i) => `[${i + 1}] 出典: ${c.metadata.source}\n${c.text}`)
    .join("\n\n");

  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `コンテキスト:\n${context}\n\n質問: ${question}` },
    ],
    stream: true,
    // usage は最終チャンクにしか載らない。この指定を忘れると消費トークンが取れない
    stream_options: { include_usage: true },
  });

  let usage = { promptTokens: 0, completionTokens: 0 };
  for await (const chunk of stream) {
    // usage 付きの最終チャンクは choices が空になるためガードする
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield { type: "token", content };
    if (chunk.usage) {
      usage = {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
      };
    }
  }
  yield { type: "done", usage };
}
