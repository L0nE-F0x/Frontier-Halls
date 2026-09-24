import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { contactShadow, obox, tube, uprightDisc } from "../../engine/shapes";
import { worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import { shows, type BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z, TRUSS_Z } from "../metrics";
import { at, axes, footprint, orient } from "./furniture";

/*
 * The furniture of the rooms every lab shares. Each piece that somebody uses
 * is placed by where that somebody stands or sits, like the desks: a treadmill
 * by where the runner's feet are, a bike by its saddle. The Layout that places
 * them knows those points are the stations.
 */

function soft(ctx: BuildCtx, cx: number, cy: number, along: number, across: number, face: number, cost = 3): void {
  if (!ctx.nav) return;
  const [x, y, w, d] = footprint(cx, cy, along, across, face);
  ctx.nav.costRect(x, y, w, d, cost);
}

function hard(ctx: BuildCtx, cx: number, cy: number, along: number, across: number, face: number, pad = 0.08): void {
  if (!ctx.nav) return;
  const [x, y, w, d] = footprint(cx, cy, along, across, face);
  ctx.nav.blockRect(x, y, w, d, pad);
}

/** Text standing on a wall that faces +y, at a size given in world units per cell. */
function letter(ctx: BuildCtx, text: string, x: number, y: number, z: number, size: number, tone: RGB, align: "left" | "center" = "center"): void {
  if (!shows(ctx, size * 6, 1.1) || ctx.lod < 2) return;
  worldText(ctx.p, text, x, y, z, 1, 0, 0, 0, 0, 1, size, tone, { align, emissive: 1, bias: 0.06 });
}

/* =================================================================== gym */

/** A treadmill, placed by where the runner stands. The belt runs whether or not anyone is on it. */
export function treadmill(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p, time } = ctx;
  const deck = at(x, y, face, 0, 0.1);
  orient(ctx, deck.x, deck.y, FLOOR_Z, 0.84, 1.9, 0.16, face, MAT.black, { top: MAT.rubber });
  if (ctx.lod > 1) {
    const { fx, fy, rx, ry } = axes(face);
    for (let i = 0; i < 5; i++) {
      const v = 0.8 - ((i / 5 + time * 0.9) % 1) * 1.7;
      const cx = deck.x + fx * v;
      const cy = deck.y + fy * v;
      p.line(cx - rx * 0.34, cy - ry * 0.34, FLOOR_Z + 0.165, cx + rx * 0.34, cy + ry * 0.34, FLOOR_Z + 0.165, MAT.darkMetal, 1, { emissive: 0.6, bias: 0.02 });
    }
  }
  const front = at(x, y, face, 0, 0.98);
  for (const u of [-0.38, 0.38]) {
    const up = at(front.x, front.y, face, u, 0);
    p.box(up.x - 0.04, up.y - 0.04, FLOOR_Z + 0.16, 0.08, 0.08, 1.12, MAT.darkMetal);
    if (ctx.lod > 1) {
      const back = at(up.x, up.y, face, 0, -0.55);
      p.line(up.x, up.y, FLOOR_Z + 1.05, back.x, back.y, FLOOR_Z + 1.02, MAT.metal, 2, { emissive: 0.3 });
    }
  }
  orient(ctx, front.x, front.y, FLOOR_Z + 1.24, 0.86, 0.22, 0.08, face, MAT.darkMetal);
  const glass = at(front.x, front.y, face, 0, -0.12);
  orient(ctx, glass.x, glass.y, FLOOR_Z + 1.3, 0.4, 0.02, 0.18, face, MAT.screen, { emissive: 0.8, glow: 0.3 });
  hard(ctx, front.x, front.y, 0.86, 0.3, face, 0.04);
  soft(ctx, deck.x, deck.y, 0.84, 1.6, face);
}

/** A bike, placed by its saddle. */
export function exerciseBike(ctx: BuildCtx, x: number, y: number, face: number, seat = 0.74): void {
  const { p } = ctx;
  const base = at(x, y, face, 0, 0.22);
  orient(ctx, base.x, base.y, FLOOR_Z, 0.5, 1.1, 0.07, face, MAT.darkMetal);
  p.line(x, y, FLOOR_Z + 0.07, x, y, FLOOR_Z + seat - 0.04, MAT.darkMetal, Math.max(2, 0.07 * p.cam.s), { emissive: 0.2 });
  obox(p, x, y, FLOOR_Z + seat - 0.05, 0.3, 0.2, 0.06, face, MAT.black);
  const bars = at(x, y, face, 0, 0.58);
  const fly = at(x, y, face, 0, 0.4);
  p.line(fly.x, fly.y, FLOOR_Z + 0.35, bars.x, bars.y, FLOOR_Z + 1.02, MAT.darkMetal, Math.max(2, 0.07 * p.cam.s), { emissive: 0.2 });
  orient(ctx, bars.x, bars.y, FLOOR_Z + 1.02, 0.48, 0.06, 0.05, face, MAT.metal);
  if (ctx.lod > 0) {
    const ew = Math.abs(Math.sin(face)) > 0.5;
    uprightDisc(p, ew ? "x" : "y", fly.x, fly.y, FLOOR_Z + 0.36, 0.26, ew ? 1 : -1, MAT.chrome, { noCull: true }, ctx.lod > 1 ? 12 : 6);
  }
  hard(ctx, fly.x, fly.y, 0.3, 0.5, face, 0.04);
}

/** A rowing machine, placed by its seat. */
export function rower(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p, time } = ctx;
  const rail = at(x, y, face, 0, 0.35);
  orient(ctx, rail.x, rail.y, FLOOR_Z + 0.1, 0.14, 2.3, 0.1, face, MAT.chrome);
  obox(p, x, y, FLOOR_Z + 0.22, 0.34, 0.3, 0.06, face, MAT.black);
  const fly = at(x, y, face, 0, 1.45);
  orient(ctx, fly.x, fly.y, FLOOR_Z, 0.46, 0.5, 0.55, face, MAT.black, { top: MAT.darkMetal });
  if (ctx.lod > 1) {
    const feet = at(x, y, face, 0, 0.72);
    orient(ctx, feet.x, feet.y, FLOOR_Z + 0.12, 0.44, 0.1, 0.24, face, MAT.darkMetal);
    const spin = time * 6;
    for (let i = 0; i < 3; i++) p.dot(fly.x + Math.cos(spin + i * 2.1) * 0.12, fly.y + Math.sin(spin + i * 2.1) * 0.12, FLOOR_Z + 0.4, 2, MAT.metal, { emissive: 0.5 });
  }
  hard(ctx, fly.x, fly.y, 0.46, 0.5, face, 0.04);
  soft(ctx, rail.x, rail.y, 0.4, 2.3, face);
}

/** A power rack, placed by where the lifter stands inside it. */
export function squatRack(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p } = ctx;
  const h = 2.3;
  for (const u of [-0.62, 0.62]) {
    for (const v of [-0.45, 0.45]) {
      const post = at(x, y, face, u, v);
      p.box(post.x - 0.05, post.y - 0.05, FLOOR_Z, 0.1, 0.1, h, MAT.darkMetal);
    }
  }
  const back = at(x, y, face, 0, -0.45);
  orient(ctx, back.x, back.y, FLOOR_Z + h - 0.08, 1.34, 0.08, 0.08, face, MAT.darkMetal);
  const fr = at(x, y, face, 0, 0.45);
  orient(ctx, fr.x, fr.y, FLOOR_Z + h - 0.08, 1.34, 0.08, 0.08, face, MAT.darkMetal);
  orient(ctx, x, y, FLOOR_Z, 1.4, 1.1, 0.04, face, MAT.rubber);
  // The bar on its hooks, plates on either end.
  const bar = at(x, y, face, 0, 0.36);
  orient(ctx, bar.x, bar.y, FLOOR_Z + 1.38, 1.9, 0.05, 0.05, face, MAT.chrome);
  if (ctx.lod > 0) {
    const ew = Math.abs(Math.sin(face)) > 0.5;
    for (const u of [-0.82, 0.82]) {
      const plate = at(bar.x, bar.y, face, u, 0);
      uprightDisc(p, ew ? "x" : "y", plate.x, plate.y, FLOOR_Z + 1.4, 0.24, 1, MAT.black, { noCull: true }, 10);
    }
  }
  for (const u of [-0.62, 0.62]) {
    for (const v of [-0.45, 0.45]) {
      const post = at(x, y, face, u, v);
      ctx.nav?.blockRect(post.x - 0.08, post.y - 0.08, 0.16, 0.16, 0.02);
    }
  }
}

