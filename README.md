<div align="center">

```
  _____ _   _ ____  _____ ____    _    _   _  ____ _____ 
 |_   _| | | | __ )| ____|  _ \  / \  | \ | |/ ___| ____|
   | | | | | |  _ \|  _| | | | |/ _ \ |  \| | |   |  _|  
   | | | |_| | |_) | |___| |_| / ___ \| |\  | |___| |___ 
   |_|  \___/|____/|_____|____/_/   \_\_| \_|\____|_____|
```

# TubeDance -- Audition Online Reborn

**Web-basiertes Multiplayer-Rhythmusspiel im Browser**

*Inspiriert vom legendaeren Audition Online (Alaplaya 2008-2012)*

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-000000?logo=threedotjs&logoColor=white&style=for-the-badge)](https://threejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase&logoColor=white&style=for-the-badge)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com/)

**[Live Demo](https://tubedance.netlify.app)**

</div>

---

## Spielmodi

| Modus | Beschreibung |
|-------|-------------|
| **Beat Up** | Der Klassiker: Pfeilsequenz merken, eingeben, Space im Takt. Level 1-9, Finish Move, Chance Mode. **S-Rank** bei perfektem Finish. |
| **Beat Rush** | DDR/StepMania-Style: Pfeile fallen in 4 Spalten. **Canvas-basiert** fuer 60fps. Sound-Feedback + Lane Glow bei Hit. |
| **Freestyle** | Freier Tanz zum Beat. Jury bewertet Timing, Variation und Komplexitaet. **Tier-Announcements** bei neuen Stufen. |
| **Club Dance** | Kooperativer Modus (in Vorbereitung). |

---

## Gameplay

- **Fever Mode** -- 20+ Combo aktiviert 4x Multiplier mit goldenem Puls-Effekt
- **Combo-Meilensteine** -- Goldene Burst-Animation bei 10, 25, 50, 100er Combo
- **Grace Period** -- Erster Miss bricht Combo nicht sofort (ab Combo 5+)
- **Perfect Streak Counter** -- Zaehlt aufeinanderfolgende Perfects
- **S-Rank System** -- Perfekter Finish Move wird mit S-RANK-Explosion belohnt
- **Sound-Effekte** -- Web Audio API Synthesizer (Chimes, Plings, Thuds)
- **Hit VFX** -- Screen Shake, goldene Sternexplosion, Neon-Aura bei hohem Combo
- **Live Grade** -- S/A/B/C/D Bewertung in Echtzeit

---

## Multiplayer

- **20 feste Raeume** (5 pro Modus) + Private Raeume mit Codes
- **Live-Join** -- Laufendem Spiel beitreten, YouTube synchronisiert automatisch
- **Battle-Stage** -- Alle Avatare tanzen nebeneinander mit Hit-Ratings und Combo-Badges
- **Leaderboard-Notifications** -- "X hat dich ueberholt!" Warnung in Echtzeit
- **Score-Persistenz** -- Score bleibt beim Verlassen/Wiedereintreten erhalten
- **Leader-System** -- Aeltester Spieler wird automatisch Leader
- **Chat mit Emotes** -- In-Game und Lobby-Chat ueber Supabase Realtime
- **Offline-Erkennung** -- Indikator wenn Verbindung abbricht

---

## Avatar-Editor

> Detailreicher Charakter-Creator mit 30+ Optionen -- alles prozedural in Three.js gerendert.

**15 Frisuren** -- Glatze, Kurz, Lang, Spikes, Zopf, Bob, Twintails, Geflochten, Afro, Mohawk, Sidecut, Locken, Wellig, Dutt, Zoepfe

**Gesichts-Editor:**
- Nase (4 Formen: Stups, Spitz, Breit, Flach) mit Groessen-Slider
- Ohren (Rund, Spitz/Elf, Klein) mit Groessen-Slider
- Augenbrauen (6 Styles) mit eigener Farbe und Dicke
- Kinn (Rund, Eckig, Spitz), Wangenbreite, Stirnhoehe
- Sommersprossen On/Off
- Augenabstand + Augengroesse Slider
- Lippendicke Slider

**Koerper-Editor:**
- Geschlecht, Groesse, Muskeln, Koerperfett
- Schulterbreite, Hueftbreite, Armlaenge, Beinlaenge
- Halslaenge + Halsdicke
- Farbrad fuer Haut, Augen, Haare, Augenbrauen (Presets + freie Wahl)

**Kleidung:**
- 100+ Items mit Emoji-Thumbnails und prozeduralen 512x512 Texturen
- 3D-Details: Kragen, Manschetten, Guertel, Taschen, Reissverschluss
- Rarity-System: Common, Rare, Epic, Legendary mit Glow-Effekten
- Spezialeffekte: Schmetterlinge, Feuer, Neon-Aura, Super Saiyan, Black Hole
- Anime-Modelle (CC0 VRM) + Ready Player Me Import

---

## Wirtschaft und Fortschritt

| Feature | Details |
|---------|---------|
| **Beats** | Waehrung -- verdient durch Gameplay, ausgegeben im Fashion Shop |
| **Fashion Shop** | 30+ Items, Rarity-Filter, Sales, Level-Gates, Live-3D-Preview |
| **Daily Rewards** | 7-Tage-Streak, serverseitig validiert, Timezone-korrekt |
| **Level-System** | EXP + automatischer Level-Up |
| **Achievements** | 10 Achievements mit Fortschrittsbalken |
| **Rangliste** | Top 100 mit Wochen-/Monatsfilter |
| **Freundesliste** | Suchen, Anfragen, Rechtsklick-Menue |

---

## Rollen-System

| Rolle | Rechte |
|:-----:|--------|
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

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Manuell im Supabase Dashboard -> SQL Editor
```

| Migration | Inhalt |
|-----------|--------|
| `001_economy_and_social.sql` | Basis-Schema: Profiles, Shop, Coins, Friendships, Crews, Achievements, Leaderboard, Game Rooms |
| `002_sync_columns.sql` | Zusaetzliche Profil-Spalten (Kleidung, Transaktionen, Daily Login) |
| `003_user_roles.sql` | Rollen-System + Admin-RPC-Funktionen |
| `004_claim_daily_reward_rpc.sql` | Serverseitige Daily-Reward-Validierung (JSONB) |
| `005_missing_tables_and_indexes.sql` | Fehlende Spalten, RLS-Policies, Performance-Indexes |
| `006_friends_search_and_delete.sql` | Freunde-Suche RPC, DELETE-Policy fuer Friendships |

### Entwicklung

```bash
npm run dev        # Dev-Server starten (Port 3000)
npm run build      # Production Build
npx tsc --noEmit   # Type-Check (3 bekannte Fehler -- siehe unten)
```

---

## Steuerung

| Taste | Aktion |
|:-----:|--------|
| Pfeiltasten | Richtungseingabe (Beat Up / Freestyle / Beat Rush) |
| Space | Timing-Hit (Beat Up SyncBar) |
| C | Chance Mode Toggle (ab Level 6) |

---

## Projektstruktur

```
src/
  App.tsx                          Haupt-App, View-Router, Error Boundary
  components/
    modes/
      BeatUpMode.tsx               Klassischer Audition-Modus + Finish Move + S-Rank
      BeatRushMode.tsx             DDR-Style, Canvas-basiert, 60fps
      FreestyleMode.tsx            Freestyle + Jury-Tier-Announcements
    Game.tsx                       Game Controller, Fever Mode, Multiplayer Battle-Stage
    AnimatedAvatar.tsx             3D Avatar (Skelett + Prozedural, 15 Frisuren)
    LockerRoom.tsx                 Charakter-Editor (30+ Optionen, Color Picker)
    RoomBrowser.tsx                Multiplayer Lobby + Presence
    SyncBar.tsx                    Timing-Bar (Canvas, Anti-Spam)
    HitVFX.tsx                     Hit-Effekte (Screen Shake, Explosionen)
    StageBackground.tsx            Disco-Buehne (Canvas)
    FashionShop.tsx                Item-Shop (Anti-Doppelkauf)
    DailyRewards.tsx               Daily Rewards (Timezone-korrekt)
    Chat.tsx                       Echtzeit-Chat
  lib/
    economy.ts                     Wallet, Shop, Transaktionen (Multi-Tab-Safe)
    supabase.ts                    Supabase Client + Timeout-Fetch
    roles.ts                       Rollen-System
  utils/
    audio.ts                       SoundEngine, BeatScheduler, AudioAnalyzer
    clothingTextures.ts            Prozedurale 512x512 Canvas-Texturen
  types/
    gameTypes.ts                   Typen, Ratings, Grades
supabase/
  migrations/                      6 SQL-Migrationen
```

---

## Architektur-Highlights

**Multiplayer-Sync:**
Feste Raeume laufen rein ueber Supabase Realtime Presence -- keine DB-Eintraege. Leader-Wahl per `joined_at`, Live-Join per YouTube-Seek aus `gameStartedAt`-Timestamp, Drift-Korrektur bei >2s Abweichung.

**Avatar-System:**
Komplett prozedural aus Three.js Primitiven (Boxen, Kugeln, Zylinder, Kegel). 512x512 Canvas-Texturen werden pro Item generiert und gecacht. Legendary Items bekommen `MeshPhysicalMaterial` mit Iridescence.

**Sicherheit:**
Server ist autoritativ fuer Economy (Daily Rewards via RPC). SyncBar hat Spacebar-Debounce (150ms Cooldown). Purchase-Flow hat Anti-Doppelklick. Room Auto-Delete mit 3s Delay gegen Race Conditions. Alle Tabellen mit RLS.

---

## Bekannte Einschraenkungen

- 3 pre-existing TypeScript-Fehler in `Avatar.tsx` (motion/react Types) und `supabase.ts` (Vite env) -- harmlos
- Animations-Dateien (`public/animations/*.glb`) muessen manuell heruntergeladen werden -- ohne sie nutzt der Avatar den prozeduralen Fallback
- Mobile/Touch ist grundsaetzlich responsive, aber Gameplay braucht Tastatur

---

## Changelog

<details>
<summary><strong>2026-04-16 -- Detailreicher Avatar-Editor + Performance + Gameplay Overhaul</strong></summary>

**Avatar-Editor:**
- 15 Frisuren (10 neue: Bob, Twintails, Braid, Afro, Mohawk, Sidecut, Curly, Wavy, Bun, Pigtails)
- Neue Gesichts-Features: Nase, Ohren, Augenbrauen, Kinn, Sommersprossen
- 20+ Slider fuer Koerper-/Gesichtsproportionen
- Color Picker (Presets + freie Farbwahl) fuer Haut, Augen, Haare, Brauen
- 30+ neue Kleidungsstuecke mit Emoji-Thumbnails
- 3D-Details: Kragen, Manschetten, Guertel, Taschen, Reissverschluss
- UI-Redesign mit aufklappbaren Sektionen

**Gameplay:**
- Fever Mode (20+ Combo = 4x Multiplier)
- Combo-Meilensteine (10/25/50/100)
- Grace Period (Combo bricht nicht sofort bei Miss)
- Perfect Streak Counter + S-Rank System
- Sound-Effekte in allen 3 Modi (Web Audio API)
- BeatRush komplett auf Canvas umgestellt (60fps)
- BeatRush Lane Glow + Feedback-Text
- FreestyleMode Jury-Tier-Announcements + Variationsmeter
- Multiplayer Leaderboard-Ueberholungs-Benachrichtigungen

**Bug-Fixes (39 gefunden, alle kritischen gefixt):**
- SyncBar Spacebar-Spam-Exploit geschlossen (150ms Debounce)
- SyncBar Timing-Fenster verschaerft (halbiert)
- FashionShop Doppelkauf-Race-Condition verhindert
- DailyRewards Doppel-Claim verhindert
- DailyRewards UTC -> Lokale Zeitzone
- DailyRewards Streak-Day-Index-Inkonsistenz gefixt
- Profile-Update Error Handling
- Room Auto-Delete Race Condition (3s Delay)
- Channel Cleanup (.catch() bei unsubscribe)
- Economy Multi-Tab Guard
- YouTube URL Regex erweitert (Shorts, kurze IDs)
- Guest Mode Auth-Guard fuer Freundesliste
- BeatRush Avatar-Position korrigiert (35vh statt 45vh)
- Leaderboard Sort nur bei Score-Aenderung
- AnimatedAvatar Inline-Material-Leak gefixt
- RoomBrowser Lobby-Broadcast nur bei Count-Aenderung
- GameModeBoundary Error Boundary
- Offline-Erkennung

**Performance:**
- handleHit/handleMiss mit useCallback
- BeatRush Arrows: requestAnimationFrame + Canvas statt React DOM
- Callback Refs statt Effect-Dependencies (keine Listener-Neuregistrierung)
- Material-Caching in AnimatedAvatar
</details>

<details>
<summary><strong>2026-04-10 -- 33 Bug-Fixes</strong></summary>

Waehrungs-Exploit, Memory Leaks, Crash-Fixes, Audio-Cleanup, Stale Closures, Achievement-Daten, etc.
</details>

---

<div align="center">
<strong>Made for the Rhythm Game Community</strong><br>
<sub>React 19 + Three.js + Supabase + Tailwind 4</sub>
</div>
