import OpenAI from "openai";

// サーバー専用モジュール。Route Handler / Server Component 以外から import しないこと
// （クライアントに import すると API キーの秘匿が崩れる）

export const CHAT_MODEL = "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY が未設定です。.env.example を .env.local にコピーしてキーを設定してください"
    );
  }
  // モジュールスコープに1個だけ生成（コネクション再利用のため）
  client ??= new OpenAI();
  return client;
}