/** A rack of dumbbells along x or y. */
export function dumbbells(ctx: BuildCtx, x: number, y: number, length: number, axis: "x" | "y"): void {
  const { p } = ctx;
  const w = axis === "x" ? length : 0.6;
  const d = axis === "x" ? 0.6 : length;
  p.box(x, y, FLOOR_Z, w, d, 0.5, MAT.darkMetal, { top: MAT.rubber });
  p.box(axis === "x" ? x : x + 0.3, axis === "x" ? y + 0.3 : y, FLOOR_Z + 0.5, axis === "x" ? w : 0.3, axis === "x" ? 0.3 : d, 0.36, MAT.darkMetal);
  if (ctx.lod > 1) {
    const n = Math.floor(length / 0.36);
    for (let i = 0; i < n; i++) {
      const t = 0.18 + i * 0.36;
      const s = 0.06 + (i / n) * 0.05;
      for (const [dz, off] of [[0.5, 0.15], [0.86, 0.45]] as const) {
        const cx = axis === "x" ? x + t : x + off;
        const cy = axis === "x" ? y + off : y + t;
        p.box(cx - s, cy - s, FLOOR_Z + dz, s * 2, s * 2, s * 2, i % 2 ? MAT.black : MAT.chrome);
      }
    }
  }
  ctx.nav?.blockRect(x, y, w, d, 0.08);
}

/** A yoga mat, placed by where its user kneels. */
export function yogaMat(ctx: BuildCtx, x: number, y: number, face: number, tone: RGB): void {
  if (!shows(ctx, 1.2, 1.2)) return;
  const c = at(x, y, face, 0, 0.3);
  orient(ctx, c.x, c.y, FLOOR_Z, 0.64, 1.8, 0.02, face, tone, { emissive: 0.2 });
}

/** A heavy bag on a chain, swinging a little. */
export function punchingBag(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const sway = Math.sin(time * 2.7 + x) * 0.07;
  const sx = x + sway;
  p.line(x, y, TRUSS_Z, sx, y, FLOOR_Z + 1.85, MAT.metal, 1.5, { emissive: 0.4 });
  p.cylinder(sx, y, FLOOR_Z + 0.55, 0.23, 0.23, 1.3, MAT.red, ctx.lod > 1 ? 10 : 6, { top: scale(MAT.red, 0.7) });
  if (ctx.lod > 0) contactShadow(p, x, y, FLOOR_Z, 0.35, 0.24, ctx.shadowStrength * 0.5, MAT.ink);
  ctx.nav?.blockRect(x - 0.3, y - 0.3, 0.6, 0.6, 0.05);
}

/** A climbing wall on the north face of a room, with a mat under it. */
export function climbingWall(ctx: BuildCtx, x: number, wy: number, w: number, seed: number): void {
  const { p } = ctx;
  const y = wy + 0.6;
  p.box(x, y, FLOOR_Z, w, 0.24, 5.2, MAT.concrete, { top: MAT.wallTrim });
  p.box(x - 0.2, y + 0.24, FLOOR_Z, w + 0.4, 1.4, 0.26, MAT.rubber, { top: scale(MAT.rubber, 1.3) });
  if (ctx.lod > 0) {
    const tones = [MAT.lamp, MAT.led, MAT.seal, MAT.red, MAT.green];
    const n = Math.round(w * 9);
    for (let i = 0; i < n; i++) {
      const u = hash2(seed, i) * (w - 0.3) + 0.15;
      const z = FLOOR_Z + 0.6 + hash2(i, seed * 3) * 4.4;
      const s = 0.08 + hash2(i * 3, i) * 0.07;
      p.box(x + u, y + 0.24, z, s, 0.06, s, tones[i % tones.length], { emissive: 0.4 });
    }
  }
  ctx.nav?.blockRect(x - 0.2, y, w + 0.4, 1.64, 0.04);
}

/* =============================================================== canteen */

/**
 * The serving line: a counter, glass over the food, lamps keeping it warm,
 * and a rail to slide a tray along. Customers stand to the +y side.
 */
export function servingLine(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  const d = 0.9;
  p.box(x, y, FLOOR_Z, w, d, 0.92, MAT.chrome, { top: MAT.metal, sideTint: 0.88 });
  if (ctx.lod === 0) {
    ctx.nav?.blockRect(x, y, w, d, 0.1);
    return;
  }
  // Pans of food, in whatever inks the palette has to spare.
  const tones = [MAT.lamp, MAT.green, MAT.red, MAT.terracotta, MAT.paper, MAT.seal];
  const pans = Math.floor(w / 0.62);
  for (let i = 0; i < pans; i++) {
    const px = x + 0.16 + i * 0.62;
    p.box(px, y + 0.18, FLOOR_Z + 0.92, 0.52, 0.5, 0.03, MAT.darkMetal);
    p.box(px + 0.03, y + 0.21, FLOOR_Z + 0.94, 0.46, 0.44, 0.03, tones[(i * 5 + 1) % tones.length], { emissive: 0.25 });
  }
  // Sneeze glass on posts, and the tray rail.
  if (ctx.lod > 1) {
    for (let i = 0; i <= pans; i += 2) p.box(x + 0.1 + i * 0.62, y + d - 0.12, FLOOR_Z + 0.92, 0.04, 0.04, 0.55, MAT.chrome);
    p.box(x, y + d - 0.14, FLOOR_Z + 1.44, w, 0.34, 0.03, MAT.glass, { alpha: 0.4, emissive: 0.4 });
    p.box(x, y + d + 0.02, FLOOR_Z + 0.78, w, 0.3, 0.04, MAT.chrome);
    // Heat lamps over the pans.
    for (let i = 0; i < pans; i += 2) {
      const lx = x + 0.42 + i * 0.62;
      p.line(lx, y + 0.45, TRUSS_Z, lx, y + 0.45, FLOOR_Z + 2.0, MAT.darkMetal, 1, { emissive: 0.3 });
      const glow = 0.7 + Math.sin(time * 3 + i) * 0.05;
      p.cylinder(lx, y + 0.45, FLOOR_Z + 1.82, 0.16, 0.16, 0.18, MAT.red, 7, { emissive: glow, glow: 0.5 });
    }
  }
  ctx.nav?.blockRect(x, y, w, d + 0.3, 0.06);
}

/** The kitchen along a back wall: a range with pots on the go, a hood, a pass. */
export function kitchenLine(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, 0.8, 0.9, MAT.chrome, { top: MAT.darkMetal, sideTint: 0.86 });
  p.box(x, y - 0.02, FLOOR_Z + 2.3, w, 1.0, 0.7, MAT.chrome, { top: MAT.metal });
  if (ctx.lod > 0) p.box(x + w / 2 - 0.3, y + 0.1, FLOOR_Z + 3.0, 0.6, 0.6, TRUSS_Z - FLOOR_Z - 3.0, MAT.chrome);
  if (ctx.lod > 1) {
    const pots = Math.floor(w / 0.7);
    for (let i = 0; i < pots; i++) {
      const px = x + 0.4 + i * 0.7;
      const big = i % 3 === 0;
      p.cylinder(px, y + 0.4, FLOOR_Z + 0.9, big ? 0.24 : 0.17, big ? 0.24 : 0.17, big ? 0.36 : 0.16, MAT.chrome, 8, { top: MAT.darkMetal });
      if (i % 2 === 0) {
        for (let j = 0; j < 3; j++) {
          const t = (time * 0.4 + j * 0.33 + i * 0.1) % 1;
          p.dot(px + Math.sin(time + j) * 0.05, y + 0.4, FLOOR_Z + 1.3 + t * 0.9, 2 + t * 3, MAT.paper, { emissive: 1, alpha: (1 - t) * 0.28 });
        }
      }
      p.dot(px, y + 0.4, FLOOR_Z + 0.9, 3, MAT.red, { emissive: 1, glow: 0.4, alpha: 0.7 });
    }
  }
  ctx.nav?.blockRect(x, y, w, 0.8, 0.06);
}

