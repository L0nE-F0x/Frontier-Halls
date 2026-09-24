import { mix, scale } from "../../engine/color";
import { hash2, noise1 } from "../../engine/rng";
import { contactShadow, obox } from "../../engine/shapes";
import { worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import { shows, type BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z } from "../metrics";
import { DESK_H } from "./furniture";

const DESK_Z = FLOOR_Z + DESK_H + 0.03;

/** A monitor with something running on it. The rows are the only writing that moves. */
export function monitor(
  ctx: BuildCtx,
  x: number, y: number,
  angle: number,
  seed: number,
  size = 1,
  z = DESK_Z,
): void {
  const { p, time } = ctx;
  const w = 0.82 * size;
  const h = 0.52 * size;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  if (ctx.lod > 1) {
    p.cylinder(x, y, z, 0.15 * size, 0.11 * size, 0.04, MAT.darkMetal, 7);
    obox(p, x, y, z + 0.04, 0.06, 0.1, 0.2 * size, angle, MAT.darkMetal);
  }
  obox(p, x, y, z + 0.2 * size, w, 0.07, h, angle, MAT.darkMetal);

  const flicker = 0.86 + noise1(time * 3 + seed) * 0.14;
  const screen = mix(MAT.screen, MAT.paper, 0.1);
  const fx = x - sa * 0.045;
  const fy = y + ca * 0.045;
  obox(p, fx, fy, z + 0.2 * size + 0.03, w - 0.08, 0.02, h - 0.06, angle, screen, {
    emissive: 0.72 * flicker,
    glow: 0.62 * flicker,
  });
  if (ctx.lod < 2) return;

  // Rows of "output", scrolling slowly.
  const rows = 6;
  const scroll = (time * 0.22 + seed) % 1;
  for (let i = 0; i < rows; i++) {
    const t = (i / rows + scroll) % 1;
    const rz = z + 0.2 * size + 0.06 + t * (h - 0.16);
    const n = hash2(seed + i, Math.floor(time * 0.22 + i));
    const len = (0.2 + n * 0.62) * (w - 0.16);
    const off = -(w - 0.16) / 2 + 0.03;
    const cx = fx + ca * (off + len / 2);
    const cy = fy + sa * (off + len / 2);
    obox(p, cx, cy, rz, len, 0.015, 0.028 * size, angle, n > 0.7 ? MAT.lamp : MAT.ink, {
      emissive: 0.9, glow: n > 0.7 ? 0.35 : 0,
    });
  }
}

export function keyboard(ctx: BuildCtx, x: number, y: number, angle: number, z = DESK_Z): void {
  if (ctx.lod < 2) return;
  obox(ctx.p, x, y, z, 0.54, 0.2, 0.035, angle, MAT.darkMetal, { top: scale(MAT.darkMetal, 1.3) });
}

export function mug(ctx: BuildCtx, x: number, y: number, tone: RGB = MAT.terracotta, z = DESK_Z): void {
  if (ctx.lod < 2) return;
  const { p } = ctx;
  p.cylinder(x, y, z, 0.075, 0.075, 0.13, tone, 8, { top: scale(tone, 0.55) });
  p.box(x + 0.07, y - 0.015, z + 0.04, 0.035, 0.03, 0.06, tone);
}

export function papers(ctx: BuildCtx, x: number, y: number, count = 3, seed = 3, z = DESK_Z): void {
  if (ctx.lod < 2) return;
  const { p } = ctx;
  for (let i = 0; i < count; i++) {
    const n = hash2(seed + i, i * 7);
    const m = hash2(i * 3, seed);
    p.box(
      x + n * 0.18 - 0.09, y + m * 0.14 - 0.07, z + i * 0.014,
      0.42, 0.3, 0.012, MAT.paper, { emissive: 0.25 },
    );
    if (i === count - 1) {
      for (let r = 0; r < 4; r++) {
        p.box(x + n * 0.18 - 0.03, y + m * 0.14 - 0.03 + r * 0.055, z + i * 0.014 + 0.013, 0.26 - r * 0.03, 0.018, 0.004, MAT.ink, { emissive: 0.6 });
      }
    }
  }
}

export function books(ctx: BuildCtx, x: number, y: number, count = 4, seed = 9, z = DESK_Z): void {
  if (ctx.lod < 2) return;
  const { p } = ctx;
  let cz = z;
  for (let i = 0; i < count; i++) {
    const n = hash2(seed, i);
    const tone = n > 0.66 ? MAT.cloth : n > 0.33 ? mix(MAT.bench, MAT.ink, 0.3) : MAT.paper;
    const h = 0.05 + n * 0.035;
    p.box(x - n * 0.03, y - n * 0.02, cz, 0.36, 0.26, h, tone, { top: scale(tone, 1.05) });
    cz += h;
  }
}

/** Potted plant. One of the few things in the building that is not working. */
export function plant(ctx: BuildCtx, x: number, y: number, size = 1): void {
  const { p, time } = ctx;
  const pot = 0.24 * size;
  p.cylinder(x, y, FLOOR_Z, pot, pot, 0.34 * size, MAT.terracotta, ctx.lod > 1 ? 9 : 6, { top: MAT.soil });
  const base = FLOOR_Z + 0.34 * size;
  if (ctx.lod === 0) {
    p.cylinder(x, y, base, pot * 1.6, pot * 1.6, 0.6 * size, MAT.leaf, 6);
    ctx.nav?.blockRect(x - pot, y - pot, pot * 2, pot * 2, 0.15);
    return;
  }
  if (ctx.lod > 1) p.cylinder(x, y, FLOOR_Z + 0.34 * size - 0.03, pot * 1.08, pot * 1.08, 0.05, scale(MAT.terracotta, 0.85), 9);
  const leaves = ctx.lod > 1 ? 7 : 4;
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + hash2(x, i) * 1.4;
    const lean = 0.26 + hash2(i, y) * 0.34;
    const sway = Math.sin(time * 0.6 + i * 1.3 + x) * 0.03;
    const tipX = x + Math.cos(a) * lean * size + sway;
    const tipY = y + Math.sin(a) * lean * size;
    const tipZ = base + (0.38 + hash2(i, x) * 0.42) * size;
    p.line(x, y, base, tipX, tipY, tipZ, MAT.leaf, 3.4 * size, { emissive: 0.32 });
    if (ctx.lod > 1) {
      p.line(tipX, tipY, tipZ, tipX + Math.cos(a) * 0.1, tipY + Math.sin(a) * 0.1, tipZ - 0.06, scale(MAT.leaf, 1.2), 2.4 * size, { emissive: 0.3 });
    }
  }
  contactShadow(p, x, y, FLOOR_Z, pot * 1.6, pot, ctx.shadowStrength * 0.5, MAT.ink);
  ctx.nav?.blockRect(x - pot, y - pot, pot * 2, pot * 2, 0.15);
}

