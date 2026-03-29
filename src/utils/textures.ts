/**
 * Prozedurale Stoff-Texturen — High-Detail Canvas-Rendering
 *
 * Jede Textur wird auf 512x512 Canvas gezeichnet mit:
 * - Stoffstruktur (Gewebe, Fasern, Falten)
 * - Details (Nähte, Knöpfe, Reißverschlüsse, Logos, Streifen)
 * - Materialspezifische Oberflächen (Leder-Poren, Denim-Twill, Nylon-Glanz)
 */

import * as THREE from 'three';

const TEX_SIZE = 512;

// ─── Hilfsfunktionen ────────────────────────────────────────────────

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number, r: number, g: number, b: number) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity;
    d[i] = Math.max(0, Math.min(255, d[i] + n * r));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * g));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * b));
  }
  ctx.putImageData(id, 0, 0);
}

function fabricWeave(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, spacing: number = 4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < w; x += spacing * 2) {
      ctx.lineTo(x + spacing, y + 1);
      ctx.lineTo(x + spacing * 2, y);
    }
    ctx.stroke();
  }
}

function stitchLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string = 'rgba(255,255,255,0.3)', dashLen: number = 6) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([dashLen, dashLen * 0.7]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Holes
  const hr = r * 0.15;
  for (let a = 0; a < 4; a++) {
    const angle = (a / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * r * 0.4, y + Math.sin(angle) * r * 0.4, hr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
  }
}

function drawZipper(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number) {
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(x - 2, y1, 4, y2 - y1);
  for (let y = y1; y < y2; y += 6) {
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(x - 4, y, 3, 3);
    ctx.fillRect(x + 1, y, 3, 3);
  }
  // Pull tab
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(x - 3, y1 - 8, 6, 10);
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(x - 1, y1 - 12, 2, 6);
}

function leatherGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const s = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crease lines
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + (Math.random() - 0.5) * 100, sy + Math.random() * 60, sx + (Math.random() - 0.5) * 80, sy + 30 + Math.random() * 40);
    ctx.stroke();
  }
}

