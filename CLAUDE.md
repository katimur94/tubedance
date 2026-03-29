# CLAUDE.md — TubeDance / Audition Online

## Projekt

Web-Rhythmusspiel (Audition Online Klon). React 19, TypeScript, Vite 6, Three.js/R3F, Supabase, Tailwind 4, Motion.

## Tech-Stack

- **Frontend:** React 19, TypeScript, Vite 6
- **3D:** Three.js 0.183, @react-three/fiber 9, @react-three/drei 10
- **Backend:** Supabase (Auth, DB, Storage, Realtime)
- **Styling:** Tailwind CSS 4
- **Animations:** Motion (framer-motion successor)
- **Audio:** YouTube (react-youtube) + Web Audio API
- **Avatars:** Ready Player Me + procedural fallback
- **Deployment:** Netlify (PWA)

## Commands

```bash
npm run dev        # Vite dev server
npx tsc --noEmit   # Type check (3 pre-existing errors in Avatar.tsx + supabase.ts are known)
npm run build       # Production build
```

## Bekannte TypeScript-Fehler (pre-existing, nicht beheben)

- `src/components/Avatar.tsx(61,7)` — Variants type incompatibility mit motion/react
- `src/lib/supabase.ts(3,33)` und `(4,33)` — `Property 'env' does not exist on type 'ImportMeta'` (Vite env type)

---

## Status der Audition-Transformation

Alle 8 Phasen des Master-Prompts (`PROMPT_TUBEDANCE_TO_AUDITION.md`) sind **code-seitig implementiert**. Folgendes muss der Entwickler noch manuell tun:

---

## TODO: Was DU (Entwickler) noch tun musst

### 1. Supabase Migration ausfuehren

Die SQL-Datei liegt bereit, muss aber in deinem Supabase-Projekt ausgefuehrt werden:

```bash
# Option A: Supabase CLI
supabase db push

# Option B: Manuell im Supabase Dashboard
# SQL Editor oeffnen -> Inhalt von supabase/migrations/001_economy_and_social.sql einfuegen -> Run
```

**Was die Migration erstellt:**
- `profiles` Erweiterungen (coins, diamonds, highest_combo, total_games, etc.)
- `shop_items` Tabelle (Fashion Shop Katalog)
- `coin_transactions` Tabelle (Transaktions-Log)
- `friendships` Tabelle (Freundesliste)
- `crews` + `crew_members` Tabellen (Gilden-System)
- `achievements` + `user_achievements` Tabellen
- `leaderboard` Tabelle
- `game_rooms` Erweiterungen (name, mode, max_players, is_locked)
- RLS Policies fuer alle Tabellen
- Seed Data: 10 Achievements

### 2. Animations-Dateien vorbereiten

Die GLB-Animations-Dateien fehlen noch komplett in `public/animations/`. Ohne diese Dateien nutzt der Avatar den Procedural Fallback (mathematische Bone-Rotation).

**Schritt-fuer-Schritt:**

1. Lade die Ready Player Me Animation Library herunter:
   ```
   https://github.com/readyplayerme/animation-library
   ```

2. Kopiere die FBX-Dateien aus `masculine/fbx/dance/` nach `./rpm-animations/`

3. Installiere den Konverter:
   ```bash
   npm install -g fbx2gltf
   ```

4. Fuehre das Konvertierungs-Script aus:
   ```bash
   node scripts/convert-animations.js
   ```

5. Benenne die GLB-Dateien so um, dass sie diesem Schema entsprechen:
   ```
   public/animations/
   ├── idle.glb
   ├── dance_01.glb
   ├── dance_02.glb
   ├── dance_03.glb
   ├── dance_04.glb
   ├── dance_05.glb
   ├── miss.glb
   ├── victory.glb
   └── groove.glb
   ```

### 3. Environment Variables pruefen

