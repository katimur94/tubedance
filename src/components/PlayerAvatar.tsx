import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// 1. Die Unterkomponente, die das eigentliche Modell lädt
const Model = ({ url, danceState = 'idle', intensity = 1, bpm = 120 }: { url: string; danceState?: string; intensity?: number; bpm?: number }) => {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  
  // Optional: Schatten aktivieren und Materialien leicht anpassen
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame((state) => {
    // Statisches Fallback-Tanzen ohne echtes Rig
    if (group.current) {
      const t = state.clock.getElapsedTime();
      const beat = t * (bpm / 60) * Math.PI;

      if (danceState === 'dancing') {
        const bounce = Math.abs(Math.sin(beat)) * 0.1 * intensity;
        group.current.position.y = bounce - 1;
        group.current.rotation.y = Math.sin(beat * 0.5) * 0.2 * intensity;
      } else if (danceState === 'miss') {
        group.current.position.y = -1;
        group.current.rotation.y = 0;
        group.current.rotation.x = 0.2; // Sad lean forward
      } else {
        group.current.position.y = Math.sin(t * 2) * 0.05 - 1;
        group.current.rotation.y = Math.sin(t * 0.5) * 0.05;
        group.current.rotation.x = 0;
      }
    }
  });

  // Wir positionieren das Modell leicht nach unten (y: -1), damit es besser auf dem Boden steht
  return <primitive ref={group} object={scene} position={[0, -1, 0]} scale={1.2} />;
};

// 2. Die Hauptkomponente mit dem Canvas
interface PlayerAvatarProps {
  modelUrl: string | null | undefined;
  danceState?: 'idle' | 'dancing' | 'miss';
  intensity?: number;
  bpm?: number;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ modelUrl, danceState, intensity, bpm }) => {
  const activeUrl = modelUrl || '/models/placeholder.glb';

  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }} shadows>
        <Suspense fallback={null}>
          {/* Beleuchtung für besseres Aussehen */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[-5, 5, -5]} intensity={0.5} color="cyan" />
          <spotLight position={[5, 5, -5]} intensity={0.5} color="magenta" />
          
          <Environment preset="city" /> {/* Gibt dem Modell schöne Reflexionen */}
          
          {/* Das Modell laden */}
          <Model url={activeUrl} danceState={danceState} intensity={intensity} bpm={bpm} />

          {/* Ein kleiner weicher Schatten unter dem Charakter */}
          <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={10} blur={2} far={4} />

          {/* Steuerung: Man kann den Avatar mit der Maus drehen, aber nicht wegscrollen */}
          <OrbitControls 
            enablePan={false} 
            enableZoom={false} 
            minPolarAngle={Math.PI / 2.5} 
            maxPolarAngle={Math.PI / 2} 
          />
        </Suspense>
      </Canvas>
      
      {!modelUrl && (
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="bg-gray-900 border border-cyan-500 text-cyan-400 px-3 py-1 text-xs font-mono rounded-full uppercase tracking-widest">
               Local Placeholder
            </span>
         </div>
      )}
    </div>
  );
};

export default PlayerAvatar;
