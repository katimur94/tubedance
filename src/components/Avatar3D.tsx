import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
  jacket: string; // E.g. "#ff0000" or simple hex colors
  pants: string;
  shoes: string;
  danceState: 'idle' | 'dancing' | 'miss';
  intensity: number; // 1 (low) to 3 (extreme) based on hit or combo
}

// Convert Tailwind string to Hex just for the 3D model
const colorMap: Record<string, string> = {
  'bg-gray-500': '#6b7280', 'bg-red-500': '#ef4444', 
  'bg-blue-500': '#3b82f6', 'bg-green-500': '#22c55e',
  'bg-pink-500': '#ec4899', 'bg-cyan-400': '#22d3ee',
  'bg-yellow-400': '#facc15', 'bg-gray-900': '#111827',
  'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500': '#a855f7' // simplified
};

function RobotModel({ jacket, pants, shoes, danceState, intensity }: Avatar3DProps) {
  const group = useRef<THREE.Group>(null);
  
  // Limbs
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const jColor = colorMap[jacket] || '#6b7280';
  const pColor = colorMap[pants] || '#6b7280';
  const sColor = colorMap[shoes] || '#6b7280';

  const materials = useMemo(() => ({
    head: new THREE.MeshStandardMaterial({ color: '#f3f4f6', roughness: 0.2, metalness: 0.1 }),
    eye: new THREE.MeshBasicMaterial({ color: danceState === 'miss' ? '#ef4444' : '#22d3ee', toneMapped: false }),
    jacket: new THREE.MeshStandardMaterial({ color: jColor, roughness: 0.4 }),
    pants: new THREE.MeshStandardMaterial({ color: pColor, roughness: 0.5 }),
    shoes: new THREE.MeshStandardMaterial({ color: sColor, roughness: 0.3 })
  }), [jColor, pColor, sColor, danceState]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (!group.current || !leftArm.current || !rightArm.current || !leftLeg.current || !rightLeg.current || !body.current || !head.current) return;

    if (danceState === 'dancing') {
      const speed = intensity * 4; // Faster animations for higher intensity
      
      // Bouncing body
      body.current.position.y = Math.sin(t * speed * 2) * 0.2 + 1.2;
      group.current.rotation.y = Math.sin(t * speed * 0.5) * 0.3;

      // Arms swinging wildly
      leftArm.current.rotation.x = Math.sin(t * speed) * 1.5;
      leftArm.current.rotation.z = Math.cos(t * speed * 2) * 0.5 + 0.5;
      
      rightArm.current.rotation.x = Math.sin(t * speed + Math.PI) * 1.5;
      rightArm.current.rotation.z = -Math.cos(t * speed * 2) * 0.5 - 0.5;

      // Legs stepping
      leftLeg.current.rotation.x = Math.sin(t * speed) * 0.8;
      leftLeg.current.position.y = Math.max(0, Math.sin(t * speed)) * 0.4 + 0.3;
      
      rightLeg.current.rotation.x = Math.sin(t * speed + Math.PI) * 0.8;
      rightLeg.current.position.y = Math.max(0, Math.sin(t * speed + Math.PI)) * 0.4 + 0.3;

      // Head bobbing
      head.current.rotation.x = Math.sin(t * speed * 4) * 0.2;
      head.current.rotation.y = Math.sin(t * speed * 2) * 0.3;

    } else if (danceState === 'miss') {
      // Slumped sad pose
      body.current.position.y = 1.0;
      group.current.rotation.y = 0;
      
      leftArm.current.rotation.x = -0.5;
      leftArm.current.rotation.z = 0.2;
      rightArm.current.rotation.x = -0.5;
      rightArm.current.rotation.z = -0.2;
      
      leftLeg.current.rotation.x = 0;
      leftLeg.current.position.y = 0.3;
      rightLeg.current.rotation.x = 0;
      rightLeg.current.position.y = 0.3;

      head.current.rotation.x = 0.5; // Looking down
      head.current.rotation.y = 0;
    } else {
      // Idle breathing
      body.current.position.y = Math.sin(t * 2) * 0.05 + 1.2;
      group.current.rotation.y = Math.sin(t * 0.5) * 0.1;

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
      {/* Body / Jacket */}
      <group ref={body} position={[0, 1.2, 0]}>
        <mesh castShadow receiveShadow material={materials.jacket}>
          <boxGeometry args={[0.8, 1, 0.5]} />
        </mesh>
        
        {/* Head */}
        <group ref={head} position={[0, 0.7, 0]}>
          <mesh castShadow receiveShadow material={materials.head}>
            <sphereGeometry args={[0.4, 32, 32]} />
          </mesh>
          {/* Eyes with glow */}
          <mesh position={[-0.15, 0.1, 0.35]} material={materials.eye}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
          <mesh position={[0.15, 0.1, 0.35]} material={materials.eye}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>

        {/* Left Arm */}
        <mesh ref={leftArm} position={[-0.55, 0.3, 0]} material={materials.jacket} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <mesh position={[0, -0.4, 0]} material={materials.head}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        </mesh>

        {/* Right Arm */}
        <mesh ref={rightArm} position={[0.55, 0.3, 0]} material={materials.jacket} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <mesh position={[0, -0.4, 0]} material={materials.head}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        </mesh>
      </group>

      {/* Legs */}
      <mesh ref={leftLeg} position={[-0.2, 0.3, 0]} material={materials.pants} castShadow>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
      </mesh>
      <mesh ref={rightLeg} position={[0.2, 0.3, 0]} material={materials.pants} castShadow>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
      </mesh>

      {/* Shoes static on feet basically */}
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
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        <spotLight position={[-10, 10, -5]} intensity={0.5} color="cyan" />
        <spotLight position={[10, 10, -5]} intensity={0.5} color="magenta" />
        
        <Environment preset="city" />
        
        <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
          <RobotModel {...props} />
        </Float>
        
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} far={4} />
      </Canvas>
    </div>
  );
}
