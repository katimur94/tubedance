/**
 * AnimatedAvatar — Unified 3D Avatar mit echten Skelett-Animationen
 *
 * Der ProceduralRobot unterstützt vollständige Anpassung:
 * - Körper: Geschlecht, Größe, Muskeln, Körperfett, Kopfgröße, Hautfarbe
 * - Kleidung: Jacke, T-Shirt, Weste, Hose, Shorts, Schuhe
 * - Accessoires: Hut, Brille, Bart, Schnurrbart, Flügel
 * - Gesicht: Augenform, Augenfarbe, Mundform
 */

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import {
  animationCache,
  AvatarAnimationController,
  type DanceStyle
} from '../systems/AnimationSystem';
import type { BodyParams, FaceParams } from './LockerRoom';
import { getClothingTexture as getTexture } from '../utils/clothingTextures';
import { SHOP_CATALOG } from '../lib/economy';

// ─── Props ──────────────────────────────────────────────────────────
interface AnimatedAvatarProps {
  modelUrl?: string | null;
  jacket?: string;
  tshirt?: string;
  vest?: string;
  pants?: string;
  shorts?: string;
  shoes?: string;
  hat?: string;
  glasses?: string;
  beard?: string;
  mustache?: string;
  wings?: string;
  effect?: string;
  accessory?: string;
  body?: BodyParams;
  face?: FaceParams;
  danceState: 'idle' | 'dancing' | 'miss';
  intensity: number;
  bpm?: number;
  compact?: boolean;
}



// ─── Bone name patterns for humanoid skeletons ───────────
// VRM, Mixamo, and other standard humanoid rigs use these patterns
const BONE_PATTERNS: Record<string, string[]> = {
  hips:          ['hips', 'hip', 'pelvis', 'root', 'j_bip_c_hips'],
  spine:         ['spine', 'spine1', 'j_bip_c_spine'],
  chest:         ['chest', 'spine2', 'upperchest', 'j_bip_c_chest'],
  neck:          ['neck', 'j_bip_c_neck'],
  head:          ['head', 'j_bip_c_head'],
  leftUpperArm:  ['leftshoulder', 'leftupperarm', 'l_upperarm', 'j_bip_l_upperarm', 'left_arm'],
  leftLowerArm:  ['leftforearm', 'leftlowerarm', 'l_forearm', 'j_bip_l_lowerarm', 'left_forearm'],
  rightUpperArm: ['rightshoulder', 'rightupperarm', 'r_upperarm', 'j_bip_r_upperarm', 'right_arm'],
  rightLowerArm: ['rightforearm', 'rightlowerarm', 'r_forearm', 'j_bip_r_lowerarm', 'right_forearm'],
  leftUpperLeg:  ['leftupleg', 'leftupperleg', 'l_thigh', 'j_bip_l_upperleg', 'left_thigh'],
  leftLowerLeg:  ['leftleg', 'leftlowerleg', 'l_calf', 'j_bip_l_lowerleg', 'left_calf'],
  rightUpperLeg: ['rightupleg', 'rightupperleg', 'r_thigh', 'j_bip_r_upperleg', 'right_thigh'],
  rightLowerLeg: ['rightleg', 'rightlowerleg', 'r_calf', 'j_bip_r_lowerleg', 'right_calf'],
};

function findBone(scene: THREE.Object3D, patterns: string[]): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  scene.traverse((child) => {
    if (found) return;
    if (child instanceof THREE.Bone) {
      const name = child.name.toLowerCase().replace(/[^a-z]/g, '');
      for (const p of patterns) {
        if (name.includes(p.replace(/[^a-z]/g, ''))) {
          found = child;
          return;
        }
      }
    }
  });
  return found;
}

interface BoneRefs {
  hips: THREE.Bone | null;
  spine: THREE.Bone | null;
  chest: THREE.Bone | null;
  neck: THREE.Bone | null;
  head: THREE.Bone | null;
  leftUpperArm: THREE.Bone | null;
  leftLowerArm: THREE.Bone | null;
  rightUpperArm: THREE.Bone | null;
  rightLowerArm: THREE.Bone | null;
  leftUpperLeg: THREE.Bone | null;
  leftLowerLeg: THREE.Bone | null;
  rightUpperLeg: THREE.Bone | null;
  rightLowerLeg: THREE.Bone | null;
}

