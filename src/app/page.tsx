"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowLeft,
  FlaskConical,
  KeyRound,
  Music2,
  RefreshCw,
  SearchX,
  Sparkles,
} from "lucide-react";
import Background from "@/components/Background";
import Lyrics from "@/components/Lyrics";
import type { LyricsStatus } from "@/components/Lyrics";
import Player from "@/components/Player";
import type { PlayerHandle } from "@/components/Player";
import SearchBar from "@/components/SearchBar";
import SongCard from "@/components/SongCard";
import Toast from "@/components/Toast";
import type { ToastData } from "@/components/Toast";
import { ApiError, fetchLyrics, fetchSearch } from "@/lib/api";
import { demoTrack, getDemoLyrics } from "@/lib/demo";
import type { LyricsResult, Track } from "@/lib/types";

type SearchStatus = "idle" | "loading" | "done" | "error" | "nokey";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");

  const [selected, setSelected] = useState<Track | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [lyricsStatus, setLyricsStatus] = useState<LyricsStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);

  const [toast, setToast] = useState<ToastData | null>(null);

  const playerRef = useRef<PlayerHandle>(null);
  const searchSeq = useRef(0);
  const lyricsSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: ToastData["kind"]) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  /* ---------------- Recherche (debounce + anti-réponse périmée) -------- */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      searchSeq.current++;
      setResults([]);
      setSearchStatus("idle");
      return;
    }
    setSearchStatus("loading");
    const id = ++searchSeq.current;
    const timer = setTimeout(async () => {
      try {
        const r = await fetchSearch(q);
        if (searchSeq.current !== id) return;
        setResults(r);
        setSearchStatus("done");
      } catch (e) {
        if (searchSeq.current !== id) return;
        if (e instanceof ApiError && e.code === "NO_API_KEY") {
          setSearchStatus("nokey");
        } else {
          setSearchStatus("error");
        }
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  /* ---------------- Chargement des paroles à la sélection ------------- */
  const loadLyrics = useCallback((track: Track) => {
    if (track.id.startsWith("demo")) {
      setLyrics(getDemoLyrics());
      setLyricsStatus("ready");
      return;
    }
    const id = ++lyricsSeq.current;
    setLyrics(null);
    setLyricsStatus("loading");
    fetchLyrics({
      track: track.title,
      artist: track.artist,
      album: track.album,
      durationSec: track.durationMs ? track.durationMs / 1000 : null,
    })
      .then((r) => {
        if (lyricsSeq.current !== id) return;
        setLyrics(r);
        setLyricsStatus("ready");
      })
      .catch(() => {
        if (lyricsSeq.current !== id) return;
        setLyricsStatus("error");
      });
  }, []);

  const selectTrack = useCallback(
    (track: Track, index: number) => {
      setSelected(track);
      setSelectedIndex(index);
      setCurrentTime(0);
      loadLyrics(track);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [loadLyrics]
  );

  const selectDemo = useCallback(() => {
    selectTrack(demoTrack, -1);
    showToast("Mode démo activé — paroles et audio d'exemple.", "info");
  }, [selectTrack, showToast]);

  const backToSearch = useCallback(() => {
    setSelected(null);
    setSelectedIndex(-1);
    setLyrics(null);
    setLyricsStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goTo = useCallback(
    (dir: 1 | -1) => {
      const next = selectedIndex + dir;
      if (next < 0 || next >= results.length) return;
      const track = results[next];
      setSelected(track);
      setSelectedIndex(next);
      setCurrentTime(0);
      loadLyrics(track);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [selectedIndex, results, loadLyrics]
  );

  const handleSeek = useCallback((t: number) => {
    playerRef.current?.seek(t);
    setCurrentTime(t);
  }, []);

  /* ---------------- Raccourcis clavier -------------------------------- */
  useEffect(() => {
    const onSlash = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      e.preventDefault();
      document
        .querySelector<HTMLInputElement>('input[type="search"]')
        ?.focus();
    };
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") backToSearch();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [selected, backToSearch]);

  useEffect(() => {
    document.title = selected
      ? `${selected.title} — ${selected.artist} · Karaoke LRCLIB`
      : "Karaoke LRCLIB — paroles synchronisées";
  }, [selected]);

  // Focus auto sur la recherche quand on revient en arrière
  useEffect(() => {
    if (!selected) {
      document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }
  }, [selected]);

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < results.length - 1;

  return (
    <MotionConfig reducedMotion="user">
      <Background />

      {/* ------------------------- Header ------------------------- */}
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={backToSearch}
            className="flex items-center gap-2.5"
            aria-label="Retour à l'accueil"
          >
            <motion.span
              whileHover={{ rotate: -8, scale: 1.05 }}
              className="rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 p-2.5 text-white shadow-lg"
            >
              <Music2 size={20} />
            </motion.span>
            <span className="text-left leading-tight">
              <span className="block text-base font-bold text-slate-800">
                Karaoke<span className="text-sky-500">·</span>LRCLIB
              </span>
              <span className="block text-xs text-slate-400">
                paroles synchronisées
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={selectDemo}
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-sky-600 ring-1 ring-white/70 transition hover:bg-white/90"
          >
            <FlaskConical size={16} />
            <span className="hidden sm:inline">Essayer la démo</span>
            <span className="sm:hidden">Démo</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <AnimatePresence mode="wait">
          {!selected ? (
            /* ==================== VUE RECHERCHE ==================== */
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -18, transition: { duration: 0.22 } }}
            >
              {/* Hero */}
              <div className="mx-auto max-w-3xl pt-12 text-center sm:pt-16">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-1.5 text-xs font-semibold text-sky-600 ring-1 ring-white/70"
                >
                  <Sparkles size={14} />
                  Audio Audius · Paroles LRCLIB
                </motion.div>
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                  <motion.span
                    className="block"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                  >
                    Qu&apos;est-ce qu&apos;on chante,
                  </motion.span>
                  <motion.span
                    className="block bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.22 }}
                  >
                    aujourd&apos;hui ? 🎵
                  </motion.span>
                </h1>
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mx-auto mt-4 max-w-xl text-slate-500"
                >
                  Recherchez un titre ou un artiste, lancez le morceau en
                  intégral et chantez avec les paroles synchronisées en temps
                  réel.
                </motion.p>
              </div>

              {/* Barre de recherche */}
              <div className="mt-8">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  loading={searchStatus === "loading"}
                />
              </div>

              {/* États + résultats */}
              <div className="mt-10">
                {searchStatus === "idle" && query.trim().length < 2 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-slate-400"
                  >
                    Tapez au moins 2 lettres pour lancer la recherche…
                  </motion.p>
                )}

                {searchStatus === "loading" && (
                  <div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label="Chargement des résultats"
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="glass flex items-center gap-4 rounded-3xl p-3"
                      >
                        <div className="skeleton h-20 w-20 shrink-0 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-3/4 rounded-lg" />
                          <div className="skeleton h-3.5 w-1/2 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl p-8 text-center"
                  >
                    <p className="font-semibold text-slate-700">
                      La recherche a échoué
                    </p>
                    <p className="text-sm text-slate-500">
                      Le service musical est injoignable. Réessayez ou
                      découvrez le mode démo hors-ligne.
                    </p>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setQuery((q) => `${q.trim()} `)}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                      >
                        <RefreshCw size={16} />
                        Réessayer
                      </button>
                      <button
                        type="button"
                        onClick={selectDemo}
                        className="rounded-full bg-white/70 px-5 py-2.5 text-sm font-semibold text-sky-600 ring-1 ring-white/70 transition hover:bg-white"
                      >
                        Mode démo
                      </button>
                    </div>
                  </motion.div>
                )}

                {searchStatus === "nokey" && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl p-8 text-center"
                  >
                    <span className="rounded-full bg-sky-100 p-4 text-sky-500">
                      <KeyRound size={28} />
                    </span>
                    <p className="font-semibold text-slate-700">
                      Clé API Audius manquante
                    </p>
                    <p className="text-sm text-slate-500">
                      Créez une application gratuite sur{" "}
                      <a
                        href="https://audius.co/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-sky-600 underline-offset-2 hover:underline"
                      >
                        audius.co/settings
                      </a>{" "}
                      (« Manage Your Apps »), puis ajoutez la clé dans{" "}
                      <code className="rounded-md bg-white/70 px-1.5 py-0.5 text-xs ring-1 ring-slate-200">
                        .env.local
                      </code>{" "}
                      comme expliqué dans le README — ou explorez le mode
                      démo.
                    </p>
                    <button
                      type="button"
                      onClick={selectDemo}
                      className="mt-1 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                    >
                      Essayer la démo
                    </button>
                  </motion.div>
                )}

                {searchStatus === "done" && results.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto flex max-w-md flex-col items-center gap-3 py-8 text-center"
                  >
                    <span className="rounded-full bg-white/60 p-4 text-slate-400 ring-1 ring-white/70">
                      <SearchX size={28} />
                    </span>
                    <p className="font-semibold text-slate-700">
                      Aucun résultat trouvé
                    </p>
                    <p className="text-sm text-slate-500">
                      Essayez un autre titre, un autre artiste ou vérifiez
                      l&apos;orthographe.
                    </p>
                  </motion.div>
                )}

                {results.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {results.map((track, i) => (
                        <SongCard
                          key={track.id}
                          track={track}
                          index={i}
                          onSelect={() => selectTrack(track, i)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ==================== VUE LECTEUR ==================== */
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18, transition: { duration: 0.22 } }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="pt-6"
            >
              <button
                type="button"
                onClick={backToSearch}
                className="mb-5 flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-white/70 transition hover:bg-white/90 hover:text-sky-600"
              >
                <ArrowLeft size={16} />
                Retour aux résultats
                <kbd className="hidden rounded-md bg-white px-1.5 py-0.5 text-xs text-slate-400 shadow-sm ring-1 ring-slate-200 sm:inline">
                  échap
                </kbd>
              </button>

              <Player
                ref={playerRef}
                track={selected}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPrev={() => goTo(-1)}
                onNext={() => goTo(1)}
                queueLabel={
                  selectedIndex >= 0
                    ? `Résultat ${selectedIndex + 1} / ${results.length}`
                    : undefined
                }
                badge={
                  selected.source === "demo" ? "Démo" : "Audius · intégral"
                }
                onTimeUpdate={setCurrentTime}
                onAudioError={() =>
                  showToast(
                    "Impossible de lire le flux audio de ce morceau.",
                    "error"
                  )
                }
              />

              <div className="mt-6">
                <Lyrics
                  status={lyricsStatus}
                  lyrics={lyrics}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onRetry={() => loadLyrics(selected)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ------------------------- Footer ------------------------- */}
      <footer className="border-t border-white/50 bg-white/30 py-5 backdrop-blur-xl">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400">
          Recherche & audio : Audius · Paroles : LRCLIB · Fait avec Next.js,
          Tailwind CSS et Framer Motion
        </p>
      </footer>

      <Toast toast={toast} />
    </MotionConfig>
  );
}
