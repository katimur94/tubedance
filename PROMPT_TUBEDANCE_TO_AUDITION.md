# MASTER-PROMPT: TubeDance → Audition Online Transformation

## Projekt-Kontext

Du arbeitest an **TubeDance**, einem Web-Rhythmusspiel (React 19, Vite 6, TypeScript, Three.js/R3F, Supabase, Tailwind 4). Das Ziel ist, es in einen **Audition Online (alaplaya)**-Klon zu verwandeln — ein Multiplayer-Tanz-Rhythmusspiel mit 3D-Avataren, Fashion-System und sozialen Features.

**Wichtig: Der Entwickler hat KEINE 3D-Modellierungs-Erfahrung. Alle 3D-Assets müssen aus frei verfügbaren Quellen kommen (Ready Player Me, RPM Animation Library, etc.). Kein Blender, kein manuelles Rigging.**

---

## Tech-Stack (unverändert beibehalten)

- **Frontend:** React 19, TypeScript, Vite 6
- **3D:** Three.js (v0.183), @react-three/fiber (v9), @react-three/drei (v10)
- **Backend:** Supabase (Auth, DB, Storage, Realtime)
- **Styling:** Tailwind CSS 4
- **Animations:** Motion (framer-motion successor)
- **Deployment:** Netlify (PWA)
- **Audio:** YouTube (react-youtube) + Web Audio API

---

## Bestehende Dateistruktur

```
src/
├── App.tsx                          # Haupt-App mit View-Router (menu/playlist/lobby/locker/wardrobe/game)
├── main.tsx                         # Entry
├── index.css                        # Tailwind
├── lib/
│   └── supabase.ts                  # Supabase Client (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── utils/
│   └── audio.ts                     # SoundEngine, BeatScheduler, TapBPMDetector, AudioAnalyzer
├── components/
│   ├── Auth.tsx                     # Login/Register + Gastmodus
│   ├── Avatar3D.tsx                 # Prozeduraler Robot-Avatar aus Boxen/Kugeln mit Canvas-Texturen
│   ├── AvatarCreator.tsx            # Ready Player Me iFrame-Editor (@readyplayerme/react-avatar-creator)
│   ├── Game.tsx                     # Haupt-Gameplay (YouTube + SyncBar + SequenceInput + 3D Avatar)
│   ├── LockerRoom.tsx               # Outfit-Auswahl für den prozeduralen Robot-Avatar
│   ├── ModularAvatar.tsx            # GLB-basierter Avatar mit Mesh-Visibility-Toggle (Wardrobe)
│   ├── MultiplayerLobby.tsx         # Supabase Realtime Presence Lobby
│   ├── PlayerAvatar.tsx             # Lädt beliebige .glb via useGLTF, bounce-Animation per useFrame
│   ├── PlaylistManager.tsx          # YouTube-Playlist CRUD (Supabase)
│   ├── SequenceInput.tsx            # Pfeil-Sequenz eingeben (↑↓←→), 4-8 zufällige Pfeile
│   ├── SyncBar.tsx                  # Timing-Bar: weißer Marker läuft über Bar, Spacebar zum Sync
│   └── Wardrobe.tsx                 # 3D Wardrobe mit Supabase user_inventory/items Tabellen
public/
├── models/
│   ├── placeholder.glb              # Fallback-Modell
│   ├── placeholder2.glb
│   └── patrick_the_mustache_starfish.glb
```

---

## Bestehende Supabase-Tabellen (bekannt aus Code)

- `profiles` — id, username, level, exp, jacket, pants, shoes, rpm_url
- `game_rooms` — room_code, host_id, is_playing, playlist_id
- `playlist_songs` — playlist_id, video_id, title, bpm, position
- `user_inventory` — id, user_id, item_id, is_equipped
- `items` — id, name, type (shirt/pants/shoes), mesh_name, price

---

## PHASE 1: Animationssystem (Priorität HÖCHSTE)

### Ziel
Den prozeduralen Box-Roboter (Avatar3D.tsx) und den statischen GLB-Bouncer (PlayerAvatar.tsx) durch einen echten animierten Charakter mit Motion-Capture-Tanzanimationen ersetzen.

### Umsetzung

#### 1.1 — Animations-Dateien vorbereiten

Lade die **Ready Player Me Animation Library** herunter:
- GitHub: `https://github.com/readyplayerme/animation-library`
- Dort gibt es den Ordner `masculine/fbx/dance/` mit fertigen Tanz-FBX-Dateien
- Diese sind bereits auf das RPM-Armature retargetiert

