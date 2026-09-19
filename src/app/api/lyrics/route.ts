import { NextResponse } from "next/server";
import { parseLRC } from "@/lib/lrc";
import type { LyricsResult } from "@/lib/types";

const LRCLIB = "https://lrclib.net/api";
const UA = {
  "User-Agent": "karaoke-lrclib/1.0 (educational lyrics player)",
};

type LrclibEntry = Record<string, unknown>;

function toResult(d: LrclibEntry): LyricsResult {
  const synced =
    typeof d.syncedLyrics === "string" ? parseLRC(d.syncedLyrics) : [];
  return {
    synced,
    plain: typeof d.plainLyrics === "string" ? d.plainLyrics : null,
    instrumental: d.instrumental === true,
    source: "lrclib",
  };
}

/** Score un candidat LRCLIB : paroles synchro > durée proche > titres exacts. */
function scoreEntry(
  e: LrclibEntry,
  duration: number,
  track: string,
  artist: string
): number {
  let s = 0;
  if (typeof e.syncedLyrics === "string" && e.syncedLyrics) s += 10;
  if (typeof e.plainLyrics === "string" && e.plainLyrics) s += 2;
  if (
    Number.isFinite(duration) &&
    typeof e.duration === "number" &&
    Number.isFinite(e.duration)
  ) {
    s -= Math.min(10, Math.abs(e.duration - duration) / 5);
  }
  if (
    typeof e.trackName === "string" &&
    e.trackName.toLowerCase() === track.toLowerCase()
  )
    s += 3;
  if (
    typeof e.artistName === "string" &&
    e.artistName.toLowerCase() === artist.toLowerCase()
  )
    s += 3;
  return s;
}

const NO_LYRICS: LyricsResult = {
  synced: [],
  plain: null,
  instrumental: false,
  source: "none",
};

/**
 * GET /api/lyrics?track=...&artist=...&album=...&duration=...
 * Proxy Node.js vers LRCLIB : d'abord /get (match exact),
 * puis /search (meilleur candidat) en repli.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const track = (searchParams.get("track") || "").trim();
  const artist = (searchParams.get("artist") || "").trim();
  const album = (searchParams.get("album") || "").trim();
  const durationRaw = searchParams.get("duration");
  const duration = durationRaw ? parseFloat(durationRaw) : NaN;

  if (!track || !artist) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
  }

  try {
    // 1) Match exact
    const params = new URLSearchParams({
      track_name: track,
      artist_name: artist,
    });
    if (album) params.set("album_name", album);
    if (Number.isFinite(duration)) {
      params.set("duration", String(Math.round(duration)));
    }
    const exact = await fetch(`${LRCLIB}/get?${params}`, {
      headers: UA,
      signal: AbortSignal.timeout(8000),
    });
    if (exact.ok) {
      return NextResponse.json(toResult((await exact.json()) as LrclibEntry));
    }

    // 2) Repli : recherche + meilleur candidat
    const search = await fetch(
      `${LRCLIB}/search?q=${encodeURIComponent(`${track} ${artist}`)}`,
      { headers: UA, signal: AbortSignal.timeout(8000) }
    );
    if (!search.ok) throw new Error(`LRCLIB search: ${search.status}`);
    const list = (await search.json()) as LrclibEntry[];
    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json(NO_LYRICS);
    }
    const best = [...list].sort(
      (a, b) =>
        scoreEntry(b, duration, track, artist) -
        scoreEntry(a, duration, track, artist)
    )[0];
    return NextResponse.json(toResult(best));
  } catch {
    return NextResponse.json({ error: "LYRICS_FAILED" }, { status: 502 });
  }
}
