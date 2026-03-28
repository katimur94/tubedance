import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
  jacket: string; // E.g. "leather_black", "camo_green"
  pants: string; // E.g. "denim_blue", "tracksuit_red"
  shoes: string;
  danceState: 'idle' | 'dancing' | 'miss';
  intensity: number;
  bpm?: number;
}

// --- Procedural Textures ---
function createTexture(type: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  if (type === 'denim_blue') {
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for(let i=0; i<3000; i++) ctx.fillRect(Math.random()*256, Math.random()*256, 1, 3);
  } else if (type === 'denim_black') {
    ctx.fillStyle = '#1f2937'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<3000; i++) ctx.fillRect(Math.random()*256, Math.random()*256, 1, 3);
  } else if (type === 'tracksuit_red') {
    ctx.fillStyle = '#dc2626'; ctx.fillRect(0,0,256,256);
    // White stripes
    ctx.fillStyle = '#ffffff'; ctx.fillRect(230, 0, 10, 256);
  } else if (type === 'tracksuit_black') {
    ctx.fillStyle = '#000000'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(230, 0, 10, 256);
  } else if (type === 'leather_black') {
    ctx.fillStyle = '#111827'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for(let i=0; i<1000; i++) {
       ctx.beginPath();
       ctx.arc(Math.random()*256, Math.random()*256, Math.random()*3, 0, Math.PI*2);
       ctx.fill();
    }
  } else if (type === 'camo_green') {
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(0,0,256,256);
    const colors = ['#3f6212', '#14532d', '#1c1917'];
    for(let i=0; i<100; i++) {
       ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
       ctx.beginPath();
       ctx.ellipse(Math.random()*256, Math.random()*256, 15+Math.random()*30, 15+Math.random()*20, Math.random()*Math.PI, 0, Math.PI*2);
       ctx.fill();
    }
  } else if (type === 'plaid_red') {
    ctx.fillStyle = '#ef4444'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for(let i=0; i<8; i++) { ctx.fillRect(i*32, 0, 16, 256); ctx.fillRect(0, i*32, 256, 16); }
  } else if (type === 'swag_gold') {
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = '#f59e0b';
    for(let i=0; i<10; i++) { ctx.fillRect(i*25, 0, 5, 256); ctx.fillRect(0, i*25, 256, 5); }
  } else if (type === 'shoes_sneakers') {
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0,0,256,256);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 100, 256, 50); // stripe
  } else if (type === 'shoes_boots') {
    ctx.fillStyle = '#78350f'; ctx.fillRect(0,0,256,256); // brown
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const textureCache: Record<string, THREE.Texture> = {};
function getTexture(type: string) {
  if (!type) return null;
  if (!textureCache[type]) {
    textureCache[type] = createTexture(type);
  }
  return textureCache[type];
}

function RobotModel({ jacket, pants, shoes, danceState, intensity, bpm = 120 }: Avatar3DProps) {
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const materials = useMemo(() => {
    const jTex = getTexture(jacket) || getTexture('leather_black');
    const pTex = getTexture(pants) || getTexture('denim_blue');
    const sTex = getTexture(shoes) || getTexture('shoes_sneakers');

    return {
      head: new THREE.MeshStandardMaterial({ color: '#f3f4f6', roughness: 0.2, metalness: 0.1 }),
      eye: new THREE.MeshBasicMaterial({ color: danceState === 'miss' ? '#ef4444' : '#22d3ee', toneMapped: false }),
      jacket: new THREE.MeshStandardMaterial({ map: jTex, roughness: 0.7, color: '#ffffff' }),
      pants: new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.9, color: '#ffffff' }),
      shoes: new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.5, color: '#ffffff' })
    };
  }, [jacket, pants, shoes, danceState]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!group.current || !leftArm.current || !rightArm.current || !leftLeg.current || !rightLeg.current || !body.current || !head.current) return;

    const beat = t * (bpm / 60) * Math.PI;

    if (danceState === 'dancing') {
      
      if (intensity >= 2.5) {
        // --- MOONWALK ---
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
        // --- HIGH ENERGY BOUNCE ---
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
        // --- BASIC RHYTHM GROOVE ---
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

  return (
    <group ref={group}>
      <group ref={body} position={[0, 1.2, 0]}>
        <mesh castShadow receiveShadow material={materials.jacket}>
          <boxGeometry args={[0.8, 1, 0.5]} />
        </mesh>
        
        <group ref={head} position={[0, 0.7, 0]}>
          <mesh castShadow receiveShadow material={materials.head}>
            <sphereGeometry args={[0.4, 32, 32]} />
          </mesh>
          <mesh position={[-0.15, 0.1, 0.35]} material={materials.eye}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
          <mesh position={[0.15, 0.1, 0.35]} material={materials.eye}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>

        <mesh ref={leftArm} position={[-0.55, 0.3, 0]} material={materials.jacket} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <mesh position={[0, -0.4, 0]} material={materials.head}>
             <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        </mesh>

        <mesh ref={rightArm} position={[0.55, 0.3, 0]} material={materials.jacket} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <mesh position={[0, -0.4, 0]} material={materials.head}>
             <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        </mesh>
      </group>

      <mesh ref={leftLeg} position={[-0.2, 0.3, 0]} material={materials.pants} castShadow>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
      </mesh>
      <mesh ref={rightLeg} position={[0.2, 0.3, 0]} material={materials.pants} castShadow>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
      </mesh>

      <mesh position={[-0.2, 0.1, 0.1]} material={materials.shoes} castShadow>
        <boxGeometry args={[0.35, 0.2, 0.5]} />
      </mesh>
      <mesh position={[0.2, 0.1, 0.1]} material={materials.shoes} castShadow>
        <boxGeometry args={[0.35, 0.2, 0.5]} />
      </mesh>
    </group>
  );
}

export function Avatar3D(props: Avatar3DProps) {
  return (
    <div className="w-full h-full relative border-0 outline-none" style={{ minHeight: '300px' }}>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        <spotLight position={[-10, 10, -5]} intensity={0.5} color="cyan" />
        <spotLight position={[10, 10, -5]} intensity={0.5} color="magenta" />
        
        <Environment preset="city" />
        
        {/* Enable Camera Rotation and Zooming */}
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 1.8} minDistance={2} maxDistance={15} />

        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.1}>
          <RobotModel {...props} />
        </Float>
        
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} far={4} />
      </Canvas>
    </div>
  );
}
