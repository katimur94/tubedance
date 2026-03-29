/**
 * AnimationSystem — Zentrales Tanzanimationssystem für TubeDance
 * 
 * Lädt GLB-Animationsdateien, verwaltet AnimationMixer pro Avatar,
 * und bietet smooth Crossfading zwischen Tanz-States.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Animation Registry ─────────────────────────────────────────────
export type DanceStyle = 'idle' | 'dance_basic' | 'dance_hiphop' | 'dance_breakdance' | 'dance_freestyle' | 'miss';

export interface AnimationEntry {
  name: DanceStyle;
  path: string;
  clip: THREE.AnimationClip | null;
  loaded: boolean;
  loading: boolean;
}

// Die Pfade zu den Animationsdateien – werden bei Verfügbarkeit geladen
const ANIMATION_PATHS: Record<DanceStyle, string> = {
  idle: '/animations/idle.glb',
  dance_basic: '/animations/dance_basic.glb',
  dance_hiphop: '/animations/dance_hiphop.glb',
  dance_breakdance: '/animations/dance_breakdance.glb',
  dance_freestyle: '/animations/dance_freestyle.glb',
  miss: '/animations/miss.glb',
};

// ─── Singleton Animation Cache ──────────────────────────────────────
class AnimationCache {
  private static instance: AnimationCache;
  private cache: Map<DanceStyle, THREE.AnimationClip> = new Map();
  private loadPromises: Map<DanceStyle, Promise<THREE.AnimationClip | null>> = new Map();
  private loader: GLTFLoader;
  private availabilityChecked = false;
  private availableAnimations: Set<DanceStyle> = new Set();

  private constructor() {
    this.loader = new GLTFLoader();
  }

  static getInstance(): AnimationCache {
    if (!AnimationCache.instance) {
      AnimationCache.instance = new AnimationCache();
    }
    return AnimationCache.instance;
  }

  /**
   * Prüfe welche Animationsdateien tatsächlich auf dem Server vorhanden sind
   */
  async checkAvailability(): Promise<Set<DanceStyle>> {
    if (this.availabilityChecked) return this.availableAnimations;

    const checks = Object.entries(ANIMATION_PATHS).map(async ([style, path]) => {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        if (response.ok) {
          this.availableAnimations.add(style as DanceStyle);
        }
      } catch {
        // File not available – das ist OK
      }
    });

    await Promise.all(checks);
    this.availabilityChecked = true;

    if (this.availableAnimations.size === 0) {
      console.info(
        '%c[AnimationSystem] Keine Animationsdateien gefunden in /animations/. Nutze prozeduralen Fallback.',
        'color: #fbbf24; font-weight: bold;'
      );
      console.info(
        '%c[AnimationSystem] Lade Mixamo-Animationen als GLB herunter und speichere sie in public/animations/',
        'color: #a78bfa;'
      );
    } else {
      console.info(
        `%c[AnimationSystem] ${this.availableAnimations.size} Animationen verfügbar: ${[...this.availableAnimations].join(', ')}`,
        'color: #22d3ee; font-weight: bold;'
      );
    }

    return this.availableAnimations;
  }

  /**
   * Lade eine einzelne Animation aus einer GLB-Datei
   */
  async loadAnimation(style: DanceStyle): Promise<THREE.AnimationClip | null> {
    // Schon im Cache?
    if (this.cache.has(style)) {
      return this.cache.get(style)!;
    }

    // Schon am Laden?
    if (this.loadPromises.has(style)) {
      return this.loadPromises.get(style)!;
    }

    const path = ANIMATION_PATHS[style];

    const promise = new Promise<THREE.AnimationClip | null>((resolve) => {
      this.loader.load(
        path,
        (gltf) => {
          if (gltf.animations && gltf.animations.length > 0) {
            const clip = gltf.animations[0];
            clip.name = style; // Benenne den Clip einheitlich
            this.cache.set(style, clip);
            console.info(`%c[AnimationSystem] ✅ "${style}" geladen (${clip.duration.toFixed(1)}s)`, 'color: #4ade80;');
            resolve(clip);
          } else {
            console.warn(`[AnimationSystem] ⚠️ "${path}" enthält keine Animationen`);
            resolve(null);
          }
        },
        undefined,
        () => {
          // Kein Error-Log nötig – wird bei Availability-Check schon geprüft
          resolve(null);
        }
      );
    });

    this.loadPromises.set(style, promise);
    return promise;
  }

  /**
   * Lade alle verfügbaren Animationen parallel
   */
  async loadAllAvailable(): Promise<Map<DanceStyle, THREE.AnimationClip>> {
    const available = await this.checkAvailability();
    const loadPromises = [...available].map((style) => this.loadAnimation(style));
    await Promise.all(loadPromises);
    return this.cache;
  }

  getClip(style: DanceStyle): THREE.AnimationClip | null {
    return this.cache.get(style) || null;
  }

  hasAnyAnimations(): boolean {
    return this.cache.size > 0;
  }

  getAvailableStyles(): DanceStyle[] {
    return [...this.cache.keys()];
  }
}

