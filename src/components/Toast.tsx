"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";

export interface ToastData {
  id: number;
  message: string;
  kind: "error" | "info";
}

/** Notification flottante glassmorphism. */
export default function Toast({ toast }: { toast: ToastData | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            role="alert"
            className={`glass-strong pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${
              toast.kind === "error" ? "text-rose-600" : "text-sky-700"
            }`}
          >
            {toast.kind === "error" ? (
              <AlertTriangle size={18} className="shrink-0" />
            ) : (
              <Info size={18} className="shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