// ─── Skelett-animiertes 3D-Modell (RPM, GLB oder VRM) ───────────
function SkeletalModel({
  url, danceState, intensity, bpm = 120
}: {
  url: string; danceState: string; intensity: number; bpm: number
}) {
  const { scene, animations } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const controllerRef = useRef<AvatarAnimationController | null>(null);
  const bonesRef = useRef<BoneRefs | null>(null);
  const initialRotationsRef = useRef<Map<string, THREE.Euler>>(new Map());
  const isVRMRef = useRef(false);
  const [externalAnimsLoaded, setExternalAnimsLoaded] = useState(false);
  const hasEmbeddedAnimations = animations && animations.length > 0;

  // Find bones on load
  useEffect(() => {
    const bones: BoneRefs = {
      hips: null, spine: null, chest: null, neck: null, head: null,
      leftUpperArm: null, leftLowerArm: null, rightUpperArm: null, rightLowerArm: null,
      leftUpperLeg: null, leftLowerLeg: null, rightUpperLeg: null, rightLowerLeg: null,
    };

    for (const [key, patterns] of Object.entries(BONE_PATTERNS)) {
      (bones as any)[key] = findBone(scene, patterns);
    }

    // Store initial rotations (T-pose) so we can add on top
    const initRots = new Map<string, THREE.Euler>();
    for (const [key, bone] of Object.entries(bones)) {
      if (bone) {
        initRots.set(key, bone.rotation.clone());
      }
    }
    initialRotationsRef.current = initRots;
    bonesRef.current = bones;

    // Setup shadows
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Detect VRM skeleton by checking for J_Bip_ bone names
    let detectedVRM = false;
    for (const [, bone] of Object.entries(bones)) {
      if (bone && bone.name.startsWith('J_Bip_')) {
        detectedVRM = true;
        break;
      }
    }
    isVRMRef.current = detectedVRM;
    if (detectedVRM) {
      console.info('%c[AnimatedAvatar] VRM-Skeleton erkannt — nutze prozeduralen Tanz', 'color: #f0abfc;');
    }
  }, [scene]);

  // Load clip-based animations (embedded + external FBX)
  const [usingClips, setUsingClips] = useState(false);

  useEffect(() => {
    const controller = new AvatarAnimationController(scene);
    controllerRef.current = controller;

    // 1) Register embedded animations from the model itself
    if (hasEmbeddedAnimations) {
      animations.forEach((clip) => {
        const name = clip.name.toLowerCase();
        if (name.includes('idle')) controller.addClip('idle', clip);
        else if (name.includes('dance') || name.includes('samba') || name.includes('hip')) controller.addClip('dance_basic', clip);
        else if (name.includes('sad') || name.includes('miss') || name.includes('defeat')) controller.addClip('miss', clip);
        else controller.addClip('idle', clip);
      });
    }

    // 2) Load external FBX dance animations
    animationCache.loadAllAvailable().then((clips) => {
      let addedAny = false;
      clips.forEach((clip, style) => {
        controller.addClip(style, clip);
        addedAny = true;
      });

      if (addedAny || hasEmbeddedAnimations) {
        setUsingClips(true);
        setExternalAnimsLoaded(true);
        // Start playing immediately — pick first dance or idle
        const danceClips = [...clips.keys()].filter(k => k.startsWith('dance_'));
        if (danceClips.length > 0) {
          controller.play(danceClips[0], bpm / 120);
        }
      }
    });

    return () => { controller.dispose(); };
  }, [scene, animations, hasEmbeddedAnimations]);

  // React to danceState/intensity changes — switch dance clips
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !usingClips) return;

    const timeScale = bpm / 120;

    if (danceState === 'dancing') {
      const availableStyles = animationCache.getAvailableStyles();
      const style = AvatarAnimationController.chooseDanceStyle(intensity, availableStyles);
      controller.play(style, timeScale);
    } else if (danceState === 'miss') {
      // Try miss clip, fallback to first dance at slow speed
      controller.play('miss', 1);
    } else {
      // Idle: try idle clip, fallback to first dance at half speed
      const hasIdle = animationCache.getClip('idle');
      if (hasIdle) {
        controller.play('idle', 1);
      } else {
        // Use first dance at very slow speed as idle
        const styles = animationCache.getAvailableStyles();
        const firstDance = styles.find(s => s.startsWith('dance_'));
        if (firstDance) controller.play(firstDance, 0.3);
      }
    }
  }, [danceState, intensity, bpm, usingClips]);

  // ═══ FRAME UPDATE — clip animations OR procedural fallback ═══
  useFrame((state, delta) => {
    const controller = controllerRef.current;

    // FBX clip animations only work on Mixamo/RPM skeletons (NOT VRM)
    // VRM bones have different rest-pose orientations → clips cause broken poses
    if (controller && usingClips && !isVRMRef.current) {
      controller.update(delta);
      return;
    }

    // ═══ PROCEDURAL BONE DANCE ═══
    // Rich choreography with walking, spinning, varied moves

    const bones = bonesRef.current;
    if (!bones || !group.current) return;

    const t = state.clock.getElapsedTime();
    const bps = bpm / 60; // beats per second
    const beat = t * bps * Math.PI;
    const beatCount = t * bps; // total beats elapsed
    const beatInBar = beatCount % 4; // 0-3.99
    const bar = Math.floor(beatCount / 4); // which bar we're in
    // Which 8-bar phrase (32 beats) — changes the whole routine
    const moveSet = Math.floor(beatCount / 32) % 8;
    // Smooth normalized beat (0→1 per beat)
    const bFrac = beatCount % 1;
    // Snap: sharp attack, smooth release
    const snap = bFrac < 0.12 ? bFrac / 0.12 : Math.max(0, 1 - (bFrac - 0.12) * 1.5);

    // Helper
    const rot = (bone: THREE.Bone | null, x: number, y = 0, z = 0) => {
      if (!bone) return;
      bone.rotation.x = x; bone.rotation.y = y; bone.rotation.z = z;
    };

    // ── IDLE ──
    if (danceState === 'idle') {
      rot(bones.leftUpperArm, 0, 0, 1.1);
      rot(bones.rightUpperArm, 0, 0, -1.1);
      rot(bones.leftLowerArm, -0.1, 0, 0.15);
      rot(bones.rightLowerArm, -0.1, 0, -0.15);
      rot(bones.leftUpperLeg, 0, 0, 0.02);
      rot(bones.rightUpperLeg, 0, 0, -0.02);
      rot(bones.leftLowerLeg, 0); rot(bones.rightLowerLeg, 0);
      rot(bones.spine, Math.sin(t * 1.8) * 0.015);
      rot(bones.chest, 0); rot(bones.neck, 0);
      rot(bones.head, Math.sin(t * 1.3) * 0.03, Math.sin(t * 0.7) * 0.02, 0);
      group.current.position.x = 0;
      group.current.position.y = Math.sin(t * 1.8) * 0.01;
      group.current.rotation.y = 0;
      return;
    }

    // ── MISS ──
    if (danceState === 'miss') {
      rot(bones.head, 0.35, 0, 0.05);
      rot(bones.spine, 0.2); rot(bones.chest, 0.05);
      rot(bones.leftUpperArm, 0.1, 0, 0.7);
      rot(bones.rightUpperArm, 0.1, 0, -0.7);
      rot(bones.leftLowerArm, 0, 0, 0.1);
      rot(bones.rightLowerArm, 0, 0, -0.1);
      rot(bones.leftUpperLeg, 0, 0, 0.02);
      rot(bones.rightUpperLeg, 0, 0, -0.02);
      rot(bones.leftLowerLeg, 0); rot(bones.rightLowerLeg, 0);
      group.current.position.y = -0.05;
      group.current.position.x = 0;
      group.current.rotation.y = 0;
      return;
    }

    // ── DANCING — 8 routines that cycle every 32 beats ──
    const i = Math.min(intensity, 3);

    // Global body bounce (all routines)
    const bounce = snap * 0.08 * i;
    group.current.position.y = bounce;

    // Base body groove
    rot(bones.hips, Math.sin(beat) * 0.06 * i, Math.sin(beat * 0.5) * 0.08 * i, 0);
    rot(bones.spine, Math.sin(beat + 0.5) * 0.06 * i, 0, Math.sin(beat * 0.5) * 0.04 * i);
    rot(bones.chest, -snap * 0.05 * i, 0, 0);
    rot(bones.neck, 0, 0, 0);
    rot(bones.head, Math.sin(beat * 2) * 0.08 * i, Math.sin(beat) * 0.1 * i, 0);

    // ═══ MOVE SETS — cycle through different choreography ═══
    const m = moveSet;

    if (m === 0) {
      // ── SIDE STEP: Walk left-right across stage ──
      const walk = Math.sin(beat * 0.25);
      group.current.position.x = walk * 0.4 * i;
      group.current.rotation.y = walk * 0.15;

      // Walking legs
      rot(bones.leftUpperLeg, Math.sin(beat) * 0.5 * i, 0, 0.02);
      rot(bones.rightUpperLeg, Math.sin(beat + Math.PI) * 0.5 * i, 0, -0.02);
      rot(bones.leftLowerLeg, -Math.max(0, Math.sin(beat)) * 0.7 * i);
      rot(bones.rightLowerLeg, -Math.max(0, Math.sin(beat + Math.PI)) * 0.7 * i);

      // Swinging arms
      rot(bones.leftUpperArm, Math.sin(beat + Math.PI) * 0.6 * i, 0, 0.5);
      rot(bones.rightUpperArm, Math.sin(beat) * 0.6 * i, 0, -0.5);
      rot(bones.leftLowerArm, -0.3 - Math.abs(Math.sin(beat)) * 0.4 * i, 0, 0);
      rot(bones.rightLowerArm, -0.3 - Math.abs(Math.sin(beat + Math.PI)) * 0.4 * i, 0, 0);

    } else if (m === 1) {
      // ── PARA PARA: Arms up, pointing in sequence ──
      group.current.position.x = 0;
      group.current.rotation.y = 0;
      const phase = Math.floor(beatInBar);

      // 4 different arm poses per beat
      if (phase === 0) { // Both up right
        rot(bones.leftUpperArm, -2.5, 0.3, 0.2);
        rot(bones.rightUpperArm, -2.5, -0.3, -0.2);
        rot(bones.leftLowerArm, -0.3, 0, 0);
        rot(bones.rightLowerArm, -0.3, 0, 0);
      } else if (phase === 1) { // Point right
        rot(bones.leftUpperArm, -0.3, 0.5, 0.8);
        rot(bones.rightUpperArm, -1.5, -0.3, -0.1);
        rot(bones.leftLowerArm, -0.5, 0, 0);
        rot(bones.rightLowerArm, 0, 0, 0);
      } else if (phase === 2) { // Both out to sides
        rot(bones.leftUpperArm, 0, 0, 0);
        rot(bones.rightUpperArm, 0, 0, 0);
        rot(bones.leftLowerArm, -1.5, 0, 0);
        rot(bones.rightLowerArm, -1.5, 0, 0);
      } else { // Cross chest
        rot(bones.leftUpperArm, -0.8, 0.8, 0.5);
        rot(bones.rightUpperArm, -0.8, -0.8, -0.5);
        rot(bones.leftLowerArm, -1.2, 0, 0);
        rot(bones.rightLowerArm, -1.2, 0, 0);
      }

      // Stepping in place
      const step = Math.sin(beat);
      rot(bones.leftUpperLeg, step > 0 ? step * 0.4 : 0, 0, 0.02);
      rot(bones.rightUpperLeg, step < 0 ? -step * 0.4 : 0, 0, -0.02);
      rot(bones.leftLowerLeg, step > 0 ? -step * 0.6 : 0);
      rot(bones.rightLowerLeg, step < 0 ? step * 0.6 : 0);

    } else if (m === 2) {
      // ── SPIN MOVE: Full body rotation + arm windmill ──
      const spinAngle = (beatCount % 8) / 8 * Math.PI * 2;
      group.current.rotation.y = spinAngle * 0.5;
      group.current.position.x = Math.sin(spinAngle) * 0.15;

      rot(bones.leftUpperArm, -1.5 + Math.sin(beat) * 0.8, Math.cos(beat * 0.5) * 0.4, 0.2);
      rot(bones.rightUpperArm, -1.5 + Math.cos(beat) * 0.8, -Math.sin(beat * 0.5) * 0.4, -0.2);
      rot(bones.leftLowerArm, -0.8 - Math.abs(Math.sin(beat)) * 0.6, 0, 0);
      rot(bones.rightLowerArm, -0.8 - Math.abs(Math.cos(beat)) * 0.6, 0, 0);

      // High stepping legs during spin
      rot(bones.leftUpperLeg, Math.max(0, Math.sin(beat)) * 0.7, 0, 0.02);
      rot(bones.rightUpperLeg, Math.max(0, Math.sin(beat + Math.PI)) * 0.7, 0, -0.02);
      rot(bones.leftLowerLeg, -Math.max(0, Math.sin(beat)) * 1.0);
      rot(bones.rightLowerLeg, -Math.max(0, Math.sin(beat + Math.PI)) * 1.0);

    } else if (m === 3) {
      // ── HIP-HOP BOUNCE: Deep squat bounce + arm pump ──
      group.current.position.x = 0;
      group.current.rotation.y = Math.sin(beat * 0.25) * 0.2;
      group.current.position.y = bounce + snap * 0.12 * i;

      // Deep squat on beat
      const squat = snap * 0.4 * i;
      rot(bones.leftUpperLeg, squat, 0, 0.08);
      rot(bones.rightUpperLeg, squat, 0, -0.08);
      rot(bones.leftLowerLeg, -squat * 1.5);
      rot(bones.rightLowerLeg, -squat * 1.5);

      // Pump arms alternating
      const armBeat = Math.floor(beatInBar) % 2 === 0;
      if (armBeat) {
        rot(bones.leftUpperArm, -2.0 + snap * 0.8, 0.2, 0.3);
        rot(bones.rightUpperArm, -0.2, 0, -0.7);
        rot(bones.leftLowerArm, -1.0 + snap * 0.5, 0, 0);
        rot(bones.rightLowerArm, -0.3, 0, 0);
      } else {
        rot(bones.leftUpperArm, -0.2, 0, 0.7);
        rot(bones.rightUpperArm, -2.0 + snap * 0.8, -0.2, -0.3);
        rot(bones.leftLowerArm, -0.3, 0, 0);
        rot(bones.rightLowerArm, -1.0 + snap * 0.5, 0, 0);
      }

      // Extra spine groove
      rot(bones.spine, -snap * 0.15 * i, 0, Math.sin(beat * 0.5) * 0.1);
      rot(bones.chest, snap * 0.1, 0, 0);

    } else if (m === 4) {
      // ── WAVE: Smooth body wave from feet to head ──
      group.current.position.x = Math.sin(beat * 0.25) * 0.1;
      group.current.rotation.y = 0;

      const wave = Math.sin(beat * 0.5);
      const waveDelay1 = Math.sin(beat * 0.5 - 0.5);
      const waveDelay2 = Math.sin(beat * 0.5 - 1.0);
      const waveDelay3 = Math.sin(beat * 0.5 - 1.5);

      rot(bones.leftUpperLeg, wave * 0.15, 0, 0.02);
      rot(bones.rightUpperLeg, wave * 0.15, 0, -0.02);
      rot(bones.leftLowerLeg, -Math.abs(wave) * 0.2);
      rot(bones.rightLowerLeg, -Math.abs(wave) * 0.2);

      rot(bones.hips, waveDelay1 * 0.15, wave * 0.1, 0);
      rot(bones.spine, waveDelay2 * 0.15, 0, waveDelay1 * 0.05);
      rot(bones.chest, waveDelay3 * 0.15, 0, 0);
      rot(bones.head, -waveDelay3 * 0.1, wave * 0.15, 0);

      // Flowing arms
      rot(bones.leftUpperArm, waveDelay2 * 0.6 - 0.5, 0, 0.3 + wave * 0.2);
      rot(bones.rightUpperArm, waveDelay2 * 0.6 - 0.5, 0, -0.3 - wave * 0.2);
      rot(bones.leftLowerArm, -0.5 + waveDelay3 * 0.4, waveDelay3 * 0.3, 0);
      rot(bones.rightLowerArm, -0.5 + waveDelay3 * 0.4, -waveDelay3 * 0.3, 0);

    } else if (m === 5) {
      // ── RUNNING MAN: Classic running in place ──
      group.current.position.x = 0;
      group.current.rotation.y = 0;
      group.current.position.y = bounce + Math.abs(Math.sin(beat)) * 0.06;

      // Alternating legs - high knees
      const legPhase = Math.sin(beat);
      rot(bones.leftUpperLeg, legPhase > 0 ? legPhase * 0.9 : -0.05, 0, 0.02);
      rot(bones.rightUpperLeg, legPhase < 0 ? -legPhase * 0.9 : -0.05, 0, -0.02);
      rot(bones.leftLowerLeg, legPhase > 0 ? -legPhase * 1.3 : -0.1);
      rot(bones.rightLowerLeg, legPhase < 0 ? legPhase * 1.3 : -0.1);

      // Opposite arms
      rot(bones.leftUpperArm, legPhase < 0 ? legPhase * 0.8 : 0.2, 0, 0.3);
      rot(bones.rightUpperArm, legPhase > 0 ? -legPhase * 0.8 : 0.2, 0, -0.3);
      rot(bones.leftLowerArm, -0.8, 0, 0);
      rot(bones.rightLowerArm, -0.8, 0, 0);

    } else if (m === 6) {
      // ── GROOVE WALK: Walking in a circle ──
      const circle = (beatCount % 16) / 16 * Math.PI * 2;
      group.current.position.x = Math.sin(circle) * 0.3;
      group.current.rotation.y = circle + Math.PI * 0.5;

      // Walking legs
      rot(bones.leftUpperLeg, Math.sin(beat) * 0.45, 0, 0.02);
      rot(bones.rightUpperLeg, Math.sin(beat + Math.PI) * 0.45, 0, -0.02);
      rot(bones.leftLowerLeg, -Math.max(0, Math.sin(beat)) * 0.6);
      rot(bones.rightLowerLeg, -Math.max(0, Math.sin(beat + Math.PI)) * 0.6);

      // Groovy arms — elbows out
      rot(bones.leftUpperArm, Math.sin(beat + Math.PI) * 0.4, 0.3, 0.3);
      rot(bones.rightUpperArm, Math.sin(beat) * 0.4, -0.3, -0.3);
      rot(bones.leftLowerArm, -0.9 + Math.sin(beat) * 0.3, 0, 0);
      rot(bones.rightLowerArm, -0.9 + Math.sin(beat + Math.PI) * 0.3, 0, 0);

      // Extra swagger
      rot(bones.hips, 0.05, Math.sin(beat * 0.5) * 0.12, Math.sin(beat) * 0.06);
      rot(bones.spine, -0.05, -Math.sin(beat * 0.5) * 0.08, 0);

    } else {
      // ── FREESTYLE: Combination of everything, high energy ──
      const sub = Math.floor(beatInBar);
      group.current.position.x = Math.sin(beat * 0.25) * 0.2;
      group.current.rotation.y = Math.sin(beat * 0.125) * 0.4;
      group.current.position.y = bounce + Math.abs(Math.sin(beat)) * 0.1;

      // Different pose each beat
      if (sub === 0) {
        // Jump squat
        rot(bones.leftUpperArm, -2.8, 0.2, 0.2);
        rot(bones.rightUpperArm, -2.8, -0.2, -0.2);
        rot(bones.leftLowerArm, 0, 0, 0);
        rot(bones.rightLowerArm, 0, 0, 0);
        rot(bones.leftUpperLeg, snap * 0.5, 0, 0.1);
        rot(bones.rightUpperLeg, snap * 0.5, 0, -0.1);
        rot(bones.leftLowerLeg, -snap * 0.8);
        rot(bones.rightLowerLeg, -snap * 0.8);
      } else if (sub === 1) {
        // Kick right
        rot(bones.leftUpperArm, -0.5, 0, 0.8);
        rot(bones.rightUpperArm, -1.5, -0.5, -0.2);
        rot(bones.leftLowerArm, -0.3, 0, 0);
        rot(bones.rightLowerArm, 0, 0, 0);
        rot(bones.leftUpperLeg, 0, 0, 0.02);
        rot(bones.rightUpperLeg, snap * 1.2, 0, -0.02);
        rot(bones.leftLowerLeg, -0.15);
        rot(bones.rightLowerLeg, 0);
      } else if (sub === 2) {
        // Dab
        rot(bones.leftUpperArm, -2.2, 0.5, 0.2);
        rot(bones.rightUpperArm, -0.5, -0.3, -0.8);
        rot(bones.leftLowerArm, -1.2, 0.3, 0);
        rot(bones.rightLowerArm, -0.5, 0, 0);
        rot(bones.leftUpperLeg, 0.05, 0, 0.08);
        rot(bones.rightUpperLeg, 0.05, 0, -0.08);
        rot(bones.leftLowerLeg, -0.1);
        rot(bones.rightLowerLeg, -0.1);
        rot(bones.head, -0.3, 0.5, 0.2);
      } else {
        // Stomp + fist pump
        rot(bones.leftUpperArm, -2.5 + snap * 0.5, 0, 0.2);
        rot(bones.rightUpperArm, -0.3, 0, -0.9);
        rot(bones.leftLowerArm, -0.5 + snap * 0.3, 0, 0);
        rot(bones.rightLowerArm, -0.2, 0, 0);
        rot(bones.leftUpperLeg, 0, 0, 0.02);
        rot(bones.rightUpperLeg, snap * 0.6, 0, -0.02);
        rot(bones.leftLowerLeg, -0.05);
        rot(bones.rightLowerLeg, -snap * 0.8);
      }
    }
  });

  // Auto-center: compute bounding box, normalize scale, place feet on ground
  const wrapperRef = useRef<THREE.Group>(null);
  const baseYRef = useRef(-1);
  const modelInfo = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Target height ~2.2 units
    const targetHeight = 2.2;
    const s = size.y > 0 ? targetHeight / size.y : 1;

    // Place feet at y = -1
    const yOffset = -box.min.y * s - 1;
    baseYRef.current = yOffset;

    return { scale: s, offsetX: -center.x * s, offsetY: yOffset, offsetZ: -center.z * s };
  }, [scene]);

  // Wrapper: centering. Group: dance bounce. Primitive: the model itself.
  // No forced rotation — the animation clips handle orientation.
  return (
    <group ref={wrapperRef}>
      <group ref={group} position={[0, 0, 0]}>
        <primitive
          object={scene}
          position={[modelInfo.offsetX, modelInfo.offsetY, modelInfo.offsetZ]}
          scale={modelInfo.scale}
        />
      </group>
    </group>
  );
}

