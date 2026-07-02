# 社内ドキュメント Q&A RAGアプリ 実装計画（学習用 / rag-study01）

## Context（なぜ作るか）

**目的はアプリを完成させることではなく、「お客さんの"こういうの作れる?"を、頭の中で構成図と工数に変換できる状態」になること。**
ユーザーはアクセンチュアでのマネジメント側の立ち回り（高速開発の見積もり・設計）に備えており、そのための訓練として RAG を選択。RAG は「取り込み→分割→ベクトル化→蓄積→検索→生成」というデータ/AI連携の型が全部入りで、かつ「PoCは半日・本番品質は数ヶ月」という**工数の落差**を体感できるのが狙い。

進め方は「各段階で Claude が選択肢＋トレードオフを提示 → ユーザーが技術判断 → Claude が実装」。つまりユーザーは "Claude Code を使うマネージャー" の役を演じ、設計判断・工数見積もりに集中する。

## 確定した技術構成

| 要素 | 選択 | 備考 |
|------|------|------|
| フレームワーク | Next.js (App Router) + TypeScript | `src/` 構成・Tailwind・ESLint |
| 生成モデル | `gpt-4o-mini` | 最安・キー1本・情報量最多。`generate.ts` に隠蔽し差し替え可能 |
| 生成API | **Chat Completions**（`client.chat.completions.create`） | 教材が多く学習向き。Responses への移行は `generate.ts` 局所変更で可能 |
| Embedding | `text-embedding-3-small` | 同じOpenAIキーで使える |
| ベクトルストア | メモリ内（配列＋コサイン類似度）から | `VectorStore` インターフェースで抽象化し後で差し替え |
| OpenAI SDK | `openai` npm（v6系） | 着手時に公式READMEで最新API形を写経確認 |
| worktree運用 | **各ステップで厳密に切る** | グローバルルール遵守の練習。初回コミットのみ main 直コミット許可 |

## 要確認ポイント（着手時に一次情報で再確認）

- Next.js の `create-next-app` 最新版（16系）のプロンプト構成（Biome / React Compiler / AGENTS.md の選択肢）
- `openai` SDK v6 の `chat.completions.create` / `embeddings.create` の正確なメソッド形 → **Step1で公式READMEを写経して疎通確認してから抽象化**
- `text-embedding-3-small` の次元数（1536想定）、`gpt-4o-mini` の存続 → Step2で実物確認
- git identity: 個人アカウントのメールを使用（学習リポジトリのため）。会社寄りにする場合はプロジェクトローカルで `git config user.email` を上書きするか着手時に確認

## git init と worktree の順序（ルールとの整合）

worktree は既存リポジトリの機能なので、新規プロジェクトでは先に作れない。よって以下が正しくルールと矛盾しない：

1. `create-next-app` で `rag-study01` 生成（`/Users/naoto/dev/rag-study01`）
2. `.gitignore` に `.claude/worktrees/` を追記
3. `git init`（既に create-next-app が init 済みなら不要）
4. **初回コミット** ← main への直接コミットが許される唯一の例外（コミット0件だと worktree/branch が作れないため）
5. 以降は各ステップごとに `git worktree add .claude/worktrees/<branch> -b <branch>` → 作業 → コミット → main にマージ → `git worktree remove`

## ディレクトリ構成（RAG 6段階がモジュール名に対応）

```
src/
  app/
    page.tsx                    # 最小チャットUI（Client Component）
    layout.tsx
    api/
      chat/route.ts             # 質問→検索→生成（retrieve+generate）本丸
      ingest/route.ts           # 取り込み→分割→embed→store
  lib/
    rag/
      types.ts                  # Chunk, Document, RetrievedChunk 等の共通型
      ingest.ts                 # (1)取り込み
      split.ts                  # (2)分割（固定長+オーバーラップ）
      embed.ts                  # (3)ベクトル化（OpenAI embeddings ラッパ）
      retrieve.ts               # (5)検索（store に問い合わせ上位k件）
      generate.ts               # (6)生成（Chat Completions で出典つき回答）
      pipeline.ts               # ingest の 1→2→3→4 を束ねる
    store/
      VectorStore.ts            # (4)蓄積: インターフェース（抽象化の中心）
      MemoryVectorStore.ts      # メモリ実装（配列＋コサイン類似度）
      cosine.ts                 # コサイン類似度ユーティリティ
      index.ts                  # getStore() ファクトリ（実装差し替え点）
    openai.ts                   # OpenAIクライアント生成・APIキー秘匿の一元化
  data/
    sample-docs/                # 学習用サンプル文書（.md/.txt）
```

### ストア抽象化インターフェース（設計の中心）

`VectorStore` が持つべき契約：
- `add(items: { id, text, embedding: number[], metadata })` — ベクトル+本文+出典メタを蓄積
- `search(queryEmbedding: number[], k: number): RetrievedChunk[]` — 類似度上位k件
- `clear()` / `size()`（任意）— 学習中のリセット・件数確認

