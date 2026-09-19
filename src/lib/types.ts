/** Morceau issu de la recherche Audius (via /api/search). */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** URL principale de la pochette (ou null → placeholder). */
  artwork: string | null;
  /** Hôtes miroirs de la pochette (repli au chargement, cf. doc Audius). */
  artworkMirrors: string[];
  /**
   * URL audio prête à jouer dans <audio>.
   * `null` pour Audius : le flux est résolu paresseusement via /api/stream.
   */
  audioUrl: string | null;
  /** Durée totale du morceau en ms (ou null). */
  durationMs: number | null;
  genre?: string;
  source: "audius" | "demo";
  playCount?: number;
  permalink?: string;
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
