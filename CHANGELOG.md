# Changelog

Alle wichtigen Aenderungen am Projekt werden hier dokumentiert.

---

## [2.0.0] - 2026-03-30

### Multiplayer-Redesign

- **20 feste Raeume** (5 pro Spielmodus) ersetzen die dynamische Raumliste — Raeume existieren immer und werden nie geloescht
- **Private Raeume** koennen weiterhin erstellt werden — Code wird an Freunde weitergegeben, Raeume erscheinen nicht in der Liste
- **Presence-basiertes Leader-System** — der am laengsten anwesende Spieler ist Leader, keine Datenbank-Abhaengigkeit
- **Live-Join** — laufendem Spiel beitreten ohne Countdown, Musik wird automatisch zur aktuellen Position synchronisiert
- **YouTube-Raum-Sync** — der Raum hat einen `gameStartedAt`-Timestamp, alle Spieler berechnen ihre Seek-Position daraus
- **Drift-Korrektur** — nach YouTube-Buffering wird die Position automatisch nachkorrigiert (bei >2s Abweichung)
- **Score-Persistenz** — Score, Combo, HitCounts und Runde werden in `sessionStorage` gespeichert und beim Rejoin wiederhergestellt
- **Spieler-Announce-System** — beim Beitreten broadcasten alle Spieler ihren Status, damit neue Spieler alle Avatare sofort sehen
- **Raum-Status in der Lobby** — jeder Raum zeigt Spieleranzahl und ob gerade gespielt wird
- **Kein STARTEN-Button im Multiplayer** — Countdown startet automatisch und gleichzeitig fuer alle
- **Song-Fixierung** — wenn der Leader einen Song ausgewaehlt hat und das Spiel laeuft, kann der Song nicht mehr geaendert werden

### Freundesliste

- **Freunde-Suche repariert** — neuer `search_profiles` RPC umgeht RLS-Einschraenkungen
- **Rechtsklick-Kontextmenue** — in der Lobby auf Online-Spieler rechtsklicken zum Hinzufuegen als Freund
- **Duplikat-Pruefung** — Freundschaftsanfragen in beide Richtungen werden geprueft
- **Fehlende DELETE-Policy** fuer Friendships hinzugefuegt
- **Gastmodus-Erkennung** — Gaeste sehen einen Hinweis statt kaputter Funktionen
- **Lade-Status und Fehlermeldungen** — Suche zeigt Spinner, leere Ergebnisse und Fehler an

### Bug-Fixes (Kritisch)

- **Memory Leak in SyncBar** — `requestAnimationFrame`-Loops akkumulierten bei BPM-Wechsel, jetzt mit Cancelled-Flag und sauberem Cleanup
- **Race Condition in BeatRushMode** — Cleanup-Interval und Keyboard-Handler konnten gleichzeitig auf Pfeile zugreifen (Geister-Misses, Doppel-Scoring). Geloest mit `hitIdsRef` Set
- **GPU-Speicherleck in AnimatedAvatar** — geklonte Three.js-Materials wurden nie disposed, jetzt mit useEffect-Cleanup
- **Supabase Channel-Leaks** — `unsubscribe()` wird jetzt vor `removeChannel()` aufgerufen in MultiplayerLobby und Chat
- **Stille Fehler in Economy** — 10 leere `.then(() => {}, () => {})` Error-Handler durch `console.warn` ersetzt
- **setState waehrend Render** — `onMiss()` wurde innerhalb von `setArrows()` aufgerufen (BeatRushMode), jetzt mit Ref-Zaehler ausserhalb
- **Spiel steckt fest nach Ende** — `handleGameEnd` war async mit `await`-Calls, DB-Updates sind jetzt fire-and-forget, Navigation erfolgt sofort
- **Daily Rewards Exploit** — serverseitige Validierung via `claim_daily_reward` RPC-Funktion, Fallback auf Client-Logik wenn RPC nicht verfuegbar
- **Economy Math.max Exploit** — `syncWalletFromServer` verwendet jetzt Server als Quelle der Wahrheit statt `Math.max(local, server)`
- **Auto-Start Race Condition** — nur der Host triggert DB-Update und Broadcast, nicht alle Clients gleichzeitig