設計の肝：
- **メタデータに出典（元ファイル名・チャンク位置）を必ず持たせる** → 出典つき回答の生命線
- embedding は呼び出し側で計算済みを渡す設計 → Embeddingモデル変更がストアに波及しない
- `store/index.ts` の `getStore()` だけ変えれば実装差し替え可能
- メモリ実装は dev の HMR で消えるため `globalThis` キャッシュパターンを使う（Step3で学ぶ）

## 段階的実装ステップ（1セッション=1機能 / 各ステップ worktree 1サイクル）

各ステップ：worktree 作成 → 実装 → 動作確認 → コミット → main マージ → worktree 削除

- **Step 0: 初期化とコミット基盤**
  create-next-app / `.gitignore` 調整 / 初回コミット / `.env.local` 準備。
  学び: 骨格・環境変数の扱い・worktree運用の起点。工数注意: create-next-app 新プロンプトで迷いやすい。

- **Step 1: OpenAI 疎通確認（生成の最小単位）**
  `lib/openai.ts` + 単純な route で「固定プロンプト→1回answer」。
  学び: Chat Completions の呼び出し形、サーバー側でのキー秘匿。工数注意: **SDK v6 の API形を公式写経で確認**（最大の要確認点）。

- **Step 2: Embedding 単体（ベクトル化の理解）**
  `embed.ts` で文字列→number[]。次元数を console 目視。`cosine.ts` を手実装し2文の近さを試す。
  学び: ベクトルとコサイン類似度の直感。工数注意: 少ない。数値を目で見る体験が肝。

- **Step 3: メモリストア + 検索（蓄積と検索）**
  `VectorStore` → `MemoryVectorStore` → `retrieve.ts`。`globalThis` シングルトン導入。
  学び: 抽象化の効用、上位k件取得、HMR対策。工数注意: **HMRでストアが消える問題**でハマりやすい。

- **Step 4: 取り込み+分割パイプライン（ingest）**
  `ingest.ts`→`split.ts`（固定長+オーバーラップ）→embed→store.add。`api/ingest/route.ts`。
  学び: チャンクサイズ/オーバーラップが精度に効く、出典メタ設計。工数注意: 分割戦略で沼る→**まず固定長で割り切る**。

- **Step 5: 検索→生成の接続（RAG完成）**
  `api/chat/route.ts`: 質問→embed→retrieve(k件)→コンテキスト注入→`generate.ts`→出典つき回答。
  学び: プロンプト注入、出典の紐付け、ハルシネーション抑制指示。工数注意: 出典紐付けで工数が跳ねる→まず「回答本文＋参照ファイル名リスト」で十分。

- **Step 6: 最小チャットUI**
  `app/page.tsx`: 入力＋送信＋回答＋出典表示。Tailwind 最低限。ストリーミングは任意（後回し）。
  学び: Client→API route、Server/Client 境界。工数注意: ストリーミング（SSE）に手を出すと工数が跳ねる→まず一括レスポンス。

- **Step 7（発展・任意）: ストア差し替え**
  `MemoryVectorStore` を SQLite（`better-sqlite3` + 自前コサイン、または `sqlite-vec`）に差し替え。`store/index.ts` の変更だけで済むことを体感。
  学び: 抽象化の投資回収、永続化の意味。工数注意: ネイティブビルドの環境依存で詰まりやすい（**要確認**）。

## 動作確認（文書投入→出典つき回答まで）

1. `.env.local` に `OPENAI_API_KEY` を設定し `npm run dev`
2. `data/sample-docs/` に内容の異なる `.md` を数本（例: 就業規則抜粋、社内ツール手順）
3. `api/ingest` を叩く（curl かUIボタン）。ログでチャンク件数・次元数を確認
4. UIで質問（例: 「有給の申請方法は?」）→ 回答本文＋参照元ファイル名が返る
5. 検証観点: (a) docs の事実が回答に反映されるか (b) 出典が正しいファイルを指すか (c) docs に無い質問で「分かりません」寄りの安全な回答になるか
6. dev 再起動でメモリストアが空になることを確認 → Step7 で永続化する動機を体感

## 学習の主眼（マネジメント訓練として）

- 各ステップの「工数が跳ねる箇所」を体で覚える（HMR/分割沼/出典紐付け/ストリーミング/ネイティブビルド）
- RAG完成後に **同じ質問を gpt-4o-mini と GPT-5.4 mini で比較**し、単価と体感精度の両方を測る
- 「PoC（半日）→実用最低ライン（1〜2週）→本番品質（数ヶ月）」の落差を、各機能を作りながら実感する

## 次アクション

Step 0（create-next-app → .gitignore 調整 → 初回コミット）から着手。着手前に「要確認ポイント」を一次情報で潰す。
