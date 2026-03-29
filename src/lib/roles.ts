// ─── User Role System ───

export type UserRole = 'user' | 'supporter' | 'moderator' | 'gamemaster' | 'admin';

export interface RoleConfig {
  label: string;
  labelDE: string;
  emoji: string;
  color: string;        // Tailwind text color
  bgColor: string;      // Tailwind bg
  borderColor: string;  // Tailwind border
  glow: string;         // shadow glow
  priority: number;     // higher = more important
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  user: {
    label: 'Player',
    labelDE: 'Spieler',
    emoji: '',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800',
    borderColor: 'border-gray-600',
    glow: '',
    priority: 0,
  },
  supporter: {
    label: 'Supporter',
    labelDE: 'Supporter',
    emoji: '💖',
    color: 'text-pink-400',
    bgColor: 'bg-pink-950/40',
    borderColor: 'border-pink-500/50',
    glow: 'shadow-[0_0_10px_rgba(236,72,153,0.3)]',
    priority: 1,
  },
  moderator: {
    label: 'Moderator',
    labelDE: 'Moderator',
    emoji: '🛡️',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/50',
    glow: 'shadow-[0_0_10px_rgba(52,211,153,0.3)]',
    priority: 2,
  },
  gamemaster: {
    label: 'Gamemaster',
    labelDE: 'Gamemaster',
    emoji: '✨',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-400/50',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
    priority: 3,
  },
  admin: {
    label: 'Admin',
    labelDE: 'Admin',
    emoji: '👑',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/40',
    borderColor: 'border-yellow-500/50',
    glow: 'shadow-[0_0_15px_rgba(250,204,21,0.4)]',
    priority: 4,
  },
};

export function isStaff(role: UserRole): boolean {
  return ROLE_CONFIG[role].priority >= 2;
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'gamemaster';
}

export function canManageRoles(role: UserRole): boolean {
  return role === 'admin';
}