Stelle sicher, dass `.env` diese Variablen hat:
```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### 4. Testen

Nach den obigen Schritten:

- [ ] `npm run dev` starten und Hauptmenue pruefen (AUDITION Titel, Pink/Purple Theme)
- [ ] Singleplayer: Mode Select -> Beat Up / Beat Rush / Freestyle ausprobieren
- [ ] Multiplayer: Room Browser oeffnen, Raum erstellen, beitreten
- [ ] Fashion Shop: Items durchstoebern, kaufen
- [ ] Wallet: Beats-Guthaben pruefen, Transaktionshistorie
- [ ] Daily Rewards: Popup beim ersten Login, Streak-System
- [ ] Leaderboard: Top 100 Anzeige (braucht Daten in der DB)
- [ ] Freundesliste: Suchen, hinzufuegen (braucht 2+ Accounts)
- [ ] Profil: Statistiken + 3D Avatar Preview
- [ ] Chat im Multiplayer-Raum: Nachrichten + Emotes
- [ ] Avatar Creator (RPM): Neuen Avatar erstellen/importieren
- [ ] Animations: Wenn GLB-Dateien vorhanden, pruefen ob Avatar tanzt

### 5. Optional: Weitere Verbesserungen

Diese Features sind im Code angelegt aber nicht voll implementiert:

- **Club Dance Modus** (`club_dance`): Kooperativer Modus — nur als Karte in ModeSelect sichtbar, kein eigener Mode-Component
- **Crews/Gilden**: DB-Schema existiert, aber kein Frontend-Component dafuer
- **Achievement-Tracking**: Schema + Seed existiert, aber kein automatisches Unlock bei Gameplay-Events
- **Leaderboard Auto-Update**: Schema existiert, aber kein Trigger der nach jedem Spiel die Leaderboard-Tabelle aktualisiert
- **Chat-Filter**: Basis-Implementierung vorhanden, koennte erweitert werden
- **Mobile/Touch**: Grundsaetzlich responsive, aber Gameplay-Modi (besonders Beat Rush) brauchen Touch-Buttons fuer Pfeiltasten

---

## Dateistruktur (nach Transformation)

```
src/
├── App.tsx                              # Haupt-App mit View-Router, Audition-Theme
├── main.tsx
├── index.css                            # Tailwind + Audition CSS Vars + Animationen
├── types/
│   └── gameTypes.ts                     # GameMode, HitRating, LetterGrade, GAME_MODES
├── lib/
│   ├── supabase.ts                      # Supabase Client
│   └── economy.ts                       # Wallet, Shop-Katalog (30+ Items), Beats-System
├── systems/
│   └── AnimationSystem.ts               # Singleton AnimationCache, AvatarAnimationController
├── utils/
│   └── audio.ts                         # SoundEngine, BeatScheduler, TapBPMDetector, AutoBPMDetector, AudioAnalyzer
├── components/
│   ├── Auth.tsx                          # Login/Register + Gastmodus
│   ├── Avatar.tsx                        # 2D Avatar (pre-existing, motion/react type error)
│   ├── AnimatedAvatar.tsx                # 3D Avatar mit Skelettanimation + Procedural Fallback
│   ├── AvatarCreator.tsx                 # Ready Player Me iFrame-Editor
│   ├── Chat.tsx                          # Supabase Realtime Broadcast Chat + Emotes
│   ├── DailyRewards.tsx                  # 7-Tage Belohnungszyklus mit Streak
│   ├── FashionShop.tsx                   # Fashion Shop (Jacken, Schuhe, Effekte, etc.)
│   ├── FriendsList.tsx                   # Freunde, Anfragen, Suche
│   ├── Game.tsx                          # Game Controller (rendert Modi basierend auf gameMode)
│   ├── Leaderboard.tsx                   # Top 100 Rangliste mit Zeitfiltern
│   ├── LockerRoom.tsx                    # Procedural Robot Outfit-Auswahl
│   ├── ModularAvatar.tsx                 # GLB Avatar mit Mesh-Toggle
│   ├── ModeSelect.tsx                    # Spielmodus-Auswahl (4 Karten)
│   ├── MultiplayerLobby.tsx              # Legacy Lobby (ersetzt durch RoomBrowser)
│   ├── PlayerProfile.tsx                 # Profil mit Stats + Achievements
│   ├── PlaylistManager.tsx               # YouTube Playlist CRUD
│   ├── RoomBrowser.tsx                   # Raum-Liste, Erstellen, Beitreten, Warten, Ready-Check
│   ├── SequenceInput.tsx                 # Pfeil-Sequenz Eingabe
│   ├── SyncBar.tsx                       # Timing-Bar
│   ├── WalletView.tsx                    # Beats-Guthaben + Transaktionshistorie
│   ├── Wardrobe.tsx                      # 3D Wardrobe
│   └── modes/
│       ├── BeatUpMode.tsx                # Klassischer Audition-Modus + Finish Move
│       ├── BeatRushMode.tsx              # DDR/StepMania-Stil, fallende Pfeile
│       └── FreestyleMode.tsx             # Freie Kombos, Jury-Bewertung
scripts/
└── convert-animations.js                # FBX -> GLB Konverter
supabase/
└── migrations/
    └── 001_economy_and_social.sql        # Komplettes DB-Schema
```
