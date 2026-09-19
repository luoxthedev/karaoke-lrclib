"use client";

import { motion } from "framer-motion";
import { Disc3, Play } from "lucide-react";
import TrackArtworkImage from "@/components/TrackArtworkImage";
import { formatTime } from "@/lib/lrc";
import type { Track } from "@/lib/types";

interface Props {
  track: Track;
  index: number;
  onSelect: () => void;
}

function formatPlays(n: number): string {
  return `${new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n)} écoutes`;
}

/** Carte résultat glassmorphism (transition partagée de la pochette). */
export default function SongCard({ track, index, onSelect }: Props) {
  const subLine =
    track.album ||
    [track.genre, track.playCount != null ? formatPlays(track.playCount) : null]
      .filter(Boolean)
      .join(" • ");

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.05, 0.45),
        ease: "easeOut",
      }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="glass group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl p-3 text-left transition-shadow duration-300 hover:shadow-[0_24px_60px_-18px_rgba(56,189,248,0.45)]"
      aria-label={`Écouter ${track.title} de ${track.artist}`}
    >
      {/* Pochette (morph vers le lecteur via layoutId) */}
      <motion.div
        layoutId={`cover-${track.id}`}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-md"
      >
        <TrackArtworkImage
          url={track.artwork}
          mirrors={track.artworkMirrors}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackClassName="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-300 via-blue-300 to-indigo-300"
        />
        {/* Overlay lecture au survol */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all duration-300 group-hover:bg-slate-900/35 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 p-2.5 text-sky-600 shadow-lg">
            <Play size={16} fill="currentColor" />
          </span>
        </div>
      </motion.div>

      {/* Textes */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-800">
          {track.title}
        </p>
        <p className="truncate text-sm text-slate-500">{track.artist}</p>
        {subLine && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
            <Disc3 size={12} className="shrink-0" />
            <span className="truncate">{subLine}</span>
          </p>
        )}
      </div>

      {/* Durée */}
      {track.durationMs ? (
        <span className="shrink-0 rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-500 ring-1 ring-white/60">
          {formatTime(track.durationMs / 1000)}
        </span>
      ) : null}

      {/* Reflet glass */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent"
      />
    </motion.button>
  );
}
