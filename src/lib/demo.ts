import { parseLRC } from "./lrc";
import type { LyricsResult, Track } from "./types";

/**
 * Morceau de démonstration (paroles originales, audio d'exemple libre).
 * Utilisé quand les API externes sont injoignables.
 */
export const demoTrack: Track = {
  id: "demo-soundhelix-1",
  title: "Chanson démo (extrait libre)",
  artist: "SoundHelix — démo",
  album: "Démo hors-ligne",
  artwork: null,
  previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  durationMs: 372000,
  genre: "Démo",
};

const DEMO_LRC = `[ar:Démo]
[ti:Chanson démo]
[00:02.00]Bienvenue dans le mode démo
[00:06.00]Ici, les vers défilent tout seuls
[00:10.00]Chaque ligne suit la musique
[00:14.00]Comme dans un vrai karaoké
[00:18.50]Le vers chanté s'illumine
[00:23.00]Les autres restent en retrait
[00:27.50]Clique sur un vers pour naviguer
[00:32.00]Et saute où tu veux dans le morceau
[00:37.00]Monte le son, suis le rythme
[00:42.00]La la la, chante avec nous
[00:47.00]Encore un petit refrain
[00:52.00]La la la, jusqu'au bout de la nuit
[00:57.00]Merci d'avoir testé la démo !
[01:04.00](Fin des paroles de démonstration)`;

export function getDemoLyrics(): LyricsResult {
  return {
    synced: parseLRC(DEMO_LRC),
    plain: null,
    instrumental: false,
    source: "demo",
  };
}