/** A menu on the wall. Written by somebody with a sense of humour about the building. */
export function menuBoard(ctx: BuildCtx, x: number, wy: number, z: number, w: number, lines: string[]): void {
  const { p } = ctx;
  const h = 0.36 + lines.length * 0.3;
  p.box(x, wy + 0.58, z, w, 0.06, h, MAT.black);
  if (ctx.lod > 0) p.box(x - 0.06, wy + 0.56, z - 0.06, w + 0.12, 0.05, h + 0.12, MAT.woodDark);
  lines.forEach((line, i) => {
    letter(ctx, line, x + w / 2, wy + 0.66, z + h - 0.14 - i * 0.3, i === 0 ? 0.038 : 0.03, i === 0 ? MAT.lamp : MAT.paper);
  });
}

/** Stacked trays and a cutlery caddy at the head of the line. */
export function trayStation(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, 0.8, 0.6, 0.9, MAT.chrome, { top: MAT.metal });
  if (ctx.lod > 1) {
    for (let i = 0; i < 9; i++) p.box(x + 0.1, y + 0.08, FLOOR_Z + 0.9 + i * 0.025, 0.46, 0.34, 0.02, i % 2 ? MAT.darkMetal : MAT.black);
    p.cylinder(x + 0.66, y + 0.3, FLOOR_Z + 0.9, 0.08, 0.08, 0.14, MAT.chrome, 6);
  }
  ctx.nav?.blockRect(x, y, 0.8, 0.6, 0.06);
}

/** A trolley where trays come back. */
export function trolley(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  for (const [u, v] of [[0, 0], [0.56, 0], [0, 0.4], [0.56, 0.4]]) p.box(x + u, y + v, FLOOR_Z, 0.05, 0.05, 1.3, MAT.chrome);
  for (let i = 0; i < 4; i++) {
    p.box(x, y, FLOOR_Z + 0.2 + i * 0.3, 0.61, 0.45, 0.02, MAT.chrome);
    if (ctx.lod > 1 && i % 2 === 0) p.box(x + 0.06, y + 0.05, FLOOR_Z + 0.22 + i * 0.3, 0.46, 0.34, 0.02, MAT.darkMetal);
  }
  ctx.nav?.blockRect(x, y, 0.61, 0.45, 0.06);
}

/** A pastry case: glass, with a few things in it. */
export function pastryCase(ctx: BuildCtx, x: number, y: number, z: number): void {
  const { p } = ctx;
  p.box(x, y, z, 1.0, 0.5, 0.4, MAT.glass, { alpha: 0.5, emissive: 0.5 });
  if (ctx.lod < 2) return;
  for (let i = 0; i < 6; i++) {
    const tone = [MAT.lamp, MAT.terracotta, MAT.paper][i % 3];
    p.cylinder(x + 0.15 + (i % 3) * 0.33, y + 0.14 + Math.floor(i / 3) * 0.2, z + 0.02, 0.07, 0.06, 0.06, tone, 6);
  }
}

/* ============================================================ datacentre */

/** A coolant distribution unit, with its pipes going up to the overhead run. */
export function cdu(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 1.0, 0.8, 2.2, mix(MAT.pipe, MAT.metal, 0.3), { top: MAT.darkMetal });
  if (ctx.lod > 0) {
    p.box(x + 0.2, y + 0.3, FLOOR_Z + 2.2, 0.16, 0.16, TRUSS_Z - FLOOR_Z - 2.6, MAT.pipe);
    p.box(x + 0.64, y + 0.3, FLOOR_Z + 2.2, 0.16, 0.16, TRUSS_Z - FLOOR_Z - 2.6, MAT.led, { emissive: 0.25 });
  }
  if (ctx.lod > 1) {
    const g = 0.5 + 0.3 * Math.sin(time * 0.7 + x);
    p.dot(x + 0.3, y + 0.82, FLOOR_Z + 1.6, 3, MAT.paper, { emissive: 1 });
    p.line(x + 0.3, y + 0.83, FLOOR_Z + 1.6, x + 0.3 + Math.cos(g * 3) * 0.08, y + 0.83, FLOOR_Z + 1.6 + Math.sin(g * 3) * 0.08, MAT.red, 1, { emissive: 1, bias: 0.05 });
    p.box(x + 0.5, y + 0.8, FLOOR_Z + 1.4, 0.36, 0.02, 0.3, MAT.screen, { emissive: 0.7, glow: 0.3 });
  }
  ctx.nav?.blockRect(x, y, 1.0, 0.8, 0.08);
}

/** Pipe run under the trusses, along x, carrying coolant out to the racks. */
export function coolantRun(ctx: BuildCtx, x: number, y: number, length: number): void {
  if (ctx.lod === 0) return;
  tube(ctx.p, x, y, TRUSS_Z - 0.55, length, 0.1, "x", MAT.pipe, 6);
  tube(ctx.p, x, y + 0.34, TRUSS_Z - 0.55, length, 0.1, "x", mix(MAT.led, MAT.pipe, 0.5), 6, { emissive: 0.2 });
}

/**
 * The pod the day's run trains in. Glass all the way round except a doorway
 * at the front, which is how the run steps out of it at noon: nothing has to
 * walk through the glass.
 */
export function pod(ctx: BuildCtx, x: number, y: number, face: number, progress: number): void {
  const { p, time } = ctx;
  const r = 0.95;
  const h = 2.7;
  p.cylinder(x, y, FLOOR_Z, r + 0.25, r + 0.25, 0.26, MAT.darkMetal, 14, { top: MAT.metal });
  const glow = 0.5 + 0.5 * progress;
  p.cylinder(x, y, FLOOR_Z + 0.26, r + 0.05, r + 0.05, 0.06, MAT.led, 14, { emissive: 1, glow: 0.4 + glow * 0.6 });
  p.cylinder(x, y, FLOOR_Z + h, r + 0.2, r + 0.2, 0.3, MAT.darkMetal, 14, { top: MAT.metal });
  p.cylinder(x, y, FLOOR_Z + h - 0.06, r + 0.05, r + 0.05, 0.06, MAT.led, 14, { emissive: 1, glow: 0.3 + glow * 0.5 });
  // Cables up to the trusses.
  if (ctx.lod > 0) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const cx = x + Math.cos(a) * 0.6;
      const cy = y + Math.sin(a) * 0.6;
      p.line(cx, cy, FLOOR_Z + h + 0.3, cx + Math.cos(a) * 0.5, cy + Math.sin(a) * 0.5, TRUSS_Z, MAT.black, 2.5, { emissive: 0.2 });
    }
  }
  // The glass, in panels, leaving the front sector open.
  const sides = 16;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    let rel = mid - face;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    if (Math.abs(rel) < 0.55) continue;
    const x0 = x + Math.cos(a0) * r, y0 = y + Math.sin(a0) * r;
    const x1 = x + Math.cos(a1) * r, y1 = y + Math.sin(a1) * r;
    p.quad(x0, y0, FLOOR_Z + 0.32, x1, y1, FLOOR_Z + 0.32, x1, y1, FLOOR_Z + h, x0, y0, FLOOR_Z + h,
      MAT.glass, Math.cos(mid), Math.sin(mid), 0, { alpha: 0.34, emissive: 0.55, glow: 0.12 * glow });
  }
  // Ribs between the panels, either side of the doorway and round the back.
  if (ctx.lod > 0) {
    for (const a of [face + 0.62, face - 0.62, face + Math.PI, face + 1.9, face - 1.9]) {
      const rx = x + Math.cos(a) * r;
      const ry = y + Math.sin(a) * r;
      p.box(rx - 0.05, ry - 0.05, FLOOR_Z + 0.3, 0.1, 0.1, h - 0.3, MAT.darkMetal);
    }
  }
  // Tokens going in: a slow helix of beads that thickens as the run goes on.
  if (ctx.lod > 1 && progress < 1) {
    const n = 10 + Math.round(progress * 14);
    for (let i = 0; i < n; i++) {
      const t = (time * 0.25 + i / n) % 1;
      const a = t * Math.PI * 6 + i;
      p.dot(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, FLOOR_Z + h - t * (h - 0.4), 2,
        i % 3 ? MAT.led : MAT.lamp, { emissive: 1, glow: 0.5, alpha: 0.85 });
    }
  }
  if (ctx.lod > 0) contactShadow(p, x, y, FLOOR_Z, r + 0.4, (r + 0.4) * 0.65, ctx.shadowStrength * 0.6, MAT.ink);
  // Only the plinth's rim is solid. Anything standing in the pod is on it.
  if (ctx.nav) ctx.nav.costRect(x - r - 0.25, y - r - 0.25, (r + 0.25) * 2, (r + 0.25) * 2, 6);
}

