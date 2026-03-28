import React from 'react';
import { AvatarCreator as RPMAvatarCreator } from '@readyplayerme/react-avatar-creator';

interface AvatarCreatorProps {
  onAvatarExported: (url: string) => void;
  onClose: () => void;
}

export function AvatarCreator({ onAvatarExported, onClose }: AvatarCreatorProps) {
  const handleExport = (event: any) => {
    // URL ist im event.data.url vorhanden
    const url = event.data?.url || (typeof event === 'string' ? event : null);
    if (url) {
      onAvatarExported(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col pt-16 font-sans">
       <div className="absolute top-0 left-0 w-full h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-50 shadow-2xl">
         <h1 className="text-xl font-black text-white uppercase tracking-widest">Ready Player Me Editor</h1>
         <button onClick={onClose} className="py-2 px-6 bg-red-900/50 hover:bg-red-600 text-white font-bold rounded-full transition-colors border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
           Abbrechen
         </button>
       </div>
       
       <div className="flex-1 w-full relative">
         <RPMAvatarCreator 
            subdomain="demo" 
            config={{ clearCache: true, bodyType: 'fullbody' }} 
            onAvatarExported={handleExport} 
         />
       </div>
    </div>
  );
}
