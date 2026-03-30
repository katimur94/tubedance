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



// ─── Skelett-animiertes 3D-Modell (RPM oder lokales GLB) ───────────
function SkeletalModel({
  url, danceState, intensity, bpm = 120
}: {
  url: string; danceState: string; intensity: number; bpm: number
}) {
  const { scene, animations } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const controllerRef = useRef<AvatarAnimationController | null>(null);
  const [externalAnimsLoaded, setExternalAnimsLoaded] = useState(false);
  const hasEmbeddedAnimations = animations && animations.length > 0;

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    const controller = new AvatarAnimationController(scene);
    controllerRef.current = controller;

    if (hasEmbeddedAnimations) {
      animations.forEach((clip) => {
        const name = clip.name.toLowerCase();
        if (name.includes('idle')) controller.addClip('idle', clip);
        else if (name.includes('dance') || name.includes('samba') || name.includes('hip')) controller.addClip('dance_basic', clip);
        else if (name.includes('sad') || name.includes('miss') || name.includes('defeat')) controller.addClip('miss', clip);
        else controller.addClip('idle', clip);
      });
    }

    animationCache.loadAllAvailable().then((clips) => {
      clips.forEach((clip, style) => { controller.addClip(style, clip); });
      setExternalAnimsLoaded(true);
    });

    controller.play('idle');
    return () => { controller.dispose(); };
  }, [scene, animations, hasEmbeddedAnimations]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    const timeScale = bpm / 120;

    if (danceState === 'dancing') {
      const availableStyles = animationCache.getAvailableStyles();
      const style = AvatarAnimationController.chooseDanceStyle(intensity, availableStyles);
      controller.play(style, timeScale);
    } else if (danceState === 'miss') {
      controller.play('miss', 1);
    } else {
      controller.play('idle', 1);
    }
  }, [danceState, intensity, bpm, externalAnimsLoaded]);

  useFrame((state, delta) => {
    const controller = controllerRef.current;
    if (controller) controller.update(delta);

    if (!animationCache.hasAnyAnimations() && !hasEmbeddedAnimations && group.current) {
      const t = state.clock.getElapsedTime();
      const beat = t * (bpm / 60) * Math.PI;
      if (danceState === 'dancing') {
        group.current.position.y = Math.abs(Math.sin(beat)) * 0.15 * intensity - 1;
        group.current.rotation.y = Math.sin(beat * 0.5) * 0.3 * intensity;
      } else if (danceState === 'miss') {
        group.current.position.y = -1;
        group.current.rotation.x = 0.15;
      } else {
        group.current.position.y = Math.sin(t * 2) * 0.03 - 1;
        group.current.rotation.y = Math.sin(t * 0.5) * 0.05;
      }
    }
  });

  return <primitive ref={group} object={scene} position={[0, -1, 0]} scale={1.2} />;
}

