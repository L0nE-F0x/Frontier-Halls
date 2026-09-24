import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { contactShadow, obox, tube, uprightDisc } from "../../engine/shapes";
import { worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import { shows, type BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z } from "../metrics";
import { at, axes, footprint, orient } from "./furniture";
import { clockFace } from "./fixtures";

/*
 * Each lab's own things: the objects that say which room this is before any
 * plaque does. Americas, Europe, the Gulf and India. The east of the building
 * keeps its own in heroes-east.ts.
 */

function hard(ctx: BuildCtx, cx: number, cy: number, along: number, across: number, face: number, pad = 0.08): void {
  if (!ctx.nav) return;
  const [x, y, w, d] = footprint(cx, cy, along, across, face);
  ctx.nav.blockRect(x, y, w, d, pad);
}

/** Lettering on a plane facing +y (the room), for signs on the north wall. */
function wallWord(ctx: BuildCtx, text: string, x: number, z: number, size: number, tone: RGB, y: number): void {
  if (!shows(ctx, size * 6, 1.1)) return;
  worldText(ctx.p, text, x, y, z, 1, 0, 0, 0, 0, 1, size, tone, { align: "center", emissive: 1, bias: 0.06 });
}

/** Lettering laid flat on the floor, readable from the south. */
export function floorWord(ctx: BuildCtx, text: string, x: number, y: number, size: number, tone: RGB): void {
  if (!shows(ctx, size * 6, 1.1)) return;
  worldText(ctx.p, text, x, y, FLOOR_Z + 0.012, 1, 0, 0, 0, -1, 0, size, tone, { align: "center", emissive: 0.6, bias: 0.03 });
}

/* ================================================================ Amazon */

/**
 * A conveyor along x with parcels riding it, spaced on a lattice fixed to the
 * world so the belt never seems to jump when it wraps.
 */
export function conveyor(ctx: BuildCtx, x: number, y: number, length: number, speed = 0.5): void {
  const { p, time } = ctx;
  const h = 0.8;
  p.box(x, y, FLOOR_Z + h - 0.1, length, 0.9, 0.1, MAT.darkMetal, { top: MAT.black });
  p.box(x, y - 0.06, FLOOR_Z + h - 0.06, length, 0.06, 0.12, MAT.metal);
  p.box(x, y + 0.9, FLOOR_Z + h - 0.06, length, 0.06, 0.12, MAT.metal);
  if (ctx.lod > 0) {
    for (let i = 0.3; i < length; i += 1.4) {
      p.box(x + i, y + 0.1, FLOOR_Z, 0.08, 0.08, h - 0.1, MAT.darkMetal);
      p.box(x + i, y + 0.72, FLOOR_Z, 0.08, 0.08, h - 0.1, MAT.darkMetal);
    }
    const gap = 1.3;
    const shift = (time * speed) % gap;
    for (let s = shift; s < length - 0.5; s += gap) {
      const k = Math.floor((time * speed - s) / gap);
      const size = 0.34 + hash2(k, 3) * 0.24;
      const tone = hash2(k, 7) > 0.5 ? MAT.bench : scale(MAT.bench, 0.86);
      p.box(x + s, y + 0.45 - size / 2, FLOOR_Z + h, size, size, size * 0.7, tone, { top: scale(tone, 1.1) });
      if (ctx.lod > 1) p.box(x + s, y + 0.45 - 0.02, FLOOR_Z + h + size * 0.7, size, 0.04, 0.005, MAT.lamp, { emissive: 0.5 });
    }
  }
  ctx.nav?.blockRect(x, y - 0.06, length, 1.02, 0.08);
}

/**
 * A drive unit carrying a shelf pod, running back and forth along a painted
 * lane. The warehouse robot, at the scale of a room.
 */
export function kivaPod(ctx: BuildCtx, x0: number, y: number, x1: number, phase: number): void {
  const { p, time } = ctx;
  const t = (Math.sin(time * 0.35 + phase) + 1) / 2;
  const x = x0 + (x1 - x0) * t;
  if (ctx.lod > 0) {
    p.plate(x0 - 0.5, y - 0.55, FLOOR_Z + 0.004, x1 - x0 + 1, 1.1, mix(MAT.lamp, MAT.concrete, 0.6), { bias: 0.012 });
  }
  p.box(x - 0.42, y - 0.42, FLOOR_Z, 0.84, 0.84, 0.28, MAT.lamp, { top: scale(MAT.lamp, 0.85) });
  p.box(x - 0.45, y - 0.45, FLOOR_Z + 0.28, 0.9, 0.9, 1.9, MAT.darkMetal, { top: MAT.metal });
  if (ctx.lod > 1) {
    for (let r = 0; r < 4; r++) {
      p.box(x - 0.45, y - 0.46, FLOOR_Z + 0.5 + r * 0.42, 0.9, 0.92, 0.04, MAT.lamp);
      for (let c = 0; c < 2; c++) {
        p.box(x - 0.38 + c * 0.42, y - 0.47, FLOOR_Z + 0.56 + r * 0.42, 0.34, 0.3, 0.3, MAT.bench);
      }
    }
  }
  ctx.nav?.blockRect(Math.min(x0, x1) - 0.5, y - 0.5, Math.abs(x1 - x0) + 1, 1.0, 0.05);
}

/** A glass dome with a garden in it: the Seattle spheres, at desk scale. */
export function sphere(ctx: BuildCtx, x: number, y: number, r = 1.6): void {
  const { p, time } = ctx;
  p.cylinder(x, y, FLOOR_Z, r, r, 0.2, MAT.concrete, 14, { top: MAT.soil });
  // The plants inside, then the glass over them in stacked rings.
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    const sway = Math.sin(time * 0.5 + i) * 0.04;
    p.line(x + Math.cos(a) * 0.4, y + Math.sin(a) * 0.4, FLOOR_Z + 0.2, x + Math.cos(a) * 0.9 + sway, y + Math.sin(a) * 0.9, FLOOR_Z + 1.4 + hash2(i, 3) * 0.6, MAT.leaf, 4, { emissive: 0.3 });
  }
  p.cylinder(x, y, FLOOR_Z + 0.2, 0.3, 0.3, 1.8, MAT.woodDark, 6);
  p.cylinder(x, y, FLOOR_Z + 1.8, 0.9, 0.8, 0.6, MAT.leaf, 8, { top: scale(MAT.leaf, 1.1) });
  const rings = ctx.lod > 1 ? 6 : 3;
  for (let i = 0; i < rings; i++) {
    const a0 = (i / rings) * (Math.PI / 2);
    const a1 = ((i + 1) / rings) * (Math.PI / 2);
    const r0 = Math.cos(a0) * r;
    const r1 = Math.cos(a1) * r;
    const z0 = FLOOR_Z + 0.2 + Math.sin(a0) * r * 1.3;
    const z1 = FLOOR_Z + 0.2 + Math.sin(a1) * r * 1.3;
    const sides = 14;
    for (let k = 0; k < sides; k++) {
      const b0 = (k / sides) * Math.PI * 2;
      const b1 = ((k + 1) / sides) * Math.PI * 2;
      p.quad(
        x + Math.cos(b0) * r0, y + Math.sin(b0) * r0, z0,
        x + Math.cos(b1) * r0, y + Math.sin(b1) * r0, z0,
        x + Math.cos(b1) * r1, y + Math.sin(b1) * r1, z1,
        x + Math.cos(b0) * r1, y + Math.sin(b0) * r1, z1,
        MAT.glass, Math.cos((b0 + b1) / 2), Math.sin((b0 + b1) / 2), 0.5, { alpha: 0.2, emissive: 0.5 },
      );
      if (ctx.lod > 1 && k % 2 === 0) {
        p.line(x + Math.cos(b0) * r0, y + Math.sin(b0) * r0, z0, x + Math.cos(b0) * r1, y + Math.sin(b0) * r1, z1, MAT.darkMetal, 1, { emissive: 0.3 });
      }
    }
  }
  ctx.nav?.blockRect(x - r, y - r, r * 2, r * 2, 0.05);
}

/* ============================================================= Microsoft */

/** Four squares let into the floor, in the four colours the palette has nearest. */
export function fourSquare(ctx: BuildCtx, x: number, y: number, size: number): void {
  const { p } = ctx;
  const g = size * 0.06;
  const s = (size - g) / 2;
  const tones = [MAT.red, MAT.green, MAT.led, MAT.lamp];
  tones.forEach((tone, i) => {
    const cx = x + (i % 2) * (s + g);
    const cy = y + Math.floor(i / 2) * (s + g);
    p.plate(cx, cy, FLOOR_Z + 0.006, s, s, tone, { emissive: 0.45, bias: 0.015 });
  });
}