// ─── Avatar Animation Controller ────────────────────────────────────
export class AvatarAnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Map<DanceStyle, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private currentStyle: DanceStyle | null = null;
  private crossFadeDuration = 0.35;
  private clock: THREE.Clock;

  constructor(root: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(root);
    this.clock = new THREE.Clock();
  }

  /**
   * Registriere einen AnimationClip für diesen Avatar
   */
  addClip(style: DanceStyle, clip: THREE.AnimationClip) {
    const action = this.mixer.clipAction(clip);
    
    // Standardmäßig Loop
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;

    // Miss-Animation nur einmal abspielen und halten
    if (style === 'miss') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    this.actions.set(style, action);
  }

  /**
   * Spiele eine Animation mit smooth Crossfade
   */
  play(style: DanceStyle, timeScale: number = 1) {
    const action = this.actions.get(style);
    if (!action) return;

    // Gleiche Animation? Nur Speed updaten
    if (this.currentStyle === style && this.currentAction) {
      this.currentAction.timeScale = timeScale;
      return;
    }

    // Crossfade von alter zu neuer Animation
    if (this.currentAction) {
      action.reset();
      action.timeScale = timeScale;
      action.play();
      this.currentAction.crossFadeTo(action, this.crossFadeDuration, true);
    } else {
      action.reset();
      action.timeScale = timeScale;
      action.play();
    }

    this.currentAction = action;
    this.currentStyle = style;
  }

  /**
   * Stoppe alle Animationen
   */
  stop() {
    this.mixer.stopAllAction();
    this.currentAction = null;
    this.currentStyle = null;
  }

  /**
   * Update den Mixer (muss in useFrame aufgerufen werden)
   */
  update(delta: number) {
    this.mixer.update(delta);
  }

  /**
   * Setze die Animations-Geschwindigkeit (für BPM-Sync)
   */
  setTimeScale(scale: number) {
    if (this.currentAction) {
      this.currentAction.timeScale = scale;
    }
  }

  /**
   * Welche Tanz-Animation basierend auf Intensität wählen
   */
  static chooseDanceStyle(intensity: number, availableStyles: DanceStyle[]): DanceStyle {
    const danceStyles = availableStyles.filter(s => s.startsWith('dance_'));
    
    if (danceStyles.length === 0) return 'dance_basic';
    
    if (intensity >= 2.5 && danceStyles.includes('dance_breakdance')) {
      return 'dance_breakdance';
    } else if (intensity >= 2.0 && danceStyles.includes('dance_freestyle')) {
      return 'dance_freestyle';
    } else if (intensity >= 1.5 && danceStyles.includes('dance_hiphop')) {
      return 'dance_hiphop';
    } else {
      return danceStyles.includes('dance_basic') ? 'dance_basic' : danceStyles[0];
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.actions.clear();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}

// ─── Exports ────────────────────────────────────────────────────────
export const animationCache = AnimationCache.getInstance();
export { ANIMATION_PATHS };
