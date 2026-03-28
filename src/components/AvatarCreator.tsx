import React from 'react';
import { AvatarCreator as RPMAvatarCreator } from '@readyplayerme/react-avatar-creator';

interface AvatarCreatorProps {
  onAvatarExported: (avatarUrl: string) => void;
  onClose: () => void;
}

export const AvatarCreator: React.FC<AvatarCreatorProps> = ({ onAvatarExported, onClose }) => {
  // Das ist die kritische Konfiguration für RPM
  const config = {
    clearCache: true,
    bodyType: 'fullbody', // Wir wollen den ganzen Körper für Tanz-Animationen
    quickStart: false,
    language: 'en', // Sicherer Fallback (manche Subdomains unterstützen '/de/avatar' nicht korrekt im Iframe)
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.5)] border border-gray-700">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-4 bg-red-600 text-white rounded-xl hover:bg-red-500 font-black shadow-lg uppercase tracking-widest text-xs transition-colors"
        >
          Editor Schließen
        </button>
        
        <RPMAvatarCreator
          subdomain="demo" 
          config={config as any}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onAvatarExported={(event: any) => {
            const url = event.data?.url || (typeof event === 'string' ? event : null);
            if (url) {
              console.log("Avatar erfolgreich erstellt. URL:", url);
              onAvatarExported(url);
            }
          }}
        />
      </div>
    </div>
  );
};

export default AvatarCreator;
