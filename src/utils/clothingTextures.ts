/**
 * clothingTextures.ts — High-detail 512×512 procedural canvas textures
 * for all clothing items. Each texture includes fabric weave, stitching,
 * gradients, noise, and material-specific details.
 */
import * as THREE from 'three';
import { SHOP_CATALOG } from '../lib/economy';

const S = 512; // texture resolution

const TW2HEX: Record<string, string> = {
  'cyan-500': '#06b6d4', 'blue-500': '#3b82f6', 'pink-500': '#ec4899', 'purple-600': '#9333ea',
  'indigo-600': '#4f46e5', 'purple-500': '#a855f7', 'gray-700': '#374151', 'orange-500': '#f97316',
  'red-600': '#dc2626', 'sky-200': '#bae6fd', 'blue-300': '#93c5fd', 'emerald-400': '#34d399',
  'green-900': '#14532d', 'green-400': '#4ade80', 'emerald-500': '#10b981', 'gray-900': '#111827',
  'violet-600': '#7c3aed', 'fuchsia-500': '#d946ef', 'yellow-400': '#facc15', 'amber-500': '#f59e0b',
  'blue-900': '#1e3a8a', 'gray-500': '#6b7280', 'cyan-400': '#22d3ee', 'blue-400': '#60a5fa',
  'red-700': '#b91c1c', 'gray-300': '#d1d5db', 'pink-400': '#f472b6', 'purple-400': '#c084fc',
  'gray-600': '#4b5563', 'teal-500': '#14b8a6', 'yellow-200': '#fef08a', 'amber-300': '#fcd34d',
  'yellow-500': '#eab308', 'amber-600': '#d97706', 'violet-500': '#8b5cf6', 'gray-800': '#1f2937',
  'fuchsia-400': '#e879f9', 'indigo-400': '#818cf8', 'stone-800': '#292524', 'cyan-200': '#a5f3fc',
  'white': '#ffffff', 'stone-700': '#44403c', 'blue-600': '#2563eb', 'emerald-600': '#059669',
  'amber-800': '#92400e', 'gray-100': '#f3f4f6', 'stone-600': '#57534e', 'pink-300': '#f9a8d4',
  'purple-300': '#d8b4fe', 'yellow-300': '#fde047'
};

// ─── Helpers ────────────────────────────────────────────────────────
function noise(ctx: CanvasRenderingContext2D, color: string, count: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) ctx.fillRect(Math.random() * S, Math.random() * S, w, h);
}

function weave(ctx: CanvasRenderingContext2D, color: string, spacing = 4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < S; i += spacing) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }
}

function stitchLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = 'rgba(255,255,255,0.15)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
}

function fabricGrain(ctx: CanvasRenderingContext2D, intensity = 0.03) {
  const imgData = ctx.getImageData(0, 0, S, S);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * intensity;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);
}

function gradientBG(ctx: CanvasRenderingContext2D, c1: string, c2: string, angle = 0) {
  const rad = angle * Math.PI / 180;
  const x2 = S * Math.cos(rad), y2 = S * Math.sin(rad);
  const g = ctx.createLinearGradient(0, 0, x2, y2);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
}

// ─── Texture Definitions ────────────────────────────────────────────
type TexFn = (ctx: CanvasRenderingContext2D) => void;