/**
 * Two seats side by side in front of a panel of instruments: a pilot and a
 * copilot. Placed by the midpoint between the two seats.
 */
export function cockpit(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p, time } = ctx;
  const panel = at(x, y, face, 0, 0.95);
  orient(ctx, panel.x, panel.y, FLOOR_Z, 2.4, 0.7, 0.9, face, MAT.darkMetal, { top: MAT.black });
  const hood = at(x, y, face, 0, 1.2);
  orient(ctx, hood.x, hood.y, FLOOR_Z + 0.9, 2.4, 0.3, 0.55, face, MAT.darkMetal);
  if (ctx.lod > 0) {
    for (let i = -1; i <= 1; i++) {
      const s = at(x, y, face, i * 0.72, 0.7);
      orient(ctx, s.x, s.y, FLOOR_Z + 0.95, 0.55, 0.03, 0.36, face, i === 0 ? MAT.lamp : MAT.screen, { emissive: 0.8, glow: 0.35 });
    }
    // The yokes, one each side, swinging slightly.
    for (const u of [-0.6, 0.6]) {
      const base = at(x, y, face, u, 0.55);
      const tilt = Math.sin(time * 0.7 + u) * 0.05;
      p.line(base.x, base.y, FLOOR_Z + 0.6, base.x, base.y, FLOOR_Z + 0.82 + tilt, MAT.black, 3, { emissive: 0.2 });
      orient(ctx, base.x, base.y, FLOOR_Z + 0.82 + tilt, 0.34, 0.05, 0.05, face, MAT.black);
    }
    // A strip of sky across the top of the panel, which is the whole of the
    // flight simulator from here.
    const sky = at(x, y, face, 0, 1.36);
    orient(ctx, sky.x, sky.y, FLOOR_Z + 1.5, 2.2, 0.03, 0.5, face, mix(MAT.led, MAT.paper, 0.5), { emissive: 0.8, glow: 0.25 });
  }
  hard(ctx, panel.x, panel.y, 2.4, 0.7, face);
}

/** A paperclip, two metres tall, with eyes. Nobody in the hall will say who made it. */
export function paperclip(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x - 0.4, y - 0.3, FLOOR_Z, 0.8, 0.6, 0.3, MAT.white, { top: MAT.metal });
  const tone = MAT.chrome;
  const w = Math.max(3, 0.08 * p.cam.s);
  // Loops of the clip, as straight runs with the ends turned.
  const pts: [number, number][] = [[-0.2, 0.3], [-0.2, 1.9], [0.25, 1.9], [0.25, 0.55], [-0.05, 0.55], [-0.05, 1.6]];
  for (let i = 1; i < pts.length; i++) {
    p.line(x + pts[i - 1][0], y, FLOOR_Z + pts[i - 1][1], x + pts[i][0], y, FLOOR_Z + pts[i][1], tone, w, { emissive: 0.4 });
  }
  if (ctx.lod > 1) {
    const blink = Math.sin(time * 0.9) > 0.96 ? 0.2 : 1;
    for (const u of [-0.12, 0.14]) {
      p.box(x + u - 0.06, y + 0.02, FLOOR_Z + 1.35, 0.12, 0.02, 0.14 * blink, MAT.white, { emissive: 0.7 });
      p.dot(x + u, y + 0.04, FLOOR_Z + 1.4, 2, MAT.ink, { emissive: 1 });
    }
  }
  ctx.nav?.blockRect(x - 0.4, y - 0.3, 0.8, 0.6, 0.06);
}

/* =================================================================== IBM */

/** Big iron: a run of cabinets with two tape reels in each, turning. */
export function mainframe(ctx: BuildCtx, x: number, y: number, count: number): void {
  const { p, time } = ctx;
  for (let i = 0; i < count; i++) {
    const cx = x + i * 1.3;
    p.box(cx, y, FLOOR_Z, 1.2, 0.9, 2.2, MAT.metal, { top: MAT.darkMetal, sideTint: 0.92 });
    if (ctx.lod < 1) continue;
    p.box(cx + 0.1, y + 0.9, FLOOR_Z + 0.9, 1.0, 0.02, 1.1, MAT.black);
    for (const u of [0.35, 0.85]) {
      uprightDisc(p, "y", cx + u, y + 0.93, FLOOR_Z + 1.55, 0.2, 1, MAT.darkMetal, { noCull: true }, 10);
      if (ctx.lod > 1) {
        const a = time * (u > 0.5 ? 2.2 : -1.7) + i;
        p.line(cx + u, y + 0.95, FLOOR_Z + 1.55, cx + u + Math.cos(a) * 0.16, y + 0.95, FLOOR_Z + 1.55 + Math.sin(a) * 0.16, MAT.paper, 1.5, { emissive: 1, bias: 0.05 });
      }
    }
    if (ctx.lod > 1) {
      for (let k = 0; k < 8; k++) {
        const on = hash2(Math.floor(time * 2) + k, i) > 0.5;
        p.box(cx + 0.14 + k * 0.12, y + 0.92, FLOOR_Z + 1.1, 0.06, 0.02, 0.06, on ? MAT.lamp : MAT.ledOff, { emissive: on ? 1 : 0.2, glow: on ? 0.4 : 0 });
      }
    }
  }
  ctx.nav?.blockRect(x, y, count * 1.3 - 0.1, 0.9, 0.08);
}

/** THINK, the one word IBM put on its walls a century ago. */
export function thinkSign(ctx: BuildCtx, x: number, wy: number, z: number): void {
  const { p } = ctx;
  p.box(x - 1.4, wy + 0.58, z - 0.1, 2.8, 0.06, 0.9, MAT.woodDark);
  wallWord(ctx, "THINK", x, z + 0.62, 0.075, MAT.paper, wy + 0.62);
}

/** A chessboard on a small table. The board sits at (x, y); two players face each other across it along x. */
export function chessTable(ctx: BuildCtx, x: number, y: number, pieces = true): void {
  const { p } = ctx;
  p.box(x - 0.45, y - 0.45, FLOOR_Z, 0.9, 0.9, 0.7, MAT.woodDark, { top: MAT.wood });
  if (ctx.lod > 0) {
    const s = 0.1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2) continue;
        p.plate(x - 0.4 + i * s, y - 0.4 + j * s, FLOOR_Z + 0.705, s, s, MAT.ink, { bias: 0.01 });
      }
    }
    if (pieces && ctx.lod > 1) {
      for (let k = 0; k < 14; k++) {
        const i = Math.floor(hash2(k, 5) * 8);
        const j = k < 7 ? Math.floor(hash2(5, k) * 2) : 6 + Math.floor(hash2(k, k) * 2);
        const tone = k < 7 ? MAT.white : MAT.black;
        p.cylinder(x - 0.35 + i * s, y - 0.35 + j * s, FLOOR_Z + 0.71, 0.03, 0.03, 0.08 + hash2(k, 9) * 0.06, tone, 5);
      }
    }
  }
  ctx.nav?.blockRect(x - 0.45, y - 0.45, 0.9, 0.9, 0.05);
}

/** A game-show podium with a glowing face, for the machine that once won one. */
export function quizPodium(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x - 0.6, y - 0.35, FLOOR_Z, 1.2, 0.7, 1.1, MAT.led, { top: MAT.darkMetal, emissive: 0.2 });
  p.box(x - 0.45, y + 0.35, FLOOR_Z + 0.5, 0.9, 0.02, 0.5, MAT.black);
  if (ctx.lod > 1) {
    const pulse = 0.6 + 0.4 * Math.sin(time * 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.8;
      p.line(x, y + 0.38, FLOOR_Z + 0.75, x + Math.cos(a) * 0.2, y + 0.38, FLOOR_Z + 0.75 + Math.sin(a) * 0.2, MAT.led, 1.5, { emissive: 1, glow: pulse * 0.5, bias: 0.05 });
    }
  }
  ctx.nav?.blockRect(x - 0.6, y - 0.35, 1.2, 0.7, 0.06);
}

/* ============================================================ Perplexity */

/** A card catalogue: many small drawers, each with a brass pull. */
export function cardCatalog(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, w, 0.6, 1.3, MAT.wood, { top: MAT.woodDark, sideTint: 0.9 });
  if (ctx.lod > 1) {
    const cols = Math.floor(w / 0.3);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < cols; c++) {
        p.box(x + 0.05 + c * 0.3, y + 0.6, FLOOR_Z + 0.12 + r * 0.24, 0.26, 0.01, 0.2, MAT.woodDark);
        p.box(x + 0.15 + c * 0.3, y + 0.61, FLOOR_Z + 0.2 + r * 0.24, 0.06, 0.02, 0.03, MAT.lamp, { emissive: 0.4 });
      }
    }
  }
  ctx.nav?.blockRect(x, y, w, 0.6, 0.06);
}

