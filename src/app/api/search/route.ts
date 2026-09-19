import { NextResponse } from "next/server";
import { searchAudiusTracks, serverAudiusOpts } from "@/lib/audius";

/**
 * GET /api/search?q=...
 * Proxy Node.js vers Audius : GET /v1/tracks/search
 * (https://audius.co/agents.md — header `x-api-key` + `?app_name=`).
 * Les morceaux retournés sont lus en intégral via /api/stream.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const opts = serverAudiusOpts();
  if (!opts.apiKey) {
    return NextResponse.json(
      { results: [], error: "NO_API_KEY" },
      { status: 503 }
    );
  }

  try {
    const results = await searchAudiusTracks(
      q,
      opts,
      24,
      AbortSignal.timeout(10000)
    );
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { results: [], error: "SEARCH_FAILED" },
      { status: 502 }
    );
  }
}
