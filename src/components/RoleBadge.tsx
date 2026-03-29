import { type UserRole, ROLE_CONFIG } from '../lib/roles';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  if (role === 'user') return null;

  const config = ROLE_CONFIG[role];
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-full border ${config.bgColor} ${config.borderColor} ${config.color} ${config.glow} ${
        isSmall ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      <span>{config.emoji}</span>
      <span>{config.labelDE}</span>
    </span>
  );
}
