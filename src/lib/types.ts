/** Morceau issu de la recherche (iTunes Search API, via /api/search). */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** URL de la pochette en haute résolution (ou null → placeholder). */
  artwork: string | null;
  /** URL de l'extrait audio à jouer dans <audio> (ou null). */
  previewUrl: string | null;
  /** Durée totale du morceau en ms (ou null). */
  durationMs: number | null;
  genre?: string;
}

/** Un vers synchronisé. */
export interface LyricLine {
  /** Position en secondes. */
  time: number;
  text: string;
}

/** Paroles récupérées (LRCLIB ou démo). */
export interface LyricsResult {
  /** Vers synchronisés (vide si non synchronisées). */
  synced: LyricLine[];
  /** Paroles brutes non synchronisées (ou null). */
  plain: string | null;
  instrumental: boolean;
  source: "lrclib" | "demo" | "none";
}
