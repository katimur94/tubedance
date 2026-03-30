import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ModularAvatar } from './ModularAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';

interface InventoryItem {
  id: string;
  is_equipped: boolean;
  item: {
    id: string;
    name: string;
    type: 'shirt' | 'pants' | 'shoes';
    mesh_name: string;
    price: number;
  }
}

interface WardrobeProps {
  userId: string;
  onBack: () => void;
}

export function Wardrobe({ userId, onBack }: WardrobeProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'shirt' | 'pants' | 'shoes'>('shirt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [userId]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          id,
          is_equipped,
          item:items(id, name, type, mesh_name, price)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setInventory((data as unknown) as InventoryItem[]);
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Tabellen existieren noch nicht (Bitte SQL ausführen!) oder Netzwerkfehler.");
    }
  };

  const equipItem = async (invItem: InventoryItem) => {
    if (invItem.is_equipped) return;

    // Local Optimistic UI update
    setInventory(prev => prev.map(p => {
      // Unequip similar type
      if (p.item.type === invItem.item.type) {
        return { ...p, is_equipped: p.id === invItem.id };
      }
      return p;
    }));

    try {
      // Setze alle Items dieses Typs auf = false
      const sameTypeIds = inventory.filter(p => p.item.type === invItem.item.type).map(p => p.item.id);
      if (sameTypeIds.length > 0) {
        const { error: unequipError } = await supabase.from('user_inventory')
          .update({ is_equipped: false })
          .eq('user_id', userId)
          .in('item_id', sameTypeIds);
        if (unequipError) throw unequipError;
      }

      // Neues setzen
      const { error: equipError } = await supabase.from('user_inventory')
        .update({ is_equipped: true })
        .eq('id', invItem.id);
      if (equipError) throw equipError;
    } catch (e) {
      console.error("Fehler beim Ausrüsten", e);
      setErrorMsg("Fehler beim Ausrüsten. Bitte erneut versuchen.");
      // Revert optimistic update
      fetchInventory();
    }
  };

  // Finde die aktuell markierten
  const currentShirt = inventory.find(i => i.is_equipped && i.item.type === 'shirt')?.item.mesh_name || 'Shirt_Basic';
  const currentPants = inventory.find(i => i.is_equipped && i.item.type === 'pants')?.item.mesh_name || 'Pants_Basic';
  const currentShoes = inventory.find(i => i.is_equipped && i.item.type === 'shoes')?.item.mesh_name || 'Shoes_Basic';

  const visibleItems = inventory.filter(i => i.item.type === activeTab);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black flex w-full h-full z-50 overflow-hidden font-sans text-white">
      
      {/* LEFT HALF: Huge 3D View */}
      <div className="relative w-1/2 h-full flex flex-col justify-end pb-12 items-center bg-black/40">
        <button onClick={onBack} className="absolute top-8 left-8 py-3 px-6 bg-gray-800/80 hover:bg-cyan-600 text-white rounded-full transition-colors flex items-center justify-center shadow-lg group z-50 uppercase tracking-widest text-xs font-bold border border-gray-600">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Menü
        </button>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="absolute inset-0 cursor-move">
          <ModularAvatar 
            currentShirt={currentShirt} 
            currentPants={currentPants} 
            currentShoes={currentShoes} 
            danceState="dancing" 
          />
        </div>
      </div>

      {/* RIGHT HALF: Wardrobe Menu */}
      <div className="w-1/2 h-full bg-gray-900/95 backdrop-blur-3xl border-l border-gray-800 flex flex-col p-10 overflow-y-auto">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 uppercase tracking-widest mb-10">
           Wardrobe 3D
        </h1>

        {errorMsg && (
          <div className="mb-6 bg-red-900/50 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-100 font-bold">
            <AlertTriangle /> {errorMsg}
          </div>
        )}

        <div className="flex gap-4 mb-8">
          {(['shirt', 'pants', 'shoes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 px-6 rounded-2xl uppercase tracking-widest font-black transition-all ${activeTab === tab ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}
            >
              {tab === 'shirt' ? 'OBERKÖRPER' : tab === 'pants' ? 'HOSEN' : 'SCHUHE'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {visibleItems.length === 0 && !errorMsg ? (
              <p className="text-gray-500 font-bold col-span-2">Keine Items in dieser Kategorie.</p>
            ) : (
              visibleItems.map(inv => (
                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={inv.id}>
                  <button
                    onClick={() => equipItem(inv)}
                    className={`w-full aspect-[4/3] rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden group border ${
                      inv.is_equipped ? 'bg-cyan-900/30 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-600 hover:border-gray-500'}`}
                  >
                    <span className="font-bold text-gray-200 uppercase tracking-widest text-sm text-center">{inv.item.name}</span>
                    <span className="text-gray-500 text-xs font-mono">{inv.item.mesh_name}</span>
                    {inv.is_equipped && <span className="absolute top-4 right-4 text-cyan-400"><Check size={20} /></span>}
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