/**
 * The run's loss, drawn live on a big screen: it falls through the night as
 * the run sees more of the corpus, and holds once pretraining is over.
 */
export function lossScreen(ctx: BuildCtx, x: number, wy: number, z: number, w: number, h: number, hour: number, run: number): void {
  const { p } = ctx;
  const y = wy + 0.6;
  p.box(x - 0.1, y - 0.04, z - 0.1, w + 0.2, 0.1, h + 0.2, MAT.black);
  p.box(x, y + 0.06, z, w, 0.02, h, mix(MAT.ink, MAT.screen, 0.12), { emissive: 0.8, glow: 0.15 });
  if (ctx.lod === 0) return;
  const fy = y + 0.1;
  const left = x + 0.5;
  const right = x + w - 0.3;
  const bottom = z + 0.35;
  const top = z + h - 0.45;
  p.line(left, fy, bottom, right, fy, bottom, MAT.paper, 1, { emissive: 1, bias: 0.05 });
  p.line(left, fy, bottom, left, fy, top, MAT.paper, 1, { emissive: 1, bias: 0.05 });
  const done = Math.min(1, hour / 12);
  const loss = (t: number) => 1.9 + 3.6 * Math.pow(1 + t * 40, -0.42) + (hash2(Math.floor(t * 60), run) - 0.5) * 0.12 * (1 - t);
  const steps = ctx.lod > 1 ? 60 : 20;
  let px = left;
  let pz = bottom + (loss(0) - 1.5) / 4.2 * (top - bottom);
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * done;
    if (t <= 0) break;
    const nx = left + (right - left) * (i / steps) * done;
    const nz = bottom + ((loss(t) - 1.5) / 4.2) * (top - bottom);
    p.line(px, fy, pz, nx, fy, nz, MAT.lamp, 1.6, { emissive: 1, glow: 0.3, bias: 0.06 });
    px = nx;
    pz = nz;
  }
  p.dot(px, fy, pz, 3, MAT.lamp, { emissive: 1, glow: 0.8, bias: 0.07 });
  const tokens = (done * 21.6).toFixed(1);
  letter(ctx, `RUN ${run}`, x + 0.3, fy + 0.01, z + h - 0.12, 0.05, MAT.led, "left");
  letter(ctx, done < 1 ? `LOSS ${loss(done).toFixed(2)}  TOKENS ${tokens}T` : `DONE  ${tokens}T TOKENS`, x + w - 0.3 - 22 * 0.04 * 6, fy + 0.01, z + h - 0.12, 0.04, MAT.paper, "left");
}

/**
 * The tube that carries tokens from the corpus to the pod, overhead. Beads
 * sit on a lattice fixed to the world, not to the room, so a run of tube that
 * crosses a partition reads as one tube on both sides of it.
 */
export function tokenTube(ctx: BuildCtx, points: [number, number, number][], speed = 1.3): void {
  const { p, time } = ctx;
  if (ctx.lod === 0) return;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, az] = points[i - 1];
    const [bx, by, bz] = points[i];
    p.line(ax, ay, az, bx, by, bz, MAT.glass, Math.max(2.5, 0.2 * p.cam.s), { emissive: 0.6, alpha: 0.45 });
  }
  if (ctx.lod < 2) return;
  const gap = 0.55;
  const phase = (time * speed) % gap;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, az] = points[i - 1];
    const [bx, by, bz] = points[i];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    // Position along the lattice by world coordinates, so neighbouring rooms agree.
    const start = ax + ay + az;
    const offset = (((start - phase) % gap) + gap) % gap;
    for (let s = gap - offset; s < len; s += gap) {
      const t = s / len;
      const k = Math.floor((start + s) / gap);
      p.dot(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, 2.6, k % 3 ? MAT.led : MAT.lamp, {
        emissive: 1, glow: 0.6,
      });
    }
  }
}

/* ================================================================ corpus */

/** A tape library: cartridges behind glass and a picker running along its rail. */
export function tapeLibrary(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  const h = 2.5;
  p.box(x, y, FLOOR_Z, w, 1.0, h, MAT.rack, { top: MAT.rackTrim });
  if (ctx.lod > 0) {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < Math.floor(w / 0.22); c++) {
        if (ctx.lod < 2 && c % 3) continue;
        const lit = hash2(c, r) > 0.8;
        p.box(x + 0.14 + c * 0.22, y + 1.0, FLOOR_Z + 0.3 + r * 0.33, 0.16, 0.02, 0.24, lit ? MAT.led : MAT.darkMetal, { emissive: lit ? 0.8 : 0.1 });
      }
    }
    const pickX = x + 0.3 + ((Math.sin(time * 0.6) + 1) / 2) * (w - 0.6);
    const pickZ = FLOOR_Z + 0.4 + ((Math.sin(time * 0.37 + 1) + 1) / 2) * 1.6;
    p.box(pickX - 0.18, y + 1.06, pickZ, 0.36, 0.12, 0.3, MAT.lamp, { emissive: 0.7, glow: 0.4 });
    p.box(x, y + 1.06, FLOOR_Z + 2.2, w, 0.05, 0.05, MAT.chrome);
    p.box(x, y + 1.08, FLOOR_Z + 0.1, w, 0.03, h - 0.2, MAT.glass, { alpha: 0.3, emissive: 0.4 });
  }
  ctx.nav?.blockRect(x, y, w, 1.2, 0.08);
}

/**
 * The tokenizer. Books go in at the top, tokens come out of the side and up
 * the tube. `outX, outY` is where the tube leaves it.
 */
export function tokenizer(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 1.8, 1.3, 1.5, MAT.metal, { top: MAT.darkMetal, sideTint: 0.9 });
  p.box(x + 0.4, y + 0.3, FLOOR_Z + 1.5, 1.0, 0.7, 0.5, MAT.darkMetal, { top: MAT.black });
  if (ctx.lod > 0) {
    p.box(x + 0.2, y + 1.3, FLOOR_Z + 0.6, 1.4, 0.02, 0.14, MAT.led, { emissive: 1, glow: 0.6 + 0.3 * Math.sin(time * 4) });
    const spin = time * 1.6;
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      p.line(x + 0.5, y + 1.31, FLOOR_Z + 1.05, x + 0.5 + Math.cos(a) * 0.22, y + 1.31, FLOOR_Z + 1.05 + Math.sin(a) * 0.22, MAT.darkMetal, 2, { emissive: 0.5, bias: 0.04 });
    }
    letter(ctx, "TOKENIZER", x + 1.2, y + 1.33, FLOOR_Z + 1.25, 0.028, MAT.ink);
    // A book on its way in.
    const t = (time * 0.3) % 1;
    p.box(x + 0.75, y + 0.55, FLOOR_Z + 2.4 - t * 0.5, 0.3, 0.22, 0.06, [MAT.red, MAT.paper, MAT.green][Math.floor(Math.max(0, time) * 0.3) % 3]);
  }
  ctx.nav?.blockRect(x, y, 1.8, 1.3, 0.08);
}