/**
 * Sources pinned to the wall with numbers, and threads from each number to
 * the answer in the middle. Every claim with its footnote.
 */
export function citationWall(ctx: BuildCtx, x: number, wy: number, w: number, seed: number): void {
  const { p } = ctx;
  p.box(x, wy + 0.6, FLOOR_Z + 1.1, w, 0.04, 2.6, MAT.canvas);
  if (ctx.lod < 1) return;
  const cx = x + w / 2;
  const cz = FLOOR_Z + 2.4;
  p.box(cx - 0.5, wy + 0.57, cz - 0.3, 1.0, 0.03, 0.6, MAT.paper, { emissive: 0.4 });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const u = x + 0.4 + (i / (n - 1)) * (w - 0.8);
    const z = FLOOR_Z + 1.4 + hash2(seed, i) * 2.0;
    p.box(u - 0.25, wy + 0.57, z - 0.18, 0.5, 0.03, 0.36, MAT.paper, { emissive: 0.35 });
    if (ctx.lod > 1) {
      p.line(u, wy + 0.55, z, cx, wy + 0.55, cz, MAT.led, 1, { emissive: 1, bias: 0.04 });
      worldText(p, `[${i + 1}]`, u, wy + 0.54, z + 0.3, 1, 0, 0, 0, 0, 1, 0.03, MAT.lamp, { align: "center", emissive: 1, bias: 0.06 });
    }
  }
}

/* ===================================================== Thinking Machines */

/**
 * A cube of black cubes with panels of red lamps blinking at random: the
 * machine the lab took its name from, forty years on.
 */
export function connectionMachine(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const s = 0.9;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 2; k++) {
        const bx = x + i * (s + 0.06);
        const by = y + j * (s + 0.06);
        const bz = FLOOR_Z + 0.2 + k * (s + 0.06);
        p.box(bx, by, bz, s, s, s, MAT.black, { top: MAT.darkMetal });
      }
    }
  }
  p.box(x - 0.1, y - 0.1, FLOOR_Z, s * 2 + 0.26, s * 2 + 0.26, 0.2, MAT.darkMetal);
  if (ctx.lod > 0) {
    const cell = ctx.lod > 1 ? 0.1 : 0.3;
    const beat = Math.floor(time * 6);
    // The two faces that turn toward the room, lit.
    for (const [fx, fy, axis] of [[x + 2 * s + 0.07, y, "e"], [x, y + 2 * s + 0.07, "s"]] as const) {
      for (let r = 0; r < Math.floor((2 * s) / cell); r++) {
        for (let c = 0; c < Math.floor((2 * s) / cell); c++) {
          if (hash2(c * 31 + r, beat + c * 3) < 0.55) continue;
          const z = FLOOR_Z + 0.25 + r * cell;
          if (axis === "e") p.box(fx, fy + 0.05 + c * cell, z, 0.02, cell * 0.6, cell * 0.6, MAT.red, { emissive: 1, glow: 0.4 });
          else p.box(fx + 0.05 + c * cell, fy, z, cell * 0.6, 0.02, cell * 0.6, MAT.red, { emissive: 1, glow: 0.4 });
        }
      }
    }
  }
  ctx.nav?.blockRect(x - 0.1, y - 0.1, s * 2 + 0.26, s * 2 + 0.26, 0.06);
}

/** A pegboard of tools on the north wall, and a bench under it. */
export function toolWall(ctx: BuildCtx, x: number, wy: number, w: number): void {
  const { p } = ctx;
  p.box(x, wy + 0.6, FLOOR_Z + 1.1, w, 0.04, 1.8, MAT.wood);
  if (ctx.lod < 2) return;
  for (let i = 0; i < w / 0.14; i++) {
    for (let j = 0; j < 12; j++) p.dot(x + 0.07 + i * 0.14, wy + 0.58, FLOOR_Z + 1.2 + j * 0.14, 1, MAT.woodDark, { emissive: 0.5 });
  }
  const tools = Math.floor(w / 0.4);
  for (let i = 0; i < tools; i++) {
    const tx = x + 0.3 + i * 0.4;
    const kind = i % 4;
    const tone = [MAT.red, MAT.metal, MAT.lamp, MAT.darkMetal][kind];
    if (kind === 0) p.line(tx, wy + 0.56, FLOOR_Z + 2.5, tx, wy + 0.56, FLOOR_Z + 1.9, tone, 3, { emissive: 0.6 });
    else if (kind === 1) {
      p.line(tx, wy + 0.56, FLOOR_Z + 2.5, tx + 0.1, wy + 0.56, FLOOR_Z + 1.8, tone, 2.5, { emissive: 0.6 });
      p.box(tx - 0.06, wy + 0.55, FLOOR_Z + 2.45, 0.12, 0.02, 0.1, tone, { emissive: 0.5 });
    } else if (kind === 2) p.box(tx - 0.1, wy + 0.55, FLOOR_Z + 2.0, 0.2, 0.02, 0.45, tone, { emissive: 0.5 });
    else uprightDisc(p, "y", tx, wy + 0.55, FLOOR_Z + 2.2, 0.14, -1, tone, { noCull: true }, 8);
  }
}

/* ================================================================== xAI */

/**
 * A rocket on its mount, near enough to the trusses that it had to be the
 * last thing brought in.
 */
export function rocket(ctx: BuildCtx, x: number, y: number, h = 5.6): void {
  const { p, time } = ctx;
  p.box(x - 1.0, y - 1.0, FLOOR_Z, 2.0, 2.0, 0.4, MAT.darkMetal, { top: MAT.metal });
  for (const [u, v] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    p.box(x + u - 0.06, y + v - 0.06, FLOOR_Z + 0.4, 0.12, 0.12, 1.2, MAT.darkMetal);
  }
  p.cylinder(x, y, FLOOR_Z + 0.9, 0.6, 0.6, h - 1.6, MAT.chrome, ctx.lod > 1 ? 14 : 8, { top: MAT.chrome, sideTint: 0.92 });
  // The nose, in two narrowing rings.
  p.cylinder(x, y, FLOOR_Z + h - 0.7, 0.48, 0.48, 0.4, MAT.chrome, 12);
  p.cylinder(x, y, FLOOR_Z + h - 0.3, 0.26, 0.26, 0.3, MAT.chrome, 10);
  if (ctx.lod > 0) {
    // Fins and a band of black tiles down the windward side.
    for (const a of [0.3, 0.3 + Math.PI]) {
      const fx = x + Math.cos(a) * 0.6;
      const fy = y + Math.sin(a) * 0.6;
      obox(p, fx, fy, FLOOR_Z + 0.9, 0.5, 0.06, 0.9, a, MAT.darkMetal);
      obox(p, fx, fy, FLOOR_Z + h - 1.6, 0.36, 0.06, 0.6, a, MAT.darkMetal);
    }
    const glow = 0.4 + 0.2 * Math.sin(time * 5);
    p.cylinder(x, y, FLOOR_Z + 0.55, 0.4, 0.4, 0.35, MAT.lamp, 8, { emissive: 1, glow });
  }
  ctx.nav?.blockRect(x - 1.0, y - 1.0, 2.0, 2.0, 0.06);
}

/** A gas turbine and its stack: power for a cluster that outgrew the grid. */
export function turbine(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 3.2, 1.3, 0.3, MAT.darkMetal);
  tube(p, x + 0.2, y + 0.65, FLOOR_Z + 1.0, 2.6, 0.6, "x", MAT.metal, ctx.lod > 1 ? 12 : 8);
  p.box(x + 2.3, y + 0.35, FLOOR_Z + 1.4, 0.6, 0.6, 3.6, MAT.metal, { top: MAT.black });
  if (ctx.lod > 1) {
    for (let i = 0; i < 4; i++) {
      const t = (time * 0.4 + i / 4) % 1;
      p.dot(x + 2.6 + Math.sin(time + i) * 0.1, y + 0.65, FLOOR_Z + 5.0 + t * 1.2, 3 + t * 4, MAT.paper, { emissive: 1, alpha: (1 - t) * 0.25 });
    }
    p.box(x + 0.4, y + 1.3, FLOOR_Z + 0.9, 0.5, 0.02, 0.3, MAT.screen, { emissive: 0.8, glow: 0.3 });
  }
  ctx.nav?.blockRect(x, y, 3.2, 1.3, 0.08);
}

/* ================================================================== Meta */

