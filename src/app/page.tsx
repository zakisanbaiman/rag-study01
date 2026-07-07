"use client";

import { FormEvent, useState } from "react";

// 最小チャットUI: 入力→POST /api/chat→回答＋出典表示。ストリーミングなしの一括レスポンス。
// Client Component からはAPIルート経由でのみサーバー機能に触れる（キーはサーバー側に閉じたまま）。

type Source = { ref: number; source: string; chunkIndex: number; score: number };
type QA = { question: string; answer: string; sources: Source[] };

export default function Home() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleIngest() {
    setIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIngestStatus(`取り込み完了: ${data.documents}文書 / ${data.chunks}チャンク`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIngesting(false);
    }
  }

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHistory((prev) => [
        { question: q, answer: data.answer, sources: data.sources },
        ...prev,
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">社内ドキュメント Q&A</h1>
      <p className="mt-1 text-sm text-gray-500">
        RAG学習用アプリ。まず文書を取り込み、その内容について質問してください。
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {ingesting ? "取り込み中…" : "文書を取り込む"}
        </button>
        {ingestStatus && <span className="text-sm text-green-700">{ingestStatus}</span>}
      </div>

      <form onSubmit={handleAsk} className="mt-6 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例: 有給休暇の申請方法は？"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "生成中…" : "質問する"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-8 space-y-6">
        {history.map((qa, i) => (
          <div key={history.length - i} className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-500">Q. {qa.question}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{qa.answer}</p>
            <ul className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
              {qa.sources.map((s) => (
                <li key={s.ref}>
                  [{s.ref}] {s.source}（チャンク{s.chunkIndex} / 類似度 {s.score}）
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