### Bug-Fixes (Hoch)

- **Pfeiltasten scrollen Seite** — `e.preventDefault()` in BeatUpMode hinzugefuegt
- **Score-Broadcast Spam** — 100ms Debounce auf Score-Broadcasts in Game.tsx
- **Auth Race Condition** — `authInitializing` Guard verhindert parallele Wallet/Profil-Loads
- **Error Boundary** — faengt React-Render-Fehler ab, zeigt "Neu laden"-Button
- **Leaderboard-Zeitfilter** — funktionierte nicht (Query ignorierte den Filter), jetzt mit `updated_at`-Filter und Race-Condition-Schutz
- **Presence-Crash** — Null-Checks auf Presence-Arrays verhindern Crash bei fehlerhaften Daten
- **Host-Lookup Race Condition** — `hostLookupDone` wird erst nach erfolgreichem Lookup gesetzt, Retry bei Fehler
- **Doppelter Zurueck-Button** — globaler Zurueck-Button in App.tsx ueberlagerte Lobby nicht mehr

### Bug-Fixes (Mittel)

- **SyncBar Target Mismatch** — visuelle Position (90%) und Logik (90%) synchronisiert
- **FreestyleMode Scoring** — Variety-Multiplier-Logik war kontraintuitiv, jetzt: Wechsel = 1.2x sofort, Wiederholung = progressive Strafe
- **Wardrobe leeres Array** — `.in()` Query mit leerem Array abgefangen, Error-Handling + Rollback bei Fehler
- **Audio Source Leak** — `source.disconnect()` in AudioAnalyzer.destroy(), 5s Timeout auf getDisplayMedia
- **Animation Loading** — Error-Logging bei GLB-Ladefehler, 5s Timeout auf HEAD-Requests
- **PlayerProfile Async** — `mountedRef` + userId-Guard gegen veraltete Ergebnisse nach Unmount
- **WalletView Loading** — Lade-Spinner und defensive Earnings-Rate-Berechnung
- **Chat Duplikate** — Nachrichten-Deduplizierung verhindert doppelte Anzeige
- **Video Interval Leak** — Ref-basiertes Cleanup auch bei Component-Unmount
- **Error Timeout Stack** — vorherigen Timeout clearen bevor neuer gesetzt wird (BeatUpMode)
- **DailyRewards dynamischer Import** — unnoetige `import()` durch Top-Level-Import ersetzt
- **Button-in-Button** — HTML-Fehler im Song-Picker behoben (`<button>` zu `<div>` geaendert)

### Supabase-Fixes

- **Leaderboard Spaltenname** — `created_at` zu `updated_at` korrigiert (Spalte existierte nicht)
- **daily_login_json Typ** — TEXT zu JSONB konvertiert (RPC-Funktion brauchte JSONB-Operatoren)
- **Fehlende Leaderboard-Spalte** — `username` Spalte hinzugefuegt
- **RLS-Policies** — fehlende Policies fuer playlists, playlist_songs, items, user_inventory hinzugefuegt
- **Performance-Indexes** — 9 Indexes auf haeufig abgefragte Spalten (profiles, leaderboard, friendships, etc.)
- **YouTube-Validierung** — kaputte Video-Links werden vor Spielstart via noembed.com gefiltert

### Neue Migrationen

- `004_claim_daily_reward_rpc.sql` — Serverseitige Daily-Reward-Validierung
- `005_missing_tables_and_indexes.sql` — Schema-Fixes und Performance-Indexes
- `006_friends_search_and_delete.sql` — Freunde-Suche RPC und fehlende DELETE-Policy

---

## [1.0.0] - 2026-03-29

### Initiale Audition-Transformation

- Komplette Transformation von TubeDance zu Audition Online Klon
- 3 Spielmodi: Beat Up, Beat Rush, Freestyle
- Multiplayer mit Supabase Realtime
- Economy-System mit Beats-Waehrung und Fashion Shop
- 3D-Avatar-System mit Ready Player Me Integration
- Daily Rewards, Achievements, Leaderboard
- Rollen-System (User, Supporter, Moderator, Gamemaster, Admin)
- Echtzeit-Chat mit Emotes