Konvertiere die FBX-Dateien zu GLB mit dem npm-Paket `fbx2gltf` oder einem Node-Script:

```bash
npm install -g fbx2gltf
# Oder nutze: https://github.com/crazyramirez/FBX2GLB-Batch-Convert-Optimizer
```

Erstelle ein Script `scripts/convert-animations.js`:
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputDir = './rpm-animations/masculine/fbx/dance';
const outputDir = './public/animations';

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.fbx'));
files.forEach(file => {
  const input = path.join(inputDir, file);
  const output = path.join(outputDir, file.replace('.fbx', '.glb'));
  console.log(`Converting ${file}...`);
  try {
    execSync(`fbx2gltf -i "${input}" -o "${output}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Failed: ${file}`, e.message);
  }
});
```

Lege mindestens diese Animationen in `/public/animations/`:
- `idle.glb` — Standard-Stehen
- `dance_01.glb` bis `dance_10.glb` — Verschiedene Tanz-Moves
- `miss.glb` oder `sad.glb` — Reaktion bei Miss
- `victory.glb` — Gewinn-Animation
- `groove.glb` — Leichtes Wippen (Low-Intensity)

#### 1.2 — Neue AnimatedAvatar-Komponente erstellen

Erstelle `src/components/AnimatedAvatar.tsx`:

```tsx
import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Animation-URLs — diese GLBs liegen in /public/animations/
const ANIMATION_MAP = {
  idle: '/animations/idle.glb',
  dance_01: '/animations/dance_01.glb',
  dance_02: '/animations/dance_02.glb',
  dance_03: '/animations/dance_03.glb',
  dance_04: '/animations/dance_04.glb',
  dance_05: '/animations/dance_05.glb',
  miss: '/animations/miss.glb',
  victory: '/animations/victory.glb',
  groove: '/animations/groove.glb',
};

interface AnimatedAvatarModelProps {
  modelUrl: string; // RPM Avatar URL oder lokale GLB
  danceState: 'idle' | 'dancing' | 'miss';
  intensity: number; // 1-3, bestimmt welcher Dance-Clip gespielt wird
  bpm?: number;
}

function AvatarModel({ modelUrl, danceState, intensity, bpm = 120 }: AnimatedAvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  
  // Lade alle Animationen separat
  const idleGltf = useGLTF(ANIMATION_MAP.idle);
  const dance01Gltf = useGLTF(ANIMATION_MAP.dance_01);
  const dance02Gltf = useGLTF(ANIMATION_MAP.dance_02);
  const dance03Gltf = useGLTF(ANIMATION_MAP.dance_03);
  const missGltf = useGLTF(ANIMATION_MAP.miss);
  const grooveGltf = useGLTF(ANIMATION_MAP.groove);
  
  // Sammle alle Animation-Clips
  const allClips = useMemo(() => {
    const clips: THREE.AnimationClip[] = [];
    
    const addClips = (gltf: any, prefix: string) => {
      gltf.animations.forEach((clip: THREE.AnimationClip, i: number) => {
        const renamed = clip.clone();
        renamed.name = `${prefix}_${i}`;
        clips.push(renamed);
      });
    };
    
    addClips(idleGltf, 'idle');
    addClips(dance01Gltf, 'dance_01');
    addClips(dance02Gltf, 'dance_02');
    addClips(dance03Gltf, 'dance_03');
    addClips(missGltf, 'miss');
    addClips(grooveGltf, 'groove');
    
    return clips;
  }, []);
  
  const { actions, mixer } = useAnimations(allClips, group);
  
  // Animation wechseln basierend auf danceState + intensity
  useEffect(() => {
    if (!mixer || !actions) return;
    
    // Stoppe alle laufenden Animationen sanft
    Object.values(actions).forEach(action => {
      if (action) action.fadeOut(0.3);
    });
    
    let targetClipName: string;
    
    if (danceState === 'miss') {
      targetClipName = 'miss_0';
    } else if (danceState === 'dancing') {
      if (intensity >= 2.5) targetClipName = 'dance_03_0';
      else if (intensity >= 1.5) targetClipName = 'dance_02_0';
      else targetClipName = 'dance_01_0';
    } else {
      targetClipName = 'idle_0';
    }
    
    const targetAction = actions[targetClipName];
    if (targetAction) {
      targetAction.reset().fadeIn(0.3).play();
      // Passe Geschwindigkeit an BPM an (Basis-BPM der Animation: ~120)
      targetAction.timeScale = bpm / 120;
    }
  }, [danceState, intensity, bpm, actions, mixer]);
  
  // Schatten aktivieren
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);
  
  return (
    <group ref={group}>
      <primitive object={scene} position={[0, -1, 0]} scale={1.2} />
    </group>
  );
}

