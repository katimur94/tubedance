# TubeDance - Audition Online

> Web-basiertes Multiplayer-Rhythmusspiel inspiriert von Audition Online. Tanze im Battle gegen andere Spieler, sammle Beats, schalte Items frei und steige in der Rangliste auf.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-000000?logo=threedotjs&logoColor=white&style=flat-square)](https://threejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com/)

**Live:** [https://tubedance.netlify.app](https://tubedance.netlify.app)

---

## Features

### Spielmodi

| Modus | Beschreibung |
|-------|-------------|
| **Beat Up** | Klassischer Audition-Modus: Pfeilsequenz merken, eingeben und im Takt mit der Leertaste bestaetigen. Finish Moves nach erfolgreichen Runden. |
| **Beat Rush** | DDR/StepMania-Stil mit fallenden Pfeilen in 4 Spalten. Timing-Fenster: Perfect (30ms), Great (60ms), Cool (100ms), Bad (150ms). |
| **Freestyle** | Freie Kombos mit Beat-Timing und Jury-Bewertung. Variety-Multiplier belohnt Abwechslung in den Richtungen. |
| **Club Dance** | Kooperativer Modus (in Vorbereitung). |

### Multiplayer

- **20 feste Raeume** (5 pro Spielmodus) — immer verfuegbar, keine Erstellung noetig
- **Private Raeume** — eigenen Raum erstellen und Code an Freunde weitergeben
- **Live-Join** — laufendem Spiel beitreten, Musik wird automatisch zur aktuellen Position synchronisiert
- **Score-Persistenz** — beim Verlassen und Wiedereintreten bleibt der Score erhalten
- **Leader-System** — der am laengsten anwesende Spieler ist Leader (Song-Auswahl, Spieler kicken, Krone weitergeben)
- **Echtzeit-Avatare** — alle Spieler sehen sich gegenseitig mit Live-Hit-Ratings und Combos auf der Buehne
- **Chat mit Emotes** — Echtzeit-Chat in jedem Raum und in der globalen Lobby
- **Synchronisierter Start** — automatischer Countdown wenn alle Spieler bereit sind (nur im Multiplayer)

### 3D-Avatare

- **Prozeduraler 3D-Avatar** mit Skelett-Animation (Three.js / React Three Fiber)
- **50+ Kleidungsstuecke und Effekte** — Jacken, Schuhe, Hosen, Fluegel, Auren, Brillen und mehr
- **Ready Player Me Integration** — eigene Avatare importieren
- **Rarity-System** — Common, Rare, Epic, Legendary mit visuellen Glow-Effekten
- **Super Saiyajin Aura** mit SSJ-Frisur und Blitz-Effekten (Admin-exklusiv)
- **Automatische Material-Bereinigung** — GPU-Speicher wird beim Komponentenwechsel freigegeben

### Wirtschaft und Fortschritt

- **Beats** (Waehrung) — verdient durch Gameplay, ausgegeben im Fashion Shop
- **Fashion Shop** — 30+ Items mit Live-3D-Vorschau, Rarity-Filter und Sale-System
- **Daily Rewards** — 7-Tage-Belohnungszyklus mit Streak-System (serverseitig validiert)
- **Level-System** — EXP durch Gameplay, automatischer Level-Up
- **10 Achievements** — mit Fortschrittsbalken und automatischem Unlock
- **Globale Rangliste** — Top 100 mit Wochen-/Monatsfilter
- **Freundesliste** — Spieler suchen, Anfragen senden, Rechtsklick-Menue in der Lobby
- **Serverseitige Persistenz** — Wallet, Items und Fortschritt in Supabase gespeichert

### Rollen-System

| Rolle | Rechte |
|-------|--------|
| User | Standard-Spieler |
| Supporter | Spezielles Badge |
| Moderator | Spieler verwalten |
| Gamemaster | Erweiterte Verwaltung |
| Admin | Alle Items, unendlich Beats, Level 999, SSJ-Aura, Admin-Panel |

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| 3D-Engine | Three.js 0.183, @react-three/fiber 9, @react-three/drei 10 |
| Backend | Supabase (Auth, PostgreSQL, Realtime Presence/Broadcast, Storage) |
| Styling | Tailwind CSS 4 |
| Animation | Motion (framer-motion Nachfolger) |
| Audio | YouTube (react-youtube) + Web Audio API |
| Avatare | Ready Player Me + Prozeduraler 3D-Fallback |
| Deployment | Netlify (PWA) |

---

## Setup

### Voraussetzungen

- Node.js 18+
- Ein Supabase-Projekt ([supabase.com](https://supabase.com))

### Installation

```bash
git clone https://github.com/katimur94/tubedance.git
cd tubedance
npm install
```

### Environment Variables

Erstelle `.env` im Root-Verzeichnis:

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### Datenbank-Migrationen

Alle SQL-Dateien muessen der Reihe nach ausgefuehrt werden:

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Manuell im Supabase Dashboard -> SQL Editor
# Dateien der Reihe nach einfuegen und ausfuehren:
```

| Migration | Inhalt |
|-----------|--------|
| `001_economy_and_social.sql` | Basis-Schema: Profiles, Shop, Coins, Friendships, Crews, Achievements, Leaderboard, Game Rooms |
| `002_sync_columns.sql` | Zusaetzliche Profil-Spalten (Kleidung, Transaktionen, Daily Login) |
| `003_user_roles.sql` | Rollen-System + Admin-RPC-Funktionen |
| `004_claim_daily_reward_rpc.sql` | Serverseitige Daily-Reward-Validierung (JSONB) |
| `005_missing_tables_and_indexes.sql` | Fehlende Spalten (Leaderboard username, daily_login_json JSONB), RLS-Policies, Performance-Indexes |
| `006_friends_search_and_delete.sql` | Freunde-Suche RPC, fehlende DELETE-Policy fuer Friendships |

### Entwicklung

```bash
npm run dev        # Dev-Server starten
npm run build      # Production Build
npx tsc --noEmit   # Type-Check (3 bekannte Fehler in Avatar.tsx + supabase.ts)
```

### Bekannte TypeScript-Fehler (harmlos)

- `src/components/Avatar.tsx(61,7)` — Variants-Typ-Inkompatibilitaet mit motion/react
- `src/lib/supabase.ts(3,33)` und `(4,33)` — `Property 'env' does not exist on type 'ImportMeta'` (Vite env type)

---

## Projektstruktur

```
src/
├── App.tsx                         # Haupt-App mit View-Router und Error Boundary
├── types/gameTypes.ts              # GameMode, HitRating, LetterGrade, GAME_MODES
├── lib/
│   ├── supabase.ts                 # Supabase Client mit Timeout-gesichertem Fetch
│   ├── economy.ts                  # Wallet, Shop-Katalog (30+ Items), Server-Sync
│   └── roles.ts                    # Rollen-System (User bis Admin)
├── systems/
│   └── AnimationSystem.ts          # Singleton AnimationCache, AvatarAnimationController
├── utils/
│   └── audio.ts                    # SoundEngine, BeatScheduler, AudioAnalyzer
├── components/
│   ├── Game.tsx                    # Game Controller, Multiplayer Battle-Stage, Live-Join, Score-Persistenz
│   ├── RoomBrowser.tsx             # 20 feste Raeume, Private Raeume, Presence-basiertes Leader-System
│   ├── AnimatedAvatar.tsx          # 3D Avatar mit Skelett-Animation + Procedural Fallback
│   ├── FashionShop.tsx             # Fashion Shop mit Rarity-Filter und Live-3D-Preview
│   ├── PlayerProfile.tsx           # Profil mit Stats, Achievements, 3D-Avatar-Preview
│   ├── Leaderboard.tsx             # Top 100 Rangliste mit Zeitfiltern
│   ├── FriendsList.tsx             # Freunde suchen, Anfragen, Duplikat-Pruefung
│   ├── Chat.tsx                    # Supabase Realtime Broadcast Chat + Emotes
│   ├── DailyRewards.tsx            # 7-Tage Belohnungszyklus (Server-validiert)
│   ├── WalletView.tsx              # Beats-Guthaben + Transaktionshistorie
│   ├── Auth.tsx                    # Login/Register + Gastmodus
│   └── modes/
│       ├── BeatUpMode.tsx          # Klassischer Audition-Modus + Finish Move
│       ├── BeatRushMode.tsx        # DDR-Stil mit fallenden Pfeilen
│       └── FreestyleMode.tsx       # Freestyle mit Variety-Multiplier
supabase/
└── migrations/                     # 6 SQL-Migrationen (siehe oben)
```

---

## Architektur-Highlights

### Multiplayer-Synchronisation

- **Feste Raeume**: 20 Presence-basierte Raeume ohne Datenbank-Eintraege — rein ueber Supabase Realtime Channels
- **Leader-Wahl**: Aeltester anwesender Spieler wird automatisch Leader (nach `joined_at` sortiert)
- **Live-Join**: Neue Spieler berechnen ihre YouTube-Seek-Position aus dem `gameStartedAt`-Timestamp — alle hoeren die gleiche Musik
- **Drift-Korrektur**: `onStateChange`-Handler korrigiert YouTube-Buffering-Drift automatisch (>2s)
- **Score-Persistenz**: `sessionStorage` speichert Score/Combo/HitCounts pro Raum — bleibt beim Verlassen und Wiedereintreten erhalten
- **Spieler-Announce**: Beim Channel-Subscribe broadcasten alle Spieler ihren Status, neue Spieler senden `player_announce_request`

### Sicherheit

- **Economy**: Server ist die Quelle der Wahrheit — kein `Math.max`-Exploit, serverseitige Daily-Reward-Validierung via RPC
- **RLS-Policies**: Alle Tabellen mit Row Level Security geschuetzt
- **Fetch-Timeout**: 10s-Timeout auf alle Supabase-Requests mit kombiniertem Signal-Handling

---

## Changelog

### 2026-04-10 — Umfassender Bug-Fix (33 Fixes)

**Kritisch**
- Waehrungs-Duplikations-Exploit in `syncWalletToSupabase` geschlossen (Server ist jetzt autoritativ fuer Coins/Diamonds)
- `earnBeats()` lehnt negative Betraege ab
- Supabase Realtime Memory Leaks gefixt: `channel.unsubscribe()` vor `removeChannel()` in Game.tsx und RoomBrowser.tsx
- Crash bei leeren Transaktionen in WalletView behoben
- Achievements zeigen echte Daten (owned items, friends count) statt hardcoded 0

**Gameplay**
- `sync_countdown` Event-Listener wird einmal registriert statt bei jedem Re-Render (keine doppelten Countdowns mehr)
- BeatRush: Keyboard-Events und Miss-Zaehlung nur aktiv wenn `isPlaying === true`
- Freestyle: Jury-Score verliert Punkte bei Miss (statt nur zu steigen)
- SyncBar: Stale Closures fuer `locked` und `onHit` via Refs gefixt
- BeatUpMode: Grade-Timeout korrekt aufgeraeumt
- SequenceInput: `onSequenceComplete` in Dependency-Array
- Leaderboard: `setMyRank` aus `.map()` herausgezogen

**Initialisierung**
- `useState(fn)` zu `useState(() => fn())` in DailyRewards, FashionShop, WalletView

**Fehlerbehandlung**
- `fetchOnlineProfile` in try-catch gewrappt
- `syncWalletFromServer` Promise mit `.catch()`
- Crown-Transfer Fehler werden geloggt statt verschluckt

**Audio & Animation**
- `AutoBPMDetector` raeumt AudioContext nach Timeout/Completion auf
- `AudioAnalyzer.destroy()` korrekte Disconnect-Reihenfolge
- `playHit()` akzeptiert jetzt auch `'cool'` (Type-Mismatch mit gameTypes behoben)
- Fehlgeschlagene Animation-Loads werden aus dem Promise-Cache entfernt (Retry moeglich)
- `AvatarAnimationController.dispose()` nutzt korrekte THREE.js API statt nicht-existentem `uncacheRoot`

---

## Screenshots

*Coming soon*

---

<p align="center">Made for the Rhythm Game Community</p>
