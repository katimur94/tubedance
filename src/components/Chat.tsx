/**
 * Chat — In-Game Chat mit Supabase Realtime Broadcast
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, X, Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { type UserRole } from '../lib/roles';
import { RoleBadge } from './RoleBadge';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'text' | 'emote';
  role?: UserRole;
}

interface ChatProps {
  channelName: string;
  userId: string;
  username: string;
  userRole?: UserRole;
  minimizable?: boolean;
}

const EMOTES = ['👋', '🔥', '💃', '🕺', '❤️', '😂', '👏', '🎵', '⭐', '💀'];

const BANNED_WORDS = ['spam', 'hack'];

function filterMessage(msg: string): string {
  let filtered = msg;
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
}

export function Chat({ channelName, userId, username, userRole = 'user', minimizable = true }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [unread, setUnread] = useState(0);
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase.channel(`chat:${channelName}`);

    channel.on('broadcast', { event: 'chat_message' }, (payload) => {
      const msg = payload.payload as ChatMessage;
      setMessages(prev => {
        // Deduplicate: skip if message with same ID already exists (e.g. locally added)
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev.slice(-99), msg];
      });
      if (isMinimized) setUnread(u => u + 1);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
    };
  }, [channelName]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (text: string, type: 'text' | 'emote' = 'text') => {
    if (!text.trim() || !channelRef.current) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      username,
      message: type === 'text' ? filterMessage(text.trim()) : text,
      timestamp: Date.now(),
      type,
      role: userRole,
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg,
    });

    // Also add locally
    setMessages(prev => [...prev.slice(-99), msg]);
    setInput('');
    setShowEmotes(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (isMinimized && minimizable) {
    return (
      <button
        onClick={() => { setIsMinimized(false); setUnread(0); }}
        className="relative p-3 bg-purple-900/80 hover:bg-purple-800 border border-purple-700/50 rounded-2xl backdrop-blur-md transition-all"
      >
        <MessageSquare size={20} className="text-purple-300" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-[10px] font-black text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="w-80 bg-purple-950/90 backdrop-blur-xl border border-purple-800/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-800/30 bg-purple-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-pink-400" />
          <span className="text-sm font-black uppercase tracking-wider text-purple-200">Chat</span>
          <span className="text-[10px] text-purple-500 font-mono">{messages.length}</span>
        </div>
        {minimizable && (
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-purple-800 rounded-lg transition-colors text-purple-400">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-purple-600 text-xs text-center py-8 font-bold">Noch keine Nachrichten...</p>
        )}
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${msg.type === 'emote' ? 'text-center' : ''}`}
            >
              {msg.type === 'emote' ? (
                <div className="text-3xl py-1">{msg.message}</div>
              ) : (
                <div className="flex items-center flex-wrap gap-1">
                  <span className={`text-xs font-black ${msg.userId === userId ? 'text-pink-400' : 'text-cyan-400'}`}>
                    {msg.username}
                  </span>
                  {msg.role && msg.role !== 'user' && <RoleBadge role={msg.role} size="sm" />}
                  <span className="text-gray-300 text-sm">{msg.message}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emote Picker */}
      <AnimatePresence>
        {showEmotes && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-purple-800/30 overflow-hidden">
            <div className="flex flex-wrap gap-1 p-3">
              {EMOTES.map(emote => (
                <button
                  key={emote}
                  onClick={() => sendMessage(emote, 'emote')}
                  className="w-9 h-9 flex items-center justify-center hover:bg-purple-800/50 rounded-lg text-xl transition-colors"
                >
                  {emote}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-purple-800/30">
        <button
          type="button"
          onClick={() => setShowEmotes(!showEmotes)}
          className={`p-2 rounded-lg transition-colors ${showEmotes ? 'bg-pink-600 text-white' : 'text-purple-400 hover:bg-purple-800/50'}`}
        >
          <Smile size={16} />
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Nachricht..."
          maxLength={200}
          className="flex-1 bg-purple-900/30 border border-purple-700/30 rounded-lg px-3 py-2 text-sm text-white placeholder-purple-600 focus:border-pink-500 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