const TEXTURES: Record<string, TexFn> = {
  // ═══ DENIM ═══
  'denim_blue': (ctx) => {
    gradientBG(ctx, '#1e3a8a', '#1e40af', 45);
    // Twill weave pattern
    ctx.strokeStyle = 'rgba(100,150,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = -S; i < S * 2; i += 3) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
    }
    noise(ctx, 'rgba(255,255,255,0.06)', 8000, 1, 2);
    noise(ctx, 'rgba(0,0,50,0.05)', 3000, 1, 3);
    // Faded knee area
    const g = ctx.createRadialGradient(S / 2, S * 0.6, 20, S / 2, S * 0.6, 120);
    g.addColorStop(0, 'rgba(100,150,220,0.12)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Seam
    stitchLine(ctx, S * 0.5, 0, S * 0.5, S, 'rgba(200,180,100,0.12)');
    fabricGrain(ctx, 0.025);
  },
  'denim_black': (ctx) => {
    gradientBG(ctx, '#111827', '#1f2937', 90);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = -S; i < S * 2; i += 3) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
    }
    noise(ctx, 'rgba(255,255,255,0.03)', 6000, 1, 2);
    stitchLine(ctx, S * 0.5, 0, S * 0.5, S, 'rgba(150,150,150,0.08)');
    fabricGrain(ctx, 0.02);
  },

  // ═══ TRACKSUITS ═══
  'tracksuit_red': (ctx) => {
    gradientBG(ctx, '#dc2626', '#b91c1c', 90);
    // Shiny polyester sheen
    const g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.4, 'rgba(255,255,255,0.08)');
    g.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Racing stripes
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(S - 50, 0, 8, S);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(S - 35, 0, 4, S);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(S - 25, 0, 2, S);
    weave(ctx, 'rgba(255,255,255,0.015)', 6);
    fabricGrain(ctx, 0.015);
  },
  'tracksuit_black': (ctx) => {
    gradientBG(ctx, '#0a0a0a', '#1a1a1a', 90);
    const g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.55, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#fff'; ctx.fillRect(S - 50, 0, 8, S);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(S - 35, 0, 4, S);
    fabricGrain(ctx, 0.012);
  },

  // ═══ LEATHER ═══
  'leather_black': (ctx) => {
    gradientBG(ctx, '#0f1117', '#1a1d27', 135);
    // Leather grain pores
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 0.5 + Math.random() * 2.5;
      ctx.fillStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.03})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Subtle crease lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * S, Math.random() * S);
      ctx.quadraticCurveTo(Math.random() * S, Math.random() * S, Math.random() * S, Math.random() * S);
      ctx.stroke();
    }
    // Gloss highlight
    const g = ctx.createRadialGradient(S * 0.3, S * 0.3, 10, S * 0.3, S * 0.3, S * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Zipper seam
    stitchLine(ctx, S * 0.48, 0, S * 0.48, S, 'rgba(200,200,200,0.08)');
    ctx.fillStyle = 'rgba(180,180,180,0.1)';
    for (let y = 10; y < S; y += 12) ctx.fillRect(S * 0.47, y, 6, 5);
  },

  // ═══ CAMO ═══
  'camo_green': (ctx) => {
    ctx.fillStyle = '#4d7c0f'; ctx.fillRect(0, 0, S, S);
    const colors = ['#3f6212', '#14532d', '#1c1917', '#365314', '#166534'];
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      ctx.ellipse(Math.random() * S, Math.random() * S, 20 + Math.random() * 50, 15 + Math.random() * 35, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, 'rgba(0,0,0,0.04)', 4000, 1, 1);
    fabricGrain(ctx, 0.03);
  },

  // ═══ PLAID ═══
  'plaid_red': (ctx) => {
    ctx.fillStyle = '#ef4444'; ctx.fillRect(0, 0, S, S);
    const step = 64;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < S / step; i++) { ctx.fillRect(i * step, 0, step / 2, S); ctx.fillRect(0, i * step, S, step / 2); }
    ctx.fillStyle = 'rgba(255,255,0,0.06)'; for (let i = 0; i < S / step; i++) { ctx.fillRect(i * step + step / 4, 0, 2, S); ctx.fillRect(0, i * step + step / 4, S, 2); }
    weave(ctx, 'rgba(255,255,255,0.02)', 4);
    fabricGrain(ctx, 0.025);
  },

  // ═══ GOLD SWAG ═══
  'swag_gold': (ctx) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#fbbf24'); g.addColorStop(0.3, '#fde68a'); g.addColorStop(0.5, '#f59e0b'); g.addColorStop(0.7, '#fbbf24'); g.addColorStop(1, '#d97706');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Diamond quilting
    ctx.strokeStyle = 'rgba(120,80,0,0.15)'; ctx.lineWidth = 1.5;
    for (let i = -S; i < S * 2; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + S, 0); ctx.lineTo(i, S); ctx.stroke();
    }
    fabricGrain(ctx, 0.02);
  },

  // ═══ SHOES ═══
  'shoes_sneakers': (ctx) => {
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, S, S);
    // Mesh texture
    weave(ctx, 'rgba(0,0,0,0.03)', 5);
    // Swoosh accent
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.moveTo(50, S * 0.55); ctx.quadraticCurveTo(S * 0.5, S * 0.3, S - 50, S * 0.45); ctx.lineTo(S - 50, S * 0.55); ctx.quadraticCurveTo(S * 0.5, S * 0.45, 50, S * 0.6); ctx.fill();
    // Sole line
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(0, S - 60, S, 60);
    stitchLine(ctx, 20, S - 62, S - 20, S - 62, 'rgba(0,0,0,0.1)');
    fabricGrain(ctx, 0.02);
  },
  'shoes_boots': (ctx) => {
    gradientBG(ctx, '#78350f', '#5c2d0e', 90);
    // Leather grain
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.beginPath(); ctx.arc(Math.random() * S, Math.random() * S, Math.random() * 2, 0, Math.PI * 2); ctx.fill();
    }
    // Sole
    ctx.fillStyle = '#3d1a06'; ctx.fillRect(0, S - 50, S, 50);
    stitchLine(ctx, 20, S - 52, S - 20, S - 52, 'rgba(200,180,100,0.15)');
    stitchLine(ctx, 20, 30, S - 20, 30, 'rgba(200,180,100,0.12)');
    fabricGrain(ctx, 0.03);
  },

  // ═══ T-SHIRTS ═══
  'tshirt_white': (ctx) => {
    ctx.fillStyle = '#f9fafb'; ctx.fillRect(0, 0, S, S);
    weave(ctx, 'rgba(0,0,0,0.02)', 3);
    // Collar shadow
    const g = ctx.createLinearGradient(0, 0, 0, 60);
    g.addColorStop(0, 'rgba(0,0,0,0.06)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, 60);
    fabricGrain(ctx, 0.015);
  },
  'tshirt_black': (ctx) => {
    ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, S, S);
    weave(ctx, 'rgba(255,255,255,0.015)', 3);
    fabricGrain(ctx, 0.02);
  },
  'tshirt_red': (ctx) => {
    gradientBG(ctx, '#dc2626', '#c52020', 90);
    weave(ctx, 'rgba(0,0,0,0.03)', 3);
    fabricGrain(ctx, 0.02);
  },
  'tshirt_blue': (ctx) => {
    gradientBG(ctx, '#2563eb', '#1d4ed8', 90);
    weave(ctx, 'rgba(255,255,255,0.02)', 3);
    fabricGrain(ctx, 0.02);
  },
  'tshirt_neon': (ctx) => {
    gradientBG(ctx, '#10b981', '#059669', 45);
    ctx.fillStyle = '#34d399';
    for (let i = 0; i < 10; i++) ctx.fillRect(0, i * (S / 10), S, 2);
    // Glow effect
    const g = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.6);
    g.addColorStop(0, 'rgba(52,211,153,0.15)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    fabricGrain(ctx, 0.02);
  },
  'tshirt_stripe': (ctx) => {
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < S / 32; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'transparent';
      ctx.fillRect(0, i * 32, S, 16);
    }
    weave(ctx, 'rgba(0,0,0,0.02)', 4);
    fabricGrain(ctx, 0.02);
  },

  // ═══ VESTS ═══
  'vest_leather': (ctx) => {
    gradientBG(ctx, '#292524', '#1c1917', 90);
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
      ctx.beginPath(); ctx.arc(Math.random() * S, Math.random() * S, Math.random() * 2, 0, Math.PI * 2); ctx.fill();
    }
    // Center zipper
    ctx.fillStyle = 'rgba(120,113,108,0.3)'; ctx.fillRect(S / 2 - 4, 0, 8, S);
    for (let y = 5; y < S; y += 10) { ctx.fillStyle = 'rgba(180,180,180,0.15)'; ctx.fillRect(S / 2 - 3, y, 6, 5); }
    fabricGrain(ctx, 0.025);
  },
  'vest_denim': (ctx) => {
    gradientBG(ctx, '#1e40af', '#1d4ed8', 45);
    noise(ctx, 'rgba(255,255,255,0.08)', 6000, 1, 2);
    stitchLine(ctx, 30, 0, 30, S, 'rgba(200,180,100,0.12)');
    stitchLine(ctx, S - 30, 0, S - 30, S, 'rgba(200,180,100,0.12)');
    fabricGrain(ctx, 0.025);
  },
  'vest_neon': (ctx) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#f0abfc'); g.addColorStop(0.5, '#c084fc'); g.addColorStop(1, '#818cf8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Glow stripes
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, i * (S / 8) + 20, S, 3);
    fabricGrain(ctx, 0.015);
  },

  // ═══ SHORTS ═══
  'shorts_cargo': (ctx) => {
    ctx.fillStyle = '#65a30d'; ctx.fillRect(0, 0, S, S);
    weave(ctx, 'rgba(0,0,0,0.03)', 4);
    // Cargo pockets
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
    ctx.strokeRect(S * 0.6, S * 0.2, S * 0.28, S * 0.25);
    ctx.strokeRect(S * 0.6, S * 0.55, S * 0.28, S * 0.25);
    // Pocket flaps
    ctx.fillStyle = 'rgba(77,124,15,0.8)'; ctx.fillRect(S * 0.6, S * 0.2, S * 0.28, 15);
    ctx.fillRect(S * 0.6, S * 0.55, S * 0.28, 15);
    stitchLine(ctx, S * 0.6, S * 0.2, S * 0.88, S * 0.2, 'rgba(200,180,100,0.12)');
    fabricGrain(ctx, 0.03);
  },
  'shorts_denim': (ctx) => {
    gradientBG(ctx, '#3b82f6', '#2563eb', 90);
    noise(ctx, 'rgba(255,255,255,0.05)', 4000, 1, 2);
    stitchLine(ctx, S * 0.5, 0, S * 0.5, S, 'rgba(200,180,100,0.1)');
    fabricGrain(ctx, 0.025);
  },
  'shorts_sport': (ctx) => {
    gradientBG(ctx, '#111827', '#1f2937', 90);
    const g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.85, 'transparent'); g.addColorStop(0.88, '#ef4444'); g.addColorStop(1, '#ef4444');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    weave(ctx, 'rgba(255,255,255,0.01)', 6);
    fabricGrain(ctx, 0.015);
  },

  // ═══ HATS ═══
  'hat_snapback': (ctx) => {
    ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, S, S);
    weave(ctx, 'rgba(255,255,255,0.02)', 4);
    // Brim area
    ctx.fillStyle = '#ef4444'; ctx.fillRect(0, S * 0.75, S, S * 0.25);
    stitchLine(ctx, 20, S * 0.75, S - 20, S * 0.75, 'rgba(255,255,255,0.1)');
    // Front panel stitching
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(S / 2, S * 0.3, S * 0.25, 0, Math.PI, true); ctx.stroke();
    fabricGrain(ctx, 0.02);
  },
  'hat_beanie': (ctx) => {
    ctx.fillStyle = '#6b21a8'; ctx.fillRect(0, 0, S, S);
    // Ribbed knit pattern
    for (let i = 0; i < S / 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#7c3aed' : '#6b21a8';
      ctx.fillRect(0, i * 8, S, 8);
    }
    // Vertical knit lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < S; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke(); }
    fabricGrain(ctx, 0.025);
  },
  'hat_tophat': (ctx) => {
    gradientBG(ctx, '#0f172a', '#1e293b', 90);
    // Silk sheen
    const g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,0.08)'); g.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Band
    ctx.fillStyle = '#334155'; ctx.fillRect(0, S * 0.75, S, 25);
    stitchLine(ctx, 0, S * 0.75, S, S * 0.75, 'rgba(255,255,255,0.05)');
    fabricGrain(ctx, 0.015);
  },
  'hat_crown': (ctx) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#fde68a'); g.addColorStop(0.3, '#fbbf24'); g.addColorStop(0.5, '#fde68a'); g.addColorStop(0.7, '#f59e0b'); g.addColorStop(1, '#fbbf24');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Gem spots
    const gems = ['#ef4444', '#3b82f6', '#10b981'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = gems[i % gems.length];
      ctx.beginPath(); ctx.arc(50 + i * (S / 6), S * 0.5, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    fabricGrain(ctx, 0.015);
  },

  // ═══ GLASSES ═══
  'glasses_shades': (ctx) => {
    gradientBG(ctx, '#0f172a', '#020617', 135);
    const g = ctx.createRadialGradient(S * 0.3, S * 0.3, 10, S * 0.3, S * 0.3, S);
    g.addColorStop(0, 'rgba(100,100,150,0.15)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  },
  'glasses_nerd': (ctx) => {
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 6;
    ctx.strokeRect(40, S * 0.25, S * 0.35, S * 0.5);
    ctx.strokeRect(S * 0.55, S * 0.25, S * 0.35, S * 0.5);
    ctx.beginPath(); ctx.moveTo(S * 0.4, S * 0.5); ctx.lineTo(S * 0.55, S * 0.5); ctx.stroke();
  },
  'glasses_led': (ctx) => {
    const g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, '#ef4444'); g.addColorStop(0.3, '#f59e0b'); g.addColorStop(0.5, '#22d3ee'); g.addColorStop(0.7, '#8b5cf6'); g.addColorStop(1, '#a855f7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // LED scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < S; y += 4) ctx.fillRect(0, y, S, 2);
  },
  'glasses_aviator': (ctx) => {
    gradientBG(ctx, '#b45309', '#92400e', 90);
    ctx.fillStyle = 'rgba(251,191,36,0.25)'; ctx.fillRect(0, 0, S, S);
    const g = ctx.createRadialGradient(S * 0.4, S * 0.4, 10, S * 0.4, S * 0.4, S * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  },

  // ═══ BEARDS ═══
  'beard_full': (ctx) => {
    gradientBG(ctx, '#78350f', '#65290d', 90);
    // Hair strands
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * S;
      ctx.beginPath(); ctx.moveTo(x, Math.random() * S * 0.3);
      ctx.lineTo(x + (Math.random() - 0.5) * 10, S * 0.3 + Math.random() * S * 0.7);
      ctx.stroke();
    }
    fabricGrain(ctx, 0.035);
  },
  'beard_goatee': (ctx) => {
    ctx.fillStyle = '#292524'; ctx.fillRect(0, 0, S, S);
    noise(ctx, 'rgba(255,255,255,0.03)', 3000, 1, 2);
    fabricGrain(ctx, 0.03);
  },
  'beard_stubble': (ctx) => {
    ctx.fillStyle = '#78716c'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(87,83,78,${0.3 + Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * S, Math.random() * S, 1, 1);
    }
    fabricGrain(ctx, 0.03);
  },

  // ═══ MUSTACHE ═══
  'mustache_handlebar': (ctx) => {
    ctx.fillStyle = '#44403c'; ctx.fillRect(0, 0, S, S);
    noise(ctx, 'rgba(255,255,255,0.02)', 2000, 1, 3);
    fabricGrain(ctx, 0.03);
  },
  'mustache_thin': (ctx) => {
    ctx.fillStyle = '#1c1917'; ctx.fillRect(0, 0, S, S);
    noise(ctx, 'rgba(255,255,255,0.015)', 1500, 1, 2);
    fabricGrain(ctx, 0.025);
  },

  // ═══ WINGS ═══
  'wings_angel': (ctx) => {
    ctx.fillStyle = '#f9fafb'; ctx.fillRect(0, 0, S, S);
    // Feather layers
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(219,234,254,${0.15 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(S / 2 + (Math.random() - 0.5) * 100, S / 2 + (Math.random() - 0.5) * 80, 50 + i * 4, 20 + i * 2, (Math.random() - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Glow center
    const g = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.4);
    g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    fabricGrain(ctx, 0.01);
  },
  'wings_demon': (ctx) => {
    ctx.fillStyle = '#450a0a'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(127,29,29,${0.2 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(S / 2, S / 2, 40 + i * 6, 20 + i * 4, i * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    // Vein lines
    ctx.strokeStyle = 'rgba(200,50,50,0.15)'; ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath(); ctx.moveTo(S / 2, S / 2);
      ctx.quadraticCurveTo(Math.random() * S, Math.random() * S, Math.random() * S, Math.random() * S);
      ctx.stroke();
    }
    fabricGrain(ctx, 0.03);
  },
  'wings_neon': (ctx) => {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#22d3ee'); g.addColorStop(0.5, '#6366f1'); g.addColorStop(1, '#a855f7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // Energy lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath(); ctx.moveTo(S / 2, S / 2);
      const angle = (i / 20) * Math.PI * 2;
      ctx.lineTo(S / 2 + Math.cos(angle) * S * 0.5, S / 2 + Math.sin(angle) * S * 0.5);
      ctx.stroke();
    }
    fabricGrain(ctx, 0.015);
  },

  // ═══ NEW ITEMS — hand-crafted textures ═══

  // Bomber Navy
  'bomber_navy': (ctx) => {
    gradientBG(ctx, '#1e3a5f', '#0f1d3a', 90);
    // Nylon sheen stripes
    for (let i = 0; i < S; i += 8) {
      ctx.strokeStyle = `rgba(80,120,200,${0.04 + Math.sin(i * 0.1) * 0.02})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
    }
    // Ribbed collar/cuffs zone
    ctx.fillStyle = 'rgba(50,70,100,0.3)';
    ctx.fillRect(0, 0, S, 40); ctx.fillRect(0, S - 40, S, 40);
    weave(ctx, 'rgba(255,255,255,0.02)', 3);
    stitchLine(ctx, S * 0.5, 0, S * 0.5, S);
    fabricGrain(ctx, 0.02);
  },

  // Varsity
  'varsity_green': (ctx) => {
    gradientBG(ctx, '#166534', '#14532d', 0);
    // Sleeve contrast (lighter sides)
    ctx.fillStyle = 'rgba(200,200,200,0.08)';
    ctx.fillRect(0, 0, S * 0.25, S); ctx.fillRect(S * 0.75, 0, S * 0.25, S);
    // Letter patch area
    const g = ctx.createRadialGradient(S / 2, S * 0.35, 10, S / 2, S * 0.35, 80);
    g.addColorStop(0, 'rgba(255,220,100,0.15)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    stitchLine(ctx, S * 0.25, 0, S * 0.25, S);
    stitchLine(ctx, S * 0.75, 0, S * 0.75, S);
    fabricGrain(ctx, 0.03);
  },

  // Kimono
  'kimono': (ctx) => {
    gradientBG(ctx, '#9f1239', '#7f1d1d', 135);
    // Japanese wave pattern
    for (let y = 0; y < S; y += 30) {
      for (let x = 0; x < S; x += 40) {
        ctx.strokeStyle = 'rgba(255,200,100,0.08)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x + 20, y, 15, 0, Math.PI);
        ctx.stroke();
      }
    }
    // Obi belt band
    ctx.fillStyle = 'rgba(200,150,50,0.15)';
    ctx.fillRect(0, S * 0.55, S, S * 0.12);
    fabricGrain(ctx, 0.02);
  },

  // Hawaiian shirt
  'hawaiian': (ctx) => {
    gradientBG(ctx, '#fbbf24', '#22c55e', 45);
    // Flower pattern
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * S, y = Math.random() * S;
      ctx.fillStyle = `rgba(${200 + Math.random() * 55},${Math.random() * 100 + 50},${Math.random() * 100 + 80},0.2)`;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 8, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    fabricGrain(ctx, 0.015);
  },

  // Chinos beige
  'chinos_beige': (ctx) => {
    gradientBG(ctx, '#d4a574', '#c2956a', 0);
    weave(ctx, 'rgba(150,120,80,0.06)', 3);
    noise(ctx, 'rgba(0,0,0,0.03)', 5000);
    // Crease lines
    stitchLine(ctx, S * 0.3, 0, S * 0.3, S, 'rgba(0,0,0,0.06)');
    stitchLine(ctx, S * 0.7, 0, S * 0.7, S, 'rgba(0,0,0,0.06)');
    fabricGrain(ctx, 0.02);
  },

  // Leather pants
  'leather_pants': (ctx) => {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, S, S);
    // Leather grain (like jacket)
    noise(ctx, 'rgba(60,60,60,0.2)', 2500, 2, 2);
    // Gloss highlight
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.5, 'transparent'); g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    stitchLine(ctx, S * 0.5, 0, S * 0.5, S, 'rgba(255,255,255,0.08)');
    fabricGrain(ctx, 0.015);
  },

  // Combat boots
  'shoes_combat': (ctx) => {
    ctx.fillStyle = '#1f1f1f'; ctx.fillRect(0, 0, S, S);
    noise(ctx, 'rgba(80,80,80,0.15)', 3000, 2, 2);
    // Boot sole tread pattern
    for (let y = S * 0.7; y < S; y += 8) {
      ctx.strokeStyle = 'rgba(40,40,40,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
    }
    // Lace holes
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(100,100,100,0.3)';
      ctx.beginPath(); ctx.arc(S * 0.45, S * 0.1 + i * 30, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S * 0.55, S * 0.1 + i * 30, 4, 0, Math.PI * 2); ctx.fill();
    }
    fabricGrain(ctx, 0.02);
  },

  // Bucket hat
  'hat_bucket': (ctx) => {
    gradientBG(ctx, '#65a30d', '#4d7c0f', 0);
    weave(ctx, 'rgba(0,0,0,0.04)', 4);
    // Brim shade
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, S * 0.7, S, S * 0.3);
    fabricGrain(ctx, 0.025);
  },

  // Witch hat
  'hat_witch': (ctx) => {
    gradientBG(ctx, '#2e1065', '#1e0040', 90);
    // Star pattern
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(200,180,255,${0.05 + Math.random() * 0.1})`;
      const x = Math.random() * S, y = Math.random() * S;
      ctx.beginPath(); ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // Band
    ctx.fillStyle = 'rgba(150,100,200,0.2)';
    ctx.fillRect(0, S * 0.6, S, S * 0.08);
    fabricGrain(ctx, 0.02);
  },
};

// ─── Factory + Cache ────────────────────────────────────────────────
const textureCache: Record<string, THREE.Texture> = {};

export function createClothingTexture(type: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const fn = TEXTURES[type];
  if (fn) {
    fn(ctx);
  } else {
    let handled = false;
    const shopItem = SHOP_CATALOG.find(i => i.id === type);
    if (shopItem && shopItem.preview) {
      const cls = shopItem.preview;
      
      const fromMatch = cls.match(/from-([a-z]+-[0-9]+|white)/);
      const toMatch = cls.match(/to-([a-z]+-[0-9]+|white)/);
      const viaMatch = cls.match(/via-([a-z]+-[0-9]+|white)/);
      const bgMatch = cls.match(/bg-([a-z]+-[0-9]+|white)/);
      
      if (fromMatch && toMatch) {
         const c1 = TW2HEX[fromMatch[1]] || '#6b7280';
         const c2 = TW2HEX[toMatch[1]] || '#6b7280';
         if (viaMatch) {
            const g = ctx.createLinearGradient(0, 0, S, S);
            g.addColorStop(0, c1);
            g.addColorStop(0.5, TW2HEX[viaMatch[1]] || '#ffffff');
            g.addColorStop(1, c2);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, S, S);
         } else {
            gradientBG(ctx, c1, c2, 45);
         }
         handled = true;
      } else if (bgMatch) {
         ctx.fillStyle = TW2HEX[bgMatch[1]] || '#6b7280';
         ctx.fillRect(0, 0, S, S);
         handled = true;
      }
    }

    if (!handled) {
      // Fallback: neutral gray with subtle weave
      ctx.fillStyle = '#6b7280'; ctx.fillRect(0, 0, S, S);
    }
    
    // Add generic fabric details based on category
    if (shopItem) {
      if (shopItem.category === 'jacket' || shopItem.category === 'vest') {
         noise(ctx, 'rgba(255,255,255,0.05)', 5000, 1, 2);
         stitchLine(ctx, S * 0.5, 0, S * 0.5, S, 'rgba(255,255,255,0.1)');
      } else if (shopItem.category === 'tshirt' || shopItem.category === 'pants' || shopItem.category === 'shorts') {
         weave(ctx, 'rgba(0,0,0,0.03)', 3);
      } else if (shopItem.category === 'shoes') {
         weave(ctx, 'rgba(0,0,0,0.05)', 5);
      } else if (shopItem.category === 'hat') {
         weave(ctx, 'rgba(255,255,255,0.02)', 4);
      }
    }
    fabricGrain(ctx, 0.02);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function getClothingTexture(type: string): THREE.Texture | null {
  if (!type || type === 'none') return null;
  if (!textureCache[type]) textureCache[type] = createClothingTexture(type);
  return textureCache[type];
}