/** A crate of source material, with what it is stencilled on it. */
export function sourceCrate(ctx: BuildCtx, x: number, y: number, label: string, tone: RGB = MAT.bench): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, 1.0, 0.8, 0.7, tone, { top: scale(tone, 1.08) });
  if (ctx.lod > 1) {
    p.box(x, y + 0.8, FLOOR_Z + 0.24, 1.0, 0.02, 0.06, MAT.benchDark);
    worldText(ctx.p, label, x + 0.5, y + 0.82, FLOOR_Z + 0.58, 1, 0, 0, 0, 0, 1, 0.03, MAT.ink, { align: "center", emissive: 0.8, bias: 0.05 });
  }
  ctx.nav?.blockRect(x, y, 1.0, 0.8, 0.08);
}

/** A sieve over a bin: duplicates and junk falling out of the corpus. */
export function dedupe(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 1.1, 1.1, 0.9, MAT.darkMetal, { top: MAT.black });
  p.box(x - 0.1, y - 0.1, FLOOR_Z + 1.6, 1.3, 1.3, 0.1, MAT.metal);
  for (const [u, v] of [[0, 0], [1.1, 0], [0, 1.1], [1.1, 1.1]]) p.box(x + u - 0.05, y + v - 0.05, FLOOR_Z, 0.1, 0.1, 1.7, MAT.metal);
  if (ctx.lod > 1) {
    for (let i = 0; i < 6; i++) {
      const t = (time * 0.7 + i / 6) % 1;
      p.dot(x + 0.2 + hash2(i, 3) * 0.7, y + 0.2 + hash2(3, i) * 0.7, FLOOR_Z + 1.6 - t * 0.7, 2, MAT.paper, { emissive: 1, alpha: 0.8 });
    }
    letter(ctx, "DEDUP", x + 0.55, y + 1.12, FLOOR_Z + 0.7, 0.03, MAT.paper);
  }
  ctx.nav?.blockRect(x - 0.1, y - 0.1, 1.3, 1.3, 0.05);
}

/** A rolling ladder against a stack of shelves. */
export function ladder(ctx: BuildCtx, x: number, y: number, h = 3.4): void {
  if (!shows(ctx, 1, 2)) return;
  const { p } = ctx;
  p.line(x, y + 0.5, FLOOR_Z, x, y, FLOOR_Z + h, MAT.woodDark, 2, { emissive: 0.2 });
  p.line(x + 0.44, y + 0.5, FLOOR_Z, x + 0.44, y, FLOOR_Z + h, MAT.woodDark, 2, { emissive: 0.2 });
  if (ctx.lod > 1) {
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      p.line(x, y + 0.5 * (1 - t), FLOOR_Z + h * t, x + 0.44, y + 0.5 * (1 - t), FLOOR_Z + h * t, MAT.woodDark, 1.5, { emissive: 0.2 });
    }
  }
}

/* ============================================================= classroom */

/** A chalkboard on the north wall, written on in the house hand. */
export function chalkboard(ctx: BuildCtx, x: number, wy: number, w: number, lines: string[], z = FLOOR_Z + 1.2): void {
  const { p } = ctx;
  const h = 2.0;
  p.box(x - 0.08, wy + 0.56, z - 0.08, w + 0.16, 0.06, h + 0.16, MAT.woodDark);
  p.box(x, wy + 0.6, z, w, 0.06, h, mix(MAT.black, MAT.green, 0.22), { emissive: 0.2 });
  if (ctx.lod > 0) p.box(x, wy + 0.62, z - 0.06, w, 0.16, 0.05, MAT.woodDark);
  lines.forEach((line, i) => letter(ctx, line, x + 0.3, wy + 0.68, z + h - 0.25 - i * 0.34, 0.036, i === 0 ? MAT.lamp : MAT.paper, "left"));
}

/** A lectern, facing the room. */
export function lectern(ctx: BuildCtx, x: number, y: number, face: number): void {
  orient(ctx, x, y, FLOOR_Z, 0.6, 0.5, 1.05, face, MAT.woodDark, { top: MAT.wood });
  const top = at(x, y, face, 0, 0.05);
  orient(ctx, top.x, top.y, FLOOR_Z + 1.05, 0.7, 0.55, 0.06, face, MAT.wood);
  hard(ctx, x, y, 0.6, 0.5, face, 0.04);
}

/** A globe on a stand. */
export function globe(ctx: BuildCtx, x: number, y: number, z = FLOOR_Z): void {
  const { p, time } = ctx;
  p.cylinder(x, y, z, 0.18, 0.18, 0.04, MAT.woodDark, 7);
  p.box(x - 0.02, y - 0.02, z, 0.04, 0.04, 0.3, MAT.metal);
  p.cylinder(x, y, z + 0.3, 0.2, 0.2, 0.36, MAT.water, 10, { top: MAT.green });
  if (ctx.lod > 1) {
    const a = time * 0.3;
    p.box(x + Math.cos(a) * 0.19 - 0.04, y + Math.sin(a) * 0.19 - 0.04, z + 0.42, 0.08, 0.08, 0.12, MAT.green);
  }
  if (z <= FLOOR_Z + 0.01) ctx.nav?.blockRect(x - 0.2, y - 0.2, 0.4, 0.4, 0.05);
}

/* ================================================================== RLHF */

/**
 * The scoreboard: how often A was preferred to B today, and the reward the
 * model it is teaching is earning. It counts up with the clock.
 */
export function scoreboard(ctx: BuildCtx, x: number, wy: number, z: number, w: number, h: number, minutes: number): void {
  const { p } = ctx;
  const y = wy + 0.6;
  p.box(x - 0.1, y - 0.04, z - 0.1, w + 0.2, 0.1, h + 0.2, MAT.black);
  p.box(x, y + 0.06, z, w, 0.02, h, mix(MAT.ink, MAT.screen, 0.1), { emissive: 0.8 });
  if (ctx.lod === 0) return;
  const fy = y + 0.1;
  const a = 0.5 + 0.08 * Math.sin(minutes / 90);
  const barW = w * 0.34;
  p.box(x + 0.4, fy, z + 0.4, barW * a * 1.4, 0.02, 0.3, MAT.led, { emissive: 1, glow: 0.4 });
  p.box(x + 0.4, fy, z + 0.9, barW * (1 - a) * 1.4, 0.02, 0.3, MAT.lamp, { emissive: 1, glow: 0.4 });
  letter(ctx, `A ${Math.round(a * 100)}%`, x + 0.4, fy + 0.01, z + 0.66, 0.03, MAT.led, "left");
  letter(ctx, `B ${Math.round((1 - a) * 100)}%`, x + 0.4, fy + 0.01, z + 1.16, 0.03, MAT.lamp, "left");
  // Reward, rising through the afternoon.
  const left = x + w * 0.52;
  const right = x + w - 0.3;
  const bottom = z + 0.35;
  const top = z + h - 0.5;
  let px = left;
  let pz = bottom;
  const steps = ctx.lod > 1 ? 24 : 8;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = left + (right - left) * t;
    const nz = bottom + (top - bottom) * (1 - Math.exp(-t * 2.6)) * (0.85 + hash2(i, 9) * 0.15);
    p.line(px, fy, pz, nx, fy, nz, MAT.green, 1.5, { emissive: 1, bias: 0.06 });
    px = nx;
    pz = nz;
  }
  letter(ctx, "REWARD", left, fy + 0.01, z + h - 0.15, 0.03, MAT.paper, "left");
  letter(ctx, `${(12408 + Math.floor(minutes * 3.1)).toLocaleString("en-US")} PAIRS`, x + 0.4, fy + 0.01, z + h - 0.15, 0.03, MAT.paper, "left");
}

