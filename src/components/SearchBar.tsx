"use client";

import { motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
}

/** Grande barre de recherche glassmorphism avec glow au focus. */
export default function SearchBar({ value, onChange, loading }: Props) {
  return (
    <motion.form
      role="search"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
      onSubmit={(e) => e.preventDefault()}
      className="group relative mx-auto w-full max-w-2xl"
    >
      {/* Halo derrière la barre */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-sky-300/50 via-blue-300/40 to-cyan-300/50 opacity-60 blur-xl transition-opacity duration-500 group-focus-within:opacity-100"
      />
      <div className="glass relative flex items-center gap-3 rounded-[1.75rem] py-2 pl-5 pr-2 transition-all duration-300 group-focus-within:scale-[1.01]">
        {loading ? (
          <Loader2 size={22} className="shrink-0 animate-spin text-sky-500" />
        ) : (
          <Search
            size={22}
            className="shrink-0 text-slate-400 transition-colors duration-300 group-focus-within:text-sky-500"
          />
        )}
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher une chanson ou un artiste…"
          aria-label="Rechercher une chanson ou un artiste"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 sm:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onChange("")}
            aria-label="Effacer la recherche"
            className="shrink-0 rounded-full bg-slate-200/70 p-2 text-slate-500 transition hover:bg-slate-300/70 hover:text-slate-700"
          >
            <X size={16} />
          </motion.button>
        )}
        <div className="hidden shrink-0 items-center gap-1 rounded-xl bg-white/60 px-3 py-2 text-xs font-medium text-slate-400 sm:flex">
          <kbd className="rounded-md bg-white px-1.5 py-0.5 shadow-sm ring-1 ring-slate-200">
            /
          </kbd>
          <span>pour chercher</span>
        </div>
      </div>
    </motion.form>
  );
}