/** A tall floor plant: a trunk and a crown of fronds. The lobby kind. */
export function palm(ctx: BuildCtx, x: number, y: number, size = 1): void {
  const { p, time } = ctx;
  const pot = 0.3 * size;
  p.cylinder(x, y, FLOOR_Z, pot, pot, 0.44 * size, MAT.white, ctx.lod > 1 ? 9 : 6, { top: MAT.soil });
  const top = FLOOR_Z + 0.44 * size + 1.3 * size;
  p.line(x, y, FLOOR_Z + 0.44 * size, x + 0.05, y, top, MAT.woodDark, 3.5 * size, { emissive: 0.2 });
  if (ctx.lod === 0) {
    p.cylinder(x, y, top - 0.3, 0.8 * size, 0.8 * size, 0.4, MAT.leaf, 6);
  } else {
    const fronds = ctx.lod > 1 ? 8 : 5;
    for (let i = 0; i < fronds; i++) {
      const a = (i / fronds) * Math.PI * 2 + hash2(x, y + i) * 0.5;
      const sway = Math.sin(time * 0.5 + i + x) * 0.04;
      const mx = x + Math.cos(a) * 0.45 * size;
      const my = y + Math.sin(a) * 0.45 * size;
      const ex = x + Math.cos(a) * 0.95 * size + sway;
      const ey = y + Math.sin(a) * 0.95 * size;
      p.line(x + 0.05, y, top, mx, my, top + 0.18 * size, MAT.leaf, 3.2 * size, { emissive: 0.3 });
      p.line(mx, my, top + 0.18 * size, ex, ey, top - 0.28 * size, scale(MAT.leaf, 1.12), 2.6 * size, { emissive: 0.3 });
    }
  }
  contactShadow(p, x, y, FLOOR_Z, pot * 1.8, pot * 1.1, ctx.shadowStrength * 0.5, MAT.ink);
  ctx.nav?.blockRect(x - pot, y - pot, pot * 2, pot * 2, 0.12);
}