/** A round dais with a ring of light over it. Whatever stands here is being judged. */
export function dais(ctx: BuildCtx, x: number, y: number, r = 0.9, h = 0.16, tone: RGB = MAT.metal): void {
  const { p, time } = ctx;
  p.cylinder(x, y, FLOOR_Z, r, r, h, tone, 14, { top: scale(tone, 1.1) });
  if (ctx.lod > 0) {
    const pulse = 0.6 + 0.4 * Math.sin(time * 1.3);
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      p.line(x + Math.cos(a0) * r * 0.9, y + Math.sin(a0) * r * 0.9, FLOOR_Z + 3.4,
        x + Math.cos(a1) * r * 0.9, y + Math.sin(a1) * r * 0.9, FLOOR_Z + 3.4, MAT.bulb, 2.5, { emissive: 1, glow: pulse });
    }
    p.line(x, y, TRUSS_Z, x, y, FLOOR_Z + 3.4, MAT.darkMetal, 1, { emissive: 0.3 });
    p.disc(x, y, FLOOR_Z + h + 0.005, r * 0.85, r * 0.85, MAT.bulb, { alpha: 0.18 * pulse, emissive: 1, bias: 0.02, glow: 0.2 });
  }
  ctx.nav?.costRect(x - r, y - r, r * 2, r * 2, 2);
}

/* ================================================================= evals */

/**
 * A running track laid along x, with hurdles, a start and a timing gate.
 * `clear` is a stretch of x with no hurdles in it, for a doorway's corridor.
 */
export function track(ctx: BuildCtx, x: number, y: number, length: number, lanes = 3, clear: [number, number] = [0, 0]): void {
  const { p } = ctx;
  const lane = 0.9;
  const w = lanes * lane;
  p.plate(x, y, FLOOR_Z + 0.01, length, w, mix(MAT.red, MAT.concrete, 0.45), { bias: 0.01 });
  if (ctx.lod > 0) {
    for (let i = 0; i <= lanes; i++) p.plate(x, y + i * lane - 0.03, FLOOR_Z + 0.015, length, 0.06, MAT.paper, { bias: 0.02, emissive: 0.4 });
    p.plate(x + 0.6, y, FLOOR_Z + 0.015, 0.1, w, MAT.paper, { bias: 0.02, emissive: 0.5 });
    p.plate(x + length - 0.8, y, FLOOR_Z + 0.015, 0.1, w, MAT.paper, { bias: 0.02, emissive: 0.5 });
    // Hurdles, and the gate at the far end.
    for (let hx = x + 2.6; hx < x + length - 1.5; hx += 2.4) {
      if (hx > clear[0] - 0.3 && hx < clear[1] + 0.3) continue;
      for (let i = 0; i < lanes; i++) {
        const cy = y + i * lane + lane / 2;
        p.box(hx, cy - 0.34, FLOOR_Z, 0.05, 0.05, 0.62, MAT.darkMetal);
        p.box(hx, cy + 0.3, FLOOR_Z, 0.05, 0.05, 0.62, MAT.darkMetal);
        p.box(hx - 0.01, cy - 0.34, FLOOR_Z + 0.52, 0.07, 0.68, 0.1, MAT.white, { emissive: 0.3 });
      }
    }
    const gx = x + length - 0.75;
    p.box(gx, y - 0.2, FLOOR_Z, 0.12, 0.12, 2.4, MAT.darkMetal);
    p.box(gx, y + w + 0.08, FLOOR_Z, 0.12, 0.12, 2.4, MAT.darkMetal);
    p.box(gx - 0.04, y - 0.2, FLOOR_Z + 2.4, 0.2, w + 0.4, 0.4, MAT.black);
    letter(ctx, "00:09.58", gx + 0.1, y + w / 2, FLOOR_Z + 2.72, 0.035, MAT.red);
  }
  if (ctx.nav) {
    for (let hx = x + 2.6; hx < x + length - 1.5; hx += 2.4) {
      if (hx > clear[0] - 0.3 && hx < clear[1] + 0.3) continue;
      ctx.nav.blockRect(hx - 0.02, y - 0.05, 0.1, lanes * 0.9 + 0.1, 0.02);
    }
    const gx = x + length - 0.75;
    ctx.nav.blockRect(gx - 0.02, y - 0.22, 0.16, 0.16);
    ctx.nav.blockRect(gx - 0.02, y + lanes * 0.9 + 0.06, 0.16, 0.16);
  }
}

/** A leaderboard of whoever is on it today. */
export function leaderboard(ctx: BuildCtx, x: number, wy: number, z: number, w: number, names: string[], seed: number): void {
  const { p } = ctx;
  const y = wy + 0.6;
  const rowH = 0.3;
  const h = names.length * rowH + 0.55;
  p.box(x - 0.08, y - 0.04, z - 0.08, w + 0.16, 0.08, h + 0.16, MAT.black);
  p.box(x, y + 0.04, z, w, 0.02, h, mix(MAT.ink, MAT.paper, 0.08), { emissive: 0.7 });
  if (ctx.lod === 0) return;
  letter(ctx, "LEADERBOARD", x + w / 2, y + 0.07, z + h - 0.1, 0.035, MAT.lamp);
  const scores = names.map((n, i) => ({ n, s: 0.55 + hash2(seed, i) * 0.4 })).sort((a, b) => b.s - a.s);
  scores.forEach((row, i) => {
    const rz = z + h - 0.5 - i * rowH;
    p.box(x + w * 0.45, y + 0.07, rz, (w * 0.5) * row.s, 0.02, 0.16, i === 0 ? MAT.lamp : MAT.led, { emissive: 0.9 });
    letter(ctx, row.n, x + 0.2, y + 0.07, rz + 0.18, 0.026, MAT.paper, "left");
  });
}

/** A countdown on the wall of the examination hall. */
export function countdown(ctx: BuildCtx, x: number, wy: number, z: number, minutes: number): void {
  const { p } = ctx;
  p.box(x, wy + 0.58, z, 2.4, 0.08, 0.7, MAT.black);
  const left = Math.max(0, 180 - (minutes % 180));
  const hh = String(Math.floor(left / 60)).padStart(2, "0");
  const mm = String(Math.floor(left % 60)).padStart(2, "0");
  letter(ctx, `${hh}:${mm}`, x + 1.2, wy + 0.67, z + 0.58, 0.06, MAT.red);
}

/* ============================================================== red team */

/**
 * A mesh cage with a lockbox on a plinth inside it. The doorway is on the
 * south side, and it is the only way in or out.
 */
export function cage(ctx: BuildCtx, x: number, y: number, w: number, d: number): void {
  const { p } = ctx;
  const h = 2.9;
  const door = 1.2;
  const dx0 = x + w / 2 - door / 2;
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + d], [x + w, y + d], [dx0, y + d], [dx0 + door, y + d]]) {
    p.box(cx - 0.05, cy - 0.05, FLOOR_Z, 0.1, 0.1, h, MAT.darkMetal);
  }
  p.box(x, y, FLOOR_Z + h, w, d, 0.06, MAT.darkMetal, { alpha: 0.6 });
  if (ctx.lod > 0) {
    const step = ctx.lod > 1 ? 0.3 : 0.9;
    const mesh = (ax: number, ay: number, bx: number, by: number) => {
      const len = Math.hypot(bx - ax, by - ay);
      for (let s = 0; s <= len; s += step) {
        const t = s / len;
        p.line(ax + (bx - ax) * t, ay + (by - ay) * t, FLOOR_Z, ax + (bx - ax) * t, ay + (by - ay) * t, FLOOR_Z + h, MAT.metal, 1, { emissive: 0.35 });
      }
      for (let zz = FLOOR_Z; zz <= FLOOR_Z + h; zz += step) p.line(ax, ay, zz, bx, by, zz, MAT.metal, 1, { emissive: 0.35 });
    };
    mesh(x, y, x + w, y);
    mesh(x, y, x, y + d);
    mesh(x + w, y, x + w, y + d);
    mesh(x, y + d, dx0, y + d);
    mesh(dx0 + door, y + d, x + w, y + d);
  }
  // The thing in the cage.
  p.box(x + w / 2 - 0.3, y + 0.35, FLOOR_Z, 0.6, 0.5, 0.9, MAT.metal, { top: MAT.darkMetal });
  p.box(x + w / 2 - 0.22, y + 0.4, FLOOR_Z + 0.9, 0.44, 0.36, 0.3, MAT.seal, { emissive: 0.5, glow: 0.3 });
  ctx.nav?.blockRect(x - 0.05, y - 0.05, w + 0.1, 0.12);
  ctx.nav?.blockRect(x - 0.05, y, 0.12, d);
  ctx.nav?.blockRect(x + w - 0.07, y, 0.12, d);
  ctx.nav?.blockRect(x, y + d - 0.06, dx0 - x, 0.12);
  ctx.nav?.blockRect(dx0 + door, y + d - 0.06, x + w - dx0 - door, 0.12);
  ctx.nav?.blockRect(x + w / 2 - 0.3, y + 0.35, 0.6, 0.5, 0.04);
}