// ─── Prozeduraler Box-Roboter (Vollständig anpassbar) ──────────────
// Anime/Chibi defaults — big head, cute proportions
const DEFAULT_BODY_INTERNAL: BodyParams = {
  gender: 'male', height: 1, muscles: 0.2, bodyFat: 0.1, headSize: 1.3, skinColor: '#fce4d6',
  armLength: 1, legLength: 1, shoulderWidth: 1, hipWidth: 1, neckLength: 1, neckThickness: 1,
};
const DEFAULT_FACE_INTERNAL: FaceParams = {
  eyeStyle: 'normal', eyeColor: '#22d3ee', eyeSpacing: 1, eyeSize: 1,
  mouthStyle: 'smile', lipThickness: 1,
  hairStyle: 'long', hairColor: '#2d1b4e',
  noseSize: 1, noseShape: 'button',
  earSize: 1, earShape: 'round',
  eyebrowStyle: 'thin', eyebrowColor: '#2d1b4e', eyebrowThickness: 1,
  chinShape: 'round', foreheadHeight: 1, cheekWidth: 1,
  freckles: false,
};

// Toon gradient texture for cel-shading
const toonGradient = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  // 3-step toon shading: dark, mid, bright
  ctx.fillStyle = '#666';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#999';
  ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = '#fff';
  ctx.fillRect(3, 0, 1, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
})();

