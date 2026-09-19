# Karaoke·LRCLIB 🎵

Mini lecteur musical **one-page** : recherchez une chanson ou un artiste,
écoutez un extrait et chantez avec les **paroles synchronisées en temps réel**
via [LRCLIB](https://lrclib.net).

Design **glassmorphism** lumineux (blanc / bleu clair), responsive et
mobile-friendly, avec des animations soignées (Framer Motion).

## Fonctionnalités

- 🔍 Recherche de titres / artistes (avec debounce, clavier, états vides)
- 🖼️ Résultats avec pochettes, album et durée
- ▶️ Lecteur audio custom : lecture/pause, précédent/suivant, progression,
  temps écoulé, volume + muet, badge « Extrait 30 s »
- 🎤 Paroles synchronisées LRCLIB : vers actif mis en avant, défilement
  automatique centré, **clic sur un vers = navigation dans l'audio**
- 🎼 Gestion des cas : instrumental, paroles non synchronisées, introuvables
- 📱 Responsive mobile-first + `prefers-reduced-motion` respecté
- 🧪 **Mode démo hors-ligne** (bouton « Démo ») si les API sont injoignables

## Stack

- **Node.js** + **Next.js 15** (App Router) + **TypeScript**
- **React 19**, **Tailwind CSS 4**, **Framer Motion**, **Lucide**
- Recherche & extraits : **iTunes Search API** (sans clé)
- Paroles : **LRCLIB** (`/api/get` puis repli `/api/search`)

## Démarrage

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000.

Production :

```bash
npm run build
npm run start
```

Aucune variable d'environnement ni clé API n'est nécessaire.

## Architecture

```text
src/
├── app/
│   ├── page.tsx            # One-page : recherche ⇄ lecteur
│   ├── layout.tsx
│   ├── globals.css         # Thème glassmorphism + animations
│   └── api/
│       ├── search/route.ts # Proxy Node → iTunes Search API
│       └── lyrics/route.ts # Proxy Node → LRCLIB (+ scoring)
├── components/
│   ├── Background.tsx      # Blobs animés + notes flottantes
│   ├── SearchBar.tsx
│   ├── SongCard.tsx        # Carte résultat (pochette à transition partagée)
│   ├── Player.tsx          # Lecteur <audio> custom
│   ├── Lyrics.tsx          # Paroles synchronisées interactives
│   └── Toast.tsx
└── lib/
    ├── types.ts
    ├── lrc.ts              # Parser LRC + formatage du temps
    ├── api.ts              # Client : API Node d'abord, repli direct ensuite
    └── demo.ts             # Morceau + paroles de démonstration
```

### Stratégie réseau

Le frontend appelle d'abord les routes API Node.js (`/api/search`,
`/api/lyrics`). Si le serveur ne peut pas joindre les API externes, le client
bascule automatiquement sur des appels directs navigateur → iTunes / LRCLIB.
En dernier recours, le **mode démo** permet de découvrir l'interface
(lecteur + synchronisation) sans réseau.
