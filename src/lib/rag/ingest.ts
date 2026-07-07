import { readdir, readFile } from "fs/promises";
import path from "path";
import type { Document } from "./types";

// (1) 取り込み: data/sample-docs/ 配下の .md / .txt を読み込む。
// ファイル名がそのまま出典（metadata.source）になる。

const DOCS_DIR = path.join(process.cwd(), "data", "sample-docs");

export async function loadDocuments(): Promise<Document[]> {
  const files = (await readdir(DOCS_DIR))
    .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
    .sort();

  return Promise.all(
    files.map(async (file) => ({
      source: file,
      content: await readFile(path.join(DOCS_DIR, file), "utf-8"),
    }))
  );
}
