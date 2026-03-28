import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useGLTF, useAnimations, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

interface ModularAvatarProps {
  currentShirt: string;
  currentPants: string;
  currentShoes?: string;
  danceState?: 'idle' | 'dancing' | 'miss';
}

function ModularAvatarModel({ currentShirt, currentPants, currentShoes, danceState = 'idle' }: ModularAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/placeholder.glb');
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    // Falls das Modell Animationen besitzt
    if (names && names.length > 0) {
      let animName = names[0]; // Fallback zu Index 0
      
      if (danceState === 'dancing') {
        animName = names.find(n => n.toLowerCase().includes('dance')) || names[0];
      } else if (danceState === 'miss') {
        animName = names.find(n => n.toLowerCase().includes('sad') || n.toLowerCase().includes('miss') || n.toLowerCase().includes('fail')) || names[0];
      } else {
        animName = names.find(n => n.toLowerCase().includes('idle')) || names[0];
      }

      if (actions[animName]) {
        actions[animName]?.reset().fadeIn(0.3).play();
        return () => { actions[animName]?.fadeOut(0.3); };
      }
    }
  }, [danceState, actions, names]);

  useEffect(() => {
    // Traversiere den Scene-Graph, um Kleidung einzublenden / auszublenden
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const nodeName = child.name;

        // Basis-Körper immer zeigen
        if (nodeName.toLowerCase().includes('body') || nodeName.toLowerCase().includes('head') || nodeName.toLowerCase().includes('hands') || nodeName.toLowerCase().includes('skin')) {
          child.visible = true;
        } 
        // Tops
        else if (nodeName.startsWith('Shirt_') || nodeName.startsWith('Top_')) {
          child.visible = (nodeName === currentShirt);
        }
        // Pants
        else if (nodeName.startsWith('Pants_') || nodeName.startsWith('Bottom_')) {
          child.visible = (nodeName === currentPants);
        }
        // Shoes
        else if (nodeName.startsWith('Shoes_')) {
          child.visible = (nodeName === currentShoes);
        }
      }
    });
  }, [scene, currentShirt, currentPants, currentShoes]);

  return <primitive ref={group} object={scene} />
}

// Error Boundary & Fallback für fehlendes Modell
class ModelErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="red" wireframe />
        </mesh>
      );
    }
    return this.props.children;
  }
}

export function ModularAvatar(props: ModularAvatarProps) {
  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <Environment preset="city" />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 1.5} minDistance={1} maxDistance={10} />
        
        <Suspense fallback={null}>
          <ModelErrorBoundary>
            <ModularAvatarModel {...props} />
          </ModelErrorBoundary>
        </Suspense>
        
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} far={4} />
      </Canvas>

      {/* Hilfstext für den User, falls Modell fehlt */}
      <div className="absolute bottom-4 w-full text-center pointer-events-none">
        <p className="text-cyan-400 font-mono text-xs bg-gray-900 border border-cyan-500 inline-block px-4 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          [Lade lokales Fallback-Modell: /models/placeholder.glb]
        </p>
      </div>
    </div>
  );
}
// Wir preloadaen es nicht zwingend, um Crash-Loops zu vermeiden, wenn das Modell nicht da ist
