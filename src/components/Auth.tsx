import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export function Auth({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMSG, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Konto erstellt! Bitte überprüfe deine E-Mails (falls aktiviert) oder logge dich direkt ein.');
        setIsLogin(true);
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Anmelden/Registrieren.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest uppercase mb-2">
          {isLogin ? 'Login' : 'Registrieren'}
        </h2>
        <p className="text-gray-400 font-medium">Dein Tänzer-Profil wartet auf dich</p>
      </div>

      {errorMSG && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-400 text-sm font-bold text-center">
          {errorMSG}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="email" required placeholder="E-Mail"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="password" required placeholder="Passwort" minLength={6}
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          type="submit" disabled={loading}
          className="w-full py-4 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Los Geht\'s' : 'Account erstellen')}
          {!loading && <ArrowRight size={18} />}
        </motion.button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(null); }}
          className="text-gray-400 hover:text-cyan-400 font-bold transition-colors text-sm"
        >
          {isLogin ? 'Noch keinen Account? Registrieren' : 'Bereits einen Account? Einloggen'}
        </button>
      </div>

      <div className="mt-8 border-t border-gray-800 pt-6 text-center">
         <button onClick={onLogin} className="text-xs text-gray-600 hover:text-gray-400 font-bold uppercase tracking-widest cursor-pointer">
            Als Gast fortfahren
         </button>
      </div>
    </div>
  );
}