/** A rotating red beacon on the ceiling, turning whenever anyone is being tested. */
export function beacon(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const z = TRUSS_Z - 0.6;
  p.line(x, y, TRUSS_Z, x, y, z + 0.3, MAT.darkMetal, 1, { emissive: 0.3 });
  p.cylinder(x, y, z, 0.18, 0.18, 0.3, MAT.red, 8, { emissive: 1, glow: 0.8 });
  if (ctx.lod < 2) return;
  const a = time * 2.4;
  const reach = 3.2;
  p.quad(
    x, y, z + 0.15,
    x + Math.cos(a - 0.25) * reach, y + Math.sin(a - 0.25) * reach, FLOOR_Z + 0.4,
    x + Math.cos(a + 0.25) * reach, y + Math.sin(a + 0.25) * reach, FLOOR_Z + 0.4,
    x, y, z + 0.15,
    MAT.red, 0, 0, 1, { alpha: 0.12, emissive: 1, noCull: true, glow: 0.2 },
  );
}

/** Sticky notes, many of them, most of them red. */
export function stickyWall(ctx: BuildCtx, x: number, wy: number, w: number, seed: number): void {
  const { p } = ctx;
  p.box(x, wy + 0.6, FLOOR_Z + 1.0, w, 0.04, 2.2, MAT.canvas);
  if (ctx.lod < 1) return;
  const n = Math.round(w * (ctx.lod > 1 ? 14 : 5));
  for (let i = 0; i < n; i++) {
    const u = hash2(seed, i) * (w - 0.2);
    const z = FLOOR_Z + 1.1 + hash2(i, seed) * 1.9;
    const tone = hash2(i, i * 7) > 0.35 ? MAT.red : hash2(i, 3) > 0.5 ? MAT.lamp : MAT.paper;
    p.box(x + u, wy + 0.56, z, 0.16, 0.03, 0.16, tone, { emissive: 0.4 });
  }
}

/* ================================================================= stage */

/**
 * A raised stage with steps at its south-west corner. It is walkable, at a
 * cost: the presenter goes up the steps and across it, and nobody else cuts
 * across the stage on the way to somewhere else.
 */
export function stagePlatform(ctx: BuildCtx, x: number, y: number, w: number, d: number, h: number): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, w, d, h, MAT.woodDark, { top: MAT.wood });
  if (ctx.lod > 0) {
    p.box(x, y + d - 0.02, FLOOR_Z + h - 0.05, w, 0.04, 0.05, MAT.lamp, { emissive: 0.8, glow: 0.3 });
    for (let i = 0; i < 3; i++) {
      p.box(x + 0.2, y + d + i * 0.32, FLOOR_Z, 1.2, 0.32, h * (1 - (i + 1) / 4), MAT.woodDark, { top: MAT.wood });
    }
  }
  ctx.nav?.costRect(x, y, w, d, 12);
}

/** The screen at the back of the stage, with the day's run on it. */
export function stageScreen(ctx: BuildCtx, x: number, wy: number, z: number, w: number, h: number, title: string, live: boolean): void {
  const { p, time } = ctx;
  p.box(x - 0.15, wy + 0.58, z - 0.15, w + 0.3, 0.1, h + 0.3, MAT.black);
  const lit = live ? 0.9 : 0.35;
  p.box(x, wy + 0.66, z, w, 0.02, h, mix(MAT.ink, MAT.screen, live ? 0.3 : 0.08), { emissive: lit, glow: live ? 0.3 : 0 });
  if (ctx.lod === 0) return;
  letter(ctx, title, x + w / 2, wy + 0.69, z + h * 0.66, 0.09, live ? MAT.paper : MAT.cloth);
  if (live && ctx.lod > 1) {
    // A slide: bars climbing, the way every launch has them.
    for (let i = 0; i < 5; i++) {
      const bh = (0.25 + i * 0.12) * (0.85 + 0.15 * Math.sin(time + i));
      p.box(x + w * 0.3 + i * 0.5, wy + 0.69, z + 0.3, 0.32, 0.02, bh, i === 4 ? MAT.lamp : MAT.led, { emissive: 1, glow: 0.3 });
    }
  }
}

/** A spotlight on the truss and the cone it throws onto the stage. */
export function spotlight(ctx: BuildCtx, x: number, y: number, tx: number, ty: number, tz: number, on: number): void {
  const { p } = ctx;
  p.cylinder(x, y, TRUSS_Z - 0.3, 0.16, 0.16, 0.3, MAT.black, 7);
  if (on <= 0.05 || ctx.lod < 2) return;
  const r = 0.9;
  p.quad(
    x, y, TRUSS_Z - 0.3,
    tx - r, ty, tz,
    tx + r, ty, tz,
    x, y, TRUSS_Z - 0.3,
    MAT.bulb, 0, 0, 1, { alpha: 0.09 * on, emissive: 1, noCull: true, glow: 0.2 * on },
  );
  p.disc(tx, ty, tz + 0.01, r, r * 0.7, MAT.bulb, { alpha: 0.16 * on, emissive: 1, bias: 0.03, glow: 0.2 * on }, 12);
}

/** A speaker stack on the floor. */
export function speaker(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, 0.6, 0.6, 1.6, MAT.black, { top: MAT.darkMetal });
  if (ctx.lod > 1) {
    uprightDisc(p, "y", x + 0.3, y + 0.62, FLOOR_Z + 0.5, 0.2, 1, MAT.darkMetal, { noCull: true }, 10);
    uprightDisc(p, "y", x + 0.3, y + 0.62, FLOOR_Z + 1.2, 0.12, 1, MAT.darkMetal, { noCull: true }, 8);
  }
  ctx.nav?.blockRect(x, y, 0.6, 0.6, 0.05);
}

/* ======================================================== interpretability */

/** A bench microscope. */
export function microscope(ctx: BuildCtx, x: number, y: number, z: number): void {
  const { p } = ctx;
  p.box(x - 0.18, y - 0.14, z, 0.36, 0.3, 0.06, MAT.black);
  p.box(x - 0.04, y + 0.06, z + 0.06, 0.08, 0.08, 0.5, MAT.white);
  p.line(x, y + 0.1, z + 0.5, x, y - 0.1, z + 0.72, MAT.white, Math.max(2, 0.08 * p.cam.s), { emissive: 0.3 });
  p.box(x - 0.12, y - 0.1, z + 0.22, 0.24, 0.2, 0.03, MAT.darkMetal);
  p.dot(x, y - 0.02, z + 0.26, 2, MAT.led, { emissive: 1, glow: 0.5 });
}

/**
 * A wall of features: a grid of cells lighting in patterns, the way a probe
 * shows which parts of a model fire for what.
 */
