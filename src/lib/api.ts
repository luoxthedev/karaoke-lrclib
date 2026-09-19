import { parseLRC } from "./lrc";
import type { LyricsResult, Track } from "./types";

/* ------------------------------------------------------------------ */
/*  Couche d'accès aux données côté client.                            */
/*  Stratégie : on passe d'abord par nos routes API Node.js            */
/*  (/api/search, /api/lyrics). Si le serveur est injoignable           */
/*  (ex. bac à sable sans sortie réseau), on bascule en repli           */
/*  direct navigateur → API publiques (iTunes + LRCLIB).                */
/* ------------------------------------------------------------------ */

function mapItunesSong(r: Record<string, unknown>): Track {
  const art = typeof r.artworkUrl100 === "string" ? r.artworkUrl100 : null;
  return {
    id: String(r.trackId ?? `${r.artistName}-${r.trackName}`),
    title: typeof r.trackName === "string" ? r.trackName : "Titre inconnu",
    artist:
      typeof r.artistName === "string" ? r.artistName : "Artiste inconnu",
    album: typeof r.collectionName === "string" ? r.collectionName : "",
    artwork: art ? art.replace("100x100bb", "600x600bb") : null,
    previewUrl: typeof r.previewUrl === "string" ? r.previewUrl : null,
    durationMs: typeof r.trackTimeMillis === "number" ? r.trackTimeMillis : null,
    genre: typeof r.primaryGenreName === "string" ? r.primaryGenreName : undefined,
  };
}

export async function fetchSearch(q: string): Promise<Track[]> {
  // 1) Via notre API Node.js
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as { results?: Track[] };
      if (Array.isArray(data.results)) return data.results;
    }
    throw new Error(`server search: ${res.status}`);
  } catch (serverError) {
    // 2) Repli direct (le navigateur a son propre accès réseau)
    try {
      const params = new URLSearchParams({
        term: q,
        entity: "song",
        limit: "24",
        country: "FR",
      });
      const res = await fetch(`https://itunes.apple.com/search?${params}`);
      if (!res.ok) throw new Error(`itunes: ${res.status}`);
      const data = (await res.json()) as {
        results?: Record<string, unknown>[];
      };
      return (data.results ?? []).map(mapItunesSong);
    } catch {
      throw serverError;
    }
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
