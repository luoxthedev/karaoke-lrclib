import { NextResponse } from "next/server";
import type { Track } from "@/lib/types";

/**
 * GET /api/search?q=...
 * Proxy Node.js vers l'iTunes Search API (pochettes + extraits audio).
 * Aucune clé requise. Le frontend ne parle jamais directement à iTunes
 * sauf en mode repli (voir src/lib/api.ts).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const params = new URLSearchParams({
      term: q,
      entity: "song",
      limit: "24",
      country: "FR",
    });
    const res = await fetch(`https://itunes.apple.com/search?${params}`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "karaoke-lrclib/1.0" },
    });
    if (!res.ok) throw new Error(`iTunes responded ${res.status}`);

    const data = (await res.json()) as {
      results?: Record<string, unknown>[];
    };
    const results: Track[] = (data.results ?? []).map((r) => {
      const art = typeof r.artworkUrl100 === "string" ? r.artworkUrl100 : null;
      return {
        id: String(r.trackId ?? `${r.artistName}-${r.trackName}`),
        title: typeof r.trackName === "string" ? r.trackName : "Titre inconnu",
        artist:
          typeof r.artistName === "string" ? r.artistName : "Artiste inconnu",
        album: typeof r.collectionName === "string" ? r.collectionName : "",
        artwork: art ? art.replace("100x100bb", "600x600bb") : null,
        previewUrl: typeof r.previewUrl === "string" ? r.previewUrl : null,
        durationMs:
          typeof r.trackTimeMillis === "number" ? r.trackTimeMillis : null,
        genre:
          typeof r.primaryGenreName === "string"
            ? r.primaryGenreName
            : undefined,
      };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { results: [], error: "SEARCH_FAILED" },
      { status: 502 }
    );
  }
}