/** A bonsai on a low stand. */
export function bonsai(ctx: BuildCtx, x: number, y: number, z = FLOOR_Z): void {
  const { p } = ctx;
  p.box(x - 0.3, y - 0.2, z, 0.6, 0.4, 0.12, MAT.woodDark);
  if (!shows(ctx, 0.6, 2)) return;
  p.line(x, y, z + 0.12, x - 0.12, y, z + 0.34, MAT.woodDark, 3, { emissive: 0.2 });
  p.line(x - 0.12, y, z + 0.34, x + 0.14, y + 0.04, z + 0.52, MAT.woodDark, 2.4, { emissive: 0.2 });
  p.cylinder(x - 0.16, y, z + 0.4, 0.2, 0.14, 0.12, MAT.leaf, 7);
  p.cylinder(x + 0.14, y + 0.04, z + 0.52, 0.18, 0.13, 0.1, scale(MAT.leaf, 1.1), 7);
}

/** A column cactus in a clay pot. */
export function cactus(ctx: BuildCtx, x: number, y: number, size = 1): void {
  const { p } = ctx;
  p.cylinder(x, y, FLOOR_Z, 0.22 * size, 0.22 * size, 0.3 * size, MAT.terracotta, 7, { top: MAT.soil });
  p.cylinder(x, y, FLOOR_Z + 0.3 * size, 0.1 * size, 0.1 * size, 0.9 * size, MAT.leaf, 7, { top: scale(MAT.leaf, 1.1) });
  if (ctx.lod > 1) {
    p.box(x + 0.08 * size, y - 0.04, FLOOR_Z + 0.65 * size, 0.2 * size, 0.08, 0.07, MAT.leaf);
    p.box(x + 0.22 * size, y - 0.04, FLOOR_Z + 0.65 * size, 0.08, 0.08, 0.28 * size, MAT.leaf);
  }
  ctx.nav?.blockRect(x - 0.22 * size, y - 0.22 * size, 0.44 * size, 0.44 * size, 0.1);
}

/** A fir in a tub. The Black Forest's, brought indoors. */
export function fir(ctx: BuildCtx, x: number, y: number, size = 1): void {
  const { p, time } = ctx;
  p.cylinder(x, y, FLOOR_Z, 0.34 * size, 0.34 * size, 0.36 * size, MAT.woodDark, 8, { top: MAT.soil });
  const sway = Math.sin(time * 0.4 + x) * 0.02;
  const tiers = ctx.lod > 1 ? 4 : 2;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = (0.62 - t * 0.44) * size;
    p.cylinder(x + sway * i, y, FLOOR_Z + (0.36 + i * (1.5 / tiers)) * size, r, r, (1.7 / tiers) * size, scale(MAT.leaf, 0.86 + t * 0.2), 7, {
      top: scale(MAT.leaf, 1.05),
    });
  }
  ctx.nav?.blockRect(x - 0.34 * size, y - 0.34 * size, 0.68 * size, 0.68 * size, 0.1);
}