/** A stand of headsets on hooks, one of them always missing. */
export function headsetStand(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.box(x - 0.08, y - 0.08, FLOOR_Z, 0.16, 0.16, 1.6, MAT.darkMetal);
  p.cylinder(x, y, FLOOR_Z, 0.3, 0.3, 0.05, MAT.darkMetal, 8);
  if (ctx.lod < 1) return;
  for (let i = 0; i < 4; i++) {
    if (i === 2) continue;
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const hx = x + Math.cos(a) * 0.22;
    const hy = y + Math.sin(a) * 0.22;
    obox(p, hx, hy, FLOOR_Z + 1.2, 0.2, 0.3, 0.16, a, MAT.white, { top: MAT.white });
    if (ctx.lod > 1) obox(p, hx + Math.cos(a) * 0.1, hy + Math.sin(a) * 0.1, FLOOR_Z + 1.24, 0.02, 0.26, 0.09, a, MAT.black);
  }
  ctx.nav?.blockRect(x - 0.3, y - 0.3, 0.6, 0.6, 0.05);
}

/* ================================================================ NVIDIA */

/**
 * A GPU, the size of a rug, laid on a plinth: a grid of cores lit in the
 * palette's green, the memory stacks down its sides, and gold at the edges.
 */
export function gpuDie(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, w, 0.24, MAT.darkMetal, { top: mix(MAT.green, MAT.black, 0.7) });
  p.box(x + w * 0.2, y + w * 0.15, FLOOR_Z + 0.24, w * 0.6, w * 0.7, 0.06, MAT.black, { top: MAT.darkMetal });
  if (ctx.lod === 0) return;
  // HBM stacks either side of the die.
  for (const side of [0.05, 0.83]) {
    for (let k = 0; k < 3; k++) p.box(x + w * side, y + w * (0.18 + k * 0.23), FLOOR_Z + 0.24, w * 0.12, w * 0.18, 0.1, MAT.metal);
  }
  const cells = ctx.lod > 1 ? 8 : 4;
  const cs = (w * 0.56) / cells;
  const wave = time * 1.5;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const lit = Math.sin(i * 0.9 + j * 0.7 - wave) > 0.1;
      p.plate(x + w * 0.22 + i * cs, y + w * 0.17 + j * cs * (0.7 / 0.6), FLOOR_Z + 0.302, cs * 0.8, cs * 0.8 * (0.7 / 0.6), lit ? MAT.green : mix(MAT.green, MAT.black, 0.6), {
        emissive: lit ? 1 : 0.4, glow: lit ? 0.3 : 0, bias: 0.01,
      });
    }
  }
  if (ctx.lod > 1) {
    for (let i = 0; i < w / 0.2; i++) {
      p.plate(x + 0.05 + i * 0.2, y + 0.02, FLOOR_Z + 0.242, 0.1, 0.1, MAT.lamp, { emissive: 0.6, bias: 0.01 });
      p.plate(x + 0.05 + i * 0.2, y + w - 0.12, FLOOR_Z + 0.242, 0.1, 0.1, MAT.lamp, { emissive: 0.6, bias: 0.01 });
    }
  }
  ctx.nav?.blockRect(x, y, w, w, 0.05);
}

/** A forklift carrying a crate, running a lane back and forth. */
export function forklift(ctx: BuildCtx, x0: number, y: number, x1: number, phase: number): void {
  const { p, time } = ctx;
  const t = (Math.sin(time * 0.3 + phase) + 1) / 2;
  const x = x0 + (x1 - x0) * t;
  const dir = Math.cos(time * 0.3 + phase) >= 0 ? 1 : -1;
  const face = dir > 0 ? 0 : Math.PI;
  const f = (u: number) => x + u * dir;
  p.box(f(-0.4) - 0.5, y - 0.45, FLOOR_Z + 0.15, 1.0, 0.9, 0.6, MAT.lamp, { top: scale(MAT.lamp, 0.85) });
  obox(p, f(-0.55), y, FLOOR_Z + 0.75, 0.5, 0.8, 0.12, face, MAT.darkMetal);
  // Cage over the seat.
  for (const [u, v] of [[-0.8, -0.38], [-0.8, 0.38], [-0.3, -0.38], [-0.3, 0.38]]) {
    p.box(f(u) - 0.03, y + v - 0.03, FLOOR_Z + 0.75, 0.06, 0.06, 1.2, MAT.darkMetal);
  }
  p.box(Math.min(f(-0.85), f(-0.25)), y - 0.42, FLOOR_Z + 1.95, 0.6, 0.84, 0.05, MAT.darkMetal);
  // Mast and forks, with the load.
  p.box(f(0.2) - 0.05, y - 0.35, FLOOR_Z + 0.1, 0.1, 0.1, 2.0, MAT.darkMetal);
  p.box(f(0.2) - 0.05, y + 0.25, FLOOR_Z + 0.1, 0.1, 0.1, 2.0, MAT.darkMetal);
  const lift = 0.3 + (Math.sin(time * 0.6 + phase) + 1) * 0.2;
  p.box(Math.min(f(0.25), f(1.05)), y - 0.38, FLOOR_Z + lift, 0.8, 0.76, 0.6, MAT.bench, { top: scale(MAT.bench, 1.1) });
  // Wheels, on the two long sides; the lane runs along x, so they face y.
  for (const [u, v] of [[-0.8, -0.45], [-0.8, 0.45], [0.05, -0.45], [0.05, 0.45]]) {
    uprightDisc(p, "y", f(u), y + v, FLOOR_Z + 0.16, 0.16, v > 0 ? 1 : -1, MAT.black, { noCull: true }, 8);
  }
  if (ctx.lod > 0) contactShadow(p, x, y, FLOOR_Z, 1.1, 0.6, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.blockRect(Math.min(x0, x1) - 1.1, y - 0.5, Math.abs(x1 - x0) + 2.2, 1.0, 0.05);
}

/* ========================================================== DeepMind */

/**
 * A Go board on a low table, stones on it from a game that is going
 * somewhere. The two players sit facing each other along x.
 */
export function goBoard(ctx: BuildCtx, x: number, y: number): void {
  const { p, clock } = ctx;
  p.box(x - 0.55, y - 0.55, FLOOR_Z, 1.1, 1.1, 0.5, MAT.wood, { top: mix(MAT.wood, MAT.paper, 0.3) });
  if (ctx.lod === 0) return;
  const n = ctx.lod > 1 ? 19 : 7;
  const s = 1.0 / (n - 1);
  for (let i = 0; i < n; i++) {
    p.line(x - 0.5, y - 0.5 + i * s, FLOOR_Z + 0.505, x + 0.5, y - 0.5 + i * s, FLOOR_Z + 0.505, MAT.ink, 1, { emissive: 0.7, bias: 0.02 });
    p.line(x - 0.5 + i * s, y - 0.5, FLOOR_Z + 0.505, x - 0.5 + i * s, y + 0.5, FLOOR_Z + 0.505, MAT.ink, 1, { emissive: 0.7, bias: 0.02 });
  }
  if (ctx.lod < 2) return;
  // More stones as the day goes on: the game is in progress.
  const moves = Math.floor((clock.minutes / 1440) * 120) + 10;
  for (let k = 0; k < moves; k++) {
    const i = Math.floor(hash2(k, 37) * 19);
    const j = Math.floor(hash2(37, k) * 19);
    const tone = k % 2 ? MAT.white : MAT.black;
    p.cylinder(x - 0.5 + i * (1 / 18), y - 0.5 + j * (1 / 18), FLOOR_Z + 0.505, 0.024, 0.024, 0.015, tone, 5);
  }
  ctx.nav?.blockRect(x - 0.55, y - 0.55, 1.1, 1.1, 0.05);
}

/**
 * A folded protein on a plinth: a chain of segments twisting up in a helix,
 * turning slowly, coloured by how confident the prediction was.
 */
export function proteinHelix(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x - 0.5, y - 0.5, FLOOR_Z, 1.0, 1.0, 0.9, MAT.white, { top: scale(MAT.white, 0.95) });
  const turn = time * 0.25;
  const steps = ctx.lod > 1 ? 36 : 12;
  let px = x;
  let py = y;
  let pz = FLOOR_Z + 1.0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 5 + turn;
    const r = 0.32 + Math.sin(t * 7) * 0.08;
    const nx = x + Math.cos(a) * r;
    const ny = y + Math.sin(a) * r;
    const nz = FLOOR_Z + 1.0 + t * 1.9;
    const conf = hash2(i, 11);
    const tone = conf > 0.66 ? MAT.led : conf > 0.3 ? MAT.seal : MAT.lamp;
    p.line(px, py, pz, nx, ny, nz, tone, Math.max(3, 0.1 * p.cam.s), { emissive: 0.6, glow: 0.2 });
    px = nx;
    py = ny;
    pz = nz;
  }
  ctx.nav?.blockRect(x - 0.5, y - 0.5, 1.0, 1.0, 0.06);
}

