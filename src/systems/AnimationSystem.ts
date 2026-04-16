/**
 * AnimationSystem — Tanz-Animationen für Audition Online
 *
 * Lädt FBX-Tanz-Animationen (Ready Player Me / Mixamo) und wendet sie
 * auf beliebige Humanoid-Skelette an (VRM, RPM, GLB).
 *
 * 11 echte Motion-Capture Tanz-Animationen:
 * dance_01 bis dance_10 + dance_samba
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Retargeting: Mixamo/RPM bone names → VRM bone names ───────────
// FBX animations use Mixamo names, VRM models use J_Bip_* names.
// We try BOTH: original name first, then retargeted name.
const MIXAMO_TO_VRM: Record<string, string> = {
  'Hips': 'J_Bip_C_Hips',
  'Spine': 'J_Bip_C_Spine',
  'Spine1': 'J_Bip_C_Chest',
  'Spine2': 'J_Bip_C_UpperChest',
  'Neck': 'J_Bip_C_Neck',
  'Head': 'J_Bip_C_Head',
  'LeftShoulder': 'J_Bip_L_Shoulder',
  'LeftArm': 'J_Bip_L_UpperArm',
  'LeftForeArm': 'J_Bip_L_LowerArm',
  'LeftHand': 'J_Bip_L_Hand',
  'RightShoulder': 'J_Bip_R_Shoulder',
  'RightArm': 'J_Bip_R_UpperArm',
  'RightForeArm': 'J_Bip_R_LowerArm',
  'RightHand': 'J_Bip_R_Hand',
  'LeftUpLeg': 'J_Bip_L_UpperLeg',
  'LeftLeg': 'J_Bip_L_LowerLeg',
  'LeftFoot': 'J_Bip_L_Foot',
  'LeftToeBase': 'J_Bip_L_ToeBase',
  'RightUpLeg': 'J_Bip_R_UpperLeg',
  'RightLeg': 'J_Bip_R_LowerLeg',
  'RightFoot': 'J_Bip_R_Foot',
  'RightToeBase': 'J_Bip_R_ToeBase',
  // Fingers
  'LeftHandThumb1': 'J_Bip_L_Thumb1', 'LeftHandThumb2': 'J_Bip_L_Thumb2', 'LeftHandThumb3': 'J_Bip_L_Thumb3',
  'LeftHandIndex1': 'J_Bip_L_Index1', 'LeftHandIndex2': 'J_Bip_L_Index2', 'LeftHandIndex3': 'J_Bip_L_Index3',
  'LeftHandMiddle1': 'J_Bip_L_Middle1', 'LeftHandMiddle2': 'J_Bip_L_Middle2', 'LeftHandMiddle3': 'J_Bip_L_Middle3',
  'LeftHandRing1': 'J_Bip_L_Ring1', 'LeftHandRing2': 'J_Bip_L_Ring2', 'LeftHandRing3': 'J_Bip_L_Ring3',
  'LeftHandPinky1': 'J_Bip_L_Little1', 'LeftHandPinky2': 'J_Bip_L_Little2', 'LeftHandPinky3': 'J_Bip_L_Little3',
  'RightHandThumb1': 'J_Bip_R_Thumb1', 'RightHandThumb2': 'J_Bip_R_Thumb2', 'RightHandThumb3': 'J_Bip_R_Thumb3',
  'RightHandIndex1': 'J_Bip_R_Index1', 'RightHandIndex2': 'J_Bip_R_Index2', 'RightHandIndex3': 'J_Bip_R_Index3',
  'RightHandMiddle1': 'J_Bip_R_Middle1', 'RightHandMiddle2': 'J_Bip_R_Middle2', 'RightHandMiddle3': 'J_Bip_R_Middle3',
  'RightHandRing1': 'J_Bip_R_Ring1', 'RightHandRing2': 'J_Bip_R_Ring2', 'RightHandRing3': 'J_Bip_R_Ring3',
  'RightHandPinky1': 'J_Bip_R_Little1', 'RightHandPinky2': 'J_Bip_R_Little2', 'RightHandPinky3': 'J_Bip_R_Little3',
};

/**
 * Clone an animation clip with retargeted bone names for VRM compatibility.
 *
 * Key rules:
 * - Keeps original Mixamo track names (for Mixamo/RPM skeletons)
 * - Adds VRM-named duplicates (for VRM skeletons)
 * - SKIPS .position tracks for retargeted bones (scale mismatch between
 *   Mixamo cm and VRM meters would teleport the avatar off-screen)
 * - Only Hips.position is kept (but scaled down by 0.01 for VRM)
 */
function retargetClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const dotIdx = track.name.indexOf('.');
    if (dotIdx === -1) {
      newTracks.push(track);
      continue;
    }

    const boneName = track.name.substring(0, dotIdx);
    const property = track.name.substring(dotIdx); // e.g. ".quaternion", ".position", ".scale"

    // Keep original track (for Mixamo-compatible skeletons)
    newTracks.push(track);

    // Add VRM-retargeted track if mapping exists
    const vrmName = MIXAMO_TO_VRM[boneName];
    if (vrmName) {
      // Only retarget quaternion tracks (rotations are unit-independent)
      if (property !== '.quaternion') {
        continue;
      }

      // Skip leg/foot bones — rest-pose mismatch between Mixamo and VRM
      // causes legs to fly up. Upper body works fine.
      const skipBones = [
        'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
        'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
      ];
      if (skipBones.includes(boneName)) {
        continue;
      }

      const retargetedTrack = track.clone();
      retargetedTrack.name = vrmName + property;
      newTracks.push(retargetedTrack);
    }
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

// ─── Types ──────────────────────────────────────────────────────────
export type DanceStyle =
  | 'idle'
  | 'dance_basic' | 'dance_hiphop' | 'dance_breakdance' | 'dance_freestyle'
  | 'dance_01' | 'dance_02' | 'dance_03' | 'dance_04' | 'dance_05'
  | 'dance_06' | 'dance_07' | 'dance_08' | 'dance_09' | 'dance_10'
  | 'dance_samba'
  | 'miss';

// FBX dance animation files in public/animations/
const FBX_DANCE_PATHS: Record<string, string> = {
  dance_01: '/animations/dance_01.fbx',
  dance_02: '/animations/dance_02.fbx',
  dance_03: '/animations/dance_03.fbx',
  dance_04: '/animations/dance_04.fbx',
  dance_05: '/animations/dance_05.fbx',
  dance_06: '/animations/dance_06.fbx',
  dance_07: '/animations/dance_07.fbx',
  dance_08: '/animations/dance_08.fbx',
  dance_09: '/animations/dance_09.fbx',
  dance_10: '/animations/dance_10.fbx',
  dance_samba: '/animations/dance_samba.fbx',
};

