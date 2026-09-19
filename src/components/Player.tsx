"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AudioLines,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import TrackArtworkImage from "@/components/TrackArtworkImage";
import { fetchStreamUrl } from "@/lib/api";
import { formatTime } from "@/lib/lrc";
import type { Track } from "@/lib/types";

export interface PlayerHandle {
  seek: (time: number) => void;
}

interface Props {
  track: Track;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  queueLabel?: string;
  badge?: string;
  onTimeUpdate: (t: number) => void;
  onAudioError: () => void;
}

type StreamStatus = "idle" | "loading" | "ready" | "error";

function sliderFill(pct: number): CSSProperties {
  const p = Math.max(0, Math.min(100, pct));
  return {
    "--slider-track": `linear-gradient(90deg, #38bdf8 0%, #818cf8 ${p}%, rgba(148,163,184,0.3) ${p}%)`,
  } as CSSProperties;
}

/** Lecteur audio : pochette, flux Audius, progression, contrôles, volume. */
const Player = forwardRef<PlayerHandle, Props>(function Player(
  {
    track,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
    queueLabel,
    badge,
    onTimeUpdate,
    onAudioError,
  },
  ref
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 0.9;
    const saved = Number(window.localStorage.getItem("klr-volume"));
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.9;
  });
  const [muted, setMuted] = useState(false);
  const streamSeq = useRef(0);

  const canPlay = streamStatus === "ready" && !!streamUrl;

  // Résolution du flux : URL directe (démo) ou /api/stream (Audius)
  const resolveStream = useCallback(() => {
    const id = ++streamSeq.current;
    setStreamStatus("loading");
    setStreamUrl(null);
    fetchStreamUrl(track.id)
      .then((url) => {
        if (streamSeq.current !== id) return;
        setStreamUrl(url);
        setStreamStatus("ready");
      })
      .catch(() => {
        if (streamSeq.current !== id) return;
        setStreamStatus("error");
        onAudioError();
      });
  }, [track.id, onAudioError]);

  // Nouveau morceau → reset + résolution du flux
  useEffect(() => {
    streamSeq.current++;
    setTime(0);
    setDuration(0);
    setPlaying(false);
    onTimeUpdate(0);
    if (track.audioUrl) {
      setStreamUrl(track.audioUrl);
      setStreamStatus("ready");
    } else {
      resolveStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  // Lecture auto dès que le flux est prêt
  useEffect(() => {
    if (!streamUrl) return;
    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {
        /* autoplay bloqué : l'utilisateur appuiera sur lecture */
      });
    }
  }, [streamUrl]);

  // Volume
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = muted ? 0 : volume;
    try {
      window.localStorage.setItem("klr-volume", String(volume));
    } catch {
      /* stockage indisponible */
    }
  }, [volume, muted]);

  const seek = useCallback((t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t);
    setTime(el.currentTime);
  }, []);

  useImperativeHandle(ref, () => ({ seek }), [seek]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !canPlay) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [canPlay]);

  // Espace = lecture/pause (hors champs de saisie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName))
        return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progressPct = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <section
      aria-label="Lecteur audio"
      className="glass-strong relative overflow-hidden rounded-[2rem] p-5 sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/50 to-transparent"
      />

      <div className="relative grid gap-6 md:grid-cols-[minmax(0,300px)_1fr] md:items-center md:gap-8">
        {/* Pochette */}
        <motion.div
          key={track.id}
          layoutId={`cover-${track.id}`}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl shadow-[0_30px_70px_-20px_rgba(56,130,200,0.5)] md:mx-0 md:max-w-none"
        >
          <TrackArtworkImage
            url={track.artwork}
            mirrors={track.artworkMirrors}
            alt={`Pochette de ${track.title}`}
            eager
            className="h-full w-full object-cover"
            fallbackClassName="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-400"
            fallbackIconSize={72}
          />
          {/* Reflet glass */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent"
          />
          {/* Anneau "en lecture" */}
          <AnimatePresence>
            {playing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-hidden
                className="absolute inset-0 rounded-3xl ring-4 ring-sky-300/60"
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Infos + contrôles */}
        <div className="min-w-0 text-center md:text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {badge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 ring-1 ring-sky-300/50">
                    <AudioLines size={12} />
                    {badge}
                  </span>
                )}
                {queueLabel && (
                  <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/60">
                    {queueLabel}
                  </span>
                )}
              </div>
              <h2 className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {track.title}
              </h2>
              <p className="mt-1 truncate text-base text-slate-500 sm:text-lg">
                {track.artist}
                {track.album ? ` — ${track.album}` : ""}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Barre de progression */}
          <div className="mt-5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              disabled={!canPlay || !duration}
              onChange={(e) => seek(parseFloat(e.target.value))}
              style={sliderFill(progressPct)}
              className="slider w-full"
              aria-label="Position de lecture"
            />
            <div className="mt-1 flex justify-between text-xs font-medium tabular-nums text-slate-500">
              <span>{formatTime(time)}</span>
              <span>{formatTime(duration || (track.durationMs ?? 0) / 1000)}</span>
            </div>
          </div>

          {/* Contrôles */}
          <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3 md:justify-start">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Morceau précédent"
              className="rounded-full bg-white/60 p-3 text-slate-600 ring-1 ring-white/70 transition hover:bg-white/90 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipBack size={20} fill="currentColor" />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={toggle}
              disabled={!canPlay}
              aria-label={playing ? "Pause" : "Lecture"}
              className="rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 p-4 text-white shadow-[0_16px_40px_-12px_rgba(56,189,248,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50 sm:p-5"
            >
              {streamStatus === "loading" ? (
                <Loader2 size={26} className="animate-spin" />
              ) : playing ? (
                <Pause size={26} fill="currentColor" />
              ) : (
                <Play size={26} fill="currentColor" className="translate-x-[1px]" />
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Morceau suivant"
              className="rounded-full bg-white/60 p-3 text-slate-600 ring-1 ring-white/70 transition hover:bg-white/90 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SkipForward size={20} fill="currentColor" />
            </motion.button>
          </div>

          {/* Volume */}
          <div className="mx-auto mt-4 flex max-w-xs items-center gap-3 md:mx-0">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Activer le son" : "Couper le son"}
              className="rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-sky-600"
            >
              <VolumeIcon size={20} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setMuted(false);
              }}
              style={sliderFill((muted ? 0 : volume) * 100)}
              className="slider w-full"
              aria-label="Volume"
            />
          </div>

          {streamStatus === "loading" && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400 md:justify-start">
              <Loader2 size={16} className="animate-spin text-sky-500" />
              Connexion au flux Audius…
            </p>
          )}

          {streamStatus === "error" && (
            <div className="mt-4 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-amber-100/60 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200/60 sm:flex-row md:justify-start">
              <span className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                Impossible de lire ce morceau pour le moment.
              </span>
              <button
                type="button"
                onClick={resolveStream}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-sky-600 ring-1 ring-white transition hover:bg-white"
              >
                <RefreshCw size={13} />
                Réessayer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Élément audio réel */}
      <audio
        ref={audioRef}
        src={streamUrl ?? undefined}
        preload="metadata"
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          onTimeUpdate(t);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (hasNext) onNext();
        }}
        onError={() => {
          if (streamUrl) {
            setStreamStatus("error");
            onAudioError();
          }
        }}
      />
    </section>
  );
});

export default Player;