/** A red telephone box. It has not had a telephone in it for years. */
export function phoneBox(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  const w = 0.95;
  const h = 2.5;
  p.box(x - w / 2, y - w / 2, FLOOR_Z, w, w, h, MAT.red, { top: scale(MAT.red, 0.85) });
  p.box(x - w / 2 - 0.04, y - w / 2 - 0.04, FLOOR_Z + h, w + 0.08, w + 0.08, 0.14, MAT.red);
  if (ctx.lod > 0) {
    for (const [fx, fy, axis] of [[x + w / 2, y, "x"], [x, y + w / 2, "y"]] as const) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (axis === "x") p.box(fx + 0.005, y - 0.3 + c * 0.2, FLOOR_Z + 0.9 + r * 0.38, 0.01, 0.16, 0.32, MAT.glass, { emissive: 0.5 });
          else p.box(x - 0.3 + c * 0.2, fy + 0.005, FLOOR_Z + 0.9 + r * 0.38, 0.16, 0.01, 0.32, MAT.glass, { emissive: 0.5 });
        }
      }
      if (axis === "x") p.box(fx + 0.01, y - 0.35, FLOOR_Z + 2.2, 0.01, 0.7, 0.14, MAT.white, { emissive: 0.7 });
      else p.box(x - 0.35, fy + 0.01, FLOOR_Z + 2.2, 0.7, 0.01, 0.14, MAT.white, { emissive: 0.7 });
    }
  }
  ctx.nav?.blockRect(x - w / 2, y - w / 2, w, w, 0.06);
}

/* =============================================================== Mistral */

/** A zinc bar: a counter topped in metal, bottles on a shelf behind, stools in front. */
export function zincBar(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, w, 0.7, 1.05, MAT.woodDark, { top: MAT.chrome, sideTint: 0.9 });
  p.box(x - 0.05, y - 0.05, FLOOR_Z + 1.05, w + 0.1, 0.8, 0.05, MAT.chrome);
  if (ctx.lod > 0) {
    p.box(x, y - 0.95, FLOOR_Z + 1.4, w, 0.3, 0.05, MAT.woodDark);
    p.box(x, y - 0.95, FLOOR_Z + 1.9, w, 0.3, 0.05, MAT.woodDark);
  }
  if (ctx.lod > 1) {
    for (let i = 0; i < w / 0.18; i++) {
      for (const z of [1.45, 1.95]) {
        const tone = [MAT.green, MAT.lamp, MAT.red, MAT.glass][(i + Math.round(z * 3)) % 4];
        p.cylinder(x + 0.1 + i * 0.18, y - 0.8, FLOOR_Z + z, 0.04, 0.04, 0.26, tone, 5, { emissive: 0.35 });
      }
    }
  }
  ctx.nav?.blockRect(x, y, w, 0.7, 0.06);
}

/** A windsock on a pole, blowing in whatever the room's draught is. The wind the lab is named for. */
export function windsock(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const top = FLOOR_Z + 3.4;
  p.box(x - 0.04, y - 0.04, FLOOR_Z, 0.08, 0.08, 3.5, MAT.metal);
  p.cylinder(x, y, FLOOR_Z, 0.26, 0.26, 0.06, MAT.darkMetal, 8);
  const gust = 0.6 + 0.4 * Math.sin(time * 0.8) + 0.15 * Math.sin(time * 2.3);
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const droop = (1 - gust) * 0.5;
    const x0 = x + t0 * 1.2;
    const x1 = x + t1 * 1.2;
    const z0 = top - t0 * t0 * droop - Math.sin(time * 5 + i) * 0.02;
    const z1 = top - t1 * t1 * droop - Math.sin(time * 5 + i + 1) * 0.02;
    const r0 = 0.18 - t0 * 0.08;
    const r1 = 0.18 - t1 * 0.08;
    const tone = i % 2 ? MAT.paper : MAT.lamp;
    p.quad(x0, y, z0 + r0, x1, y, z1 + r1, x1, y, z1 - r1, x0, y, z0 - r0, tone, 0, 1, 0, { noCull: true, emissive: 0.4 });
  }
  ctx.nav?.blockRect(x - 0.26, y - 0.26, 0.52, 0.52, 0.05);
}

/* ============================================================ Black Forest */

/**
 * An easel with a canvas on it, and on the canvas an image resolving out of
 * noise and dissolving back into it: diffusion, at the speed of a painting.
 */
export function easel(ctx: BuildCtx, x: number, y: number, face: number, seed: number): void {
  const { p, time } = ctx;
  const { fx, fy, rx, ry } = axes(face);
  // Legs: two in front, one behind.
  for (const u of [-0.35, 0.35]) {
    const a = at(x, y, face, u, 0.1);
    p.line(a.x, a.y, FLOOR_Z, a.x - fx * 0.12, a.y - fy * 0.12, FLOOR_Z + 1.9, MAT.woodDark, 2.5, { emissive: 0.2 });
  }
  const b = at(x, y, face, 0, -0.45);
  p.line(b.x, b.y, FLOOR_Z, x, y, FLOOR_Z + 1.8, MAT.woodDark, 2.5, { emissive: 0.2 });
  const c = at(x, y, face, 0, 0.02);
  orient(ctx, c.x, c.y, FLOOR_Z + 0.8, 0.9, 0.04, 0.02, face, MAT.woodDark);
  orient(ctx, c.x, c.y, FLOOR_Z + 0.82, 0.8, 0.03, 0.9, face, MAT.canvas, { emissive: 0.3 });
  if (ctx.lod < 1) return;
  // The painting, as a grid of cells that settle as noise goes out of them.
  const phase = ((time * 0.08 + seed * 0.13) % 1);
  const noise = phase < 0.6 ? 1 - phase / 0.6 : phase < 0.8 ? 0 : (phase - 0.8) / 0.2;
  const n = ctx.lod > 1 ? 8 : 4;
  const cell = 0.72 / n;
  const beat = Math.floor(time * 6);
  const palette = [MAT.lamp, MAT.led, MAT.seal, MAT.green, MAT.red, MAT.paper];
  const face2 = at(x, y, face, 0, 0.045);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // The "image": a sun over hills, by rows.
      const u = i / n;
      const v = j / n;
      const hill = v < 0.35 + Math.sin(u * 5 + seed) * 0.12;
      const sun = Math.hypot(u - 0.7, v - 0.72) < 0.14;
      const target = sun ? 0 : hill ? 3 : 1;
      const jitter = hash2(i + seed * 7, j + beat * 3);
      const pick = jitter < noise ? Math.floor(hash2(j + beat, i + seed) * palette.length) : target;
      const cx = face2.x + rx * (-0.36 + (i + 0.5) * cell);
      const cy = face2.y + ry * (-0.36 + (i + 0.5) * cell);
      orient(ctx, cx, cy, FLOOR_Z + 0.86 + j * (0.82 / n), cell * 0.95, 0.01, (0.82 / n) * 0.95, face, palette[pick], { emissive: 0.7 });
    }
  }
  hard(ctx, x, y, 0.9, 0.7, face, 0.04);
}

/**
 * A cuckoo clock on the north wall: a little house with a pitched roof,
 * pinecone weights, and a bird that comes out at the top of every hour. Its
 * face reads the same clock as every other in the building.
 */
