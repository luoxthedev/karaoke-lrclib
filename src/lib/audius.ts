import type { Track } from "./types";

/* ------------------------------------------------------------------ */
/*  Client Audius (REST) — https://api.audius.co/v1                    */
/*  Doc : https://audius.co/agents.md + https://audius.co/skill.md     */
/*  - header `x-api-key` sur chaque requête                            */
/*  - `?app_name=` en query (utile pour <audio>, sans headers)         */
/*  - pochettes : URLs par taille + `mirrors` (jamais une seule URL)   */
/* ------------------------------------------------------------------ */

export const AUDIUS_API_BASE = "https://api.audius.co/v1";
export const AUDIUS_APP_FALLBACK = "karaoke-lrclib";

export interface AudiusOpts {
  apiKey?: string;
  appName?: string;
}

/** Pochettes Audius : variantes par taille + hôtes miroirs de repli. */
export interface AudiusArtwork {
  "150x150"?: string;
  "480x480"?: string;
  "1000x1000"?: string;
  mirrors?: string[];
}

export type ArtworkSize = "150x150" | "480x480" | "1000x1000";

const SIZES: ArtworkSize[] = ["150x150", "480x480", "1000x1000"];

/** Choisit la meilleure URL de pochette (taille voulue, sinon repli). */
export function getArtworkUrl(
  artwork: AudiusArtwork | undefined,
  preferred: ArtworkSize = "480x480"
): string | undefined {
  if (!artwork) return undefined;
  if (artwork[preferred]) return artwork[preferred];
  for (const s of SIZES) {
    if (artwork[s]) return artwork[s];
  }
  return undefined;
}

/**
 * Prochaine URL miroir après un échec de chargement : remplace l'hôte
 * de l'URL courante par celui d'un miroir pas encore essayé.
 * (Porté de l'exemple officiel `trending` — utils/artwork.ts)
 */
export function getNextMirrorUrl(
  currentUrl: string,
  mirrors: string[] | undefined
): string | null {
  if (!mirrors?.length) return null;
  try {
    const url = new URL(currentUrl);
    for (const mirror of mirrors) {
      const mirrorHost = new URL(mirror).hostname;
      if (url.hostname === mirrorHost) continue;
      const next = new URL(currentUrl);
      next.hostname = mirrorHost;
      return next.toString();
    }
  } catch {
    /* URL invalide */
  }
  return null;
}

export class AudiusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AudiusError";
    this.status = status;
  }
}

async function audiusGet<T>(
  path: string,
  params: Record<string, string>,
  opts: AudiusOpts,
  signal?: AbortSignal
): Promise<T> {
  const url = new URL(`${AUDIUS_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("app_name", opts.appName || AUDIUS_APP_FALLBACK);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.apiKey) headers["x-api-key"] = opts.apiKey;

  const res = await fetch(url.toString(), { headers, signal });
  if (!res.ok) {
    throw new AudiusError(`Audius ${path}: ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Normalise un morceau Audius (tolère les variantes snake/camelCase). */
export function mapAudiusTrack(raw: unknown): Track | null {
  const r = asRecord(raw);
  const id = r.id ?? r.track_id;
  if (typeof id !== "string" && typeof id !== "number") return null;

  const user = asRecord(r.user);
  const art = asRecord(r.artwork);
  const mirrors = Array.isArray(art.mirrors)
    ? art.mirrors.filter((m): m is string => typeof m === "string")
    : [];
  const artwork =
    [art["480x480"], art["1000x1000"], art["150x150"]].find(
      (u): u is string => typeof u === "string" && u.length > 0
    ) ?? null;

  const duration =
    typeof r.duration === "number" && Number.isFinite(r.duration)
      ? r.duration
      : 0;
  const playCount =
    typeof r.play_count === "number"
      ? r.play_count
      : typeof r.playCount === "number"
        ? r.playCount
        : undefined;
  const permalink =
    typeof r.permalink === "string" ? `https://audius.co${r.permalink}` : undefined;

  return {
    id: String(id),
    title: typeof r.title === "string" && r.title ? r.title : "Titre inconnu",
    artist:
      typeof user.name === "string" && user.name
        ? user.name
        : typeof user.handle === "string" && user.handle
          ? `@${user.handle}`
          : "Artiste inconnu",
    album: "",
    artwork,
    artworkMirrors: mirrors,
    audioUrl: null, // résolue paresseusement via /api/stream
    durationMs: duration > 0 ? Math.round(duration * 1000) : null,
    genre: typeof r.genre === "string" && r.genre ? r.genre : undefined,
    source: "audius",
    playCount,
    permalink,
  };
}

/** Recherche de morceaux : GET /v1/tracks/search?query=... */
export async function searchAudiusTracks(
  query: string,
  opts: AudiusOpts,
  limit = 24,
  signal?: AbortSignal
): Promise<Track[]> {
  const data = await audiusGet<{ data?: unknown }>(
    "/tracks/search",
    { query, limit: String(limit) },
    opts,
    signal
  );
  const list = Array.isArray(data?.data) ? data.data : [];
  return list
    .map(mapAudiusTrack)
    .filter((t): t is Track => t !== null);
}

/**
 * Résout l'URL finale de lecture : GET /v1/tracks/{id}/stream
 * répond une redirection (302) vers un nœud de contenu.
 * On suit la redirection côté serveur et on renvoie l'URL finale,
 * directement utilisable dans <audio> (pas d'auth requise dessus).
 */
export async function resolveAudiusStream(
  trackId: string,
  opts: AudiusOpts,
  signal?: AbortSignal
): Promise<string> {
  const url = new URL(
    `${AUDIUS_API_BASE}/tracks/${encodeURIComponent(trackId)}/stream`
  );
  url.searchParams.set("app_name", opts.appName || AUDIUS_APP_FALLBACK);
  const headers: Record<string, string> = {};
  if (opts.apiKey) headers["x-api-key"] = opts.apiKey;

  const res = await fetch(url.toString(), {
    headers,
    signal,
    redirect: "manual",
  });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get("location");
    if (!location) throw new AudiusError("Audius stream: no location", res.status);
    return new URL(location, url).toString();
  }
  if (res.ok) return url.toString(); // pas de redirection : URL utilisable telle quelle
  throw new AudiusError(`Audius stream: ${res.status}`, res.status);
}

/**
 * URL de stream directe (repli navigateur, sans clé) —
 * à utiliser telle quelle comme src de <audio>.
 */
export function buildStreamUrl(trackId: string, appName?: string): string {
  return (
    `${AUDIUS_API_BASE}/tracks/${encodeURIComponent(trackId)}/stream` +
    `?app_name=${encodeURIComponent(appName || AUDIUS_APP_FALLBACK)}`
  );
}

/** Clé API + nom d'app côté serveur (priorité à la clé serveur). */
export function serverAudiusOpts(): AudiusOpts {
  return {
    apiKey:
      process.env.AUDIUS_API_KEY ||
      process.env.NEXT_PUBLIC_AUDIUS_API_KEY ||
      "",
    appName:
      process.env.AUDIUS_APP_NAME ||
      process.env.NEXT_PUBLIC_AUDIUS_APP_NAME ||
      AUDIUS_APP_FALLBACK,
  };
}