export function featureWall(ctx: BuildCtx, x: number, wy: number, z: number, w: number, h: number, seed: number): void {
  const { p, time } = ctx;
  p.box(x - 0.08, wy + 0.58, z - 0.08, w + 0.16, 0.06, h + 0.16, MAT.black);
  if (ctx.lod === 0) return;
  const cell = ctx.lod > 1 ? 0.16 : 0.4;
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
  const beat = Math.floor(time * 0.8);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = hash2(c * 7 + seed, r * 13 + beat);
      const band = Math.abs(Math.sin(c * 0.4 + r * 0.25 + time * 0.6));
      const v = n * 0.6 + band * 0.4;
      if (v < 0.55) continue;
      const tone = v > 0.85 ? MAT.lamp : v > 0.7 ? MAT.led : MAT.seal;
      p.box(x + c * cell + 0.02, wy + 0.64, z + r * cell + 0.02, cell - 0.04, 0.02, cell - 0.04, tone, { emissive: 0.9, glow: v > 0.85 ? 0.4 : 0.1 });
    }
  }
}

/**
 * A network on a plinth: three layers of nodes and the wires between them,
 * with a pulse running through when the room is looking.
 */
export function networkSculpture(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x - 0.6, y - 0.6, FLOOR_Z, 1.2, 1.2, 0.8, MAT.white, { top: scale(MAT.white, 0.96) });
  const layers = [4, 5, 3];
  const nodes: { x: number; y: number; z: number }[][] = layers.map((n, li) =>
    Array.from({ length: n }, (_, i) => ({
      x: x + (i - (n - 1) / 2) * 0.32,
      y: y + (li - 1) * 0.1,
      z: FLOOR_Z + 1.1 + li * 0.55,
    })),
  );
  if (ctx.lod > 0) {
    for (let l = 0; l < nodes.length - 1; l++) {
      for (const a of nodes[l]) {
        for (const b of nodes[l + 1]) p.line(a.x, a.y, a.z, b.x, b.y, b.z, MAT.metal, 1, { emissive: 0.4 });
      }
    }
  }
  const pulse = (time * 0.5) % 1;
  for (let l = 0; l < nodes.length; l++) {
    nodes[l].forEach((n, i) => {
      const hot = Math.abs(pulse * 3 - l - 0.5) < 0.5 && hash2(i, Math.floor(time * 0.5)) > 0.4;
      p.box(n.x - 0.07, n.y - 0.07, n.z - 0.07, 0.14, 0.14, 0.14, hot ? MAT.lamp : MAT.led, { emissive: hot ? 1 : 0.6, glow: hot ? 0.8 : 0.2 });
    });
  }
  ctx.nav?.blockRect(x - 0.6, y - 0.6, 1.2, 1.2, 0.08);
}

/** A reclining chair with a lamp over it, where a model sits to be looked into. */
export function clinicChair(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p } = ctx;
  orient(ctx, x, y, FLOOR_Z, 0.3, 0.3, 0.4, face, MAT.chrome);
  const seat = at(x, y, face, 0, 0);
  orient(ctx, seat.x, seat.y, FLOOR_Z + 0.44, 0.6, 0.6, 0.1, face, MAT.white);
  const back = at(x, y, face, 0, -0.42);
  obox(p, back.x, back.y, FLOOR_Z + 0.5, 0.2, 0.6, 0.72, face, MAT.white);
  const lampAt = at(x, y, face, 0.7, 0.4);
  p.box(lampAt.x - 0.04, lampAt.y - 0.04, FLOOR_Z, 0.08, 0.08, 1.9, MAT.chrome);
  p.line(lampAt.x, lampAt.y, FLOOR_Z + 1.9, x, y, FLOOR_Z + 1.75, MAT.chrome, 2, { emissive: 0.4 });
  p.cylinder(x, y, FLOOR_Z + 1.62, 0.2, 0.2, 0.12, MAT.bulb, 8, { emissive: 1, glow: 0.6 });
  ctx.nav?.blockRect(lampAt.x - 0.1, lampAt.y - 0.1, 0.2, 0.2, 0.02);
  ctx.nav?.costRect(x - 0.4, y - 0.4, 0.8, 0.8, 2);
}

/** Specimen jars on a shelf: glass, with something coloured in each. */
export function jars(ctx: BuildCtx, x: number, y: number, count: number): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, count * 0.36 + 0.1, 0.42, 1.0, MAT.woodDark, { top: MAT.wood });
  if (ctx.lod < 1) return;
  const tones = [MAT.led, MAT.seal, MAT.lamp, MAT.green, MAT.red];
  for (let i = 0; i < count; i++) {
    const cx = x + 0.23 + i * 0.36;
    p.cylinder(cx, y + 0.21, FLOOR_Z + 1.0, 0.13, 0.13, 0.4, tones[i % tones.length], 8, { emissive: 0.35 });
    p.cylinder(cx, y + 0.21, FLOOR_Z + 1.4, 0.14, 0.14, 0.05, MAT.darkMetal, 8);
  }
  ctx.nav?.blockRect(x, y, count * 0.36 + 0.1, 0.42, 0.06);
}

/* ================================================================= court */

/** A tree in a square planter with a bench wrapped round it. */
export function courtTree(ctx: BuildCtx, x: number, y: number, size = 1): void {
  const { p, time } = ctx;
  const r = 0.9 * size;
  p.box(x - r, y - r, FLOOR_Z, r * 2, r * 2, 0.46, MAT.wood, { top: MAT.soil });
  const trunk = 2.4 * size;
  p.cylinder(x, y, FLOOR_Z + 0.46, 0.2 * size, 0.2 * size, trunk, MAT.woodDark, 7);
  const sway = Math.sin(time * 0.5 + x) * 0.05;
  p.cylinder(x + sway, y, FLOOR_Z + 0.46 + trunk - 0.2, 1.7 * size, 1.4 * size, 1.5 * size, MAT.leaf, ctx.lod > 1 ? 10 : 7, { top: scale(MAT.leaf, 1.08) });
  if (ctx.lod > 0) p.cylinder(x + sway + 0.2, y - 0.1, FLOOR_Z + 0.46 + trunk + 0.9 * size, 1.1 * size, 0.9 * size, 0.8 * size, scale(MAT.leaf, 0.9), 8);
  if (ctx.lod > 0) contactShadow(p, x, y, FLOOR_Z, 1.6 * size, 1.1 * size, ctx.shadowStrength * 0.4, MAT.ink);
  ctx.nav?.blockRect(x - r, y - r, r * 2, r * 2, 0.05);
}

/** A shallow round pool with a jet in the middle. */
export function fountain(ctx: BuildCtx, x: number, y: number, r = 1.6): void {
  const { p, time } = ctx;
  p.cylinder(x, y, FLOOR_Z, r + 0.2, r + 0.2, 0.4, MAT.stone, 16, { top: MAT.stone });
  p.cylinder(x, y, FLOOR_Z + 0.3, r, r, 0.08, MAT.water, 16, { emissive: 0.4, glow: 0.1 });
  if (ctx.lod > 1) {
    for (let i = 0; i < 3; i++) {
      const rr = ((time * 0.3 + i / 3) % 1) * r * 0.9;
      for (let k = 0; k < 12; k++) {
        const a0 = (k / 12) * Math.PI * 2;
        const a1 = ((k + 1) / 12) * Math.PI * 2;
        p.line(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr, FLOOR_Z + 0.39, x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, FLOOR_Z + 0.39, MAT.paper, 1, { emissive: 1, alpha: 0.4 * (1 - rr / r) });
      }
    }
    for (let i = 0; i < 8; i++) {
      const t = (time * 0.8 + i / 8) % 1;
      p.dot(x + Math.sin(i * 2.4) * t * 0.3, y + Math.cos(i * 2.4) * t * 0.3, FLOOR_Z + 0.4 + Math.sin(t * Math.PI) * 1.2, 2, MAT.paper, { emissive: 1, alpha: 0.7 });
    }
  }
  ctx.nav?.blockRect(x - r - 0.2, y - r - 0.2, (r + 0.2) * 2, (r + 0.2) * 2, 0.05);
}