/** Tall grasses in a long trough, for a room that wants a soft edge. */
export function planter(ctx: BuildCtx, x: number, y: number, w: number, d: number, tone: RGB = MAT.concrete): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, d, 0.5, tone, { top: MAT.soil });
  if (ctx.lod === 0) {
    p.box(x + 0.1, y + 0.1, FLOOR_Z + 0.5, w - 0.2, d - 0.2, 0.4, MAT.leaf);
  } else {
    const n = Math.round((w * d) / (ctx.lod > 1 ? 0.12 : 0.4));
    for (let i = 0; i < n; i++) {
      const u = hash2(i, x * 3) * (w - 0.2) + 0.1;
      const v = hash2(y * 5, i) * (d - 0.2) + 0.1;
      const sway = Math.sin(time * 0.8 + i + x) * 0.05;
      const hgt = 0.4 + hash2(i, i + 3) * 0.5;
      p.line(x + u, y + v, FLOOR_Z + 0.5, x + u + sway, y + v, FLOOR_Z + 0.5 + hgt, scale(MAT.leaf, 0.9 + hash2(i, 7) * 0.3), 2, { emissive: 0.3 });
    }
  }
  ctx.nav?.blockRect(x, y, w, d, 0.08);
}

/** Sign screwed to a wall. The only prose in the world. */
export function sign(
  ctx: BuildCtx,
  text: string,
  x: number, y: number, z: number,
  size: number,
  tone: RGB = MAT.paper,
  facingY: 1 | -1 = -1,
): void {
  const { p } = ctx;
  const w = text.length * size * 6 + size * 3;
  const h = size * 11;
  p.box(x - w / 2, y - (facingY < 0 ? 0.05 : 0), z - h / 2, w, 0.05, h, tone, { emissive: 0.3 });
  if (ctx.lod < 1) return;
  worldText(p, text, x, y - facingY * 0.02, z + size * 3.5, 1, 0, 0, 0, 0, 1, size, MAT.ink, {
    align: "center", emissive: 0.85, bias: 0.05,
  });
}

/** Paint on the floor. Bay markings, walkways, a keep-clear box. */
export function floorTape(
  ctx: BuildCtx,
  x: number, y: number, w: number, d: number,
  tone: RGB,
  dashed = false,
): void {
  const { p } = ctx;
  if (ctx.lod === 0) return;
  const opts = { emissive: 0.4, bias: 0.018 };
  if (!dashed) {
    p.plate(x, y, FLOOR_Z, w, 0.09, tone, opts);
    p.plate(x, y + d - 0.09, FLOOR_Z, w, 0.09, tone, opts);
    p.plate(x, y, FLOOR_Z, 0.09, d, tone, opts);
    p.plate(x + w - 0.09, y, FLOOR_Z, 0.09, d, tone, opts);
    return;
  }
  for (let i = 0; i < w; i += 0.6) {
    p.plate(x + i, y, FLOOR_Z, Math.min(0.36, w - i), 0.09, tone, opts);
  }
}

