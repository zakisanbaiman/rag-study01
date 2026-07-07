import { runIngestPipeline } from "@/lib/rag/pipeline";

// 取り込みAPI: data/sample-docs/ の全文書をストアに（再）投入する。
// clear→全再取り込みなので何度叩いても結果は同じ（冪等）。
// POST /api/ingest

export async function POST() {
  try {
    const result = await runIngestPipeline();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
