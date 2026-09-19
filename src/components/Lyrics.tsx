"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Disc,
  Ghost,
  Mic,
  MousePointerClick,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import type { LyricsResult } from "@/lib/types";

export type LyricsStatus = "idle" | "loading" | "ready" | "error";

interface Props {
  status: LyricsStatus;
  lyrics: LyricsResult | null;
  currentTime: number;
  onSeek: (t: number) => void;
  onRetry: () => void;
}

/** Panneau des paroles : synchronisées, interactives, défilement auto. */
export default function Lyrics({
  status,
  lyrics,
  currentTime,
  onSeek,
  onRetry,
}: Props) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const holdScrollRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = useMemo(() => lyrics?.synced ?? [], [lyrics]);

  // Index du vers actif : dernier vers dont le timestamp est passé
  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [lines, currentTime]);

  // Défilement automatique vers le vers actif (centré, fluide)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) return;
    if (holdScrollRef.current) return; // l'utilisateur fait défiler manuellement
    const el = container.querySelector<HTMLElement>(
      `[data-line="${activeIndex}"]`
    );
    if (!el) return;
    container.scrollTo({
      top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [activeIndex, reduce]);

  // Pause du défilement auto pendant le scroll manuel
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const handleManualScroll = () => {
    holdScrollRef.current = true;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      holdScrollRef.current = false;
    }, 2500);
  };

  return (
    <section
      aria-label="Paroles de la chanson"
      className="glass-strong relative overflow-hidden rounded-[2rem] p-5 sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/50 to-transparent"
      />

      {/* En-tête */}
      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-lg font-bold text-slate-800 sm:text-xl">
          <span className="rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 p-2 text-white shadow-md">
            <Mic size={18} />
          </span>
          Paroles synchronisées
        </h3>
        <div className="flex items-center gap-2">
          {lyrics && lyrics.source !== "none" && (
            <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-white/60">
              {lyrics.source === "demo" ? "Démo" : "LRCLIB"}
            </span>
          )}
          {lines.length > 0 && (
            <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
              <MousePointerClick size={14} />
              Cliquez sur un vers pour naviguer
            </span>
          )}
        </div>
      </div>

      {/* Chargement */}
      {status === "loading" && (
        <div className="space-y-3 py-4" aria-label="Chargement des paroles">
          {[92, 78, 86, 64, 90, 72].map((w, i) => (
            <div
              key={i}
              className="skeleton h-7 rounded-xl"
              style={{ width: `${w}%`, marginInline: "auto" }}
            />
          ))}
        </div>
      )}

      {/* Erreur réseau */}
      {status === "error" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="rounded-full bg-sky-100 p-4 text-sky-500">
            <WifiOff size={28} />
          </span>
          <p className="max-w-sm text-slate-500">
            Impossible de récupérer les paroles. Vérifiez votre connexion puis
            réessayez.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            <RefreshCw size={16} />
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {status === "ready" && lyrics && (
        <>
          {lyrics.instrumental && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="rounded-full bg-sky-100 p-4 text-sky-500">
                <Disc size={28} />
              </span>
              <p className="font-semibold text-slate-700">
                Morceau instrumental
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                Il n&apos;y a pas de paroles à chanter sur ce titre. Profitez
                de la musique !
              </p>
            </div>
          )}

          {!lyrics.instrumental && lines.length > 0 && (
            <div
              ref={containerRef}
              onScroll={handleManualScroll}
              className="nice-scroll lyrics-mask max-h-[26rem] space-y-1 overflow-y-auto scroll-smooth px-1 py-8 sm:max-h-[30rem]"
              role="list"
              aria-label="Paroles ligne par ligne"
            >
              {lines.map((line, i) => {
                const isActive = i === activeIndex;
                const distance = Math.abs(i - activeIndex);
                return (
                  <motion.button
                    key={`${line.time}-${i}`}
                    type="button"
                    role="listitem"
                    data-line={i}
                    onClick={() => onSeek(line.time + 0.01)}
                    initial={false}
                    animate={{
                      scale: isActive ? 1.03 : 1,
                      opacity: isActive ? 1 : distance <= 1 ? 0.75 : 0.45,
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={`Aller à ${line.text}`}
                    className={`block w-full rounded-2xl px-4 py-2.5 text-center text-base leading-relaxed transition-colors duration-300 sm:text-lg ${
                      isActive
                        ? "bg-white/80 font-bold text-slate-900 shadow-[0_10px_30px_-12px_rgba(56,189,248,0.6)] ring-1 ring-sky-200/70"
                        : "font-medium text-slate-500 hover:bg-white/50 hover:text-slate-700"
                    }`}
                  >
                    {line.text}
                  </motion.button>
                );
              })}
            </div>
          )}

          {!lyrics.instrumental && lines.length === 0 && lyrics.plain && (
            <div className="py-2">
              <p className="mb-3 rounded-2xl bg-amber-100/60 px-4 py-2 text-center text-sm text-amber-700 ring-1 ring-amber-200/60">
                Paroles non synchronisées — elles ne suivront pas la lecture.
              </p>
              <p className="nice-scroll max-h-[26rem] overflow-y-auto whitespace-pre-line px-2 text-center leading-loose text-slate-600">
                {lyrics.plain}
              </p>
            </div>
          )}

          {!lyrics.instrumental && lines.length === 0 && !lyrics.plain && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="rounded-full bg-slate-200/70 p-4 text-slate-400">
                <Ghost size={28} />
              </span>
              <p className="font-semibold text-slate-700">
                Paroles introuvables
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                Les paroles de cette chanson ne sont pas disponibles sur
                LRCLIB pour le moment.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