/** Two-jointed arm on a plinth, repeating a motion it has clearly done before. */
export function robotArm(ctx: BuildCtx, x: number, y: number, z: number, phase: number): void {
  const { p, time } = ctx;
  const t = time * 0.7 + phase;
  const a1 = Math.sin(t) * 0.42 + 0.72;
  const a2 = Math.sin(t + 1.15) * 0.62 - 0.55;
  const spin = Math.sin(t * 0.5) * 0.5;
  p.cylinder(x, y, z, 0.3, 0.3, 0.18, MAT.darkMetal, 9);
  p.cylinder(x, y, z + 0.18, 0.22, 0.22, 0.24, MAT.metal, 9, { top: scale(MAT.metal, 1.1) });
  const base = z + 0.42;
  const dirX = Math.cos(spin);
  const dirY = Math.sin(spin);
  const l1 = 1.05;
  const ex = x + dirX * Math.cos(a1) * l1;
  const ey = y + dirY * Math.cos(a1) * l1;
  const ez = base + Math.sin(a1) * l1;
  const l2 = 0.86;
  const hx = ex + dirX * Math.cos(a1 + a2) * l2;
  const hy = ey + dirY * Math.cos(a1 + a2) * l2;
  const hz = ez + Math.sin(a1 + a2) * l2;
  p.line(x, y, base, ex, ey, ez, MAT.metal, 7, { emissive: 0.34 });
  p.line(ex, ey, ez, hx, hy, hz, MAT.metal, 5, { emissive: 0.34 });
  p.cylinder(ex - 0.09, ey - 0.09, ez - 0.09, 0.12, 0.12, 0.18, MAT.darkMetal, 7);
  p.dot(hx, hy, hz, 5, MAT.led, { emissive: 1, glow: 0.8 });
  p.line(hx, hy, hz, hx, hy, hz - 0.18, MAT.darkMetal, 3, { emissive: 0.4 });
  contactShadow(p, x, y, FLOOR_Z, 0.45, 0.3, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.blockRect(x - 0.4, y - 0.4, 0.8, 0.8, 0.2);
}

/** Dust in the light. Only drawn where there is light to be in. */
export function motes(ctx: BuildCtx, ox: number, oy: number, w: number, d: number, count: number): void {
  if (ctx.quality < 2 || ctx.lod < 2) return;
  const { p, time } = ctx;
  for (let i = 0; i < count; i++) {
    const n = hash2(ox + i, oy + i * 3);
    const m = hash2(i * 11, ox);
    const drift = noise1(time * 0.22 + i * 2.7);
    const x = ox + ((n + drift * 0.14) % 1) * w;
    const y = oy + ((m + noise1(time * 0.17 + i) * 0.1) % 1) * d;
    const z = FLOOR_Z + 0.6 + ((noise1(time * 0.09 + i * 5) + n) % 1) * 4.2;
    const energy = ctx.p.light.energyAt(x, y, z);
    if (energy < 0.22) continue;
    p.dot(x, y, z, 1, MAT.bulb, { emissive: 1, alpha: Math.min(0.7, energy * 0.5), glow: 0.12 });
  }
}

/** Slow curl of vapour from a vent or a mug. */
export function steam(ctx: BuildCtx, x: number, y: number, z: number, strength: number): void {
  if (ctx.quality < 1 || strength <= 0 || ctx.lod < 2) return;
  const { p, time } = ctx;
  for (let i = 0; i < 5; i++) {
    const t = ((time * 0.35 + i * 0.2) % 1);
    const rise = t * 0.7;
    const wob = Math.sin(time * 1.3 + i * 2) * 0.06 * t;
    p.dot(x + wob, y + wob * 0.6, z + rise, 2 + t * 3, MAT.paper, {
      emissive: 1, alpha: (1 - t) * 0.3 * strength,
    });
  }
}

/** A framed picture on the north wall: a few blocks of colour, which is all a poster is at this size. */
export function poster(ctx: BuildCtx, x: number, y: number, z: number, w: number, h: number, seed: number, tones?: RGB[]): void {
  const { p } = ctx;
  if (ctx.lod === 0) return;
  p.box(x - 0.05, y, z - 0.05, w + 0.1, 0.05, h + 0.1, MAT.black);
  p.box(x, y - 0.01, z, w, 0.04, h, MAT.paper, { emissive: 0.3 });
  if (ctx.lod < 2) return;
  const palette = tones ?? [MAT.lamp, MAT.led, MAT.seal, MAT.red, MAT.green];
  for (let i = 0; i < 4; i++) {
    const n = hash2(seed, i);
    const m = hash2(i, seed * 3);
    const bw = w * (0.2 + n * 0.5);
    const bh = h * (0.15 + m * 0.4);
    p.box(x + (w - bw) * m, y - 0.02, z + (h - bh) * n, bw, 0.02, bh, palette[(seed + i) % palette.length], { emissive: 0.5 });
  }
}

/** Something to eat off. A tray with a plate and a cup on it. */
export function tray(ctx: BuildCtx, x: number, y: number, z: number, seed: number): void {
  if (ctx.lod < 2) return;
  const { p } = ctx;
  p.box(x - 0.24, y - 0.17, z, 0.48, 0.34, 0.02, MAT.darkMetal);
  p.cylinder(x - 0.06, y, z + 0.02, 0.13, 0.13, 0.02, MAT.white, 8);
  const food = [MAT.lamp, MAT.green, MAT.red, MAT.terracotta][Math.floor(hash2(seed, 3) * 4)];
  p.cylinder(x - 0.06, y, z + 0.04, 0.08, 0.08, 0.03, food, 6);
  p.cylinder(x + 0.14, y - 0.06, z + 0.02, 0.05, 0.05, 0.1, MAT.white, 6);
}
