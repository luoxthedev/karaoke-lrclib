"use client";

import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { getNextMirrorUrl } from "@/lib/audius";

interface Props {
  url: string | null;
  mirrors: string[];
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackIconSize?: number;
  eager?: boolean;
}

/**
 * Pochette Audius avec repli sur les miroirs (cf. skill.md :
 * "Image Loading and Mirrors" — jamais de <img> brut).
 * En cas d'échec, l'hôte est remplacé par chaque miroir à tour de rôle.
 */
export default function TrackArtworkImage({
  url,
  mirrors,
  alt,
  className,
  fallbackClassName,
  fallbackIconSize = 30,
  eager = false,
}: Props) {
  const [src, setSrc] = useState<string | null>(url);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setSrc(url);
    setFailed(new Set());
    setExhausted(false);
  }, [url]);

  if (!src || exhausted) {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt}>
        <Music2 size={fallbackIconSize} className="text-white/90" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      className={className}
      onError={() => {
        const next = new Set(failed);
        next.add(src);
        setFailed(next);
        const mirrorUrl = getNextMirrorUrl(src, mirrors);
        if (mirrorUrl && !next.has(mirrorUrl)) setSrc(mirrorUrl);
        else setExhausted(true);
      }}
    />
  );
}