export function cuckooClock(ctx: BuildCtx, x: number, wy: number, z: number): void {
  const { p, clock } = ctx;
  const y = wy + 0.62;
  p.box(x - 0.55, y, z, 1.1, 0.3, 1.0, MAT.woodDark, { top: MAT.wood });
  // The roof, as two pitched boards.
  p.quad(x - 0.7, y - 0.02, z + 1.0, x, y - 0.02, z + 1.5, x, y + 0.34, z + 1.5, x - 0.7, y + 0.34, z + 1.0, MAT.woodDark, -0.6, 0, 0.8, { noCull: true });
  p.quad(x, y - 0.02, z + 1.5, x + 0.7, y - 0.02, z + 1.0, x + 0.7, y + 0.34, z + 1.0, x, y + 0.34, z + 1.5, MAT.woodDark, 0.6, 0, 0.8, { noCull: true });
  p.quad(x - 0.7, y + 0.34, z + 1.0, x, y + 0.34, z + 1.5, x + 0.7, y + 0.34, z + 1.0, x - 0.7, y + 0.34, z + 1.0, MAT.woodDark, 0, 1, 0, { noCull: true });
  if (ctx.lod === 0) return;
  clockFace(ctx, "y", x, y + 0.31, z + 0.45, 0.28, 1);
  // Carved leaves either side, then the weights on their chains.
  for (const u of [-0.5, 0.5]) p.box(x + u - 0.08, y + 0.3, z + 0.1, 0.16, 0.04, 0.8, MAT.green, { emissive: 0.2 });
  for (const [u, drop] of [[-0.2, 0.9], [0.2, 1.3]] as const) {
    p.line(x + u, y + 0.2, z, x + u, y + 0.2, z - drop, MAT.lamp, 1, { emissive: 0.5 });
    p.cylinder(x + u, y + 0.2, z - drop - 0.28, 0.06, 0.06, 0.28, MAT.woodDark, 6);
  }
  // The bird: out for the first minute of the hour.
  const minute = clock.minutes % 60;
  const out = minute < 1.2 ? Math.sin((minute / 1.2) * Math.PI) : 0;
  p.box(x - 0.14, y + 0.32, z + 0.8, 0.28, 0.02, 0.18, MAT.black);
  if (out > 0.02) {
    const by = y + 0.32 + out * 0.3;
    p.box(x - 0.07, by - 0.08, z + 0.84, 0.14, 0.16, 0.1, MAT.lamp, { emissive: 0.6, glow: 0.2 });
    p.box(x - 0.03, by + 0.07, z + 0.88, 0.06, 0.06, 0.03, MAT.red, { emissive: 0.8 });
  }
}

/* =============================================================== Poolside */

/**
 * A swimming pool let into the floor of an office, with a ladder, a board,
 * and the light moving on the water. Nobody swims in it. Everyone sits by it.
 */
export function pool(ctx: BuildCtx, x: number, y: number, w: number, d: number): void {
  const { p, time } = ctx;
  // The floor is one slab with no holes in it, so the pool is drawn as a
  // basin standing a hand's height proud of it: coping round the edge, the
  // water just below the coping, and the far walls of the tank as darker
  // bands inside the rim, which is what reads as depth from above. Water
  // drawn below the floor, the honest way, was simply covered by the tiles.
  const c = 0.3;
  const rim = FLOOR_Z + 0.14;
  const water = FLOOR_Z + 0.08;
  p.box(x - c, y - c, FLOOR_Z, w + c * 2, c, rim - FLOOR_Z, MAT.white, { top: MAT.white });
  p.box(x - c, y + d, FLOOR_Z, w + c * 2, c, rim - FLOOR_Z, MAT.white, { top: MAT.white });
  p.box(x - c, y, FLOOR_Z, c, d, rim - FLOOR_Z, MAT.white, { top: MAT.white });
  p.box(x + w, y, FLOOR_Z, c, d, rim - FLOOR_Z, MAT.white, { top: MAT.white });
  p.plate(x, y, water, w, d, MAT.water, { emissive: 0.45, glow: 0.12 });
  const deep = mix(MAT.water, MAT.ink, 0.45);
  p.plate(x, y, water + 0.004, w, 0.34, deep, { emissive: 0.3, bias: 0.006 });
  p.plate(x, y, water + 0.004, 0.34, d, deep, { emissive: 0.3, bias: 0.006 });
  if (ctx.lod > 0) {
    // Lane lines on the bottom, seen through the water.
    for (let i = 1; i < 3; i++) p.plate(x + 0.6, y + (d * i) / 3 - 0.05, water + 0.003, w - 1.0, 0.1, mix(MAT.water, MAT.ink, 0.3), { emissive: 0.4, bias: 0.005 });
  }
  if (ctx.lod > 1) {
    // Caustics: short bright strokes drifting across the surface.
    for (let k = 0; k < Math.round(w * d * 0.8); k++) {
      const u = (hash2(k, 5) + time * 0.03 * (hash2(k, 9) - 0.5)) % 1;
      const v = (hash2(5, k) + time * 0.02) % 1;
      const px = x + ((u + 1) % 1) * w;
      const py = y + ((v + 1) % 1) * d;
      const len = 0.2 + hash2(k, k) * 0.3;
      p.line(px, py, water + 0.01, px + len, py + len * 0.3, water + 0.01, MAT.paper, 1, { emissive: 1, alpha: 0.55 });
    }
    // A ladder at the near end and a board at the far end.
    for (const v of [0.4, 0.9]) {
      p.line(x + w - 0.1, y + v, FLOOR_Z + 0.9, x + w - 0.1, y + v, water, MAT.chrome, 2, { emissive: 0.5 });
    }
    p.line(x + w - 0.1, y + 0.4, FLOOR_Z + 0.9, x + w + 0.25, y + 0.4, FLOOR_Z + 0.9, MAT.chrome, 2, { emissive: 0.5 });
    p.line(x + w - 0.1, y + 0.9, FLOOR_Z + 0.9, x + w + 0.25, y + 0.9, FLOOR_Z + 0.9, MAT.chrome, 2, { emissive: 0.5 });
  }
  p.box(x - 1.4, y + d / 2 - 0.25, FLOOR_Z + 0.3, 1.6, 0.5, 0.08, MAT.white, { top: MAT.white });
  p.box(x - 1.4, y + d / 2 - 0.2, FLOOR_Z, 0.3, 0.4, 0.3, MAT.metal);
  ctx.nav?.blockRect(x - c, y - c, w + c * 2, d + c * 2, 0.02);
  ctx.nav?.blockRect(x - 1.4, y + d / 2 - 0.25, 1.4, 0.5, 0.04);
}

/** A sun lounger, placed by where its occupant lies. */
export function lounger(ctx: BuildCtx, x: number, y: number, face: number, tone: RGB): void {
  const { p } = ctx;
  const seat = at(x, y, face, 0, 0.35);
  orient(ctx, seat.x, seat.y, FLOOR_Z + 0.3, 0.62, 1.3, 0.08, face, tone, { top: scale(tone, 1.08) });
  const back = at(x, y, face, 0, -0.35);
  obox(p, back.x, back.y, FLOOR_Z + 0.34, 0.1, 0.6, 0.6, face, tone);
  if (ctx.lod > 0) {
    for (const u of [-0.26, 0.26]) {
      for (const v of [-0.3, 0.9]) {
        const leg = at(x, y, face, u, v);
        p.box(leg.x - 0.03, leg.y - 0.03, FLOOR_Z, 0.06, 0.06, 0.3, MAT.chrome);
      }
    }
  }
  if (ctx.nav) {
    const [fx, fy, fw, fd] = footprint(seat.x, seat.y, 0.62, 1.3, face);
    ctx.nav.costRect(fx, fy, fw, fd, 3);
  }
}

/** A parasol: striped, tilted a little, on a weighted base. */
export function parasol(ctx: BuildCtx, x: number, y: number, tone: RGB): void {
  const { p } = ctx;
  p.cylinder(x, y, FLOOR_Z, 0.3, 0.3, 0.12, MAT.concrete, 8);
  p.line(x, y, FLOOR_Z + 0.1, x + 0.1, y, FLOOR_Z + 2.5, MAT.white, 2, { emissive: 0.4 });
  const cx = x + 0.1;
  const cz = FLOOR_Z + 2.55;
  const r = 1.2;
  const sides = ctx.lod > 1 ? 12 : 6;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    p.quad(cx, y, cz, cx + Math.cos(a0) * r, y + Math.sin(a0) * r, cz - 0.45, cx + Math.cos(a1) * r, y + Math.sin(a1) * r, cz - 0.45, cx, y, cz,
      i % 2 ? tone : MAT.white, 0, 0, 1, { noCull: true, emissive: 0.2 });
  }
  ctx.nav?.blockRect(x - 0.3, y - 0.3, 0.6, 0.6, 0.02);
}

/* ================================================================== TII */

/**
 * A screen of carved lattice, the kind that lets the air and some of the
 * light through and keeps the rest of the room out of sight.
 */
