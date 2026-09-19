import type { LyricLine } from "./types";

const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const META_TAG = /^\[(ar|al|ti|au|by|length|re|ve|tool)\s*:/i;
const OFFSET_TAG = /^\[offset\s*:\s*([+-]?\d+)\s*\]$/i;

/**
 * Parse des paroles au format LRC en lignes synchronisées triées.
 * Gère : tags multiples par ligne, centièmes/millièmes, [offset:...],
 * et ignore les tags de métadonnées ([ar:], [ti:], ...).
 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  let offsetMs = 0;

  for (const raw of lrc.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const offsetMatch = line.match(OFFSET_TAG);
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1], 10);
      continue;
    }
    if (META_TAG.test(line)) continue;

    const times: number[] = [];
    TIME_TAG.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TIME_TAG.exec(line)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      let frac = 0;
      if (m[3]) {
        frac = parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) / 1000;
      }
      times.push(min * 60 + sec + frac);
    }
    if (times.length === 0) continue;

    const text = line.replace(TIME_TAG, "").trim();
    if (!text) continue;

    for (const t of times) {
      lines.push({ time: Math.max(0, t + offsetMs / 1000), text });
    }
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
}

/** Formate des secondes en "m:ss". */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
