// コサイン類似度: 2つのベクトルの「向きの近さ」を -1〜1 で返す（1に近いほど意味が近い）。
// cos θ = (a·b) / (|a||b|)

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`ベクトルの次元が一致しません: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) {
    throw new Error("ゼロベクトルとの類似度は定義できません");
  }
  return dot / denom;
}
