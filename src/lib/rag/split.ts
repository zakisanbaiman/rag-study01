// (2) 分割: 固定長（文字数ベース）+ オーバーラップ。
// 文や段落の境界は無視して割り切る（意味単位の分割は発展課題）。
// オーバーラップは「チャンク境界で文脈が切れて検索に掛からなくなる」のを緩和するための重複部分。

export const CHUNK_SIZE = 400; // 文字数
export const CHUNK_OVERLAP = 80;

export function split(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): string[] {
  if (overlap >= chunkSize) {
    throw new Error(`overlap (${overlap}) は chunkSize (${chunkSize}) より小さくすること`);
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    chunks.push(trimmed.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
}