// Legacy GLB paths (optional, for backward compat)
const GLB_PATHS: Record<string, string> = {
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
  private cache: Map<string, THREE.AnimationClip> = new Map();
  private loadPromises: Map<string, Promise<THREE.AnimationClip | null>> = new Map();
  private fbxLoader: FBXLoader;
  private gltfLoader: GLTFLoader;
  private availabilityChecked = false;
  private availableAnimations: Set<string> = new Set();
  private loadedAll = false;

  private constructor() {
    this.fbxLoader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
  }

  static getInstance(): AnimationCache {
    if (!AnimationCache.instance) {
      AnimationCache.instance = new AnimationCache();
    }
    return AnimationCache.instance;
  }

  async checkAvailability(): Promise<Set<string>> {
    if (this.availabilityChecked) return this.availableAnimations;

    // Check FBX dance files
    const allPaths = { ...FBX_DANCE_PATHS, ...GLB_PATHS };
    const checks = Object.entries(allPaths).map(async ([style, path]) => {
      try {
        const response = await Promise.race([
          fetch(path, { method: 'HEAD' }),
          new Promise<Response>((_, reject) => setTimeout(() => reject(), 3000)),
        ]);
        if (response.ok) {
          this.availableAnimations.add(style);
        }
      } catch { /* not available */ }
    });

    await Promise.all(checks);
    this.availabilityChecked = true;

    if (this.availableAnimations.size > 0) {
      console.info(
        `%c[AnimationSystem] ${this.availableAnimations.size} Animationen gefunden: ${[...this.availableAnimations].join(', ')}`,
        'color: #22d3ee; font-weight: bold;'
      );
    } else {
      console.info(
        '%c[AnimationSystem] Keine Animationsdateien gefunden — nutze prozeduralen Tanz-Fallback.',
        'color: #fbbf24; font-weight: bold;'
      );
    }

    return this.availableAnimations;
  }

  async loadAnimation(style: string): Promise<THREE.AnimationClip | null> {
    if (this.cache.has(style)) return this.cache.get(style)!;
    if (this.loadPromises.has(style)) return this.loadPromises.get(style)!;

    const fbxPath = FBX_DANCE_PATHS[style];
    const glbPath = GLB_PATHS[style];
    const path = fbxPath || glbPath;
    if (!path) return null;

    const isFBX = !!fbxPath;

    const promise = new Promise<THREE.AnimationClip | null>((resolve) => {
      if (isFBX) {
        this.fbxLoader.load(
          path,
          (fbxScene) => {
            if (fbxScene.animations && fbxScene.animations.length > 0) {
              // Retarget: create tracks for both Mixamo AND VRM bone names
              const rawClip = fbxScene.animations[0];
              const clip = retargetClip(rawClip);
              clip.name = style;
              this.cache.set(style, clip);
              console.info(`%c[AnimationSystem] ✅ "${style}" geladen (FBX, ${clip.duration.toFixed(1)}s, ${clip.tracks.length} tracks)`, 'color: #4ade80;');
              resolve(clip);
            } else {
              resolve(null);
            }
          },
          undefined,
          () => { resolve(null); }
        );
      } else {
        this.gltfLoader.load(
          path,
          (gltf) => {
            if (gltf.animations && gltf.animations.length > 0) {
              const clip = gltf.animations[0];
              clip.name = style;
              this.cache.set(style, clip);
              resolve(clip);
            } else { resolve(null); }
          },
          undefined,
          () => { resolve(null); }
        );
      }
    });

    this.loadPromises.set(style, promise);
    return promise;
  }

  async loadAllAvailable(): Promise<Map<string, THREE.AnimationClip>> {
    if (this.loadedAll) return this.cache;
    const available = await this.checkAvailability();
    await Promise.all([...available].map((style) => this.loadAnimation(style)));
    this.loadedAll = true;
    return this.cache;
  }

  getClip(style: string): THREE.AnimationClip | null {
    return this.cache.get(style) || null;
  }

  hasAnyAnimations(): boolean {
    return this.cache.size > 0;
  }

  /** Get all loaded dance clip names */
  getAvailableStyles(): DanceStyle[] {
    return [...this.cache.keys()] as DanceStyle[];
  }

  /** Get a random dance clip (not idle/miss) */
  getRandomDanceClip(): THREE.AnimationClip | null {
    const danceClips = [...this.cache.entries()].filter(([k]) => k.startsWith('dance_'));
    if (danceClips.length === 0) return null;
    return danceClips[Math.floor(Math.random() * danceClips.length)][1];
  }

  /** Get dance clip by intensity/combo level */
  getDanceClipForIntensity(intensity: number): THREE.AnimationClip | null {
    const danceKeys = [...this.cache.keys()].filter(k => k.startsWith('dance_')).sort();
    if (danceKeys.length === 0) return null;

    // Map intensity (1-3) to dance index
    const normalized = Math.min(1, (intensity - 1) / 2); // 0-1
    const index = Math.min(danceKeys.length - 1, Math.floor(normalized * danceKeys.length));
    return this.cache.get(danceKeys[index]) || null;
  }
}

// ─── Avatar Animation Controller ────────────────────────────────────
export class AvatarAnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private currentStyle: string | null = null;
  private crossFadeDuration = 0.4;

  constructor(root: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(root);
  }

  addClip(style: string, clip: THREE.AnimationClip) {
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;

    if (style === 'miss') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    this.actions.set(style, action);
  }

  play(style: string, timeScale: number = 1) {
    const action = this.actions.get(style);
    if (!action) return;

    if (this.currentStyle === style && this.currentAction) {
      this.currentAction.timeScale = timeScale;
      return;
    }

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

  stop() {
    this.mixer.stopAllAction();
    this.currentAction = null;
    this.currentStyle = null;
  }

  update(delta: number) {
    this.mixer.update(delta);
  }

  setTimeScale(scale: number) {
    if (this.currentAction) {
      this.currentAction.timeScale = scale;
    }
  }

  /**
   * Choose dance by intensity — higher intensity = later dance in the list
   */
  static chooseDanceStyle(intensity: number, availableStyles: DanceStyle[]): DanceStyle {
    const danceStyles = availableStyles.filter(s => s.startsWith('dance_')).sort();
    if (danceStyles.length === 0) return 'dance_basic';

    const normalized = Math.min(1, (intensity - 1) / 2);
    const index = Math.min(danceStyles.length - 1, Math.floor(normalized * danceStyles.length));
    return danceStyles[index];
  }

  dispose() {
    this.mixer.stopAllAction();
    this.actions.forEach(action => {
      this.mixer.uncacheAction(action.getClip());
      this.mixer.uncacheClip(action.getClip());
    });
    this.actions.clear();
  }
}

// ─── Exports ────────────────────────────────────────────────────────
export const animationCache = AnimationCache.getInstance();
