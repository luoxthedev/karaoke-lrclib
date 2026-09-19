import { NextResponse } from "next/server";
import { resolveAudiusStream, serverAudiusOpts } from "@/lib/audius";

/**
 * GET /api/stream?trackId=...
 * Résout l'URL finale de lecture d'un morceau Audius :
 * GET /v1/tracks/{id}/stream répond une redirection vers un nœud
 * de contenu ; on la suit côté serveur (avec `x-api-key`) et on
 * renvoie l'URL finale, utilisable directement dans <audio>.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackId = (searchParams.get("trackId") || "").trim();
  if (!trackId) {
    return NextResponse.json({ error: "MISSING_TRACK_ID" }, { status: 400 });
  }

  const opts = serverAudiusOpts();
  if (!opts.apiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 });
  }

  try {
    const url = await resolveAudiusStream(
      trackId,
      opts,
      AbortSignal.timeout(10000)
    );
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "STREAM_FAILED" }, { status: 502 });
  }
}
