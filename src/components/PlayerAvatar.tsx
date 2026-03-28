import React, { useRef, Suspense } from 'react';
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerAvatarProps {
  modelUrl: string;
  danceState?: 'idle' | 'dancing' | 'miss';
  intensity?: number;
  bpm?: number;
}

function AvatarModel({ url, danceState = 'idle', intensity = 1, bpm = 120 }: PlayerAvatarProps & { url: string }) {
  const group = useRef<THREE.Group>(null);
  
  // Lädt die ReadyPlayerMe GLB Datei von der URL
  const { scene } = useGLTF(url);
  
  useFrame((state) => {
    // Da RPM-Avatare standardmäßig keine Animationen (Mixamo Rigs) beinhalten,
    // machen wir hier ein prozedurales Fallback-Posing für "Tanzen", 
    // bis ein echtes Skelett-Mapping vorgenommen wird.
    if (group.current) {
      const t = state.clock.getElapsedTime();
      const beat = t * (bpm / 60) * Math.PI;

      if (danceState === 'dancing') {
        const bounce = Math.abs(Math.sin(beat)) * 0.1 * intensity;
        group.current.position.y = bounce - 0.9;
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

  return <primitive ref={group} object={scene} castShadow />
}

export function PlayerAvatar(props: PlayerAvatarProps) {
  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <spotLight position={[-5, 5, -5]} intensity={0.5} color="cyan" />
        <spotLight position={[5, 5, -5]} intensity={0.5} color="magenta" />
        
        <Environment preset="city" />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 1.5} minDistance={2} maxDistance={10} />
        
        <Suspense fallback={null}>
            <AvatarModel url={props.modelUrl} {...props} />
        </Suspense>
        
        <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={10} blur={2} far={4} />
      </Canvas>
      {/* Hilfstext */}
      {!props.modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white bg-black/50 px-4 py-2 rounded-xl">Keine Avatar-URL hinterlegt.</p>
        </div>
      )}
    </div>
  );
}