function ProceduralRobot({
  jacket = 'leather_black', tshirt = 'none', vest = 'none',
  pants = 'denim_blue', shorts = 'none', shoes = 'shoes_sneakers',
  hat = 'none', glasses = 'none', beard = 'none', mustache = 'none', wings = 'none', effect = 'none', accessory = 'none',
  bodyParams, faceParams,
  danceState, intensity, bpm = 120
}: {
  jacket?: string; tshirt?: string; vest?: string;
  pants?: string; shorts?: string; shoes?: string;
  hat?: string; glasses?: string; beard?: string; mustache?: string; wings?: string; effect?: string; accessory?: string;
  bodyParams?: BodyParams; faceParams?: FaceParams;
  danceState: string; intensity: number; bpm: number
}) {
  const bp = bodyParams || DEFAULT_BODY_INTERNAL;
  const fp = faceParams || DEFAULT_FACE_INTERNAL;

  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  // Anime/Chibi body proportions — shorter body, bigger head, longer legs
  const isFemale = bp.gender === 'female';
  const heightScale = bp.height;
  const muscleW = 1 + bp.muscles * 0.15;
  const fatW = 1 + bp.bodyFat * 0.1;
  const shoulderW = bp.shoulderWidth ?? 1;
  const hipWScale = bp.hipWidth ?? 1;
  const armLen = bp.armLength ?? 1;
  const legLen = bp.legLength ?? 1;
  const neckLen = bp.neckLength ?? 1;
  const neckThick = bp.neckThickness ?? 1;
  const torsoW = (isFemale ? 0.55 : 0.6) * muscleW * fatW * shoulderW;
  const torsoH = (isFemale ? 0.7 : 0.75);
  const torsoD = (isFemale ? 0.35 : 0.4) * fatW;
  const hipW = (isFemale ? torsoW * 1.15 : torsoW) * hipWScale;
  const armW = 0.2 * muscleW;
  const legW = (isFemale ? 0.2 : 0.22) * muscleW;
  const headScale = bp.headSize * 1.2;
  const armH = 0.8 * armLen;
  const neckH = 0.15 * neckLen;
  const neckR = 0.12 * neckThick;

  // Active clothing: shorts override pants legs, tshirt as base, jacket on top, vest on top
  const hasJacket = jacket && jacket !== 'none';
  const hasTshirt = tshirt && tshirt !== 'none';
  const hasVest = vest && vest !== 'none';
  const hasShorts = shorts && shorts !== 'none';
  const hasPants = pants && pants !== 'none' && !hasShorts;
  const hasHat = hat && hat !== 'none';
  const hasGlasses = glasses && glasses !== 'none';
  const hasBeard = beard && beard !== 'none';
  const hasMustache = mustache && mustache !== 'none';
  const hasWings = wings && wings !== 'none';
  const hasAccessory = accessory && accessory !== 'none';

  // Determine torso material: jacket > vest > tshirt > skin
  const torsoTexId = hasJacket ? jacket : hasVest ? vest : hasTshirt ? tshirt : null;
  const legTexId = hasPants ? pants : hasShorts ? shorts : null;

  const materials = useMemo(() => {
    const isEpicOrLeg = (id?: string) => {
      const r = id && id !== 'none' ? SHOP_CATALOG.find(i => i.id === id)?.rarity : null;
      return r === 'legendary' || r === 'epic';
    };
    const isLegendary = (id?: string) => !!(id && id !== 'none' && SHOP_CATALOG.find(i => i.id === id)?.rarity === 'legendary');
    
    const createMaterial = (tex: THREE.Texture | null, isLeg: boolean, options: any) => {
       const matOpts: any = { ...options };
       if (tex) matOpts.map = tex;
       if (isLeg) {
          // Legendary items keep physical material for iridescence
          matOpts.iridescence = 1;
          matOpts.clearcoat = 1;
          matOpts.clearcoatRoughness = 0.1;
          matOpts.roughness = Math.max(0.05, (options.roughness || 0.5) * 0.3);
          matOpts.emissive = new THREE.Color(0x332200);
          return new THREE.MeshPhysicalMaterial(matOpts);
       }
       // Toon material for anime cel-shading look
       matOpts.gradientMap = toonGradient;
       delete matOpts.roughness;
       delete matOpts.metalness;
       return new THREE.MeshToonMaterial(matOpts);
    };

    // Anime skin — warm, smooth toon-shaded
    const skin = new THREE.MeshToonMaterial({ color: bp.skinColor, gradientMap: toonGradient });
    // Big anime eyes — bright, emissive
    const eyeMat = new THREE.MeshBasicMaterial({
      color: danceState === 'miss' ? '#ef4444' : fp.eyeColor,
      toneMapped: false,
    });

    const torsoTex = torsoTexId ? getTexture(torsoTexId) : null;
    const torsoMat = torsoTex
      ? createMaterial(torsoTex, isLegendary(torsoTexId!), { roughness: 0.7 })
      : skin.clone();

    const legTex = legTexId ? getTexture(legTexId) : null;
    const legMat = legTex
      ? createMaterial(legTex, isLegendary(legTexId!), { roughness: 0.9 })
      : skin.clone();

    const shoeTex = getTexture(shoes) || getTexture('shoes_sneakers');
    const shoeMat = createMaterial(shoeTex, isLegendary(shoes), { roughness: 0.5 });

    const armTexId = hasJacket ? jacket : hasTshirt ? tshirt : null;
    const armTex = armTexId ? getTexture(armTexId) : null;
    const armMat = armTex ? createMaterial(armTex, isLegendary(armTexId!), { roughness: 0.7 }) : skin.clone();

    const hatTex = hasHat ? getTexture(hat!) : null;
    const hatMat = hatTex ? createMaterial(hatTex, isLegendary(hat), { roughness: 0.5 }) : null;

    const glassTex = hasGlasses ? getTexture(glasses!) : null;
    const glassMat = glassTex ? createMaterial(glassTex, isLegendary(glasses), { roughness: 0.1, metalness: 0.8, opacity: 0.85, transparent: true }) : null;

    const beardTex = hasBeard ? getTexture(beard!) : null;
    const beardMat = beardTex ? createMaterial(beardTex, false, { roughness: 1 }) : null;

    const mustacheTex = hasMustache ? getTexture(mustache!) : null;
    const mustacheMat = mustacheTex ? createMaterial(mustacheTex, false, { roughness: 1 }) : null;

    const wingTex = hasWings ? getTexture(wings!) : null;
    const wingMat = wingTex ? createMaterial(wingTex, isLegendary(wings), { roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }) : null;

    const accTex = hasAccessory ? getTexture(accessory!) : null;
    const accMat = createMaterial(accTex, isLegendary(accessory), { roughness: 0.1, metalness: 1 });

    const hasAnyLegendary = isLegendary(jacket) || isLegendary(tshirt) || isLegendary(vest) || isLegendary(pants) || isLegendary(shorts) || isLegendary(shoes) || isLegendary(hat) || isLegendary(glasses) || isLegendary(wings) || isLegendary(accessory);
    const hasAnyEpic = !hasAnyLegendary && (isEpicOrLeg(jacket) || isEpicOrLeg(tshirt) || isEpicOrLeg(vest) || isEpicOrLeg(pants) || isEpicOrLeg(shorts) || isEpicOrLeg(shoes) || isEpicOrLeg(hat) || isEpicOrLeg(glasses) || isEpicOrLeg(wings) || isEpicOrLeg(accessory));

    const mouthColor = fp.mouthStyle === 'smile' ? '#ec4899' : fp.mouthStyle === 'grin' ? '#f43f5e' : '#9ca3af';
    const mouthMat = new THREE.MeshBasicMaterial({ color: mouthColor, toneMapped: false });

    return { skin, eyeMat, torsoMat, legMat, shoeMat, armMat, hatMat, glassMat, beardMat, mustacheMat, wingMat, accMat, mouthMat, hasAnyLegendary, hasAnyEpic };
  }, [jacket, tshirt, vest, pants, shorts, shoes, hat, glasses, beard, mustache, wings, accessory, bp.skinColor, fp.eyeColor, fp.mouthStyle, danceState, torsoTexId, legTexId, hasJacket, hasTshirt, hasVest, hasShorts, hasPants, hasHat, hasGlasses, hasBeard, hasMustache, hasWings, hasAccessory]);

  // Track previous materials and dispose them when they change or on unmount
  const prevMaterialsRef = useRef<typeof materials | null>(null);
  useEffect(() => {
    // Dispose previous materials when new ones are created
    if (prevMaterialsRef.current && prevMaterialsRef.current !== materials) {
      const prev = prevMaterialsRef.current;
      const matKeys = ['skin', 'eyeMat', 'torsoMat', 'legMat', 'shoeMat', 'armMat', 'hatMat', 'glassMat', 'beardMat', 'mustacheMat', 'wingMat', 'accMat', 'mouthMat'] as const;
      matKeys.forEach((key) => {
        const mat = prev[key];
        if (mat && mat instanceof THREE.Material) mat.dispose();
      });
    }
    prevMaterialsRef.current = materials;

    // Dispose on unmount
    return () => {
      const matKeys = ['skin', 'eyeMat', 'torsoMat', 'legMat', 'shoeMat', 'armMat', 'hatMat', 'glassMat', 'beardMat', 'mustacheMat', 'wingMat', 'accMat', 'mouthMat'] as const;
      matKeys.forEach((key) => {
        const mat = materials[key];
        if (mat && mat instanceof THREE.Material) mat.dispose();
      });
    };
  }, [materials]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!group.current || !leftArm.current || !rightArm.current || !leftLeg.current || !rightLeg.current || !body.current || !head.current) return;
    const beat = t * (bpm / 60) * Math.PI;

    if (danceState === 'dancing') {
      if (intensity >= 2.5) {
        group.current.rotation.y = Math.PI / 2;
        group.current.position.x = Math.sin(t * 0.5) * 1.5;
        body.current.position.y = Math.sin(beat * 2) * 0.05 + 1.15;
        head.current.rotation.y = -Math.PI / 2;
        head.current.rotation.x = Math.sin(beat) * 0.1;
        leftLeg.current.rotation.x = Math.sin(beat) * 0.5;
        leftLeg.current.position.y = Math.max(0, Math.sin(beat)) * 0.2 + 0.3;
        rightLeg.current.rotation.x = Math.sin(beat + Math.PI) * 0.5;
        rightLeg.current.position.y = Math.max(0, Math.sin(beat + Math.PI)) * 0.2 + 0.3;
        leftArm.current.rotation.x = -Math.sin(beat) * 0.4;
        rightArm.current.rotation.x = -Math.sin(beat + Math.PI) * 0.4;
      } else if (intensity >= 1.5) {
        group.current.rotation.y = Math.sin(beat * 0.5) * 0.4;
        group.current.position.x = 0;
        body.current.position.y = Math.abs(Math.sin(beat)) * 0.3 + 1.1;
        leftArm.current.rotation.x = Math.sin(beat) * 1.5 - 1;
        leftArm.current.rotation.z = Math.cos(beat) * 0.5 + 0.5;
        rightArm.current.rotation.x = Math.sin(beat + Math.PI) * 1.5 - 1;
        rightArm.current.rotation.z = -Math.cos(beat) * 0.5 - 0.5;
        leftLeg.current.rotation.x = Math.sin(beat) * 0.6;
        leftLeg.current.position.y = Math.max(0, Math.sin(beat)) * 0.5 + 0.3;
        rightLeg.current.rotation.x = Math.sin(beat + Math.PI) * 0.6;
        rightLeg.current.position.y = Math.max(0, Math.sin(beat + Math.PI)) * 0.5 + 0.3;
        head.current.rotation.x = Math.sin(beat * 2) * 0.3;
        head.current.rotation.y = 0;
      } else {
        group.current.rotation.y = Math.sin(beat * 0.5) * 0.2;
        group.current.position.x = 0;
        body.current.position.y = Math.sin(beat * 2) * 0.1 + 1.2;
        leftArm.current.rotation.x = Math.sin(beat) * 0.8;
        leftArm.current.rotation.z = 0.2;
        rightArm.current.rotation.x = Math.sin(beat + Math.PI) * 0.8;
        rightArm.current.rotation.z = -0.2;
        leftLeg.current.rotation.x = Math.sin(beat) * 0.4;
        leftLeg.current.position.y = Math.max(0, Math.sin(beat)) * 0.2 + 0.3;
        rightLeg.current.rotation.x = Math.sin(beat + Math.PI) * 0.4;
        rightLeg.current.position.y = Math.max(0, Math.sin(beat + Math.PI)) * 0.2 + 0.3;
        head.current.rotation.x = Math.sin(beat) * 0.1;
        head.current.rotation.y = 0;
      }
    } else if (danceState === 'miss') {
      body.current.position.y = 1.0;
      group.current.rotation.y = 0;
      group.current.position.x = 0;
      leftArm.current.rotation.x = -0.5;
      leftArm.current.rotation.z = 0.2;
      rightArm.current.rotation.x = -0.5;
      rightArm.current.rotation.z = -0.2;
      leftLeg.current.rotation.x = 0;
      leftLeg.current.position.y = 0.3;
      rightLeg.current.rotation.x = 0;
      rightLeg.current.position.y = 0.3;
      head.current.rotation.x = 0.5;
      head.current.rotation.y = 0;
    } else {
      body.current.position.y = Math.sin(t * 2) * 0.05 + 1.2;
      group.current.rotation.y = Math.sin(t * 0.5) * 0.1;
      group.current.position.x = 0;
      leftArm.current.rotation.x = Math.sin(t * 2) * 0.1;
      leftArm.current.rotation.z = 0.1;
      rightArm.current.rotation.x = Math.sin(t * 2 + Math.PI) * 0.1;
      rightArm.current.rotation.z = -0.1;
      leftLeg.current.rotation.x = 0;
      leftLeg.current.position.y = 0.3;
      rightLeg.current.rotation.x = 0;
      rightLeg.current.position.y = 0.3;
      head.current.rotation.x = Math.sin(t * 2) * 0.05;
      head.current.rotation.y = 0;
    }
  });

  // Mouth shape — scaled by lipThickness
  const lt = fp.lipThickness ?? 1;
  const mouthGeometry = useMemo(() => {
    if (fp.mouthStyle === 'smile' || fp.mouthStyle === 'grin') {
      return <torusGeometry args={[0.08 * lt, 0.02 * lt, 8, 16, Math.PI]} />;
    } else if (fp.mouthStyle === 'open') {
      return <sphereGeometry args={[0.06 * lt, 16, 16]} />;
    } else if (fp.mouthStyle === 'pout') {
      return <sphereGeometry args={[0.05 * lt, 16, 16]} />;
    }
    return <boxGeometry args={[0.12, 0.025 * lt, 0.02]} />;
  }, [fp.mouthStyle, lt]);

  // Anime eye shapes — BIG and expressive!
  const eyeGeometry = useMemo(() => {
    if (fp.eyeStyle === 'cool' || fp.eyeStyle === 'angry') {
      return <boxGeometry args={[0.14, 0.06, 0.06]} />;
    }
    if (fp.eyeStyle === 'happy') {
      // Happy anime eyes (curved line)
      return <boxGeometry args={[0.14, 0.04, 0.06]} />;
    }
    // Big round anime eyes
    return <sphereGeometry args={[0.12, 16, 16]} />;
  }, [fp.eyeStyle]);

  const legH = (hasShorts ? 0.3 : 0.6) * legLen;

  return (
    <group ref={group} scale={[heightScale, heightScale, heightScale]}>
      <group ref={body} position={[0, 1.2, 0]}>
        {/* Torso */}
        <mesh castShadow receiveShadow material={materials.torsoMat}>
          <boxGeometry args={[torsoW, torsoH, torsoD]} />
        </mesh>

        {/* Female chest shape */}
        {isFemale && (
          <>
            <mesh position={[-0.15, 0.1, torsoD / 2 + 0.05]} material={materials.torsoMat} castShadow>
              <sphereGeometry args={[0.1 * fatW, 16, 16]} />
            </mesh>
            <mesh position={[0.15, 0.1, torsoD / 2 + 0.05]} material={materials.torsoMat} castShadow>
              <sphereGeometry args={[0.1 * fatW, 16, 16]} />
            </mesh>
          </>
        )}

        {/* Hip widening for female */}
        {isFemale && (
          <mesh position={[0, -torsoH / 2 + 0.05, 0]} material={materials.torsoMat} castShadow>
            <boxGeometry args={[hipW, 0.15, torsoD * 1.1]} />
          </mesh>
        )}

        {/* Vest overlay (slightly bigger than torso) */}
        {hasVest && hasJacket && materials.torsoMat && (
          <mesh castShadow material={materials.torsoMat}>
            <boxGeometry args={[torsoW + 0.05, torsoH * 0.8, torsoD + 0.06]} />
          </mesh>
        )}

        {/* Collar */}
        {(hasTshirt || hasJacket) && (
          <mesh position={[0, torsoH / 2 + 0.02, torsoD / 4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.15, 0.025, 8, 16]} />
            <meshToonMaterial color={hasJacket ? '#2a2a2a' : '#e5e5e5'} gradientMap={toonGradient} />
          </mesh>
        )}

        {/* Zipper line (jacket) */}
        {hasJacket && (
          <mesh position={[0, 0, torsoD / 2 + 0.01]} castShadow>
            <boxGeometry args={[0.015, torsoH * 0.8, 0.01]} />
            <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
          </mesh>
        )}

        {/* Belt (pants) */}
        {hasPants && (
          <mesh position={[0, -torsoH / 2 + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[torsoW / 2 + 0.02, 0.02, 8, 16]} />
            <meshStandardMaterial color="#5c3a1e" metalness={0.3} roughness={0.6} />
          </mesh>
        )}

        {/* Neck */}
        <mesh position={[0, torsoH / 2 + neckH / 2 + 0.05, 0]} material={materials.skin} castShadow>
          <cylinderGeometry args={[neckR, neckR, neckH, 8]} />
        </mesh>

        {/* Head */}
        <group ref={head} position={[0, torsoH / 2 + neckH + 0.2, 0]}>
          <mesh castShadow receiveShadow material={materials.skin}>
            <sphereGeometry args={[0.4 * headScale, 32, 32]} />
          </mesh>

          {/* Anime Eyes — scaled by eyeSpacing + eyeSize */}
          {(() => {
            const es = fp.eyeSpacing ?? 1;
            const ez = fp.eyeSize ?? 1;
            const eyeX = 0.15 * headScale * es;
            const eyeY = 0.08 * headScale;
            const eyeZ = 0.34 * headScale;
            return (
              <>
                {/* Left Eye */}
                <group position={[-eyeX, eyeY, eyeZ]} scale={[ez, ez, ez]}>
                  <mesh><sphereGeometry args={[0.13 * headScale, 16, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
                  <mesh position={[0, 0, 0.06 * headScale]} material={materials.eyeMat}><sphereGeometry args={[0.09 * headScale, 16, 16]} /></mesh>
                  <mesh position={[0, 0, 0.1 * headScale]}><sphereGeometry args={[0.05 * headScale, 16, 16]} /><meshBasicMaterial color="#000000" /></mesh>
                  <mesh position={[0.03 * headScale, 0.04 * headScale, 0.12 * headScale]}><sphereGeometry args={[0.025 * headScale, 8, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
                  <mesh position={[-0.02 * headScale, -0.02 * headScale, 0.11 * headScale]}><sphereGeometry args={[0.015 * headScale, 8, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
                </group>
                {/* Right Eye */}
                <group position={[eyeX, eyeY, eyeZ]} scale={[ez, ez, ez]}>
                  <mesh><sphereGeometry args={[0.13 * headScale, 16, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
                  <mesh position={[0, 0, 0.06 * headScale]} material={materials.eyeMat}><sphereGeometry args={[0.09 * headScale, 16, 16]} /></mesh>
                  <mesh position={[0, 0, 0.1 * headScale]}><sphereGeometry args={[0.05 * headScale, 16, 16]} /><meshBasicMaterial color="#000000" /></mesh>
                  <mesh position={[0.03 * headScale, 0.04 * headScale, 0.12 * headScale]}><sphereGeometry args={[0.025 * headScale, 8, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
                  <mesh position={[-0.02 * headScale, -0.02 * headScale, 0.11 * headScale]}><sphereGeometry args={[0.015 * headScale, 8, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
                </group>

                {/* Wink: hide one eye */}
                {fp.eyeStyle === 'wink' && (
                  <mesh position={[eyeX, eyeY + 0.02 * headScale, eyeZ + 0.02 * headScale]} material={materials.skin}>
                    <boxGeometry args={[0.14 * ez, 0.04, 0.04]} />
                  </mesh>
                )}
              </>
            );
          })()}

          {/* Eyebrows — always rendered unless 'none' */}
          {(fp.eyebrowStyle ?? 'thin') !== 'none' && (() => {
            const es = fp.eyeSpacing ?? 1;
            const browX = 0.15 * headScale * es;
            const browY = 0.2 * headScale;
            const browZ = 0.36 * headScale;
            const bt = fp.eyebrowThickness ?? 1;
            const browColor = fp.eyebrowColor ?? fp.hairColor;
            const angryTilt = fp.eyeStyle === 'angry' ? 0.3 : 0;
            const browStyle = fp.eyebrowStyle ?? 'thin';

            let browW = 0.12, browH = 0.025 * bt;
            if (browStyle === 'thick') { browW = 0.14; browH = 0.04 * bt; }
            if (browStyle === 'bushy') { browW = 0.14; browH = 0.05 * bt; }
            if (browStyle === 'straight') { browW = 0.12; browH = 0.025 * bt; }

            const isArched = browStyle === 'arched';

            return (
              <>
                <mesh position={[-browX, browY, browZ]} rotation={[0, 0, -angryTilt]}>
                  {isArched
                    ? <torusGeometry args={[0.06, 0.015 * bt, 8, 8, Math.PI]} />
                    : <boxGeometry args={[browW, browH, 0.02]} />
                  }
                  <meshBasicMaterial color={browColor} />
                </mesh>
                <mesh position={[browX, browY, browZ]} rotation={[0, 0, angryTilt]}>
                  {isArched
                    ? <torusGeometry args={[0.06, 0.015 * bt, 8, 8, Math.PI]} />
                    : <boxGeometry args={[browW, browH, 0.02]} />
                  }
                  <meshBasicMaterial color={browColor} />
                </mesh>
              </>
            );
          })()}

          {/* Nose */}
          {(() => {
            const ns = fp.noseSize ?? 1;
            const nShape = fp.noseShape ?? 'button';
            return (
              <group position={[0, -0.02 * headScale, 0.4 * headScale]}>
                {nShape === 'button' && (
                  <mesh material={materials.skin}><sphereGeometry args={[0.04 * ns * headScale, 8, 8]} /></mesh>
                )}
                {nShape === 'pointed' && (
                  <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.skin}><coneGeometry args={[0.03 * ns * headScale, 0.08 * ns * headScale, 6]} /></mesh>
                )}
                {nShape === 'wide' && (
                  <mesh material={materials.skin}><boxGeometry args={[0.08 * ns * headScale, 0.04 * ns * headScale, 0.04]} /></mesh>
                )}
                {nShape === 'flat' && (
                  <mesh material={materials.skin}><boxGeometry args={[0.06 * ns * headScale, 0.03 * ns * headScale, 0.02]} /></mesh>
                )}
              </group>
            );
          })()}

          {/* Ears */}
          {(() => {
            const earSz = fp.earSize ?? 1;
            const eShape = fp.earShape ?? 'round';
            const earYPos = 0.05 * headScale;
            const earXPos = 0.38 * headScale;
            const earMesh = eShape === 'pointed'
              ? <coneGeometry args={[0.04 * earSz * headScale, 0.1 * earSz * headScale, 6]} />
              : eShape === 'small'
                ? <sphereGeometry args={[0.04 * earSz * headScale, 6, 6]} />
                : <sphereGeometry args={[0.06 * earSz * headScale, 8, 8]} />;
            return (
              <>
                <mesh position={[-earXPos, earYPos, 0]} material={materials.skin}>
                  {earMesh}
                </mesh>
                <mesh position={[earXPos, earYPos, 0]} material={materials.skin}>
                  {eShape === 'pointed'
                    ? <coneGeometry args={[0.04 * earSz * headScale, 0.1 * earSz * headScale, 6]} />
                    : eShape === 'small'
                      ? <sphereGeometry args={[0.04 * earSz * headScale, 6, 6]} />
                      : <sphereGeometry args={[0.06 * earSz * headScale, 8, 8]} />
                  }
                </mesh>
              </>
            );
          })()}

          {/* Chin */}
          {(() => {
            const cShape = fp.chinShape ?? 'round';
            const cw = fp.cheekWidth ?? 1;
            const chinY = -0.35 * headScale;
            const chinZ = 0.1 * headScale;
            return (
              <group position={[0, chinY, chinZ]} scale={[cw, 1, 1]}>
                {cShape === 'round' && (
                  <mesh material={materials.skin}><sphereGeometry args={[0.1 * headScale, 8, 8]} /></mesh>
                )}
                {cShape === 'square' && (
                  <mesh material={materials.skin}><boxGeometry args={[0.2 * headScale, 0.08 * headScale, 0.15 * headScale]} /></mesh>
                )}
                {cShape === 'pointed' && (
                  <mesh rotation={[Math.PI, 0, 0]} material={materials.skin}><coneGeometry args={[0.08 * headScale, 0.12 * headScale, 6]} /></mesh>
                )}
              </group>
            );
          })()}

          {/* Freckles */}
          {fp.freckles && (() => {
            const frecklePositions = [
              [-0.12, -0.04, 0.37], [-0.1, -0.02, 0.38], [-0.14, -0.06, 0.36], [-0.11, -0.07, 0.37],
              [0.12, -0.04, 0.37], [0.1, -0.02, 0.38], [0.14, -0.06, 0.36], [0.11, -0.07, 0.37],
            ] as [number, number, number][];
            return (
              <>
                {frecklePositions.map((pos, i) => (
                  <mesh key={i} position={[pos[0] * headScale, pos[1] * headScale, pos[2] * headScale]}>
                    <sphereGeometry args={[0.008 * headScale, 4, 4]} />
                    <meshBasicMaterial color="#c68b59" />
                  </mesh>
                ))}
              </>
            );
          })()}

          {/* Mouth */}
          <mesh position={[0, -0.1 * headScale, 0.38 * headScale]} rotation={fp.mouthStyle === 'smile' || fp.mouthStyle === 'grin' ? [Math.PI, 0, 0] : [0, 0, 0]} material={materials.mouthMat}>
            {mouthGeometry}
          </mesh>

          {/* Hat */}
          {hasHat && materials.hatMat && (
            <group position={[0, 0.35 * headScale, 0]}>
              {hat === 'hat_tophat' ? (
                <>
                  <mesh material={materials.hatMat} castShadow>
                    <cylinderGeometry args={[0.25, 0.25, 0.5, 16]} />
                  </mesh>
                  <mesh position={[0, -0.25, 0]} material={materials.hatMat} castShadow>
                    <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
                  </mesh>
                </>
              ) : hat === 'hat_crown' ? (
                <>
                  <mesh material={materials.hatMat} castShadow>
                    <cylinderGeometry args={[0.32, 0.28, 0.25, 5]} />
                  </mesh>
                  {[0, 1, 2, 3, 4].map(i => (
                    <mesh key={i} position={[Math.sin(i * Math.PI * 2 / 5) * 0.28, 0.18, Math.cos(i * Math.PI * 2 / 5) * 0.28]} material={materials.hatMat} castShadow>
                      <coneGeometry args={[0.05, 0.15, 4]} />
                    </mesh>
                  ))}
                </>
              ) : hat === 'hat_beanie' ? (
                <mesh material={materials.hatMat} castShadow>
                  <sphereGeometry args={[0.38, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
              ) : (
                /* Snapback */
                <>
                  <mesh material={materials.hatMat} castShadow>
                    <cylinderGeometry args={[0.35, 0.32, 0.15, 16]} />
                  </mesh>
                  <mesh position={[0, -0.05, 0.3]} rotation={[-0.3, 0, 0]} material={materials.hatMat} castShadow>
                    <boxGeometry args={[0.35, 0.03, 0.2]} />
                  </mesh>
                </>
              )}
            </group>
          )}

          {/* Glasses */}
          {hasGlasses && materials.glassMat && (
            <group position={[0, 0.12 * headScale, 0.43 * headScale]}>
               {/* Lenses */}
               <mesh position={[-0.15, 0, 0]} material={materials.glassMat}>
                 <boxGeometry args={[0.16, 0.08, 0.02]} />
               </mesh>
               <mesh position={[0.15, 0, 0]} material={materials.glassMat}>
                 <boxGeometry args={[0.16, 0.08, 0.02]} />
               </mesh>
               {/* Bridge */}
               <mesh material={materials.glassMat}>
                 <boxGeometry args={[0.08, 0.02, 0.02]} />
               </mesh>
               {/* Arms */}
               <mesh position={[-0.24, 0, -0.15]} material={materials.glassMat}>
                 <boxGeometry args={[0.02, 0.02, 0.3]} />
               </mesh>
               <mesh position={[0.24, 0, -0.15]} material={materials.glassMat}>
                 <boxGeometry args={[0.02, 0.02, 0.3]} />
               </mesh>
            </group>
          )}

          {/* Beard */}
          {hasBeard && materials.beardMat && (
            <mesh position={[0, -0.2 * headScale, 0.25 * headScale]} material={materials.beardMat} castShadow>
              <boxGeometry args={[0.3 * headScale, 0.2 * headScale, 0.15 * headScale]} />
            </mesh>
          )}

          {/* Mustache */}
          {hasMustache && materials.mustacheMat && (
            <mesh position={[0, -0.05 * headScale, 0.38 * headScale]} material={materials.mustacheMat}>
              <boxGeometry args={[0.2 * headScale, 0.05 * headScale, 0.03]} />
            </mesh>
          )}

          {/* Hair — Super Saiyan override for admin aura */}
          {effect === 'e_admin_aura' ? (
            <group position={[0, 0.3 * headScale, 0]}>
               {/* SSJ base hair volume */}
               <mesh castShadow>
                  <sphereGeometry args={[0.44 * headScale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.3} emissive="#f59e0b" emissiveIntensity={0.3} />
               </mesh>
               {/* Central tall spike */}
               <mesh position={[0, 0.25, -0.05]} rotation={[0.15, 0, 0]} castShadow>
                  <coneGeometry args={[0.18 * headScale, 0.7, 5]} />
                  <meshStandardMaterial color="#fde68a" roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.4} />
               </mesh>
               {/* Left spike */}
               <mesh position={[-0.2, 0.18, -0.05]} rotation={[0.1, 0, 0.4]} castShadow>
                  <coneGeometry args={[0.14 * headScale, 0.55, 5]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.3} emissive="#f59e0b" emissiveIntensity={0.3} />
               </mesh>
               {/* Right spike */}
               <mesh position={[0.2, 0.18, -0.05]} rotation={[0.1, 0, -0.4]} castShadow>
                  <coneGeometry args={[0.14 * headScale, 0.55, 5]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.3} emissive="#f59e0b" emissiveIntensity={0.3} />
               </mesh>
               {/* Back left spike */}
               <mesh position={[-0.15, 0.1, -0.2]} rotation={[-0.3, 0.2, 0.5]} castShadow>
                  <coneGeometry args={[0.12 * headScale, 0.5, 4]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.3} />
               </mesh>
               {/* Back right spike */}
               <mesh position={[0.15, 0.1, -0.2]} rotation={[-0.3, -0.2, -0.5]} castShadow>
                  <coneGeometry args={[0.12 * headScale, 0.5, 4]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.3} />
               </mesh>
               {/* Small accent spikes */}
               <mesh position={[-0.3, 0.05, -0.1]} rotation={[0, 0, 0.7]} castShadow>
                  <coneGeometry args={[0.08 * headScale, 0.35, 4]} />
                  <meshStandardMaterial color="#fde68a" roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.2} />
               </mesh>
               <mesh position={[0.3, 0.05, -0.1]} rotation={[0, 0, -0.7]} castShadow>
                  <coneGeometry args={[0.08 * headScale, 0.35, 4]} />
                  <meshStandardMaterial color="#fde68a" roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.2} />
               </mesh>
            </group>
          ) : fp.hairStyle !== 'none' ? (
            <group position={[0, 0.3 * headScale, 0]}>
              {/* Hair cap (shared by most styles) */}
              {(() => {
                const hs = fp.hairStyle;
                const hc = fp.hairColor;
                const r = 0.42 * headScale;
                const hairMat = <meshToonMaterial color={hc} gradientMap={toonGradient} />;
                const cap = (
                  <mesh castShadow>
                    <sphereGeometry args={[r, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
                    {hairMat}
                  </mesh>
                );

                // ── Short ──
                if (hs === 'short') return cap;

                // ── Long ──
                if (hs === 'long') return (
                  <group>
                    {cap}
                    <mesh position={[0, -0.4, -0.2]} rotation={[0, Math.PI, 0]} castShadow>
                      <cylinderGeometry args={[0.4 * headScale, 0.45 * headScale, 0.8, 16, 1, false, 0, Math.PI]} />
                      {hairMat}
                    </mesh>
                  </group>
                );

                // ── Spike ──
                if (hs === 'spike') return (
                  <group>
                    {cap}
                    <mesh position={[0, 0.15, 0]} castShadow><coneGeometry args={[0.35 * headScale, 0.5, 8]} />{hairMat}</mesh>
                    <mesh position={[-0.15, 0.1, 0]} rotation={[0, 0, 0.3]} castShadow><coneGeometry args={[0.15 * headScale, 0.3, 6]} />{hairMat}</mesh>
                    <mesh position={[0.15, 0.1, 0]} rotation={[0, 0, -0.3]} castShadow><coneGeometry args={[0.15 * headScale, 0.3, 6]} />{hairMat}</mesh>
                  </group>
                );

                // ── Ponytail ──
                if (hs === 'ponytail') return (
                  <group>
                    {cap}
                    <mesh position={[0, 0, -0.4]} castShadow><sphereGeometry args={[0.1, 8, 8]} />{hairMat}</mesh>
                    <mesh position={[0, -0.3, -0.5]} rotation={[-0.2, 0, 0]} castShadow><cylinderGeometry args={[0.08, 0.02, 0.6]} />{hairMat}</mesh>
                  </group>
                );

                // ── Bob ──
                if (hs === 'bob') return (
                  <group>
                    {cap}
                    <mesh position={[0, -0.15, -0.1]} castShadow>
                      <boxGeometry args={[0.7 * headScale, 0.35 * headScale, 0.5 * headScale]} />
                      {hairMat}
                    </mesh>
                  </group>
                );

                // ── Twintails ──
                if (hs === 'twintails') return (
                  <group>
                    {cap}
                    <mesh position={[-0.3, -0.1, -0.1]} castShadow><sphereGeometry args={[0.08, 8, 8]} />{hairMat}</mesh>
                    <mesh position={[-0.3, -0.45, -0.15]} rotation={[-0.1, 0, 0.1]} castShadow><cylinderGeometry args={[0.07, 0.03, 0.6, 8]} />{hairMat}</mesh>
                    <mesh position={[0.3, -0.1, -0.1]} castShadow><sphereGeometry args={[0.08, 8, 8]} />{hairMat}</mesh>
                    <mesh position={[0.3, -0.45, -0.15]} rotation={[-0.1, 0, -0.1]} castShadow><cylinderGeometry args={[0.07, 0.03, 0.6, 8]} />{hairMat}</mesh>
                  </group>
                );

                // ── Braid ──
                if (hs === 'braid') return (
                  <group>
                    {cap}
                    {[0, 1, 2, 3, 4].map(i => (
                      <mesh key={i} position={[0, -0.1 - i * 0.15, -0.35 - i * 0.03]} castShadow>
                        <sphereGeometry args={[0.07 - i * 0.008, 8, 8]} />{hairMat}
                      </mesh>
                    ))}
                  </group>
                );

                // ── Afro ──
                if (hs === 'afro') return (
                  <mesh position={[0, 0.05, 0]} castShadow>
                    <sphereGeometry args={[0.6 * headScale, 16, 16]} />
                    {hairMat}
                  </mesh>
                );

                // ── Mohawk ──
                if (hs === 'mohawk') return (
                  <group>
                    <mesh castShadow><sphereGeometry args={[r * 0.95, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.5]} />{hairMat}</mesh>
                    {[-0.15, -0.05, 0.05, 0.15, 0.25].map((z, i) => {
                      const h = [0.25, 0.35, 0.4, 0.35, 0.25][i];
                      return <mesh key={i} position={[0, 0.08 + h / 2, -z]} castShadow><coneGeometry args={[0.06, h, 5]} />{hairMat}</mesh>;
                    })}
                  </group>
                );

                // ── Sideshave ──
                if (hs === 'sideshave') return (
                  <group>
                    <mesh castShadow><sphereGeometry args={[r * 0.95, 16, 16, 0, Math.PI, 0, Math.PI / 1.8]} />{hairMat}</mesh>
                    <mesh position={[-0.1, -0.2, -0.1]} castShadow>
                      <boxGeometry args={[0.35 * headScale, 0.4 * headScale, 0.5 * headScale]} />
                      {hairMat}
                    </mesh>
                  </group>
                );

                // ── Curly ──
                if (hs === 'curly') return (
                  <group>
                    {cap}
                    {Array.from({ length: 14 }, (_, i) => {
                      const angle = (i / 14) * Math.PI * 2;
                      const yOff = -0.05 - Math.random() * 0.15;
                      return (
                        <mesh key={i} position={[Math.sin(angle) * 0.38 * headScale, yOff, Math.cos(angle) * 0.38 * headScale]} castShadow>
                          <sphereGeometry args={[0.06 * headScale, 6, 6]} />{hairMat}
                        </mesh>
                      );
                    })}
                  </group>
                );

                // ── Wavy ──
                if (hs === 'wavy') return (
                  <group>
                    {cap}
                    {[-0.2, -0.1, 0, 0.1, 0.2].map((xOff, i) => (
                      <mesh key={i} position={[xOff, -0.3 - i * 0.05, -0.25 + Math.sin(i) * 0.05]} rotation={[0.2, 0, xOff * 0.5]} castShadow>
                        <cylinderGeometry args={[0.04, 0.06, 0.5 + i * 0.05, 8]} />{hairMat}
                      </mesh>
                    ))}
                  </group>
                );

                // ── Bun ──
                if (hs === 'bun') return (
                  <group>
                    {cap}
                    <mesh position={[0, 0.1, -0.25]} castShadow><sphereGeometry args={[0.15, 12, 12]} />{hairMat}</mesh>
                  </group>
                );

                // ── Pigtails ──
                if (hs === 'pigtails') return (
                  <group>
                    {cap}
                    <mesh position={[-0.25, 0, -0.15]} castShadow><sphereGeometry args={[0.08, 8, 8]} />{hairMat}</mesh>
                    <mesh position={[-0.25, -0.25, -0.2]} castShadow><cylinderGeometry args={[0.06, 0.04, 0.35, 8]} />{hairMat}</mesh>
                    <mesh position={[0.25, 0, -0.15]} castShadow><sphereGeometry args={[0.08, 8, 8]} />{hairMat}</mesh>
                    <mesh position={[0.25, -0.25, -0.2]} castShadow><cylinderGeometry args={[0.06, 0.04, 0.35, 8]} />{hairMat}</mesh>
                  </group>
                );

                return cap; // fallback
              })()}
            </group>
          ) : null}
        </group>

        {/* Arms */}
        <mesh ref={leftArm} position={[-(torsoW / 2 + armW / 2 + 0.05), 0.3, 0]} material={materials.armMat} castShadow>
          <boxGeometry args={[armW, armH, armW]} />
          <mesh position={[0, -armH / 2, 0]} material={materials.skin}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
          {/* Cuff */}
          {hasJacket && (
            <mesh position={[0, -armH / 2 + 0.08, 0]}>
              <cylinderGeometry args={[armW / 2 + 0.03, armW / 2 + 0.03, 0.06, 8]} />
              <meshToonMaterial color={fp.hairColor !== '#1f2937' ? '#1f2937' : '#4a4a4a'} gradientMap={toonGradient} />
            </mesh>
          )}
        </mesh>
        <mesh ref={rightArm} position={[torsoW / 2 + armW / 2 + 0.05, 0.3, 0]} material={materials.armMat} castShadow>
          <boxGeometry args={[armW, armH, armW]} />
          <mesh position={[0, -armH / 2, 0]} material={materials.skin}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
          {hasJacket && (
            <mesh position={[0, -armH / 2 + 0.08, 0]}>
              <cylinderGeometry args={[armW / 2 + 0.03, armW / 2 + 0.03, 0.06, 8]} />
              <meshToonMaterial color={fp.hairColor !== '#1f2937' ? '#1f2937' : '#4a4a4a'} gradientMap={toonGradient} />
            </mesh>
          )}
        </mesh>

        {/* Wings */}
        {hasWings && materials.wingMat && (
          <>
            <mesh position={[-0.5, 0.2, -torsoD / 2 - 0.05]} rotation={[0, -0.3, 0.2]} material={materials.wingMat} castShadow>
              <planeGeometry args={[0.8, 1.2]} />
            </mesh>
            <mesh position={[0.5, 0.2, -torsoD / 2 - 0.05]} rotation={[0, 0.3, -0.2]} material={materials.wingMat} castShadow>
              <planeGeometry args={[0.8, 1.2]} />
            </mesh>
          </>
        )}
      </group>

      {/* Legs */}
      <mesh ref={leftLeg} position={[-hipW * 0.3, 0.3, 0]} material={materials.legMat} castShadow>
        <boxGeometry args={[legW, legH, legW]} />
        {/* Pocket */}
        {(hasPants || hasShorts) && (
          <mesh position={[legW / 2, 0.05, legW / 2 + 0.005]}>
            <boxGeometry args={[0.06, 0.07, 0.01]} />
            <meshToonMaterial color="#555555" gradientMap={toonGradient} />
          </mesh>
        )}
      </mesh>
      <mesh ref={rightLeg} position={[hipW * 0.3, 0.3, 0]} material={materials.legMat} castShadow>
        <boxGeometry args={[legW, legH, legW]} />
        {(hasPants || hasShorts) && (
          <mesh position={[-legW / 2, 0.05, legW / 2 + 0.005]}>
            <boxGeometry args={[0.06, 0.07, 0.01]} />
            <meshToonMaterial color="#555555" gradientMap={toonGradient} />
          </mesh>
        )}
      </mesh>

      {/* Skin below shorts */}
      {hasShorts && (
        <>
          <mesh position={[-hipW * 0.3, 0.05, 0]} material={materials.skin} castShadow>
            <boxGeometry args={[legW, 0.25 * legLen, legW]} />
          </mesh>
          <mesh position={[hipW * 0.3, 0.05, 0]} material={materials.skin} castShadow>
            <boxGeometry args={[legW, 0.25 * legLen, legW]} />
          </mesh>
        </>
      )}

      {/* Accessories (Necklace/Halo etc) */}
      {hasAccessory && materials.accMat && (
         <group position={[0, torsoH / 2 + 0.1, 0]}>
            {accessory === 'a_halo_ring' ? (
               <mesh position={[0, 0.5 * headScale, 0]} rotation={[Math.PI/2 - 0.2, 0, 0]} material={materials.accMat} castShadow>
                  <torusGeometry args={[0.4 * headScale, 0.04, 16, 32]} />
               </mesh>
            ) : accessory === 'a_headphones' ? (
               <group position={[0, -0.05, 0.05]} rotation={[0.4, 0, 0]}>
                  <mesh material={materials.accMat}>
                     <torusGeometry args={[0.25, 0.04, 16, 32]} />
                  </mesh>
                  <mesh position={[-0.25, 0, 0]} material={materials.accMat}>
                     <cylinderGeometry args={[0.08, 0.08, 0.05]} />
                  </mesh>
                  <mesh position={[0.25, 0, 0]} material={materials.accMat}>
                     <cylinderGeometry args={[0.08, 0.08, 0.05]} />
                  </mesh>
               </group>
            ) : (
               <mesh position={[0, 0, 0]} rotation={[Math.PI/2 + 0.2, 0, 0]} material={materials.accMat} castShadow>
                  <torusGeometry args={[0.25, 0.03, 16, 32]} />
               </mesh>
            )}
         </group>
      )}

      {/* Shoes */}
      <mesh position={[-hipW * 0.3, 0.1, 0.1]} material={materials.shoeMat} castShadow>
        <boxGeometry args={[legW + 0.05, 0.2, 0.5]} />
      </mesh>
      <mesh position={[hipW * 0.3, 0.1, 0.1]} material={materials.shoeMat} castShadow>
        <boxGeometry args={[legW + 0.05, 0.2, 0.5]} />
      </mesh>

      {/* Rarity Auras */}
      {materials.hasAnyLegendary && (
         <group position={[0, torsoH, 0]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
               <Float key={i} speed={4} rotationIntensity={0} floatIntensity={1} position={[Math.sin(i*0.8)*1.5, 0, Math.cos(i*0.8)*1.5]}>
                  <mesh>
                     <sphereGeometry args={[0.08, 4, 4]} />
                     <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
                  </mesh>
               </Float>
            ))}
            <Float speed={1} rotationIntensity={2} floatIntensity={0}>
               <mesh>
                  <cylinderGeometry args={[1.5, 0, 3, 32, 1, true]} />
                  <meshBasicMaterial color="#fbbf24" transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
               </mesh>
            </Float>
         </group>
      )}
      {!materials.hasAnyLegendary && materials.hasAnyEpic && (
         <group position={[0, torsoH, 0]}>
            {[0, 1, 2, 3].map(i => (
               <Float key={i} speed={3} rotationIntensity={0} floatIntensity={2} position={[Math.sin(i*1.5)*1.2, 0, Math.cos(i*1.5)*1.2]}>
                  <mesh>
                     <sphereGeometry args={[0.06, 4, 4]} />
                     <meshBasicMaterial color="#a855f7" transparent opacity={0.6} />
                  </mesh>
               </Float>
            ))}
         </group>
      )}

      {/* Global Effects */}
      {effect === 'e_butterflies' && (
         <group>
           {[0, 1, 2, 3, 4].map(i => (
             <Float key={i} speed={5 + i} rotationIntensity={4} floatIntensity={3} position={[Math.sin(i)*1.2, 1.5, Math.cos(i)*1.2]}>
               <mesh>
                  <planeGeometry args={[0.1, 0.1]} />
                  <meshBasicMaterial color="#ff69b4" side={THREE.DoubleSide} transparent opacity={0.8} />
               </mesh>
             </Float>
           ))}
         </group>
      )}
      {effect === 'e_fire_dance' && (
         <group position={[0, 0, 0]}>
           {[0, 1, 2, 3, 4, 5, 6].map(i => (
             <Float key={i} speed={8} rotationIntensity={1} floatIntensity={3} position={[Math.sin(i)*0.8, 1, Math.cos(i)*0.8]}>
               <mesh>
                  <sphereGeometry args={[0.15, 4, 4]} />
                  <meshBasicMaterial color="#ff4500" transparent opacity={0.6} />
               </mesh>
             </Float>
           ))}
         </group>
      )}
      {effect === 'e_sparkle_trail' && (
         <group position={[0, 1, 0]}>
            <Float speed={5} rotationIntensity={10} floatIntensity={2}>
               <mesh>
                  <sphereGeometry args={[1.5, 8, 8]} />
                  <meshBasicMaterial color="#ffd700" wireframe transparent opacity={0.2} />
               </mesh>
            </Float>
         </group>
      )}
      {effect === 'e_smoke_aura' && (
         <group position={[0, 1, 0]}>
            {[0, 1, 2, 3].map(i => (
               <Float key={i} speed={2} rotationIntensity={5} floatIntensity={1} position={[0, 0, 0]}>
                  <mesh rotation={[0, i, 0]}>
                     <torusGeometry args={[1.2 - i*0.2, 0.2, 8, 16]} />
                     <meshBasicMaterial color="#6b7280" transparent opacity={0.15} />
                  </mesh>
               </Float>
            ))}
         </group>
      )}
      {effect === 'e_music_notes' && (
         <group>
           {[0, 1, 2].map(i => (
             <Float key={i} speed={4} rotationIntensity={3} floatIntensity={3} position={[Math.cos(i*2)*1.5, 1, Math.sin(i*2)*1.5]}>
               <mesh>
                  <coneGeometry args={[0.05, 0.15, 4]} />
                  <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} />
               </mesh>
             </Float>
           ))}
         </group>
      )}
      {effect === 'e_black_hole' && (
         <group position={[0, 1.2, -1.0]}>
            <Float speed={5} rotationIntensity={10} floatIntensity={1}>
               <mesh>
                  <sphereGeometry args={[0.4, 16, 16]} />
                  <meshBasicMaterial color="#000000" />
               </mesh>
               <mesh>
                  <torusGeometry args={[0.6, 0.05, 16, 32]} />
                  <meshBasicMaterial color="#c026d3" transparent opacity={0.6} />
               </mesh>
            </Float>
         </group>
      )}
      {effect === 'e_cyber_matrix' && (
         <group position={[0, 1, 0]}>
            <Float speed={1} rotationIntensity={2} floatIntensity={0.5}>
               <mesh>
                  <cylinderGeometry args={[1.2, 1.2, 3, 16, 1, true]} />
                  <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.15} side={THREE.DoubleSide} />
               </mesh>
            </Float>
         </group>
      )}
      {/* Admin Aura — Super Saiyan style with lightning */}
      {effect === 'e_admin_aura' && (
         <group>
            {/* Inner flame aura — pulsing golden energy field */}
            <Float speed={8} rotationIntensity={0.5} floatIntensity={0.3}>
               <mesh position={[0, 1, 0]}>
                  <sphereGeometry args={[1.1, 16, 16]} />
                  <meshBasicMaterial color="#fbbf24" transparent opacity={0.06} />
               </mesh>
            </Float>
            {/* Outer flame aura — flickering */}
            <Float speed={12} rotationIntensity={1} floatIntensity={0.5}>
               <mesh position={[0, 1.1, 0]}>
                  <sphereGeometry args={[1.4, 12, 12]} />
                  <meshBasicMaterial color="#f59e0b" transparent opacity={0.04} />
               </mesh>
            </Float>
            {/* Rising flame pillars */}
            {[0, 1, 2, 3, 4, 5].map(i => (
               <Float key={`flame${i}`} speed={6 + i * 2} rotationIntensity={1} floatIntensity={4}
                  position={[Math.cos(i * 1.05) * 0.7, 0.5, Math.sin(i * 1.05) * 0.7]}>
                  <mesh>
                     <coneGeometry args={[0.08, 0.6 + i * 0.1, 4]} />
                     <meshBasicMaterial color={i % 2 === 0 ? '#fbbf24' : '#fde68a'} transparent opacity={0.4} />
                  </mesh>
               </Float>
            ))}
            {/* Lightning bolts — jagged lines that flicker */}
            {[0, 1, 2, 3].map(i => (
               <Float key={`bolt${i}`} speed={15 + i * 5} rotationIntensity={20} floatIntensity={5}
                  position={[Math.cos(i * 1.57) * 1.0, 0.8 + i * 0.3, Math.sin(i * 1.57) * 1.0]}>
                  <group rotation={[0, i * 0.8, Math.random() * Math.PI]}>
                     {/* Lightning segment 1 */}
                     <mesh position={[0, 0, 0]} rotation={[0, 0, 0.3]}>
                        <boxGeometry args={[0.02, 0.3, 0.02]} />
                        <meshBasicMaterial color="#60a5fa" transparent opacity={0.9} />
                     </mesh>
                     {/* Lightning segment 2 — angled */}
                     <mesh position={[0.08, 0.2, 0]} rotation={[0, 0, -0.5]}>
                        <boxGeometry args={[0.02, 0.25, 0.02]} />
                        <meshBasicMaterial color="#93c5fd" transparent opacity={0.8} />
                     </mesh>
                     {/* Lightning segment 3 */}
                     <mesh position={[-0.05, 0.35, 0]} rotation={[0, 0, 0.4]}>
                        <boxGeometry args={[0.015, 0.2, 0.015]} />
                        <meshBasicMaterial color="#bfdbfe" transparent opacity={0.7} />
                     </mesh>
                  </group>
               </Float>
            ))}
            {/* Energy sparks around body */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
               <Float key={`spark${i}`} speed={10 + i * 3} rotationIntensity={15} floatIntensity={6}
                  position={[Math.cos(i * 0.785) * (0.8 + (i % 3) * 0.3), 0.3 + i * 0.2, Math.sin(i * 0.785) * (0.8 + (i % 3) * 0.3)]}>
                  <mesh>
                     <octahedronGeometry args={[0.03 + (i % 3) * 0.01]} />
                     <meshBasicMaterial color={i % 3 === 0 ? '#fde68a' : i % 3 === 1 ? '#60a5fa' : '#fbbf24'} />
                  </mesh>
               </Float>
            ))}
         </group>
      )}
    </group>
  );
}

// ─── Error Boundary ─────────────────────────────────────────────────
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) {
    console.warn('[AnimatedAvatar] Model load error, switching to procedural fallback:', error?.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Loading Indicator ──────────────────────────────────────────────
function LoadingFallback() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 2;
      ref.current.position.y = Math.sin(state.clock.getElapsedTime() * 3) * 0.2;
    }
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#22d3ee" wireframe emissive="#22d3ee" emissiveIntensity={0.5} />
    </mesh>
  );
}

// ─── Hauptkomponente ────────────────────────────────────────────────
export function AnimatedAvatar({
  modelUrl,
  jacket = 'leather_black', tshirt = 'none', vest = 'none',
  pants = 'denim_blue', shorts = 'none', shoes = 'shoes_sneakers',
  hat = 'none', glasses = 'none', beard = 'none', mustache = 'none', wings = 'none', effect = 'none', accessory = 'none',
  body: bodyParams, face: faceParams,
  danceState, intensity, bpm = 120, compact = false,
}: AnimatedAvatarProps) {
  const hasModel = !!modelUrl;
  const cameraPos: [number, number, number] = compact ? [0, 1.5, 3.5] : [0, 2, 5];
  const fov = compact ? 40 : 45;

  const proceduralFallback = (
    <ProceduralRobot
      jacket={jacket} tshirt={tshirt} vest={vest}
      pants={pants} shorts={shorts} shoes={shoes}
      hat={hat} glasses={glasses} beard={beard} mustache={mustache} wings={wings} effect={effect} accessory={accessory}
      bodyParams={bodyParams} faceParams={faceParams}
      danceState={danceState} intensity={intensity} bpm={bpm}
    />
  );

  return (
    <div className="w-full h-full relative" style={{ minHeight: compact ? '120px' : '450px' }}>
      <Canvas camera={{ position: cameraPos, fov }} shadows>
        <Suspense fallback={<LoadingFallback />}>
          {/* Anime-style lighting — strong directional for toon shading */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 6, 4]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[-4, 4, -3]} intensity={0.4} color="#88ccff" />
          <spotLight position={[4, 4, -3]} intensity={0.4} color="#ff88cc" />
          {/* Rim light for anime outline effect */}
          <directionalLight position={[-2, 3, -3]} intensity={0.6} color="#aaddff" />

          {hasModel ? (
            <ModelErrorBoundary fallback={proceduralFallback}>
              <SkeletalModel url={modelUrl!} danceState={danceState} intensity={intensity} bpm={bpm} />
            </ModelErrorBoundary>
          ) : (
            <Float speed={1} rotationIntensity={0.1} floatIntensity={0.1}>
              {proceduralFallback}
            </Float>
          )}

          <ContactShadows position={[0, compact ? -0.5 : -1, 0]} opacity={0.6} scale={10} blur={2} far={4} />

          {!compact ? (
            <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={15} target={[0, 1, 0]} maxPolarAngle={Math.PI / 1.8} />
          ) : (
            <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={[0, 0.8, 0]} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default AnimatedAvatar;
