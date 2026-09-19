import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karaoke LRCLIB — paroles synchronisées",
  description:
    "Recherchez une chanson, écoutez un extrait et chantez avec les paroles synchronisées (LRCLIB).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
