import {
  AUDIUS_APP_FALLBACK,
  buildStreamUrl,
  searchAudiusTracks,
} from "./audius";
import { parseLRC } from "./lrc";
import type { LyricsResult, Track } from "./types";

/* ------------------------------------------------------------------ */
/*  Couche d'accès aux données côté client.                            */
/*  Stratégie : on passe d'abord par nos routes API Node.js            */
/*  (/api/search, /api/stream, /api/lyrics). Si le serveur est         */
/*  injoignable ou sans clé, on bascule en repli direct                */
/*  navigateur → API publiques (autorisé par la doc Audius pour        */
/*  la lecture seule, via NEXT_PUBLIC_AUDIUS_API_KEY).                 */
/* ------------------------------------------------------------------ */

const APP_NAME =
  process.env.NEXT_PUBLIC_AUDIUS_APP_NAME || AUDIUS_APP_FALLBACK;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_AUDIUS_API_KEY || "";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function fetchSearch(q: string): Promise<Track[]> {
  // 1) Via notre API Node.js
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as { results?: Track[] };
      if (Array.isArray(data.results)) return data.results;
    }
    if (res.status === 503) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (data?.error === "NO_API_KEY") {
        throw new ApiError("NO_API_KEY", "Missing Audius API key (server)");
      }
    }
    throw new Error(`server search: ${res.status}`);
  } catch (serverError) {
    // 2) Repli direct navigateur → Audius
    if (!PUBLIC_KEY && serverError instanceof ApiError) throw serverError;
    try {
      return await searchAudiusTracks(
        q,
        { apiKey: PUBLIC_KEY, appName: APP_NAME },
        24
      );
    } catch {
      throw serverError;
    }
  }
}

/**
 * Résout l'URL audio jouable d'un morceau Audius.
 * 1) /api/stream (résolution serveur de la redirection), puis
 * 2) URL /stream directe en repli (le <audio> suit la redirection).
 */
export async function fetchStreamUrl(trackId: string): Promise<string> {
  try {
    const res = await fetch(`/api/stream?trackId=${encodeURIComponent(trackId)}`);
    if (res.ok) {
      const data = (await res.json()) as { url?: unknown };
      if (typeof data.url === "string" && data.url) return data.url;
    }
    throw new Error(`server stream: ${res.status}`);
  } catch {
    return buildStreamUrl(trackId, APP_NAME);
  }
}

export interface LyricsQuery {
  track: string;
  artist: string;
  album?: string;
  durationSec?: number | null;
}

function toLyricsResult(d: Record<string, unknown>): LyricsResult {
  const synced =
    typeof d.syncedLyrics === "string" ? parseLRC(d.syncedLyrics) : [];
  return {
    synced,
    plain: typeof d.plainLyrics === "string" ? d.plainLyrics : null,
    instrumental: d.instrumental === true,
    source: "lrclib",
  };
}

const NO_LYRICS: LyricsResult = {
  synced: [],
  plain: null,
  instrumental: false,
  source: "none",
};

/** Repli direct navigateur → LRCLIB. */
async function fetchLyricsDirect(q: LyricsQuery): Promise<LyricsResult> {
  const base = "https://lrclib.net/api";
  const params = new URLSearchParams({
    track_name: q.track,
    artist_name: q.artist,
  });
  if (q.album) params.set("album_name", q.album);
  if (q.durationSec) params.set("duration", String(Math.round(q.durationSec)));

  const exact = await fetch(`${base}/get?${params}`);
  if (exact.ok) {
    return toLyricsResult((await exact.json()) as Record<string, unknown>);
  }
  if (exact.status !== 404) throw new Error(`lrclib: ${exact.status}`);

  const search = await fetch(
    `${base}/search?q=${encodeURIComponent(`${q.track} ${q.artist}`)}`
  );
  if (!search.ok) throw new Error(`lrclib search: ${search.status}`);
  const list = (await search.json()) as Record<string, unknown>[];
  if (!Array.isArray(list) || list.length === 0) return NO_LYRICS;

  const dur = q.durationSec ?? NaN;
  const score = (e: Record<string, unknown>): number => {
    let s = 0;
    if (typeof e.syncedLyrics === "string" && e.syncedLyrics) s += 10;
    if (typeof e.plainLyrics === "string" && e.plainLyrics) s += 2;
    if (
      Number.isFinite(dur) &&
      typeof e.duration === "number" &&
      Number.isFinite(e.duration)
    ) {
      s -= Math.min(10, Math.abs(e.duration - (dur as number)) / 5);
    }
    if (
      typeof e.trackName === "string" &&
      e.trackName.toLowerCase() === q.track.toLowerCase()
    )
      s += 3;
    if (
      typeof e.artistName === "string" &&
      e.artistName.toLowerCase() === q.artist.toLowerCase()
    )
      s += 3;
    return s;
  };
  const best = [...list].sort((a, b) => score(b) - score(a))[0];
  return toLyricsResult(best);
}

export async function fetchLyrics(q: LyricsQuery): Promise<LyricsResult> {
  // 1) Via notre API Node.js
  try {
    const params = new URLSearchParams({
      track: q.track,
      artist: q.artist,
    });
    if (q.album) params.set("album", q.album);
    if (q.durationSec) params.set("duration", String(Math.round(q.durationSec)));
    const res = await fetch(`/api/lyrics?${params}`);
    if (res.ok) return (await res.json()) as LyricsResult;
    throw new Error(`server lyrics: ${res.status}`);
  } catch (serverError) {
    // 2) Repli direct
    try {
      return await fetchLyricsDirect(q);
    } catch {
      throw serverError;
    }
  }
}
