# rag-study01 — 社内ドキュメント Q&A RAGアプリ（学習用）

TypeScript / Next.js で RAG（検索拡張生成）の基本構成を段階的に実装する学習プロジェクト。

## 目的

「取り込み → 分割 → ベクトル化 → 蓄積 → 検索 → 生成」という RAG の型を、
1機能ずつ設計判断つきで作りながら体で理解することを目的とする。
システム開発の見積もり・設計イメージ力を鍛えるための訓練台。

## 技術構成

| 要素 | 選択 |
|------|------|
| フレームワーク | Next.js (App Router) + TypeScript |
| 生成モデル | OpenAI `gpt-4o-mini`（Chat Completions API） |
| Embedding | OpenAI `text-embedding-3-small` |
| ベクトルストア | メモリ内（配列＋コサイン類似度）→ 後で永続DBに差し替え可能に抽象化 |

## 設計資料

- [docs/implementation-plan.md](docs/implementation-plan.md) — 段階的な実装計画（Step 0〜7）
- [docs/business-flow.html](docs/business-flow.html) — 業務フロー図（ブラウザで開く。2フェーズを色分けで可視化）

## セットアップ

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY を実際のキーに書き換える
npm run dev                  # http://localhost:3000
```

その他のコマンド: `npm run build`（本番ビルド）/ `npm run lint`（ESLint）

## 進め方

各実装ステップを git worktree で1サイクル（作成 → 実装 → コミット → main マージ → 削除）として進める。
worktree では `.env.local` のコピーと `npm install` が毎回必要な点に注意。

## 注意

学習用途のため、投入するサンプル文書は架空の内容のみとし、実在の個人情報・機密情報は含めない。