export function mashrabiya(ctx: BuildCtx, x: number, y: number, length: number, axis: "x" | "y", h = 2.6): void {
  const { p } = ctx;
  const t = 0.12;
  const w = axis === "x" ? length : t;
  const d = axis === "x" ? t : length;
  // Frame, then the lattice as a grid of small open diamonds.
  p.box(x, y, FLOOR_Z, w, d, 0.12, MAT.woodDark);
  p.box(x, y, FLOOR_Z + h - 0.12, w, d, 0.12, MAT.woodDark);
  if (axis === "x") {
    p.box(x, y, FLOOR_Z, 0.1, t, h, MAT.woodDark);
    p.box(x + length - 0.1, y, FLOOR_Z, 0.1, t, h, MAT.woodDark);
  } else {
    p.box(x, y, FLOOR_Z, t, 0.1, h, MAT.woodDark);
    p.box(x, y + length - 0.1, FLOOR_Z, t, 0.1, h, MAT.woodDark);
  }
  const step = ctx.lod > 1 ? 0.22 : 0.55;
  if (ctx.lod > 0) {
    for (let s = step; s < length - 0.05; s += step) {
      for (let z = FLOOR_Z + 0.12; z < FLOOR_Z + h - 0.2; z += step) {
        const a = axis === "x" ? { x: x + s, y: y + t / 2 } : { x: x + t / 2, y: y + s };
        const b = axis === "x" ? { x: x + s + step / 2, y: y + t / 2 } : { x: x + t / 2, y: y + s + step / 2 };
        p.line(a.x, a.y, z, b.x, b.y, z + step / 2, MAT.woodDark, 1.5, { emissive: 0.15 });
        p.line(b.x, b.y, z + step / 2, a.x, a.y, z + step, MAT.woodDark, 1.5, { emissive: 0.15 });
      }
    }
  }
  if (axis === "x") ctx.nav?.blockRect(x, y - 0.04, length, t + 0.08, 0.04);
  else ctx.nav?.blockRect(x - 0.04, y, t + 0.08, length, 0.04);
}

/** A falcon on its perch, turning its head now and then. */
export function falconPerch(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.cylinder(x, y, FLOOR_Z, 0.3, 0.3, 0.06, MAT.woodDark, 8);
  p.box(x - 0.04, y - 0.04, FLOOR_Z, 0.08, 0.08, 1.3, MAT.woodDark);
  p.cylinder(x, y, FLOOR_Z + 1.3, 0.14, 0.14, 0.1, MAT.red, 8);
  const look = Math.sin(time * 0.4) > 0.3 ? 0.9 : Math.sin(time * 0.4) < -0.5 ? -0.9 : 0;
  const face = Math.PI / 2 + look;
  obox(p, x, y, FLOOR_Z + 1.4, 0.22, 0.3, 0.36, Math.PI / 2, mix(MAT.woodDark, MAT.paper, 0.35), { top: MAT.woodDark });
  if (ctx.lod > 0) {
    const hx = x + Math.cos(face) * 0.04;
    const hy = y + Math.sin(face) * 0.04;
    obox(p, hx, hy, FLOOR_Z + 1.76, 0.16, 0.16, 0.14, face, mix(MAT.woodDark, MAT.paper, 0.2));
    p.dot(hx + Math.cos(face) * 0.1, hy + Math.sin(face) * 0.1, FLOOR_Z + 1.8, 2, MAT.lamp, { emissive: 1 });
    obox(p, x, y - 0.02, FLOOR_Z + 1.4, 0.26, 0.06, 0.3, 0, MAT.woodDark);
  }
  ctx.nav?.blockRect(x - 0.3, y - 0.3, 0.6, 0.6, 0.05);
}

/** A coffee pot with a long beak spout, and three small cups, on a tray. */
export function dallah(ctx: BuildCtx, x: number, y: number, z: number): void {
  if (ctx.lod < 2) return;
  const { p } = ctx;
  p.cylinder(x, y, z, 0.32, 0.32, 0.02, MAT.lamp, 10, { emissive: 0.3 });
  p.cylinder(x, y, z + 0.02, 0.08, 0.08, 0.14, MAT.lamp, 8, { emissive: 0.3 });
  p.cylinder(x, y, z + 0.16, 0.05, 0.05, 0.08, MAT.lamp, 6, { emissive: 0.3 });
  p.line(x + 0.06, y, z + 0.1, x + 0.18, y, z + 0.2, MAT.lamp, 2, { emissive: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = 2 + i * 0.7;
    p.cylinder(x + Math.cos(a) * 0.2, y + Math.sin(a) * 0.2, z + 0.02, 0.03, 0.03, 0.04, MAT.white, 5);
  }
}

/* ================================================================ Sarvam */

/** A rangoli: a round pattern of coloured rings and petals laid on the floor at the door. */
export function rangoli(ctx: BuildCtx, x: number, y: number, r: number, seed: number): void {
  const { p } = ctx;
  const tones = [MAT.lamp, MAT.red, MAT.seal, MAT.green, MAT.led, MAT.paper];
  const rings = ctx.lod > 1 ? 5 : 2;
  for (let i = rings; i >= 1; i--) {
    const rr = (r * i) / rings;
    p.disc(x, y, FLOOR_Z + 0.004 + (rings - i) * 0.002, rr, rr, tones[(i + seed) % tones.length], { emissive: 0.4, bias: 0.012 + (rings - i) * 0.002 }, 16);
  }
  if (ctx.lod < 2) return;
  const petals = 8;
  for (let k = 0; k < petals; k++) {
    const a = (k / petals) * Math.PI * 2;
    const px = x + Math.cos(a) * r * 0.62;
    const py = y + Math.sin(a) * r * 0.62;
    p.disc(px, py, FLOOR_Z + 0.02, r * 0.18, r * 0.18, tones[(k + seed + 3) % tones.length], { emissive: 0.5, bias: 0.03 }, 8);
    p.dot(x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08, FLOOR_Z + 0.02, 3, MAT.lamp, { emissive: 1, bias: 0.03 });
  }
}

/** A chai counter: a kettle on a burner, small glasses, a curl of steam. */
export function chaiStall(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 1.6, 0.7, 0.95, MAT.wood, { top: MAT.stone });
  if (ctx.lod === 0) {
    ctx.nav?.blockRect(x, y, 1.6, 0.7, 0.06);
    return;
  }
  p.cylinder(x + 0.4, y + 0.35, FLOOR_Z + 0.95, 0.16, 0.16, 0.06, MAT.black, 8);
  p.cylinder(x + 0.4, y + 0.35, FLOOR_Z + 1.01, 0.14, 0.12, 0.22, MAT.chrome, 8);
  if (ctx.lod > 1) {
    p.dot(x + 0.4, y + 0.35, FLOOR_Z + 0.96, 3, MAT.lamp, { emissive: 1, glow: 0.6 });
    for (let i = 0; i < 6; i++) p.cylinder(x + 0.8 + (i % 3) * 0.2, y + 0.2 + Math.floor(i / 3) * 0.24, FLOOR_Z + 0.95, 0.04, 0.04, 0.09, mix(MAT.terracotta, MAT.paper, 0.3), 5);
    for (let i = 0; i < 4; i++) {
      const t = (time * 0.35 + i / 4) % 1;
      p.dot(x + 0.4 + Math.sin(time + i) * 0.05, y + 0.35, FLOOR_Z + 1.3 + t * 0.7, 2 + t * 3, MAT.paper, { emissive: 1, alpha: (1 - t) * 0.3 });
    }
  }
  ctx.nav?.blockRect(x, y, 1.6, 0.7, 0.06);
}

/** Speech bubbles pinned to the north wall, in every colour on the sheet. Twenty-two languages. */
export function bubbleWall(ctx: BuildCtx, x: number, wy: number, w: number, seed: number): void {
  const { p } = ctx;
  if (ctx.lod === 0) return;
  const tones = [MAT.lamp, MAT.led, MAT.seal, MAT.red, MAT.green, MAT.paper];
  const n = ctx.lod > 1 ? 22 : 8;
  for (let i = 0; i < n; i++) {
    const u = x + hash2(seed, i) * (w - 0.6);
    const z = FLOOR_Z + 1.3 + hash2(i, seed) * 2.8;
    const bw = 0.4 + hash2(i, i) * 0.4;
    p.box(u, wy + 0.58, z, bw, 0.03, 0.3, tones[i % tones.length], { emissive: 0.5 });
    if (ctx.lod > 1) {
      p.box(u + 0.08, wy + 0.58, z - 0.1, 0.1, 0.03, 0.1, tones[i % tones.length], { emissive: 0.5 });
      for (let k = 0; k < 2; k++) p.box(u + 0.06, wy + 0.555, z + 0.08 + k * 0.1, bw - 0.14, 0.01, 0.03, MAT.ink, { emissive: 0.6 });
    }
  }
}

/* =============================================================== Cohere */

