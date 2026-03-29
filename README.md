# TubeDance - Audition Online

> Web-basiertes Multiplayer-Rhythmusspiel inspiriert von Audition Online. Tanze im Battle gegen andere Spieler, sammle Beats, schalte Items frei und steige in der Rangliste auf.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-000000?logo=threedotjs&logoColor=white&style=flat-square)](https://threejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com/)

**Live:** [https://tubedance.netlify.app](https://tubedance.netlify.app) <!-- Update with actual Netlify URL -->

---

## Features

### Gameplay
- **Beat Up Mode** - Klassischer Audition-Modus: Pfeile merken, eingeben, im Takt bestaetigen
- **Beat Rush Mode** - DDR/StepMania-Stil mit fallenden Pfeilen
- **Freestyle Mode** - Freie Kombos mit Jury-Bewertung
- **50+ Songs** in 5 Schwierigkeitsstufen (60-200+ BPM)

### Multiplayer
- Echtzeit-PvP Battle mit Live-Avataren auf der Buehne
- Raum-Browser mit Quick Join und Raum-Code
- Leader-System (Krone weitergeben, Spieler kicken, Raum schliessen)
- Song/Playlist-Auswahl durch den Leader
- Synchronisierter Countdown und Spielstart
- Hit-Ratings (Perfect/Great/Cool/Bad/Miss) live sichtbar fuer alle
- Echtzeit-Chat mit Emotes

### 3D Avatare
- Prozeduraler 3D-Avatar mit Skelett-Animation (Three.js / React Three Fiber)
- 50+ Kleidungsstuecke und Effekte (Jacken, Schuhe, Fluegel, Auren, ...)
- Ready Player Me Integration fuer eigene Avatare
- Rarity-System: Common, Rare, Epic, Legendary
- Super Saiyajin Aura mit SSJ-Frisur und Blitz-Effekten (Admin-exklusiv)

### Wirtschaft & Fortschritt
- **Beats** (Waehrung) verdient durch Gameplay
- Fashion Shop mit Live-3D-Vorschau
- Daily Rewards mit Streak-System
- Level-System mit EXP
- 10 Achievements mit Fortschrittsbalken
- Globale Rangliste (Top 100)
- Alles serverseitig in Supabase gespeichert (kein localStorage-Verlust)

### Rollen
- User, Supporter, Moderator, Gamemaster, Admin
- Admins: Alle Items freigeschaltet, unendlich Beats, Level 999, SSJ-Aura

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 19, TypeScript, Vite 6 |
| 3D | Three.js 0.183, @react-three/fiber 9, @react-three/drei 10 |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Storage) |
| Styling | Tailwind CSS 4 |
| Animation | Motion (framer-motion Nachfolger) |
| Audio | YouTube (react-youtube) + Web Audio API |
| Avatare | Ready Player Me + Procedural 3D Fallback |
| Deployment | Netlify |

---

## Setup

### Voraussetzungen
- Node.js 18+
- Supabase-Projekt ([supabase.com](https://supabase.com))

### Installation

```bash
git clone https://github.com/katimur94/tubedance.git
cd tubedance
npm install
```

### Environment Variables

Erstelle `.env` im Root:

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### Datenbank

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Supabase Dashboard -> SQL Editor
# Inhalt von supabase/migrations/001_economy_and_social.sql einfuegen und ausfuehren
```

### Entwicklung

```bash
npm run dev        # Dev-Server (http://localhost:5173)
npm run build      # Production Build
npx tsc --noEmit   # Type-Check
```

---

## Projektstruktur

```
src/
├── App.tsx                     # Haupt-App mit View-Router
├── types/gameTypes.ts          # GameMode, HitRating, LetterGrade
├── lib/
│   ├── supabase.ts             # Supabase Client
│   ├── economy.ts              # Wallet, Shop (50+ Items), Supabase-Sync
│   └── roles.ts                # Rollen-System (User bis Admin)
├── components/
│   ├── Game.tsx                # Game Controller + Multiplayer Battle-Stage
│   ├── RoomBrowser.tsx         # Multiplayer Lobby + Raum-Management
│   ├── AnimatedAvatar.tsx      # 3D Avatar mit Skelett-Animation + SSJ-Aura
│   ├── FashionShop.tsx         # Item-Shop mit Live-3D-Preview
│   ├── PlayerProfile.tsx       # Profil, Stats, Achievements mit Fortschritt
│   ├── Leaderboard.tsx         # Top 100 Rangliste
│   ├── Chat.tsx                # Echtzeit-Chat (Supabase Broadcast)
│   ├── DailyRewards.tsx        # 7-Tage Belohnungszyklus
│   └── modes/
│       ├── BeatUpMode.tsx      # Klassischer Audition-Modus + Finish Move
│       ├── BeatRushMode.tsx    # DDR-Stil (fallende Pfeile)
│       └── FreestyleMode.tsx   # Freestyle mit Beat-Timing
supabase/
└── migrations/
    └── 001_economy_and_social.sql
```

---

## Screenshots

*Coming soon*

---

<p align="center">Made for the Rhythm Game Community</p>