// Haupt-Export-Komponente
interface AnimatedAvatarProps {
  modelUrl?: string | null;
  danceState: 'idle' | 'dancing' | 'miss';
  intensity: number;
  bpm?: number;
  enableControls?: boolean;
}

export function AnimatedAvatar({ 
  modelUrl, 
  danceState, 
  intensity, 
  bpm = 120,
  enableControls = true 
}: AnimatedAvatarProps) {
  const finalUrl = modelUrl || '/models/placeholder.glb';
  
  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <Canvas shadows camera={{ position: [0, 1.8, 3.8], fov: 40 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[-5, 5, -5]} intensity={0.5} color="cyan" />
          <spotLight position={[5, 5, -5]} intensity={0.5} color="magenta" />
          <Environment preset="city" />
          
          <AvatarModel 
            modelUrl={finalUrl} 
            danceState={danceState} 
            intensity={intensity} 
            bpm={bpm} 
          />
          
          <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={10} blur={2} far={4} />
          
          {enableControls && (
            <OrbitControls 
              enablePan={false} 
              maxPolarAngle={Math.PI / 1.8} 
              minDistance={2} 
              maxDistance={8} 
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
```

#### 1.3 — Bestehende Komponenten migrieren

Ersetze in **Game.tsx** alle Referenzen zu `Avatar3D` und `PlayerAvatar` durch `AnimatedAvatar`:

```tsx
// ALT:
import { Avatar3D } from './Avatar3D';
import { PlayerAvatar } from './PlayerAvatar';

// NEU:
import { AnimatedAvatar } from './AnimatedAvatar';
```

Ersetze im JSX:
```tsx
// ALT:
{profile.rpm_url ? (
  <PlayerAvatar modelUrl={profile.rpm_url} danceState={avatarDance} intensity={intensity} bpm={currentSong.bpm || 120} />
) : (
  <Avatar3D jacket={profile.jacket} pants={profile.pants} shoes={profile.shoes} danceState={avatarDance} intensity={intensity} bpm={currentSong.bpm || 120} />
)}

// NEU:
<AnimatedAvatar 
  modelUrl={profile.rpm_url} 
  danceState={avatarDance} 
  intensity={intensity} 
  bpm={currentSong?.bpm || 120}
  enableControls={false}
/>
```

Mache dasselbe in **LockerRoom.tsx** und überall wo `Avatar3D` oder `PlayerAvatar` genutzt wird.

**Avatar3D.tsx und PlayerAvatar.tsx können danach gelöscht werden.**

---

## PHASE 2: Audition-Gameplay-Modi

### Ziel
Mindestens 3 Gameplay-Modi implementieren, die dem Original-Audition entsprechen.

### 2.1 — Game-Mode-Architektur

Erstelle `src/types/gameTypes.ts`:
```typescript
export type GameMode = 'beat_up' | 'beat_rush' | 'freestyle' | 'club_dance';

export interface GameModeConfig {
  id: GameMode;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind gradient
  minPlayers: number;
  maxPlayers: number;
}

export const GAME_MODES: GameModeConfig[] = [
  {
    id: 'beat_up',
    name: 'Beat Up',
    description: 'Pfeiltasten im Takt drücken. Klassischer Audition-Modus.',
    icon: 'Zap',
    color: 'from-cyan-500 to-blue-600',
    minPlayers: 1,
    maxPlayers: 8,
  },
  {
    id: 'beat_rush',
    name: 'Beat Rush',
    description: 'Schnelle Pfeile fallen runter — reagiere so schnell wie möglich!',
    icon: 'ArrowDown',
    color: 'from-pink-500 to-purple-600',
    minPlayers: 1,
    maxPlayers: 8,
  },
  {
    id: 'freestyle',
    name: 'Freestyle',
    description: 'Erfinde eigene Pfeil-Kombos für Extrapunkte.',
    icon: 'Sparkles',
    color: 'from-yellow-400 to-orange-500',
    minPlayers: 1,
    maxPlayers: 8,
  },
  {
    id: 'club_dance',
    name: 'Club Dance',
    description: 'Kooperativer Modus — tanzt zusammen synchron!',
    icon: 'Users',
    color: 'from-green-400 to-emerald-600',
    minPlayers: 2,
    maxPlayers: 8,
  },
];
```

### 2.2 — Beat-Up-Modus (Haupt-Modus wie Audition)

Erstelle `src/components/modes/BeatUpMode.tsx`:

**Spielmechanik:**
1. Eine Reihe von Pfeilen (4-8 Stück, steigend mit Level/Runde) wird angezeigt
2. Der Spieler muss die Pfeile in der richtigen Reihenfolge eingeben
3. Nach korrekter Eingabe: Spacebar im richtigen Moment drücken (SyncBar)
4. Je besser das Timing, desto besser die Wertung: Perfect > Great > Cool > Bad > Miss
5. Bei Miss: Combo zurücksetzen, neue Sequenz generieren
6. Jede Runde steigt die Schwierigkeit (mehr Pfeile, schnelleres Tempo)

**Das ist im Grunde der bestehende Modus** — aber verbessere ihn:
- Zeige die Pfeile in einer schönen Audition-artigen Box an (nicht nur als Icons)
- Füge "Finish Move" hinzu: Nach jeder 4. erfolgreichen Runde kommt ein spezieller langer Move (8-12 Pfeile) für Bonus-EXP
- Zeige Buchstaben-Bewertungen nach jeder Runde (S, A, B, C, D, F)
- Jede Runde hat 4 Levels: Level 4 → Level 8 → Freestyle → Finish Move

### 2.3 — Beat-Rush-Modus (DDR/StepMania-Stil)

Erstelle `src/components/modes/BeatRushMode.tsx`:

**Spielmechanik:**
1. 4 Spalten (←↑↓→) am unteren Bildschirmrand
2. Pfeile fallen von oben nach unten zum Beat der Musik
3. Spieler drückt die richtige Pfeiltaste, wenn der Pfeil die Trefferzone erreicht
4. Timing-Fenster: Perfect (±30ms), Great (±60ms), Cool (±100ms), Bad (±150ms), Miss
5. Pfeile werden automatisch aus dem BPM generiert (nutze den bestehenden BeatScheduler)
6. Optional: Hold-Notes (Pfeil gedrückt halten für Sustain-Sounds)

**Implementierung:**
- Nutze die bestehende `AudioAnalyzer` Klasse aus `utils/audio.ts` für automatisches Beat-Mapping
- Rendere Pfeile als `motion.div`-Elemente, die von oben nach unten animieren
- Trefferzone am unteren Rand mit Glow-Effekt
- Zeige den 3D-Avatar im Hintergrund der Spalten

### 2.4 — Freestyle-Modus

Erstelle `src/components/modes/FreestyleMode.tsx`:

**Spielmechanik:**
1. Kein vorgegebenes Pfeil-Pattern
2. Der Spieler drückt beliebige Pfeiltasten zum Beat
3. Punkte basieren auf: Timing zum Beat, Komplexität der Kombination, Wiederholung vermeiden
4. Je mehr verschiedene Pfeile in einer Kombo, desto mehr Punkte
5. Am Ende bewertet eine "Jury" (Algorithmus) die Performance

### 2.5 — Mode-Auswahl-Screen

Erstelle `src/components/ModeSelect.tsx`:
- Zeige alle Modi als große Cards mit Icons und Beschreibungen
- Farbcodiert nach Schwierigkeit
- Zeige an, welche Modi Multiplayer unterstützen
- Nach Auswahl: Weiterleitung zu Playlist-Auswahl, dann Spiel

### 2.6 — Game.tsx Refactoring

Refaktoriere `Game.tsx` als Controller-Komponente, die basierend auf `mode` den richtigen Modus lädt:

```tsx
function Game({ mode, ...props }) {
  switch (mode) {
    case 'beat_up': return <BeatUpMode {...props} />;
    case 'beat_rush': return <BeatRushMode {...props} />;
    case 'freestyle': return <FreestyleMode {...props} />;
    case 'club_dance': return <ClubDanceMode {...props} />;
    default: return <BeatUpMode {...props} />;
  }
}
```

---

## PHASE 3: Audition-UI/UX Design

### Ziel
Das UI vom "Industrial OS"-Theme zu einem farbenfrohen, Anime/K-Pop-inspirierten Audition-Look umbauen.

### 3.1 — Farbpalette ändern

Audition Online hatte ein lebhaftes, fröhliches Design. Ändere die Farbpalette:

```css
/* Von: Dunkles Industrial (Cyan/Grau/Schwarz) */
/* Zu: Fröhliches Audition (Pink/Lila/Blau/Gelb auf dunklem Hintergrund) */

:root {
  --audition-pink: #ff69b4;
  --audition-purple: #9b59b6;
  --audition-blue: #3498db;
  --audition-gold: #f1c40f;
  --audition-bg: #1a0a2e;
  --audition-bg-light: #2d1b4e;
}
```

### 3.2 — Hauptmenü redesignen

Das Menü in `App.tsx` soll aussehen wie eine **Audition-Lobby**:
- Großer animierter Titel "AUDITION" mit Glow-Effekt
- Avatar des Spielers in der Mitte (tanzend)
- Menü-Buttons um den Avatar herum angeordnet
- Laufende Nachrichten-Ticker am unteren Rand ("Willkommen bei Audition! Server: EU-West")
- Online-Spieler-Zähler
- Notifikations-Badge für neue Items

### 3.3 — Audition-typische HUD-Elemente

Während des Spiels:
- **Combo-Anzeige** oben mittig mit flammendem Effekt bei hoher Combo
- **Score** rechts oben im Audition-Font (große Zahlen mit Leuchteffekt)
- **HP/Leben-Bar** (optional) — bei Audition hat man begrenzte Misses
- **Rang-Anzeige** (S/A/B/C/D/F) die sich live aktualisiert
- **BPM-Anzeige** links unten
- **Tanzflächen-Hintergrund**: Animierter Disco-Floor unter dem Avatar

### 3.4 — Audition Lobby-Raum-Design

Das Multiplayer-Lobby-Design in `MultiplayerLobby.tsx`:
- **Raum-System**: Spieler sehen eine Liste von offenen Räumen (nicht nur Code eingeben)
- Jeder Raum zeigt: Raum-Name, Host, Spieler-Anzahl, Modus, Song/Playlist
- DJ-System: Der Host wählt den Song und den Modus
- Alle Spieler sehen ihre Avatare im "Wartezimmer" tanzen (idle animation)
- Ready-Check: Alle müssen "Bereit" klicken bevor das Spiel startet

---

## PHASE 4: In-Game-Ökonomie & Fashion Shop

### 4.1 — Währungssystem

Erweitere das `profiles`-Schema um `coins`:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 500;
```

Coins verdienen durch:
- Spiel beenden: 50-200 Coins basierend auf Score
- Daily Login Bonus: 100 Coins
- Combo-Milestone: 500 Coins bei 100er Combo
- Multiplayer-Sieg: 300 Bonus-Coins

### 4.2 — Fashion Shop

Erstelle `src/components/Shop.tsx`:

```typescript
interface ShopItem {
  id: string;
  name: string;
  type: 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory' | 'dance_move';
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  preview_image?: string;
  mesh_name?: string; // Für 3D-Items
  required_level: number;
}
```

**Shop-Kategorien (wie im Original):**
- Haare & Gesicht
- Oberteile
- Hosen & Röcke
- Schuhe
- Accessoires (Brillen, Hüte, Flügel)
- Tanz-Moves (kaufbare neue Animationen!)

**UI:**
- Tab-basierte Navigation nach Kategorie
- Items in einem Grid mit Rarity-Border (Common=Grau, Rare=Blau, Epic=Lila, Legendary=Gold)
- Kauf-Button mit Coin-Preis
- "Anprobieren"-Preview: Avatar rechts, Items links
- Inventar-Tab um gekaufte Items zu verwalten

### 4.3 — Supabase Schema erweitern

```sql
-- Shop-Items Katalog
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hair','top','bottom','shoes','accessory','dance_move')),
  price INTEGER NOT NULL DEFAULT 100,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  mesh_name TEXT,
  preview_url TEXT,
  required_level INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User-Inventar (existiert schon, erweitern)
-- user_inventory Tabelle wie bisher, aber sicherstellen:
-- user_id, item_id (FK -> shop_items), is_equipped, purchased_at

-- Transaktions-Log
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## PHASE 5: Social Features

### 5.1 — Freundesliste

Erstelle `src/components/FriendsList.tsx`:

```sql
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
```

**Features:**
- Freundesanfragen senden/annehmen/ablehnen
- Online-Status sehen (Supabase Presence)
- Freund zum Spiel einladen
- Freund's Profil anschauen

### 5.2 — In-Game-Chat

Erstelle `src/components/Chat.tsx`:

Nutze Supabase Realtime Broadcast:
```typescript
// Chat-Nachricht senden
channel.send({
  type: 'broadcast',
  event: 'chat_message',
  payload: { userId, username, message, timestamp: Date.now() }
});
```

**Features:**
- Lobby-Chat (im Warteraum)
- Global-Chat (im Hauptmenü)
- Emotes/Sticker (vordefinierte Animationen/Bilder)
- Chat-Filter für unangemessene Inhalte

### 5.3 — Crews / Gilden

```sql
CREATE TABLE IF NOT EXISTS crews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  leader_id UUID REFERENCES profiles(id),
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crew_members (
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('leader','officer','member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);
```

### 5.4 — Spieler-Profil-Seite

Erstelle `src/components/PlayerProfile.tsx`:
- 3D-Avatar-Preview (tanzend)
- Statistiken: Spiele gespielt, Win-Rate, Highest Combo, Lieblings-Song
- Ausrüstung/Outfit-Showcase
- Crew-Zugehörigkeit
- Errungenschaften/Badges

---

## PHASE 6: Lobby & Raum-System (Audition-Style)

### 6.1 — Raum-Browser

Ersetze die aktuelle `MultiplayerLobby.tsx` durch ein **Channel-basiertes Raum-System**:

Erstelle `src/components/RoomBrowser.tsx`:

```typescript
interface GameRoom {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  host_name: string;
  mode: GameMode;
  max_players: number;
  current_players: number;
  is_playing: boolean;
  is_locked: boolean;
  playlist_name?: string;
  created_at: string;
}
```

**UI:**
- Liste aller offenen Räume als Tabelle
- Spalten: Raum-Name, Modus, Spieler (3/8), Status (Wartend/Spielend), Host
- Filter nach Modus
- "Schnelles Spiel"-Button (Auto-Join in passenden Raum)
- "Raum erstellen"-Button

### 6.2 — Raum-Wartebildschirm

Wenn man einem Raum beitritt:
- Alle Spieler-Avatare stehen auf einer virtuellen Bühne (idle animation)
- DJ (Host) hat spezielle Kontrollen: Song wählen, Modus ändern, Spieler kicken
- Jeder Spieler kann "Bereit" / "Nicht bereit" umschalten
- Chat-Box am rechten Rand
- Wenn alle bereit: Countdown und Spiel startet

---

## PHASE 7: Audio & Beat-System verbessern

### 7.1 — Besseres Beat-Mapping

Der aktuelle BPM-Wert wird manuell in der Playlist gesetzt. Verbessere das:

1. **Auto-BPM-Detection**: Nutze die bestehende `AudioAnalyzer`-Klasse, aber verbessere sie:
   - Analysiere die ersten 10 Sekunden des YouTube-Videos
   - Erkenne automatisch den BPM-Wert
   - Nutze den erkannten BPM für das Gameplay

2. **Tap-BPM als Fallback**: Der bestehende `TapBPMDetector` ist gut — zeige in der Playlist-Verwaltung einen "BPM antippen"-Button

### 7.2 — Sound-Effekte erweitern

Erweitere `SoundEngine` in `utils/audio.ts`:
- Verschiedene Hit-Sounds pro Bewertung (Perfect = Chime, Great = Pling, etc.)
- Crowd-Applaus bei hohen Combos
- "Level Up"-Sound
- Countdown-Sounds (3, 2, 1, GO!)
- Nutze kurze AudioBuffer (base64-encoded) statt nur Oszillatoren

---

## PHASE 8: Erweiterte Features

### 8.1 — Errungenschafts-System

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  required_value INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID REFERENCES profiles(id),
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
```

Beispiel-Achievements:
- "Erster Tanz" — Erstes Spiel abgeschlossen
- "Combo-König" — 50er Combo erreicht
- "Perfektionist" — 10 Perfects hintereinander
- "Fashionista" — 20 Items gekauft
- "Social Butterfly" — 10 Freunde hinzugefügt

### 8.2 — Globale Rangliste

```sql
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  total_score BIGINT DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  highest_combo INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Erstelle `src/components/Leaderboard.tsx`:
- Top 100 Spieler
- Filter: Wöchentlich / Monatlich / Alle Zeit
- Eigene Position hervorgehoben
- Avatar-Preview neben dem Namen

### 8.3 — Daily Login Rewards

Erstelle eine tägliche Belohnungs-Mechanik:
- Tag 1: 100 Coins
- Tag 2: 150 Coins
- Tag 3: 200 Coins + Random Item
- Tag 7: 500 Coins + Rare Item
- Streak-Counter mit Reset bei Unterbrechung

---

## Allgemeine Regeln für die Implementierung

1. **Sprache**: Alle UI-Texte auf **Deutsch** (wie im Original-Projekt)
2. **TypeScript**: Strenge Typisierung, keine `any` außer wo unvermeidbar
3. **Komponenten-Größe**: Maximal 300 Zeilen pro Komponente. Bei mehr: aufteilen
4. **State-Management**: React State + Supabase. Kein Redux, kein Zustand
5. **Styling**: Nur Tailwind 4 Utility-Classes. Keine CSS-Module, kein styled-components
6. **Animationen**: `motion` (framer-motion) für UI, Three.js für 3D
7. **Error Handling**: Alle Supabase-Calls in try/catch mit User-freundlichen Fehlermeldungen
8. **Mobile**: Responsive Design. Touch-Support für alle Spielmodi
9. **Performance**: `React.memo`, `useMemo`, `useCallback` wo sinnvoll. GLB-Dateien preloaden
10. **Datei-Benennung**: PascalCase für Komponenten, camelCase für Utils/Hooks

---

## Reihenfolge der Implementierung

Arbeite strikt in dieser Reihenfolge. Jede Phase muss funktionieren bevor du zur nächsten gehst:

1. **PHASE 1** — AnimatedAvatar + Animationen (ersetzt Avatar3D + PlayerAvatar)
2. **PHASE 2** — Beat-Up und Beat-Rush Modi
3. **PHASE 3** — UI/UX Redesign (Audition-Look)
4. **PHASE 4** — Coins + Fashion Shop
5. **PHASE 5** — Freundesliste + Chat
6. **PHASE 6** — Raum-Browser + DJ-System
7. **PHASE 7** — Audio-Verbesserungen
8. **PHASE 8** — Achievements + Leaderboard + Daily Rewards

---

## Bekannte Abhängigkeiten (package.json)

Bereits installiert:
```json
{
  "@react-three/drei": "^10.7.7",
  "@react-three/fiber": "^9.5.0",
  "@readyplayerme/react-avatar-creator": "^0.5.0",
  "@supabase/supabase-js": "^2.100.1",
  "lucide-react": "^0.546.0",
  "motion": "^12.23.24",
  "react": "^19.0.0",
  "react-youtube": "^10.1.0",
  "three": "^0.183.2"
}
```

Eventuell zusätzlich nötig:
```bash
npm install @readyplayerme/visage   # Optional: Fertige RPM Avatar-Komponente
```

---

## Supabase RLS (Row Level Security)

Stelle sicher, dass alle neuen Tabellen RLS-Policies haben:

```sql
-- Beispiel für shop_items (jeder kann lesen, nur Admin kann schreiben)
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop items sichtbar für alle" ON shop_items FOR SELECT USING (true);

-- user_inventory (nur eigene Items sehen/bearbeiten)
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigenes Inventar sehen" ON user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Eigenes Inventar bearbeiten" ON user_inventory FOR ALL USING (auth.uid() = user_id);

-- Ähnlich für friendships, crew_members, etc.
```

---

## WICHTIGER HINWEIS ZU ANIMATIONS-DATEIEN

Die GLB-Animations-Dateien von der Ready Player Me Animation Library müssen einmalig konvertiert und in `/public/animations/` platziert werden. Der Entwickler wird das manuell machen. Im Code kannst du davon ausgehen, dass diese Dateien da sind:

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

Falls eine Animation fehlt, soll die Komponente graceful auf den prozeduralen Fallback zurückfallen (mathematische Bone-Rotation wie aktuell in Avatar3D.tsx).

---

## Ende des Prompts

Beginne mit Phase 1 und arbeite dich durch alle Phasen. Teste nach jeder Phase, dass alles funktioniert. Frage bei Unklarheiten nach, anstatt Annahmen zu treffen.