// ─── Prozeduraler Box-Roboter (Vollständig anpassbar) ──────────────
const DEFAULT_BODY_INTERNAL: BodyParams = { gender: 'male', height: 1, muscles: 0.3, bodyFat: 0.2, headSize: 1, skinColor: '#f3f4f6' };
const DEFAULT_FACE_INTERNAL: FaceParams = { eyeStyle: 'normal', eyeColor: '#22d3ee', mouthStyle: 'smile', hairStyle: 'long', hairColor: '#1f2937' };

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

  // Body dimensions based on params
  const isFemale = bp.gender === 'female';
  const heightScale = bp.height;
  const muscleW = 1 + bp.muscles * 0.3;
  const fatW = 1 + bp.bodyFat * 0.25;
  const torsoW = (isFemale ? 0.7 : 0.8) * muscleW * fatW;
  const torsoH = (isFemale ? 0.9 : 1.0);
  const torsoD = (isFemale ? 0.4 : 0.5) * fatW;
  const hipW = isFemale ? torsoW * 1.1 : torsoW * 0.95;
  const armW = 0.25 * muscleW;
  const legW = (isFemale ? 0.25 : 0.3) * muscleW * fatW;
  const headScale = bp.headSize;

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
          matOpts.iridescence = 1;
          matOpts.clearcoat = 1;
          matOpts.clearcoatRoughness = 0.1;
          matOpts.roughness = Math.max(0.05, (options.roughness || 0.5) * 0.3);
          matOpts.emissive = new THREE.Color(0x332200);
          return new THREE.MeshPhysicalMaterial(matOpts);
       }
       return new THREE.MeshStandardMaterial(matOpts);
    };

    const skin = new THREE.MeshStandardMaterial({ color: bp.skinColor, roughness: 0.4, metalness: 0.05 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: danceState === 'miss' ? '#ef4444' : fp.eyeColor, toneMapped: false });

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

  // Mouth shape
  const mouthGeometry = useMemo(() => {
    if (fp.mouthStyle === 'smile' || fp.mouthStyle === 'grin') {
      // Curved smile — use torus
      return <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />;
    } else if (fp.mouthStyle === 'open') {
      return <sphereGeometry args={[0.06, 16, 16]} />;
    } else if (fp.mouthStyle === 'pout') {
      return <sphereGeometry args={[0.05, 16, 16]} />;
    }
    // neutral — line
    return <boxGeometry args={[0.12, 0.02, 0.02]} />;
  }, [fp.mouthStyle]);

  // Eye shapes
  const eyeGeometry = useMemo(() => {
    if (fp.eyeStyle === 'cool' || fp.eyeStyle === 'angry') {
      return <boxGeometry args={[0.1, 0.04, 0.04]} />;
    }
    return <sphereGeometry args={[0.08, 16, 16]} />;
  }, [fp.eyeStyle]);

  const legH = hasShorts ? 0.3 : 0.6;

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
        {hasVest && hasJacket && (
          <mesh castShadow material={new THREE.MeshStandardMaterial({ map: getTexture(vest!), roughness: 0.6 })}>
            <boxGeometry args={[torsoW + 0.05, torsoH * 0.8, torsoD + 0.06]} />
          </mesh>
        )}

        {/* Head */}
        <group ref={head} position={[0, torsoH / 2 + 0.3, 0]}>
          <mesh castShadow receiveShadow material={materials.skin}>
            <sphereGeometry args={[0.4 * headScale, 32, 32]} />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.15 * headScale, 0.1 * headScale, 0.35 * headScale]} material={materials.eyeMat}>
            {eyeGeometry}
            {effect === 'e_eye_lightning' && (
               <group position={[0, 0, 0.1]}>
                 <Float speed={15} rotationIntensity={5} floatIntensity={1}>
                   <mesh position={[0, 0.05, 0]}>
                     <coneGeometry args={[0.02, 0.2, 4]} />
                     <meshBasicMaterial color="#00ffff" />
                   </mesh>
                 </Float>
                 <Float speed={20} rotationIntensity={8} floatIntensity={2}>
                   <mesh position={[0.05, -0.05, 0]}>
                     <coneGeometry args={[0.01, 0.15, 4]} />
                     <meshBasicMaterial color="#00ffff" />
                   </mesh>
                 </Float>
               </group>
            )}
          </mesh>
          <mesh position={[0.15 * headScale, 0.1 * headScale, 0.35 * headScale]} material={materials.eyeMat}>
            {eyeGeometry}
            {effect === 'e_eye_lightning' && (
               <group position={[0, 0, 0.1]}>
                 <Float speed={12} rotationIntensity={6} floatIntensity={1}>
                   <mesh position={[0, 0.05, 0]}>
                     <coneGeometry args={[0.02, 0.2, 4]} />
                     <meshBasicMaterial color="#00ffff" />
                   </mesh>
                 </Float>
                 <Float speed={18} rotationIntensity={7} floatIntensity={2}>
                   <mesh position={[-0.05, -0.05, 0]}>
                     <coneGeometry args={[0.01, 0.15, 4]} />
                     <meshBasicMaterial color="#00ffff" />
                   </mesh>
                 </Float>
               </group>
            )}
          </mesh>

          {/* Wink: hide one eye */}
          {fp.eyeStyle === 'wink' && (
            <mesh position={[0.15 * headScale, 0.1 * headScale, 0.36 * headScale]} material={materials.skin}>
              <boxGeometry args={[0.12, 0.03, 0.02]} />
            </mesh>
          )}

          {/* Angry eyebrows */}
          {fp.eyeStyle === 'angry' && (
            <>
              <mesh position={[-0.15 * headScale, 0.2 * headScale, 0.36 * headScale]} rotation={[0, 0, -0.3]}>
                <boxGeometry args={[0.12, 0.03, 0.02]} />
                <meshBasicMaterial color="#1f2937" />
              </mesh>
              <mesh position={[0.15 * headScale, 0.2 * headScale, 0.36 * headScale]} rotation={[0, 0, 0.3]}>
                <boxGeometry args={[0.12, 0.03, 0.02]} />
                <meshBasicMaterial color="#1f2937" />
              </mesh>
            </>
          )}

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
               <mesh castShadow>
                 {fp.hairStyle === 'short' && <sphereGeometry args={[0.42 * headScale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />}
                 {fp.hairStyle === 'long' && (
                    <>
                      <sphereGeometry args={[0.42 * headScale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
                      <mesh position={[0, -0.4, -0.2]} rotation={[0, Math.PI, 0]}>
                         <cylinderGeometry args={[0.4*headScale, 0.45*headScale, 0.8, 16, 1, false, 0, Math.PI]} />
                         <meshStandardMaterial color={fp.hairColor} roughness={0.7} />
                      </mesh>
                    </>
                 )}
                 {fp.hairStyle === 'spike' && (
                    <mesh position={[0, 0.1, 0]}>
                       <coneGeometry args={[0.4 * headScale, 0.5, 8]} />
                       <meshStandardMaterial color={fp.hairColor} roughness={0.7} />
                    </mesh>
                 )}
                 {fp.hairStyle === 'ponytail' && (
                    <>
                      <sphereGeometry args={[0.42 * headScale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
                      <mesh position={[0, 0, -0.4]}>
                         <sphereGeometry args={[0.1, 8, 8]} />
                         <meshStandardMaterial color={fp.hairColor} roughness={0.7} />
                      </mesh>
                      <mesh position={[0, -0.3, -0.5]} rotation={[-0.2, 0, 0]}>
                         <cylinderGeometry args={[0.08, 0.02, 0.6]} />
                         <meshStandardMaterial color={fp.hairColor} roughness={0.7} />
                      </mesh>
                    </>
                 )}
                 <meshStandardMaterial color={fp.hairColor} roughness={0.7} />
               </mesh>
            </group>
          ) : null}
        </group>

        {/* Arms */}
        <mesh ref={leftArm} position={[-(torsoW / 2 + armW / 2 + 0.05), 0.3, 0]} material={materials.armMat} castShadow>
          <boxGeometry args={[armW, 0.8, armW]} />
          {/* Hand */}
          <mesh position={[0, -0.4, 0]} material={materials.skin}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        </mesh>
        <mesh ref={rightArm} position={[torsoW / 2 + armW / 2 + 0.05, 0.3, 0]} material={materials.armMat} castShadow>
          <boxGeometry args={[armW, 0.8, armW]} />
          <mesh position={[0, -0.4, 0]} material={materials.skin}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
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
      </mesh>
      <mesh ref={rightLeg} position={[hipW * 0.3, 0.3, 0]} material={materials.legMat} castShadow>
        <boxGeometry args={[legW, legH, legW]} />
      </mesh>

      {/* Skin below shorts */}
      {hasShorts && (
        <>
          <mesh position={[-hipW * 0.3, 0.05, 0]} material={materials.skin} castShadow>
            <boxGeometry args={[legW, 0.25, legW]} />
          </mesh>
          <mesh position={[hipW * 0.3, 0.05, 0]} material={materials.skin} castShadow>
            <boxGeometry args={[legW, 0.25, legW]} />
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
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[-5, 5, -5]} intensity={0.5} color="#22d3ee" />
          <spotLight position={[5, 5, -5]} intensity={0.5} color="#ec4899" />
          <Environment preset="city" />

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