function denimTwill(ctx: CanvasRenderingContext2D, w: number, h: number, baseColor: string) {
  // Diagonal twill weave
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  // Vertical warp threads
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  for (let x = 0; x < w; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  // Fiber noise
  noise(ctx, w, h, 15, 0.5, 0.5, 1);
}

function fabricFolds(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number = 0.08) {
  // Soft vertical fold shadows
  for (let i = 0; i < 5; i++) {
    const x = (w / 6) * (i + 1) + (Math.random() - 0.5) * 30;
    const grad = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.4, `rgba(0,0,0,${intensity})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${intensity * 0.5})`);
    grad.addColorStop(0.6, `rgba(0,0,0,${intensity})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 30, 0, 60, h);
  }
}

function camoPattern(ctx: CanvasRenderingContext2D, w: number, h: number, colors: string[]) {
  for (const color of colors) {
    ctx.fillStyle = color;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.ellipse(x, y, 20 + Math.random() * 50, 15 + Math.random() * 35, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─── Textur-Definitionen ────────────────────────────────────────────

type TextureFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const TEXTURES: Record<string, TextureFn> = {

  // ── JACKEN ──

  'leather_black': (ctx, w, h) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    leatherGrain(ctx, w, h);
    // Collar
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, w, h * 0.12);
    stitchLine(ctx, 0, h * 0.12, w, h * 0.12, 'rgba(255,255,255,0.15)');
    // Center zipper
    drawZipper(ctx, w / 2, h * 0.12, h * 0.9);
    // Pocket stitching
    stitchLine(ctx, w * 0.1, h * 0.55, w * 0.4, h * 0.55);
    stitchLine(ctx, w * 0.1, h * 0.55, w * 0.1, h * 0.75);
    stitchLine(ctx, w * 0.4, h * 0.55, w * 0.4, h * 0.75);
    stitchLine(ctx, w * 0.1, h * 0.75, w * 0.4, h * 0.75);
    // Right pocket
    stitchLine(ctx, w * 0.6, h * 0.55, w * 0.9, h * 0.55);
    stitchLine(ctx, w * 0.6, h * 0.55, w * 0.6, h * 0.75);
    stitchLine(ctx, w * 0.9, h * 0.55, w * 0.9, h * 0.75);
    stitchLine(ctx, w * 0.6, h * 0.75, w * 0.9, h * 0.75);
    fabricFolds(ctx, w, h, 0.04);
  },

  'camo_green': (ctx, w, h) => {
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(0, 0, w, h);
    camoPattern(ctx, w, h, ['#3f6212', '#14532d', '#365314', '#1a2e05']);
    noise(ctx, w, h, 20, 1, 1, 1);
    // Pocket flap
    stitchLine(ctx, w * 0.15, h * 0.4, w * 0.45, h * 0.4);
    stitchLine(ctx, w * 0.15, h * 0.4, w * 0.15, h * 0.5);
    stitchLine(ctx, w * 0.45, h * 0.4, w * 0.45, h * 0.5);
    drawButton(ctx, w * 0.3, h * 0.42, 4, '#6b7280');
    fabricFolds(ctx, w, h, 0.06);
  },

  'plaid_red': (ctx, w, h) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, w, h);
    // Plaid pattern
    const colors = ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.15)'];
    const sizes = [40, 20, 8];
    for (let c = 0; c < colors.length; c++) {
      ctx.fillStyle = colors[c];
      for (let i = 0; i < w; i += sizes[c] * 2) { ctx.fillRect(i, 0, sizes[c], h); }
      for (let i = 0; i < h; i += sizes[c] * 2) { ctx.fillRect(0, i, w, sizes[c]); }
    }
    fabricWeave(ctx, w, h, 'rgba(255,255,255,0.03)', 3);
    noise(ctx, w, h, 10, 1, 0.5, 0.5);
    // Buttons
    for (let i = 0; i < 5; i++) drawButton(ctx, w / 2, h * 0.15 + i * h * 0.16, 5, '#f5f5f4');
    fabricFolds(ctx, w, h);
  },

  'tracksuit_red': (ctx, w, h) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, w, h);
    // Nylon sheen
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.3, 'rgba(255,255,255,0.08)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.7, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    // White racing stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w - 30, 0, 8, h);
    ctx.fillRect(w - 16, 0, 8, h);
    // Zipper
    drawZipper(ctx, w / 2, h * 0.08, h * 0.85);
    // Collar
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, w, h * 0.1);
    stitchLine(ctx, 0, h * 0.1, w, h * 0.1, 'rgba(255,255,255,0.2)');
    noise(ctx, w, h, 8, 1, 0.3, 0.3);
  },

  'tracksuit_black': (ctx, w, h) => {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    const sheen = ctx.createLinearGradient(0, 0, w, h * 0.5);
    sheen.addColorStop(0, 'rgba(255,255,255,0.02)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w - 30, 0, 8, h);
    ctx.fillRect(w - 16, 0, 8, h);
    stitchLine(ctx, w * 0.3, 0, w * 0.3, h, 'rgba(255,255,255,0.08)');
    noise(ctx, w, h, 8, 1, 1, 1);
  },

  'swag_gold': (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.5, '#fcd34d');
    grad.addColorStop(0.7, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Diamond grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += 25) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    noise(ctx, w, h, 12, 1, 0.8, 0.3);
    fabricFolds(ctx, w, h, 0.05);
  },

  // ── HOSEN ──

  'denim_blue': (ctx, w, h) => {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, w, h);
    denimTwill(ctx, w, h, '#1e3a8a');
    // Seam lines
    stitchLine(ctx, w * 0.3, 0, w * 0.3, h, 'rgba(210,160,60,0.4)', 4);
    stitchLine(ctx, w * 0.7, 0, w * 0.7, h, 'rgba(210,160,60,0.4)', 4);
    // Pocket arc
    ctx.strokeStyle = 'rgba(210,160,60,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(w * 0.15, h * 0.18, 50, -0.5, 1.2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Belt area
    ctx.fillStyle = '#172554';
    ctx.fillRect(0, 0, w, h * 0.06);
    stitchLine(ctx, 0, h * 0.06, w, h * 0.06, 'rgba(210,160,60,0.3)', 3);
    fabricFolds(ctx, w, h);
  },

  'denim_black': (ctx, w, h) => {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, w, h);
    denimTwill(ctx, w, h, '#1f2937');
    stitchLine(ctx, w * 0.3, 0, w * 0.3, h, 'rgba(150,150,150,0.2)', 4);
    stitchLine(ctx, w * 0.7, 0, w * 0.7, h, 'rgba(150,150,150,0.2)', 4);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h * 0.06);
    stitchLine(ctx, 0, h * 0.06, w, h * 0.06, 'rgba(150,150,150,0.15)', 3);
    fabricFolds(ctx, w, h, 0.05);
  },

  // ── SCHUHE ──

  'shoes_sneakers': (ctx, w, h) => {
    // White upper
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, w, h * 0.6);
    // Blue swoosh/accent
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.4);
    ctx.quadraticCurveTo(w * 0.5, h * 0.15, w * 0.9, h * 0.35);
    ctx.lineTo(w * 0.9, h * 0.45);
    ctx.quadraticCurveTo(w * 0.5, h * 0.25, w * 0.1, h * 0.5);
    ctx.fill();
    // Sole
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, h * 0.6, w, h * 0.15);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    // Tread pattern
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let x = 0; x < w; x += 12) ctx.fillRect(x, h * 0.8, 6, h * 0.2);
    // Lace holes
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.4, h * 0.1 + i * h * 0.08, 3, 0, Math.PI * 2);
      ctx.arc(w * 0.55, h * 0.1 + i * h * 0.08, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#9ca3af';
      ctx.fill();
    }
    // Laces
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h * 0.1 + i * h * 0.08);
      ctx.lineTo(w * 0.55, h * 0.1 + i * h * 0.08);
      ctx.stroke();
    }
    stitchLine(ctx, 0, h * 0.6, w, h * 0.6, 'rgba(0,0,0,0.15)', 3);
    noise(ctx, w, h, 5, 1, 1, 1);
  },

  'shoes_boots': (ctx, w, h) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, w, h);
    leatherGrain(ctx, w, h);
    // Darker toe cap
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Sole
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    // Stitching
    stitchLine(ctx, 0, h * 0.3, w, h * 0.3, 'rgba(210,160,60,0.4)', 5);
    stitchLine(ctx, 0, h * 0.7, w, h * 0.7, 'rgba(210,160,60,0.4)', 5);
    stitchLine(ctx, 0, h * 0.9, w, h * 0.9, 'rgba(210,160,60,0.3)', 3);
    // Lace hooks
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(w * 0.45, h * 0.05 + i * h * 0.04, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    fabricFolds(ctx, w, h, 0.06);
  },

  // ── T-SHIRTS ──

  'tshirt_white': (ctx, w, h) => {
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, w, h);
    fabricWeave(ctx, w, h, 'rgba(0,0,0,0.03)', 3);
    // Collar V
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0);
    ctx.lineTo(w * 0.5, h * 0.12);
    ctx.lineTo(w * 0.65, 0);
    ctx.stroke();
    stitchLine(ctx, w * 0.35, 0, w * 0.5, h * 0.12, 'rgba(0,0,0,0.08)', 3);
    stitchLine(ctx, w * 0.5, h * 0.12, w * 0.65, 0, 'rgba(0,0,0,0.08)', 3);
    // Sleeve seams
    stitchLine(ctx, 0, h * 0.2, w * 0.2, h * 0.3, 'rgba(0,0,0,0.05)');
    stitchLine(ctx, w, h * 0.2, w * 0.8, h * 0.3, 'rgba(0,0,0,0.05)');
    noise(ctx, w, h, 6, 1, 1, 1);
    fabricFolds(ctx, w, h, 0.04);
  },

  'tshirt_black': (ctx, w, h) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    fabricWeave(ctx, w, h, 'rgba(255,255,255,0.02)', 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0); ctx.lineTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.65, 0);
    ctx.stroke();
    noise(ctx, w, h, 6, 1, 1, 1);
    fabricFolds(ctx, w, h, 0.03);
  },

  'tshirt_red': (ctx, w, h) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, w, h);
    fabricWeave(ctx, w, h, 'rgba(0,0,0,0.04)', 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0); ctx.lineTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.65, 0);
    ctx.stroke();
    noise(ctx, w, h, 8, 1, 0.4, 0.4);
    fabricFolds(ctx, w, h);
  },

  'tshirt_blue': (ctx, w, h) => {
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, w, h);
    fabricWeave(ctx, w, h, 'rgba(255,255,255,0.03)', 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0); ctx.lineTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.65, 0);
    ctx.stroke();
    noise(ctx, w, h, 8, 0.4, 0.5, 1);
    fabricFolds(ctx, w, h);
  },

  'tshirt_neon': (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#10b981'); g.addColorStop(1, '#059669');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Neon stripe accents
    ctx.fillStyle = 'rgba(52,211,153,0.4)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 60 + 20, w, 2);
    // Glow effect
    ctx.fillStyle = 'rgba(110,231,183,0.08)';
    ctx.fillRect(0, h * 0.3, w, h * 0.15);
    fabricWeave(ctx, w, h, 'rgba(0,0,0,0.03)', 3);
    noise(ctx, w, h, 8, 0.5, 1, 0.7);
    fabricFolds(ctx, w, h, 0.05);
  },

  'tshirt_stripe': (ctx, w, h) => {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < h; i += 32) ctx.fillRect(0, i, w, 14);
    fabricWeave(ctx, w, h, 'rgba(0,0,0,0.02)', 2);
    noise(ctx, w, h, 6, 0.5, 0.5, 1);
    fabricFolds(ctx, w, h);
  },

  // ── WESTEN ──

  'vest_leather': (ctx, w, h) => {
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, 0, w, h);
    leatherGrain(ctx, w, h);
    // Center opening
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(w * 0.43, 0, w * 0.14, h);
    // Snaps
    for (let i = 0; i < 4; i++) {
      drawButton(ctx, w * 0.45, h * 0.2 + i * h * 0.18, 5, '#78716c');
      drawButton(ctx, w * 0.55, h * 0.2 + i * h * 0.18, 5, '#78716c');
    }
    stitchLine(ctx, w * 0.1, 0, w * 0.1, h, 'rgba(210,160,60,0.2)');
    stitchLine(ctx, w * 0.9, 0, w * 0.9, h, 'rgba(210,160,60,0.2)');
    fabricFolds(ctx, w, h, 0.04);
  },

  'vest_denim': (ctx, w, h) => {
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, w, h);
    denimTwill(ctx, w, h, '#1e40af');
    drawButton(ctx, w * 0.48, h * 0.2, 5, '#d4d4d8');
    drawButton(ctx, w * 0.48, h * 0.38, 5, '#d4d4d8');
    drawButton(ctx, w * 0.48, h * 0.56, 5, '#d4d4d8');
    stitchLine(ctx, w * 0.15, h * 0.45, w * 0.38, h * 0.45, 'rgba(210,160,60,0.3)');
    stitchLine(ctx, w * 0.15, h * 0.45, w * 0.15, h * 0.65, 'rgba(210,160,60,0.3)');
    stitchLine(ctx, w * 0.38, h * 0.45, w * 0.38, h * 0.65, 'rgba(210,160,60,0.3)');
    stitchLine(ctx, w * 0.15, h * 0.65, w * 0.38, h * 0.65, 'rgba(210,160,60,0.3)');
    fabricFolds(ctx, w, h);
  },

  'vest_neon': (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f0abfc'); g.addColorStop(0.5, '#c084fc'); g.addColorStop(1, '#818cf8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < w; i += 20) ctx.fillRect(i, 0, 2, h);
    drawZipper(ctx, w / 2, h * 0.1, h * 0.85);
    noise(ctx, w, h, 10, 1, 0.8, 1);
    fabricFolds(ctx, w, h, 0.06);
  },

  // ── SHORTS ──

  'shorts_cargo': (ctx, w, h) => {
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 15, 0.8, 1, 0.5);
    // Cargo pockets
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(w * 0.6, h * 0.3, w * 0.3, h * 0.35);
    ctx.strokeRect(w * 0.08, h * 0.3, w * 0.3, h * 0.35);
    ctx.setLineDash([]);
    // Pocket flap
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(w * 0.6, h * 0.27, w * 0.3, h * 0.08);
    ctx.fillRect(w * 0.08, h * 0.27, w * 0.3, h * 0.08);
    drawButton(ctx, w * 0.75, h * 0.32, 3, '#a3a3a3');
    drawButton(ctx, w * 0.23, h * 0.32, 3, '#a3a3a3');
    // Belt loops
    ctx.fillStyle = '#4d7c0f';
    for (let x of [0.15, 0.35, 0.55, 0.75]) ctx.fillRect(w * x, 0, 8, h * 0.08);
    fabricFolds(ctx, w, h, 0.07);
  },

  'shorts_denim': (ctx, w, h) => {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, w, h);
    denimTwill(ctx, w, h, '#3b82f6');
    stitchLine(ctx, w * 0.35, 0, w * 0.35, h, 'rgba(210,160,60,0.3)', 4);
    stitchLine(ctx, w * 0.65, 0, w * 0.65, h, 'rgba(210,160,60,0.3)', 4);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, w, h * 0.06);
    fabricFolds(ctx, w, h);
  },

  'shorts_sport': (ctx, w, h) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    // Side stripe
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(w - 35, 0, 30, h);
    // Mesh texture
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < h; y += 6) for (let x = 0; x < w - 40; x += 6) ctx.fillRect(x, y, 3, 3);
    // Elastic waistband
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, w, h * 0.1);
    stitchLine(ctx, 0, h * 0.1, w, h * 0.1, 'rgba(255,255,255,0.1)');
    noise(ctx, w, h, 6, 1, 1, 1);
  },

  // ── HUETE ──

  'hat_snapback': (ctx, w, h) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    // Panel sections
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.33, 0); ctx.lineTo(w * 0.4, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.66, 0); ctx.lineTo(w * 0.6, h); ctx.stroke();
    // Visor
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    stitchLine(ctx, 0, h * 0.7, w, h * 0.7, 'rgba(255,255,255,0.2)', 3);
    // Button on top
    drawButton(ctx, w * 0.5, h * 0.05, 6, '#ef4444');
    noise(ctx, w, h, 8, 1, 1, 1);
  },

  'hat_beanie': (ctx, w, h) => {
    ctx.fillStyle = '#6b21a8';
    ctx.fillRect(0, 0, w, h);
    // Knit ribbing
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 8) {
      ctx.beginPath();
      for (let x = 0; x < w; x += 12) {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 3, y - 3, x + 6, y);
        ctx.quadraticCurveTo(x + 9, y + 3, x + 12, y);
      }
      ctx.stroke();
    }
    // Fold-up brim
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let y = h * 0.75; y < h; y += 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    noise(ctx, w, h, 10, 0.7, 0.3, 1);
  },

  'hat_tophat': (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    // Silk sheen
    const sheen = ctx.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.3, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    sheen.addColorStop(0.7, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    // Band
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, h * 0.7, w, h * 0.08);
    stitchLine(ctx, 0, h * 0.7, w, h * 0.7, 'rgba(255,255,255,0.08)', 2);
    stitchLine(ctx, 0, h * 0.78, w, h * 0.78, 'rgba(255,255,255,0.08)', 2);
    noise(ctx, w, h, 5, 1, 1, 1);
  },

  'hat_crown': (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#fcd34d'); g.addColorStop(0.3, '#f59e0b'); g.addColorStop(0.5, '#fbbf24'); g.addColorStop(0.7, '#f59e0b'); g.addColorStop(1, '#d97706');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Jewels
    const jewels = [['#ef4444', 0.25], ['#3b82f6', 0.5], ['#22c55e', 0.75]];
    for (const [color, xPos] of jewels) {
      ctx.beginPath();
      ctx.arc(w * (xPos as number), h * 0.5, 12, 0, Math.PI * 2);
      ctx.fillStyle = color as string;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Gem highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(w * (xPos as number) - 3, h * 0.48, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cross-hatching for gold texture
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 8) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h * 0.3, h); ctx.stroke();
    }
    noise(ctx, w, h, 10, 1, 0.9, 0.4);
  },

  // ── BRILLEN ──

  'glasses_shades': (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },

  'glasses_nerd': (ctx, w, h) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.strokeRect(w * 0.08, h * 0.25, w * 0.38, h * 0.5);
    ctx.strokeRect(w * 0.54, h * 0.25, w * 0.38, h * 0.5);
    ctx.fillStyle = 'rgba(148,163,184,0.15)';
    ctx.fillRect(w * 0.08, h * 0.25, w * 0.38, h * 0.5);
    ctx.fillRect(w * 0.54, h * 0.25, w * 0.38, h * 0.5);
  },

  'glasses_led': (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ef4444'); g.addColorStop(0.5, '#22d3ee'); g.addColorStop(1, '#a855f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, h * 0.3, w, h * 0.1);
    noise(ctx, w, h, 15, 1, 1, 1);
  },

  'glasses_aviator': (ctx, w, h) => {
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(251,191,36,0.25)';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },

  // ── BART ──

  'beard_full': (ctx, w, h) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, w, h);
    // Hair strands
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y + 3 + Math.random() * 8);
      ctx.stroke();
    }
    noise(ctx, w, h, 20, 1, 0.7, 0.3);
  },

  'beard_goatee': (ctx, w, h) => {
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * w;
      ctx.beginPath(); ctx.moveTo(x, Math.random() * h); ctx.lineTo(x, Math.random() * h + 5); ctx.stroke();
    }
    noise(ctx, w, h, 15, 1, 1, 1);
  },

  'beard_stubble': (ctx, w, h) => {
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#57534e';
    for (let i = 0; i < 5000; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    noise(ctx, w, h, 12, 1, 1, 1);
  },

  // ── SCHNURRBART ──

  'mustache_handlebar': (ctx, w, h) => {
    ctx.fillStyle = '#44403c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 300; i++) {
      ctx.beginPath(); ctx.moveTo(Math.random() * w, Math.random() * h); ctx.lineTo(Math.random() * w, Math.random() * h); ctx.stroke();
    }
  },

  'mustache_thin': (ctx, w, h) => {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 10, 1, 1, 1);
  },

  // ── FLUEGEL ──

  'wings_angel': (ctx, w, h) => {
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, w, h);
    // Feather layers
    ctx.fillStyle = 'rgba(219,234,254,0.3)';
    for (let row = 0; row < 6; row++) {
      for (let i = 0; i < 8; i++) {
        const x = (i / 8) * w + (row % 2 ? w / 16 : 0);
        const y = row * h / 6;
        ctx.beginPath();
        ctx.ellipse(x, y + h / 12, w / 14, h / 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(191,219,254,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    // Soft glow
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },

  'wings_demon': (ctx, w, h) => {
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, 0, w, h);
    // Membrane veins
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.quadraticCurveTo(w * (0.2 + i * 0.1), h * Math.random(), w * (0.3 + i * 0.1), h * Math.random());
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(127,29,29,0.15)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 40, 20 + Math.random() * 30, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, w, h, 20, 1, 0.3, 0.3);
  },

  'wings_neon': (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#22d3ee'); g.addColorStop(1, '#a855f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Circuit-like pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        if (Math.random() > 0.5) x += (Math.random() - 0.5) * 80;
        else y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Node dots
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    noise(ctx, w, h, 10, 0.6, 1, 1);
  },
};

// ─── Texture Cache & Factory ────────────────────────────────────────

const textureCache: Record<string, THREE.Texture> = {};

export function getTexture(type: string): THREE.Texture | null {
  if (!type || type === 'none') return null;
  if (textureCache[type]) return textureCache[type];

  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  const fn = TEXTURES[type];
  if (fn) {
    fn(ctx, TEX_SIZE, TEX_SIZE);
  } else {
    // Fallback: solid gray
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    fabricWeave(ctx, TEX_SIZE, TEX_SIZE, 'rgba(255,255,255,0.04)', 3);
    noise(ctx, TEX_SIZE, TEX_SIZE, 10, 1, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  textureCache[type] = tex;
  return tex;
}

/** Invalidate a cached texture (e.g. after hot-reload) */
export function invalidateTexture(type: string) {
  if (textureCache[type]) {
    textureCache[type].dispose();
    delete textureCache[type];
  }
}
