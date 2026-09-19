# Karaoke·LRCLIB 🎵

Mini lecteur musical **one-page** : recherchez une chanson ou un artiste
sur [Audius](https://audius.co), écoutez le morceau en intégral et chantez
avec les **paroles synchronisées en temps réel** via
[LRCLIB](https://lrclib.net).

Design **glassmorphism** lumineux (blanc / bleu clair), responsive et
mobile-friendly, avec des animations soignées (Framer Motion).

## Fonctionnalités

- 🔍 Recherche de titres / artistes sur **Audius** (debounce, clavier, états
  vides, skeletons)
- 🖼️ Résultats avec pochettes (repli automatique sur les **miroirs** Audius),
  genre, écoutes et durée
- ▶️ Lecteur audio **intégral** : lecture/pause, précédent/suivant,
  progression, temps écoulé, volume + muet, résolution du flux avec retry
- 🎤 Paroles synchronisées LRCLIB : vers actif mis en avant, défilement
  automatique centré, **clic sur un vers = navigation dans l'audio**
- 🎼 Gestion des cas : instrumental, paroles non synchronisées, introuvables
- 📱 Responsive mobile-first + `prefers-reduced-motion` respecté
- 🧪 **Mode démo hors-ligne** (bouton « Démo ») si les API sont injoignables

## Stack

- **Node.js** + **Next.js 15** (App Router) + **TypeScript**
- **React 19**, **Tailwind CSS 4**, **Framer Motion**, **Lucide**
- Recherche & audio intégral : **Audius** (`api.audius.co/v1`, clé gratuite)
- Paroles : **LRCLIB** (`/api/get` puis repli `/api/search`)

## Configuration Audius (requis pour la recherche et l'audio)

L'API Audius demande une clé gratuite (lecture seule) :

1. Créez un compte sur https://audius.co/signup (si besoin).
2. Allez sur https://audius.co/settings → **« Manage Your Apps »**
   (ou https://api.audius.co/plans) et créez une application.
3. Copiez la **clé API** dans un fichier `.env.local` à la racine :

```bash
NEXT_PUBLIC_AUDIUS_API_KEY=votre_cle_ici
```

4. Redémarrez le serveur de dev.

> La [doc Audius](https://audius.co/skill.md) autorise l'exposition de la clé
> *lecture seule* côté client (repli direct navigateur → API). Ne créez et
> n'exposez jamais de Secret API côté frontend.
>
> Voir `.env.example` pour les options (`AUDIUS_API_KEY` serveur prioritaire,
> `AUDIUS_APP_NAME`).

Sans clé, l'application affiche un écran de configuration et le **mode démo**
reste disponible.

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

## Architecture

```text
src/
├── app/
│   ├── page.tsx            # One-page : recherche ⇄ lecteur
│   ├── layout.tsx
│   ├── globals.css         # Thème glassmorphism + animations
│   └── api/
│       ├── search/route.ts # Proxy Node → Audius /tracks/search
│       ├── stream/route.ts # Résout le flux /tracks/{id}/stream (302 suivie)
│       └── lyrics/route.ts # Proxy Node → LRCLIB (+ scoring)
├── components/
│   ├── Background.tsx      # Blobs animés + notes flottantes
│   ├── SearchBar.tsx
│   ├── SongCard.tsx        # Carte résultat (pochette à transition partagée)
│   ├── TrackArtworkImage.tsx # Pochette avec repli sur les miroirs Audius
│   ├── Player.tsx          # Lecteur <audio> + résolution du flux
│   ├── Lyrics.tsx          # Paroles synchronisées interactives
│   └── Toast.tsx
└── lib/
    ├── types.ts
    ├── audius.ts           # Client REST Audius (recherche, stream, mirrors)
    ├── lrc.ts              # Parser LRC + formatage du temps
    ├── api.ts              # Client : API Node d'abord, repli direct ensuite
    └── demo.ts             # Morceau + paroles de démonstration
```

### Stratégie réseau

Le frontend appelle d'abord les routes API Node.js (`/api/search`,
`/api/stream`, `/api/lyrics`). Si le serveur ne peut pas joindre les API
externes, le client bascule automatiquement sur des appels directs
navigateur → Audius / LRCLIB.
En dernier recours, le **mode démo** permet de découvrir l'interface
(lecteur + synchronisation) sans réseau.

Références Audius suivies : https://audius.co/agents.md et
https://audius.co/skill.md (base `api.audius.co/v1`, header `x-api-key`,
`?app_name=`, lecture via URL de stream + `<audio>`, pochettes avec
`mirrors`).