/** A vault door, round and a metre and a half across, set in a free-standing wall. */
export function vault(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, 0.5, 2.8, MAT.concrete, { top: MAT.wallTrim });
  const cx = x + w / 2;
  uprightDisc(p, "y", cx, y + 0.52, FLOOR_Z + 1.3, 0.85, 1, MAT.chrome, { noCull: true }, ctx.lod > 1 ? 20 : 10);
  if (ctx.lod > 0) {
    uprightDisc(p, "y", cx, y + 0.54, FLOOR_Z + 1.3, 0.62, 1, MAT.metal, { noCull: true }, 16);
    const a = time * 0.15;
    for (let i = 0; i < 3; i++) {
      const b = a + (i / 3) * Math.PI * 2;
      p.line(cx, y + 0.56, FLOOR_Z + 1.3, cx + Math.cos(b) * 0.5, y + 0.56, FLOOR_Z + 1.3 + Math.sin(b) * 0.5, MAT.darkMetal, 3, { emissive: 0.4, bias: 0.05 });
    }
    p.cylinder(cx, y + 0.5, FLOOR_Z + 1.3, 0.12, 0.12, 0.08, MAT.darkMetal, 8);
  }
  ctx.nav?.blockRect(x, y, w, 0.5, 0.06);
}

/** A canoe on the north wall, the one thing in the hall nobody uses for work. */
export function canoe(ctx: BuildCtx, x: number, wy: number, z: number, length = 4.2): void {
  const { p } = ctx;
  const y = wy + 0.72;
  const segs = ctx.lod > 1 ? 10 : 4;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const r0 = Math.sin(t0 * Math.PI) * 0.26;
    const r1 = Math.sin(t1 * Math.PI) * 0.26;
    const x0 = x + t0 * length;
    const x1 = x + t1 * length;
    const lift0 = Math.pow(Math.abs(t0 - 0.5) * 2, 3) * 0.2;
    const lift1 = Math.pow(Math.abs(t1 - 0.5) * 2, 3) * 0.2;
    p.quad(x0, y, z + lift0, x1, y, z + lift1, x1, y + r1, z - r1 + lift1, x0, y + r0, z - r0 + lift0, MAT.red, 0, 0.7, -0.7, { noCull: true, emissive: 0.2 });
    p.quad(x0, y + r0, z - r0 + lift0, x1, y + r1, z - r1 + lift1, x1, y + r1 * 2, z + lift1, x0, y + r0 * 2, z + lift0, scale(MAT.red, 0.85), 0, 0.7, 0.7, { noCull: true, emissive: 0.2 });
  }
  if (ctx.lod > 1) p.line(x + length * 0.3, y + 0.3, z + 0.1, x + length * 0.9, y + 0.3, z + 0.5, MAT.wood, 2.5, { emissive: 0.3 });
}

/* ================================================================ OpenAI */

/**
 * A brass bell on a post, the kind a team rings when something ships. It
 * swings at the top of every hour, which in this hall is often enough.
 */
export function shipBell(ctx: BuildCtx, x: number, y: number): void {
  const { p, clock } = ctx;
  p.box(x - 0.06, y - 0.06, FLOOR_Z, 0.12, 0.12, 1.9, MAT.woodDark);
  p.box(x - 0.3, y - 0.05, FLOOR_Z + 1.9, 0.6, 0.1, 0.08, MAT.woodDark);
  const minute = clock.minutes % 60;
  const swing = minute < 2 ? Math.sin(minute * 18) * 0.35 * (1 - minute / 2) : 0;
  const bx = x + Math.sin(swing) * 0.25;
  const bz = FLOOR_Z + 1.9 - Math.cos(swing) * 0.25;
  p.line(x, y, FLOOR_Z + 1.9, bx, y, bz, MAT.darkMetal, 1, { emissive: 0.3 });
  p.cylinder(bx, y, bz - 0.3, 0.16, 0.16, 0.3, MAT.lamp, 10, { top: scale(MAT.lamp, 0.8), emissive: 0.3 });
  p.cylinder(bx, y, bz - 0.34, 0.2, 0.2, 0.06, MAT.lamp, 10, { emissive: 0.3 });
  ctx.nav?.blockRect(x - 0.12, y - 0.12, 0.24, 0.24, 0.04);
}

/* ============================================================= Anthropic */

/**
 * A fireplace: a stone surround, a dark firebox, and a fire that is always
 * lit. It faces `face`.
 */
export function fireplace(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p, time } = ctx;
  orient(ctx, x, y, FLOOR_Z, 2.0, 0.6, 1.4, face, MAT.stone, { top: scale(MAT.stone, 1.05) });
  const mantel = at(x, y, face, 0, 0.05);
  orient(ctx, mantel.x, mantel.y, FLOOR_Z + 1.4, 2.3, 0.75, 0.1, face, MAT.woodDark);
  const box = at(x, y, face, 0, 0.3);
  orient(ctx, box.x, box.y, FLOOR_Z + 0.15, 1.1, 0.02, 0.8, face, MAT.black);
  // The chimney breast, up to the trusses.
  const back = at(x, y, face, 0, -0.1);
  orient(ctx, back.x, back.y, FLOOR_Z + 1.5, 1.4, 0.4, 3.5, face, MAT.stone);
  if (ctx.lod > 0) {
    const fire = at(x, y, face, 0, 0.32);
    for (let i = 0; i < 7; i++) {
      const u = (i - 3) * 0.12;
      const h = 0.25 + Math.abs(Math.sin(time * 5 + i * 1.7)) * 0.35;
      const f = at(fire.x, fire.y, face, u, 0);
      p.line(f.x, f.y, FLOOR_Z + 0.2, f.x, f.y, FLOOR_Z + 0.2 + h, i % 2 ? MAT.lamp : MAT.red, 3, { emissive: 1, glow: 0.8 });
    }
    p.dot(fire.x, fire.y, FLOOR_Z + 0.25, 4, MAT.bulb, { emissive: 1, glow: 1 });
  }
  hard(ctx, x, y, 2.0, 0.6, face, 0.06);
}

/**
 * A model of a suspension bridge on a low plinth: two red towers, the
 * cables swung between them, and the deck. A particular bridge, and a
 * particular week in the lab's history when one of its models could not
 * stop talking about it.
 */
export function bridgeModel(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  const len = 2.6;
  p.box(x - len / 2 - 0.2, y - 0.35, FLOOR_Z, len + 0.4, 0.7, 0.55, MAT.woodDark, { top: mix(MAT.led, MAT.paper, 0.45) });
  const deckZ = FLOOR_Z + 0.75;
  p.box(x - len / 2 - 0.1, y - 0.07, deckZ, len + 0.2, 0.14, 0.04, MAT.red, { emissive: 0.2 });
  const towers = [x - len * 0.3, x + len * 0.3];
  for (const tx of towers) {
    p.box(tx - 0.04, y - 0.12, FLOOR_Z + 0.55, 0.08, 0.05, 0.75, MAT.red, { emissive: 0.2 });
    p.box(tx - 0.04, y + 0.07, FLOOR_Z + 0.55, 0.08, 0.05, 0.75, MAT.red, { emissive: 0.2 });
    p.box(tx - 0.04, y - 0.12, FLOOR_Z + 1.2, 0.08, 0.24, 0.04, MAT.red, { emissive: 0.2 });
  }
  if (ctx.lod > 0) {
    for (const side of [-0.1, 0.1]) {
      const pts: [number, number][] = [[x - len / 2 - 0.1, deckZ + 0.05]];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const cx = towers[0] + (towers[1] - towers[0]) * t;
        pts.push([cx, FLOOR_Z + 1.28 - Math.sin(t * Math.PI) * 0.42]);
      }
      pts.push([x + len / 2 + 0.1, deckZ + 0.05]);
      for (let i = 1; i < pts.length; i++) {
        p.line(pts[i - 1][0], y + side, pts[i - 1][1], pts[i][0], y + side, pts[i][1], MAT.red, 1, { emissive: 0.5 });
      }
    }
  }
  ctx.nav?.blockRect(x - len / 2 - 0.2, y - 0.35, len + 0.4, 0.7, 0.05);
}

/** A framed document on the north wall: a title and rows of text too small to read. */
export function framedDocument(ctx: BuildCtx, x: number, wy: number, z: number, w: number, h: number, title: string): void {
  const { p } = ctx;
  p.box(x - 0.06, wy + 0.58, z - 0.06, w + 0.12, 0.05, h + 0.12, MAT.woodDark);
  p.box(x, wy + 0.56, z, w, 0.03, h, MAT.paper, { emissive: 0.4 });
  if (ctx.lod < 2) return;
  wallWord(ctx, title, x + w / 2, z + h - 0.12, 0.035, MAT.ink, wy + 0.54);
  for (let r = 0; r < 12; r++) {
    const lw = (w - 0.3) * (0.7 + hash2(r, 5) * 0.3);
    p.box(x + 0.15, wy + 0.53, z + h - 0.42 - r * ((h - 0.6) / 12), lw, 0.01, 0.025, MAT.ink, { emissive: 0.5 });
  }
}
