"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Music2, Music3, Music4 } from "lucide-react";

const BLOBS = [
  {
    className:
      "left-[-8%] top-[-12%] h-[34rem] w-[34rem] bg-sky-200/60",
    x: [0, 60, -20, 0],
    y: [0, 30, 60, 0],
    duration: 26,
  },
  {
    className:
      "right-[-10%] top-[8%] h-[28rem] w-[28rem] bg-blue-200/50",
    x: [0, -50, 20, 0],
    y: [0, 50, 10, 0],
    duration: 22,
  },
  {
    className:
      "left-[20%] bottom-[-18%] h-[30rem] w-[30rem] bg-cyan-100/70",
    x: [0, 40, -40, 0],
    y: [0, -40, -10, 0],
    duration: 30,
  },
  {
    className:
      "right-[18%] bottom-[6%] h-[16rem] w-[16rem] bg-indigo-200/40",
    x: [0, -30, 30, 0],
    y: [0, -30, 20, 0],
    duration: 18,
  },
];

const NOTES = [
  { Icon: Music2, left: "8%", top: "22%", size: 26, delay: "0s", opacity: 0.35 },
  { Icon: Music3, left: "88%", top: "18%", size: 32, delay: "1.4s", opacity: 0.3 },
  { Icon: Music4, left: "76%", top: "72%", size: 24, delay: "2.2s", opacity: 0.35 },
  { Icon: Music2, left: "14%", top: "78%", size: 30, delay: "0.8s", opacity: 0.28 },
  { Icon: Music3, left: "46%", top: "8%", size: 22, delay: "3s", opacity: 0.25 },
  { Icon: Music4, left: "60%", top: "88%", size: 26, delay: "1.9s", opacity: 0.3 },
];

/** Fond animé : blobs glassmorphism + notes flottantes. */
export default function Background() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Halos flous animés */}
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${b.className}`}
          animate={reduce ? undefined : { x: b.x, y: b.y }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Reflet lumineux en haut */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/70 to-transparent" />

      {/* Notes de musique flottantes */}
      {!reduce &&
        NOTES.map((n, i) => (
          <n.Icon
            key={i}
            size={n.size}
            className="animate-floaty absolute text-sky-500"
            style={{ left: n.left, top: n.top, opacity: n.opacity, animationDelay: n.delay }}
          />
        ))}
    </div>
  );
}
