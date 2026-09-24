import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { contactShadow, obox, uprightDisc } from "../../engine/shapes";
import { worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import { shows, type BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z, TRUSS_Z } from "../metrics";
import { at, axes, footprint, orient } from "./furniture";

/*
 * Each lab's own things, for the east of the building: China, Korea, Japan.
 */

function hard(ctx: BuildCtx, cx: number, cy: number, along: number, across: number, face: number, pad = 0.08): void {
  if (!ctx.nav) return;
  const [x, y, w, d] = footprint(cx, cy, along, across, face);
  ctx.nav.blockRect(x, y, w, d, pad);
}

/* ============================================================== DeepSeek */

/**
 * A whale, hanging from the trusses on two wires and swimming very slowly
 * through the air of the hall.
 */
export function whale(ctx: BuildCtx, x: number, y: number, z: number): void {
  const { p, time } = ctx;
  const drift = Math.sin(time * 0.25) * 0.3;
  const bob = Math.sin(time * 0.5) * 0.08;
  const cx = x + drift;
  const cz = z + bob;
  const body = MAT.led;
  const belly = mix(MAT.led, MAT.paper, 0.6);
  const segs = ctx.lod > 1 ? 8 : 4;
  // Along x: head at +x, tail at -x, a body that is widest just behind the head.
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const w0 = Math.sin(Math.pow(t0, 0.7) * Math.PI) * 0.7 + 0.08;
    const w1 = Math.sin(Math.pow(t1, 0.7) * Math.PI) * 0.7 + 0.08;
    const x0 = cx - 1.8 + t0 * 3.6;
    const x1 = cx - 1.8 + t1 * 3.6;
    const sway0 = Math.sin(time * 0.9 + t0 * 3) * 0.12 * (1 - t0);
    const sway1 = Math.sin(time * 0.9 + t1 * 3) * 0.12 * (1 - t1);
    p.quad(x0, y - w0 + sway0, cz + w0 * 0.5, x1, y - w1 + sway1, cz + w1 * 0.5, x1, y + w1 + sway1, cz + w1 * 0.5, x0, y + w0 + sway0, cz + w0 * 0.5, body, 0, 0, 1, { noCull: true, emissive: 0.35 });
    p.quad(x0, y - w0 + sway0, cz - w0 * 0.3, x1, y - w1 + sway1, cz - w1 * 0.3, x1, y + w1 + sway1, cz - w1 * 0.3, x0, y + w0 + sway0, cz - w0 * 0.3, belly, 0, 0, -1, { noCull: true, emissive: 0.35 });
    p.quad(x0, y + w0 + sway0, cz + w0 * 0.5, x1, y + w1 + sway1, cz + w1 * 0.5, x1, y + w1 + sway1, cz - w1 * 0.3, x0, y + w0 + sway0, cz - w0 * 0.3, scale(body, 0.85), 0, 1, 0, { noCull: true, emissive: 0.3 });
  }
  // The flukes.
  const flick = Math.sin(time * 0.9) * 0.25;
  p.quad(cx - 1.8, y, cz, cx - 2.4, y - 0.6, cz + 0.2 + flick, cx - 2.2, y, cz + flick * 0.5, cx - 2.4, y + 0.6, cz + 0.2 + flick, body, 0, 0, 1, { noCull: true, emissive: 0.35 });
  if (ctx.lod > 0) {
    for (const u of [-0.9, 0.9]) p.line(cx + u, y, cz + 0.4, cx + u * 0.8, y, TRUSS_Z, MAT.metal, 1, { emissive: 0.3 });
    p.dot(cx + 1.3, y + 0.35, cz + 0.2, 2.5, MAT.ink, { emissive: 1 });
  }
}

/** A low tea table with a pot and cups, and steam off the pot. Hangzhou's green tea. */
export function teaTable(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x - 0.7, y - 0.45, FLOOR_Z, 1.4, 0.9, 0.42, MAT.woodDark, { top: MAT.wood });
  if (ctx.lod > 1) {
    p.box(x - 0.45, y - 0.25, FLOOR_Z + 0.42, 0.9, 0.5, 0.03, MAT.woodDark);
    p.cylinder(x - 0.15, y, FLOOR_Z + 0.45, 0.11, 0.11, 0.12, mix(MAT.green, MAT.paper, 0.5), 8);
    p.line(x - 0.05, y, FLOOR_Z + 0.52, x + 0.06, y, FLOOR_Z + 0.58, mix(MAT.green, MAT.paper, 0.5), 2, { emissive: 0.3 });
    for (let i = 0; i < 4; i++) p.cylinder(x + 0.15 + (i % 2) * 0.14, y - 0.1 + Math.floor(i / 2) * 0.2, FLOOR_Z + 0.45, 0.035, 0.035, 0.04, MAT.white, 5);
    for (let i = 0; i < 4; i++) {
      const t = (time * 0.3 + i / 4) % 1;
      p.dot(x - 0.15 + Math.sin(time + i) * 0.04, y, FLOOR_Z + 0.62 + t * 0.6, 2 + t * 2, MAT.paper, { emissive: 1, alpha: (1 - t) * 0.3 });
    }
  }
  ctx.nav?.blockRect(x - 0.7, y - 0.45, 1.4, 0.9, 0.05);
}

/* ================================================================== Kimi */

/**
 * The moon: a pale sphere hung from the trusses with its craters on it,
 * lit from inside and waxing with the day.
 */
export function moon(ctx: BuildCtx, x: number, y: number, z: number, r = 1.1): void {
  const { p, clock } = ctx;
  const rings = ctx.lod > 1 ? 8 : 4;
  const tone = mix(MAT.paper, MAT.lamp, 0.12);
  for (let i = 0; i < rings; i++) {
    const a0 = -Math.PI / 2 + (i / rings) * Math.PI;
    const a1 = -Math.PI / 2 + ((i + 1) / rings) * Math.PI;
    const rr = (Math.cos(a0) + Math.cos(a1)) / 2 * r;
    const z0 = z + Math.sin(a0) * r;
    const z1 = z + Math.sin(a1) * r;
    p.cylinder(x, y, z0, rr, rr, z1 - z0, tone, ctx.lod > 1 ? 14 : 8, { emissive: 0.75, glow: 0.35 });
  }
  if (ctx.lod > 1) {
    // Craters, on the side toward the room.
    for (let k = 0; k < 9; k++) {
      const a = hash2(k, 3) * Math.PI - Math.PI / 2 + Math.PI / 4;
      const b = hash2(3, k) * 1.4 - 0.7;
      const cr = 0.08 + hash2(k, k) * 0.12;
      p.dot(x + Math.cos(a) * Math.cos(b) * r * 0.99, y + Math.sin(a) * Math.cos(b) * r * 0.99, z + Math.sin(b) * r * 0.9, cr * p.cam.s * 1.2, mix(tone, MAT.ink, 0.25), { emissive: 0.7 });
    }
    // A shadow that moves across it over the day: the phase.
    const phase = (clock.minutes / 1440) * Math.PI * 2;
    const sx = x + Math.cos(phase) * r * 0.35;
    const sy = y + Math.sin(phase) * r * 0.35;
    p.cylinder(sx, sy, z - r * 0.6, r * 0.62, r * 0.62, r * 1.2, mix(MAT.ink, MAT.paper, 0.3), 10, { alpha: 0.28, emissive: 1 });
  }
  if (ctx.lod > 0) p.line(x, y, z + r, x, y, TRUSS_Z, MAT.metal, 1, { emissive: 0.3 });
}

/** A telescope on a tripod, pointed up at the trusses. */
export function telescope(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.line(x + Math.cos(a) * 0.45, y + Math.sin(a) * 0.45, FLOOR_Z, x, y, FLOOR_Z + 1.25, MAT.woodDark, 2.5, { emissive: 0.2 });
  }
  const tx = x + 0.55;
  const tz = FLOOR_Z + 1.9;
  p.line(x - 0.35, y, FLOOR_Z + 0.95, tx, y, tz, MAT.white, Math.max(4, 0.16 * p.cam.s), { emissive: 0.4 });
  p.line(tx, y, tz, tx + 0.1, y, tz + 0.1, MAT.black, Math.max(4, 0.2 * p.cam.s), { emissive: 0.2 });
  ctx.nav?.blockRect(x - 0.45, y - 0.45, 0.9, 0.9, 0.04);
}

/**
 * A glass prism on a plinth, a white beam going in one side and three
 * coloured ones coming out of the other. An album cover, if you know it.
 */
export function prism(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x - 0.45, y - 0.45, FLOOR_Z, 0.9, 0.9, 1.0, MAT.black, { top: MAT.darkMetal });
  const z0 = FLOOR_Z + 1.0;
  const h = 0.5;
  const pts = [[0, -0.32], [-0.28, 0.16], [0.28, 0.16]];
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % 3];
    p.quad(x + ax, y + ay, z0, x + bx, y + by, z0, x + bx, y + by, z0 + h, x + ax, y + ay, z0 + h, MAT.glass, 0, 0, 1, { noCull: true, alpha: 0.45, emissive: 0.6 });
  }
  if (ctx.lod < 1) return;
  const zb = z0 + h * 0.5;
  const shimmer = 0.8 + 0.2 * Math.sin(time * 2);
  p.line(x - 1.6, y - 0.3, zb, x - 0.1, y - 0.05, zb, MAT.paper, 2, { emissive: 1, glow: 0.5 * shimmer });
  [MAT.red, MAT.lamp, MAT.green, MAT.led, MAT.seal].forEach((tone, i) => {
    p.line(x + 0.1, y + 0.05, zb, x + 1.6, y + 0.25 + i * 0.12, zb - 0.1 - i * 0.06, tone, 2, { emissive: 1, glow: 0.4 * shimmer });
  });
  ctx.nav?.blockRect(x - 0.45, y - 0.45, 0.9, 0.9, 0.05);
}

/** A field of stars on a dark rug: dots, a few of them bright. */
export function starRug(ctx: BuildCtx, x: number, y: number, w: number, d: number): void {
  const { p, time } = ctx;
  p.plate(x, y, FLOOR_Z + 0.01, w, d, mix(MAT.ink, MAT.seal, 0.2), { bias: 0.012 });
  if (ctx.lod < 2) return;
  const n = Math.round(w * d * 3);
  for (let k = 0; k < n; k++) {
    const twinkle = Math.sin(time * 2 + k) > 0.7;
    p.dot(x + hash2(k, 2) * w, y + hash2(2, k) * d, FLOOR_Z + 0.015, twinkle ? 2 : 1, twinkle ? MAT.bulb : MAT.paper, { emissive: 1, bias: 0.02 });
  }
}

/* ============================================================ ByteDance */

/**
 * Trays of seedlings under grow lights. The lab is called Seed; this is the
 * one room in the building where something is literally growing.
 */
export function seedlings(ctx: BuildCtx, x: number, y: number, w: number, d: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, d, 0.8, MAT.metal, { top: MAT.soil });
  p.box(x + 0.05, y + 0.05, FLOOR_Z + 2.1, w - 0.1, d - 0.1, 0.06, MAT.seal, { emissive: 1, glow: 0.6 });
  for (const [u, v] of [[0, 0], [w - 0.05, 0], [0, d - 0.05], [w - 0.05, d - 0.05]]) {
    p.box(x + u, y + v, FLOOR_Z + 0.8, 0.05, 0.05, 1.3, MAT.metal);
  }
  if (ctx.lod > 0) {
    p.plate(x, y, FLOOR_Z + 0.81, w, d, mix(MAT.seal, MAT.paper, 0.4), { alpha: 0.18, emissive: 1 });
  }
  if (ctx.lod > 1) {
    const n = Math.round(w * d * 16);
    for (let k = 0; k < n; k++) {
      const sx = x + 0.1 + hash2(k, 7) * (w - 0.2);
      const sy = y + 0.1 + hash2(7, k) * (d - 0.2);
      const grow = 0.08 + hash2(k, k) * 0.18;
      const sway = Math.sin(time * 0.8 + k) * 0.01;
      p.line(sx, sy, FLOOR_Z + 0.8, sx + sway, sy, FLOOR_Z + 0.8 + grow, MAT.green, 2, { emissive: 0.4 });
    }
  }
  ctx.nav?.blockRect(x, y, w, d, 0.06);
}

/** A wall of phone screens in portrait, each one scrolling at its own speed. */
export function phoneWall(ctx: BuildCtx, x: number, wy: number, w: number, z: number): void {
  const { p, time } = ctx;
  const cols = Math.floor(w / 0.42);
  p.box(x - 0.08, wy + 0.58, z - 0.08, cols * 0.42 + 0.08, 0.05, 2 * 0.82 + 0.16, MAT.black);
  if (ctx.lod === 0) return;
  const tones = [MAT.red, MAT.led, MAT.seal, MAT.lamp, MAT.green, MAT.paper];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 2; r++) {
      const px = x + c * 0.42;
      const pz = z + r * 0.82;
      const beat = Math.floor(time * (0.3 + hash2(c, r) * 0.5) + c * 3 + r * 7);
      const tone = tones[beat % tones.length];
      p.box(px, wy + 0.54, pz, 0.34, 0.03, 0.7, mix(tone, MAT.paper, 0.2), { emissive: 0.85, glow: 0.2 });
      if (ctx.lod > 1) {
        p.box(px + 0.05, wy + 0.52, pz + 0.08, 0.24, 0.01, 0.06, MAT.white, { emissive: 1 });
        p.dot(px + 0.29, wy + 0.52, pz + 0.25, 1.5, MAT.red, { emissive: 1 });
      }
    }
  }
}

/** A ring light on a tripod with a phone in the middle of it. */
export function ringLight(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p } = ctx;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.line(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, FLOOR_Z, x, y, FLOOR_Z + 0.9, MAT.black, 2, { emissive: 0.2 });
  }
  p.line(x, y, FLOOR_Z + 0.9, x, y, FLOOR_Z + 1.55, MAT.black, 2, { emissive: 0.2 });
  const ew = Math.abs(Math.cos(face)) > 0.5;
  const segs = 14;
  const r = 0.3;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const u0 = Math.cos(a0) * r;
    const u1 = Math.cos(a1) * r;
    const z0 = FLOOR_Z + 1.6 + Math.sin(a0) * r;
    const z1 = FLOOR_Z + 1.6 + Math.sin(a1) * r;
    if (ew) p.line(x, y + u0, z0, x, y + u1, z1, MAT.bulb, 3, { emissive: 1, glow: 0.6 });
    else p.line(x + u0, y, z0, x + u1, y, z1, MAT.bulb, 3, { emissive: 1, glow: 0.6 });
  }
  obox(p, x, y, FLOOR_Z + 1.48, 0.02, 0.1, 0.2, face, MAT.black);
  ctx.nav?.blockRect(x - 0.3, y - 0.3, 0.6, 0.6, 0.03);
}

/* ================================================================ Xiaomi */

/**
 * A car on a turntable, turning. The same company makes the phones on the
 * table beside it, the vacuum on the floor, and this.
 */
export function evTurntable(ctx: BuildCtx, x: number, y: number, tone: RGB): void {
  const { p, time } = ctx;
  p.cylinder(x, y, FLOOR_Z, 2.6, 2.6, 0.12, MAT.darkMetal, 20, { top: MAT.metal });
  if (ctx.lod > 0) p.cylinder(x, y, FLOOR_Z + 0.12, 2.5, 2.5, 0.01, MAT.lamp, 20, { emissive: 0.7, glow: 0.2, alpha: 0.5 });
  const a = time * 0.18;
  const base = FLOOR_Z + 0.13;
  // Body, cabin, glass, lights.
  obox(p, x, y, base + 0.28, 4.4, 1.9, 0.48, a, tone, { top: scale(tone, 1.1) });
  obox(p, x - Math.cos(a) * 0.3, y - Math.sin(a) * 0.3, base + 0.76, 2.2, 1.66, 0.46, a, mix(MAT.black, tone, 0.2), { top: tone });
  if (ctx.lod > 0) {
    obox(p, x - Math.cos(a) * 0.3, y - Math.sin(a) * 0.3, base + 0.8, 2.26, 1.7, 0.34, a, MAT.glass, { alpha: 0.6, emissive: 0.5 });
    for (const side of [-1, 1]) {
      const hx = x + Math.cos(a) * 2.18 - Math.sin(a) * side * 0.7;
      const hy = y + Math.sin(a) * 2.18 + Math.cos(a) * side * 0.7;
      p.dot(hx, hy, base + 0.5, 3, MAT.bulb, { emissive: 1, glow: 0.5 });
      const tx = x - Math.cos(a) * 2.18 - Math.sin(a) * side * 0.7;
      const ty = y - Math.sin(a) * 2.18 + Math.cos(a) * side * 0.7;
      p.dot(tx, ty, base + 0.55, 3, MAT.red, { emissive: 1, glow: 0.4 });
    }
    // Wheels.
    for (const [u, v] of [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]]) {
      const wx = x + Math.cos(a) * u - Math.sin(a) * v;
      const wy = y + Math.sin(a) * u + Math.cos(a) * v;
      p.cylinder(wx, wy, base, 0.36, 0.36, 0.36, MAT.black, 8);
    }
  }
  contactShadow(p, x, y, FLOOR_Z + 0.13, 2.3, 1.3, ctx.shadowStrength * 0.8, MAT.ink);
  ctx.nav?.blockRect(x - 2.6, y - 2.6, 5.2, 5.2, 0.05);
}

/**
 * A robot vacuum, doing the rounds of a patch of floor on its own, bouncing
 * off whatever it meets. It is not on the nav grid: nothing is in its way
 * that it cannot go round.
 */
export function robotVacuum(ctx: BuildCtx, x0: number, y0: number, w: number, d: number): void {
  const { p, time } = ctx;
  // A path that bounces around the box: a triangle wave on each axis.
  const tri = (t: number) => 1 - Math.abs(((t % 2) + 2) % 2 - 1);
  const x = x0 + 0.3 + tri(time * 0.11) * (w - 0.6);
  const y = y0 + 0.3 + tri(time * 0.083 + 0.4) * (d - 0.6);
  p.cylinder(x, y, FLOOR_Z, 0.28, 0.28, 0.08, MAT.white, 12, { top: scale(MAT.white, 0.95) });
  if (ctx.lod > 0) {
    p.cylinder(x, y, FLOOR_Z + 0.08, 0.09, 0.09, 0.03, MAT.darkMetal, 8);
    const blink = Math.sin(time * 4) > 0;
    p.dot(x + 0.15, y, FLOOR_Z + 0.09, 2, blink ? MAT.led : MAT.ledOff, { emissive: 1, glow: blink ? 0.5 : 0 });
  }
}

/** A glass table of phones, face up, each lit. */
export function phoneTable(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, 0.8, 0.9, MAT.white, { top: MAT.chrome });
  if (ctx.lod < 2) {
    ctx.nav?.blockRect(x, y, w, 0.8, 0.06);
    return;
  }
  for (let i = 0; i < Math.floor(w / 0.4); i++) {
    const tone = [MAT.led, MAT.lamp, MAT.seal, MAT.green][i % 4];
    p.box(x + 0.15 + i * 0.4, y + 0.25, FLOOR_Z + 0.9, 0.18, 0.34, 0.015, MAT.black);
    p.plate(x + 0.17 + i * 0.4, y + 0.27, FLOOR_Z + 0.917, 0.14, 0.3, mix(tone, MAT.paper, 0.3), {
      emissive: 0.8, glow: 0.2 + 0.1 * Math.sin(time + i), bias: 0.01,
    });
  }
  ctx.nav?.blockRect(x, y, w, 0.8, 0.06);
}

/* ================================================================= Baidu */

/**
 * A robotaxi in its bay: a white car with the sensor dome on the roof, the
 * lidar in it turning, and the bay marked out on the floor.
 */
export function robotaxi(ctx: BuildCtx, x: number, y: number, face: number): void {
  const { p, time } = ctx;
  const { fx, fy } = axes(face);
  if (ctx.lod > 0) {
    const [bx, by, bw, bd] = footprint(x, y, 2.6, 5.2, face);
    for (const [a, b, c, d] of [[bx, by, bw, 0.08], [bx, by + bd - 0.08, bw, 0.08], [bx, by, 0.08, bd], [bx + bw - 0.08, by, 0.08, bd]]) {
      p.plate(a, b, FLOOR_Z + 0.006, c, d, MAT.lamp, { emissive: 0.5, bias: 0.015 });
    }
  }
  obox(p, x, y, FLOOR_Z + 0.3, 1.8, 4.2, 0.62, face + Math.PI / 2, MAT.white, { top: scale(MAT.white, 0.96) });
  obox(p, x - fx * 0.2, y - fy * 0.2, FLOOR_Z + 0.92, 1.6, 2.2, 0.5, face + Math.PI / 2, mix(MAT.black, MAT.led, 0.2));
  obox(p, x - fx * 0.2, y - fy * 0.2, FLOOR_Z + 1.42, 1.1, 1.3, 0.06, face + Math.PI / 2, MAT.white);
  p.cylinder(x - fx * 0.2, y - fy * 0.2, FLOOR_Z + 1.48, 0.24, 0.24, 0.26, MAT.black, 10);
  if (ctx.lod > 0) {
    const a = time * 5;
    p.line(x - fx * 0.2, y - fy * 0.2, FLOOR_Z + 1.62, x - fx * 0.2 + Math.cos(a) * 0.24, y - fy * 0.2 + Math.sin(a) * 0.24, FLOOR_Z + 1.62, MAT.led, 2, { emissive: 1, glow: 0.6 });
    for (const [u, v] of [[1.4, 0.9], [1.4, -0.9], [-1.4, 0.9], [-1.4, -0.9]]) {
      const wx = x + fx * u + -fy * v;
      const wy = y + fy * u + fx * v;
      p.cylinder(wx, wy, FLOOR_Z, 0.34, 0.34, 0.34, MAT.black, 8);
    }
    for (const side of [-0.6, 0.6]) {
      p.dot(x + fx * 2.1 - fy * side, y + fy * 2.1 + fx * side, FLOOR_Z + 0.6, 3, MAT.bulb, { emissive: 1, glow: 0.4 });
    }
    p.box(x - fx * 0.2 - 0.4, y - fy * 0.2 - 0.4, FLOOR_Z + 1.44, 0.8, 0.8, 0.02, MAT.led, { emissive: 0.8, alpha: 0.6 });
  }
  contactShadow(p, x, y, FLOOR_Z, 1.6, 1.2, ctx.shadowStrength * 0.7, MAT.ink);
  hard(ctx, x, y, 1.9, 4.3, face, 0.1);
}

/** Paw prints laid on the floor in a walking line: the bear on the lab's own mark. */
export function pawPrints(ctx: BuildCtx, x0: number, y0: number, x1: number, y1: number, tone: RGB): void {
  if (ctx.lod < 1) return;
  const { p } = ctx;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.floor(len / 0.7);
  const nx = (x1 - x0) / len;
  const ny = (y1 - y0) / len;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 0.18 : -0.18;
    const cx = x0 + nx * i * 0.7 - ny * side;
    const cy = y0 + ny * i * 0.7 + nx * side;
    p.disc(cx, cy, FLOOR_Z + 0.006, 0.14, 0.12, tone, { emissive: 0.4, bias: 0.015 }, 8);
    if (ctx.lod > 1) {
      for (let k = -1; k <= 1; k++) {
        p.disc(cx + nx * 0.18 - ny * k * 0.09, cy + ny * 0.18 + nx * k * 0.09, FLOOR_Z + 0.006, 0.05, 0.05, tone, { emissive: 0.4, bias: 0.015 }, 6);
      }
    }
  }
}

/** A search box on the wall, as long as a room and with nothing typed in it yet. */
export function searchBar(ctx: BuildCtx, x: number, wy: number, w: number, z: number, cursor: boolean): void {
  const { p, time } = ctx;
  p.box(x, wy + 0.58, z, w, 0.06, 0.6, MAT.white, { emissive: 0.4 });
  p.box(x + w - 1.2, wy + 0.56, z, 1.2, 0.06, 0.6, MAT.led, { emissive: 0.7 });
  if (ctx.lod > 1) {
    if (cursor && Math.sin(time * 4) > 0) p.box(x + 0.25, wy + 0.55, z + 0.12, 0.03, 0.02, 0.36, MAT.ink, { emissive: 1 });
    worldText(p, "SEARCH", x + w - 0.6, wy + 0.54, z + 0.4, 1, 0, 0, 0, 0, 1, 0.035, MAT.white, { align: "center", emissive: 1, bias: 0.06 });
  }
}

/* =============================================================== Meituan */

/** A delivery scooter with its box on the back, on its stand. */
export function scooter(ctx: BuildCtx, x: number, y: number, face: number, tone: RGB): void {
  const { p } = ctx;
  const { fx, fy } = axes(face);
  obox(p, x, y, FLOOR_Z + 0.3, 1.2, 0.36, 0.26, face, tone, { top: scale(tone, 1.1) });
  const front = { x: x + fx * 0.62, y: y + fy * 0.62 };
  p.line(front.x, front.y, FLOOR_Z + 0.3, front.x + fx * 0.1, front.y + fy * 0.1, FLOOR_Z + 1.05, MAT.darkMetal, 3, { emissive: 0.2 });
  obox(p, front.x + fx * 0.1, front.y + fy * 0.1, FLOOR_Z + 1.02, 0.08, 0.6, 0.05, face, MAT.black);
  const back = { x: x - fx * 0.45, y: y - fy * 0.45 };
  obox(p, back.x, back.y, FLOOR_Z + 0.6, 0.55, 0.55, 0.55, face, tone, { top: scale(tone, 0.92) });
  if (ctx.lod > 0) {
    for (const u of [0.55, -0.5]) {
      const w = { x: x + fx * u, y: y + fy * u };
      p.cylinder(w.x, w.y, FLOOR_Z, 0.2, 0.2, 0.14, MAT.black, 8);
    }
  }
  hard(ctx, x, y, 0.5, 1.5, face, 0.05);
}

/**
 * A cat, lying along a bench, much longer than a cat. The lab named its
 * model after it and the hall has the cat.
 */
export function longCat(ctx: BuildCtx, x: number, y: number, length: number, z = FLOOR_Z + 0.46): void {
  const { p, time } = ctx;
  const fur = mix(MAT.paper, MAT.cloth, 0.2);
  p.box(x, y - 0.14, z, length, 0.28, 0.24, fur, { top: scale(fur, 1.05) });
  // The head at the east end, ears up; a tail at the west end that moves.
  p.box(x + length, y - 0.17, z, 0.3, 0.34, 0.3, fur);
  if (ctx.lod > 0) {
    p.box(x + length + 0.02, y - 0.16, z + 0.3, 0.08, 0.08, 0.1, fur);
    p.box(x + length + 0.02, y + 0.08, z + 0.3, 0.08, 0.08, 0.1, fur);
    p.dot(x + length + 0.31, y - 0.06, z + 0.2, 2, MAT.ink, { emissive: 1 });
    p.dot(x + length + 0.31, y + 0.06, z + 0.2, 2, MAT.ink, { emissive: 1 });
    const flick = Math.sin(time * 1.3) * 0.2;
    p.line(x, y, z + 0.12, x - 0.5, y + flick, z + 0.35, fur, 3, { emissive: 0.3 });
    // Stripes, a few.
    if (ctx.lod > 1) for (let s = 0.4; s < length - 0.2; s += 0.6) p.box(x + s, y - 0.141, z + 0.08, 0.08, 0.282, 0.17, mix(fur, MAT.ink, 0.25));
  }
}

/** A wall of pickup lockers, some with orders in, lit. */
export function pickupLockers(ctx: BuildCtx, x: number, y: number, w: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, w, 0.6, 2.0, MAT.lamp, { top: MAT.darkMetal, sideTint: 0.9 });
  if (ctx.lod > 1) {
    const cols = Math.floor(w / 0.5);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        const full = hash2(c + Math.floor(time * 0.05), r) > 0.55;
        p.box(x + 0.05 + c * 0.5, y + 0.6, FLOOR_Z + 0.1 + r * 0.46, 0.42, 0.01, 0.4, full ? MAT.white : scale(MAT.lamp, 0.85), { emissive: full ? 0.5 : 0.2 });
        if (full) p.dot(x + 0.4 + c * 0.5, y + 0.62, FLOOR_Z + 0.44 + r * 0.46, 2, MAT.green, { emissive: 1 });
      }
    }
  }
  ctx.nav?.blockRect(x, y, w, 0.6, 0.06);
}

/* ================================================================== Ant */

/** An ant farm: a slab of sand between glass, tunnels in it, and ants going about their business. */
export function antFarm(ctx: BuildCtx, x: number, y: number, z: number, w = 1.6, h = 1.1): void {
  const { p, time } = ctx;
  p.box(x - 0.05, y - 0.08, z - 0.05, w + 0.1, 0.16, h + 0.1, MAT.woodDark);
  p.box(x, y - 0.06, z, w, 0.12, h, mix(MAT.bench, MAT.paper, 0.3), { emissive: 0.2 });
  if (ctx.lod < 1) return;
  // Tunnels, fixed; ants, walking along them.
  const tunnels: [number, number, number, number][] = [
    [0.1, 0.9, 0.5, 0.6], [0.5, 0.6, 0.9, 0.7], [0.9, 0.7, 1.3, 0.35], [0.5, 0.6, 0.6, 0.2], [0.6, 0.2, 1.1, 0.15],
  ];
  for (const [a, b, c, d] of tunnels) {
    p.line(x + a * (w / 1.4), y - 0.07, z + b * h, x + c * (w / 1.4), y - 0.07, z + d * h, mix(MAT.bench, MAT.ink, 0.35), 2, { emissive: 0.4, bias: 0.04 });
  }
  if (ctx.lod > 1) {
    for (let k = 0; k < 10; k++) {
      const tn = tunnels[k % tunnels.length];
      const t = (time * 0.15 + k * 0.37) % 1;
      const back = Math.floor(time * 0.15 + k * 0.37) % 2 === 1;
      const u = back ? 1 - t : t;
      p.dot(x + (tn[0] + (tn[2] - tn[0]) * u) * (w / 1.4), y - 0.08, z + (tn[1] + (tn[3] - tn[1]) * u) * h, 1.5, MAT.ink, { emissive: 1, bias: 0.05 });
    }
  }
  p.box(x, y - 0.075, z, w, 0.01, h, MAT.glass, { alpha: 0.25, emissive: 0.4 });
}

/** An abacus as tall as a person, on a stand. */
export function abacus(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const w = 1.6;
  const h = 1.2;
  const z = FLOOR_Z + 0.6;
  for (const u of [0, w]) p.box(x + u - 0.05, y - 0.05, FLOOR_Z, 0.1, 0.1, z + h - FLOOR_Z, MAT.woodDark);
  p.box(x - 0.05, y - 0.05, z, w + 0.1, 0.1, 0.08, MAT.woodDark);
  p.box(x - 0.05, y - 0.05, z + h, w + 0.1, 0.1, 0.08, MAT.woodDark);
  p.box(x - 0.05, y - 0.05, z + h * 0.72, w + 0.1, 0.1, 0.05, MAT.woodDark);
  if (ctx.lod < 1) return;
  const rods = 9;
  for (let i = 0; i < rods; i++) {
    const rx = x + 0.12 + i * ((w - 0.24) / (rods - 1));
    p.line(rx, y, z + 0.08, rx, y, z + h, MAT.metal, 1, { emissive: 0.4 });
    const count = Math.floor(hash2(i, Math.floor(time * 0.2)) * 5);
    for (let b = 0; b < 5; b++) {
      const up = b < count;
      const bz = up ? z + h * 0.62 - b * 0.1 : z + 0.12 + b * 0.1;
      p.box(rx - 0.07, y - 0.05, bz, 0.14, 0.1, 0.08, MAT.red, { emissive: 0.3 });
    }
    p.box(rx - 0.07, y - 0.05, z + h * 0.8, 0.14, 0.1, 0.08, MAT.red, { emissive: 0.3 });
  }
  ctx.nav?.blockRect(x - 0.1, y - 0.2, w + 0.2, 0.4, 0.05);
}

/** A code of squares on the north wall, the size of a door: how half the country pays. */
export function payCode(ctx: BuildCtx, x: number, wy: number, z: number, size: number, seed: number): void {
  const { p } = ctx;
  p.box(x - 0.1, wy + 0.58, z - 0.1, size + 0.2, 0.05, size + 0.2, MAT.white, { emissive: 0.4 });
  if (ctx.lod === 0) return;
  const n = ctx.lod > 1 ? 21 : 7;
  const c = size / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const finder = (i < 7 && j < 7) || (i >= n - 7 && j < 7) || (i < 7 && j >= n - 7);
      let on: boolean;
      if (finder && n === 21) {
        const fi = i < 7 ? i : i - (n - 7);
        const fj = j < 7 ? j : j - (n - 7);
        on = fi === 0 || fi === 6 || fj === 0 || fj === 6 || (fi >= 2 && fi <= 4 && fj >= 2 && fj <= 4);
      } else on = hash2(i + seed, j * 3) > 0.52;
      if (on) p.box(x + i * c, wy + 0.55, z + (n - 1 - j) * c, c, 0.02, c, MAT.ink, { emissive: 0.8 });
    }
  }
}

/* ============================================================== Upstage */

/** Solar panels on raked frames, and a lamp to stand in for the sun. */
export function solarArray(ctx: BuildCtx, x: number, y: number, count: number): void {
  const { p } = ctx;
  for (let i = 0; i < count; i++) {
    const px = x + i * 1.9;
    p.box(px, y + 0.9, FLOOR_Z, 0.08, 0.08, 1.2, MAT.metal);
    p.box(px + 1.62, y + 0.9, FLOOR_Z, 0.08, 0.08, 1.2, MAT.metal);
    p.box(px, y, FLOOR_Z, 0.08, 0.08, 0.5, MAT.metal);
    p.box(px + 1.62, y, FLOOR_Z, 0.08, 0.08, 0.5, MAT.metal);
    const cell = mix(MAT.led, MAT.ink, 0.55);
    p.quad(px, y, FLOOR_Z + 0.55, px + 1.7, y, FLOOR_Z + 0.55, px + 1.7, y + 1.0, FLOOR_Z + 1.25, px, y + 1.0, FLOOR_Z + 1.25, cell, 0, -0.6, 0.8, { noCull: true, emissive: 0.3, glow: 0.05 });
    if (ctx.lod > 1) {
      for (let k = 1; k < 4; k++) p.line(px + (1.7 * k) / 4, y, FLOOR_Z + 0.56, px + (1.7 * k) / 4, y + 1.0, FLOOR_Z + 1.26, MAT.chrome, 1, { emissive: 0.6, bias: 0.03 });
      p.line(px, y + 0.5, FLOOR_Z + 0.905, px + 1.7, y + 0.5, FLOOR_Z + 0.905, MAT.chrome, 1, { emissive: 0.6, bias: 0.03 });
    }
  }
  ctx.nav?.blockRect(x, y, count * 1.9 - 0.2, 1.0, 0.06);
}

/** A document scanner: pages going in at the top, a light bar sweeping under the glass. */
export function docScanner(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 1.1, 0.8, 0.95, MAT.white, { top: MAT.darkMetal });
  if (ctx.lod < 1) {
    ctx.nav?.blockRect(x, y, 1.1, 0.8, 0.06);
    return;
  }
  const sweep = (Math.sin(time * 1.5) + 1) / 2;
  p.box(x + 0.1 + sweep * 0.8, y + 0.1, FLOOR_Z + 0.96, 0.06, 0.6, 0.01, MAT.led, { emissive: 1, glow: 0.6 });
  for (let i = 0; i < 4; i++) p.box(x + 0.2, y + 0.15, FLOOR_Z + 1.0 + i * 0.012, 0.6, 0.45, 0.01, MAT.paper, { emissive: 0.3 });
  ctx.nav?.blockRect(x, y, 1.1, 0.8, 0.06);
}

/* ============================================================== MiniMax */

/** A studio corner: a keyboard on a stand, two monitors on poles, a mixing desk. */
export function musicStudio(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  // Keyboard, facing south.
  p.box(x, y, FLOOR_Z + 0.75, 1.8, 0.4, 0.1, MAT.black);
  for (const u of [0.2, 1.5]) p.box(x + u, y + 0.15, FLOOR_Z, 0.08, 0.08, 0.75, MAT.darkMetal);
  if (ctx.lod > 1) {
    for (let k = 0; k < 24; k++) p.box(x + 0.08 + k * 0.069, y + 0.22, FLOOR_Z + 0.85, 0.06, 0.16, 0.02, MAT.white);
    for (let k = 0; k < 24; k++) if ([1, 3, 6, 8, 10].includes(k % 12)) p.box(x + 0.12 + k * 0.069, y + 0.2, FLOOR_Z + 0.87, 0.04, 0.1, 0.02, MAT.black);
  }
  // Speakers either side, pulsing a little.
  const beat = 1 + Math.max(0, Math.sin(time * 6)) * 0.03;
  for (const u of [-0.8, 2.2]) {
    p.box(x + u - 0.04, y + 0.1, FLOOR_Z, 0.08, 0.08, 1.0, MAT.darkMetal);
    p.box(x + u - 0.24, y - 0.05, FLOOR_Z + 1.0, 0.48, 0.4, 0.66 * beat, MAT.black);
    if (ctx.lod > 1) uprightDisc(p, "y", x + u, y + 0.36, FLOOR_Z + 1.24, 0.14 * beat, 1, MAT.darkMetal, { noCull: true }, 8);
  }
  ctx.nav?.blockRect(x - 1.05, y - 0.05, 3.5, 0.5, 0.06);
}

/** A booth lined with foam, a microphone in it, and a light over the door that says it is recording. */
export function vocalBooth(ctx: BuildCtx, x: number, y: number, live: boolean): void {
  const { p } = ctx;
  const w = 2.0;
  const d = 1.8;
  const h = 2.5;
  p.box(x, y, FLOOR_Z, w, 0.12, h, MAT.darkMetal);
  p.box(x, y, FLOOR_Z, 0.12, d, h, MAT.darkMetal);
  p.box(x + w - 0.12, y, FLOOR_Z, 0.12, d, h, MAT.darkMetal);
  p.box(x, y, FLOOR_Z + h, w, d, 0.1, MAT.darkMetal);
  if (ctx.lod > 1) {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
      if ((r + c) % 2) p.box(x + 0.15 + c * 0.35, y + 0.12, FLOOR_Z + 0.3 + r * 0.35, 0.3, 0.04, 0.3, MAT.black);
    }
  }
  p.line(x + w / 2, y + 0.9, FLOOR_Z, x + w / 2, y + 0.9, FLOOR_Z + 1.45, MAT.black, 2, { emissive: 0.2 });
  p.cylinder(x + w / 2, y + 0.9, FLOOR_Z + 1.45, 0.06, 0.06, 0.16, MAT.chrome, 6);
  p.box(x + w / 2 - 0.3, y + d - 0.02, FLOOR_Z + h - 0.3, 0.6, 0.04, 0.18, live ? MAT.red : MAT.ledOff, { emissive: 1, glow: live ? 0.6 : 0 });
  ctx.nav?.blockRect(x, y, w, 0.12);
  ctx.nav?.blockRect(x, y, 0.12, d);
  ctx.nav?.blockRect(x + w - 0.12, y, 0.12, d);
}

/**
 * The river front at night, cut out in black on the north wall: a tower of
 * spheres on a needle, and the tall one that twists.
 */
export function skyline(ctx: BuildCtx, x: number, wy: number, w: number, z: number): void {
  const { p } = ctx;
  const y = wy + 0.6;
  p.box(x, y, z, w, 0.04, 2.8, mix(MAT.seal, MAT.ink, 0.5), { emissive: 0.4 });
  if (ctx.lod === 0) return;
  const tone = MAT.black;
  // Low buildings along the bottom.
  for (let i = 0; i < w / 0.3; i++) {
    const bh = 0.3 + hash2(i, 4) * 0.8;
    p.box(x + i * 0.3, y - 0.02, z, 0.26, 0.02, bh, tone);
  }
  // The tower of spheres.
  const tx = x + w * 0.3;
  p.box(tx - 0.03, y - 0.03, z, 0.06, 0.02, 2.4, tone);
  for (const [sz, r] of [[0.9, 0.22], [1.7, 0.16], [2.35, 0.07]]) {
    uprightDisc(p, "y", tx, y - 0.035, z + sz, r, -1, tone, { noCull: true }, 10);
  }
  // The twisting tower, as stacked narrowing blocks.
  const sx = x + w * 0.68;
  for (let i = 0; i < 12; i++) {
    const ww = 0.5 - i * 0.03;
    p.box(sx - ww / 2 + Math.sin(i * 0.4) * 0.03, y - 0.025, z + i * 0.21, ww, 0.02, 0.22, tone);
  }
  if (ctx.lod > 1) {
    for (let k = 0; k < 20; k++) p.dot(x + hash2(k, 9) * w, y - 0.04, z + 0.2 + hash2(9, k) * 0.9, 1.5, MAT.lamp, { emissive: 1, glow: 0.3 });
  }
}

/* =============================================================== StepFun */

/**
 * Wide wooden steps to sit on, running up the north side of the hall: the
 * one kind of stair in the building that goes nowhere on purpose. Returns
 * nothing; each tread's height is `tread * (i + 1)`.
 */
export function bleachers(ctx: BuildCtx, x: number, y: number, w: number, steps: number, tread = 0.45, depth = 0.9): void {
  const { p } = ctx;
  for (let i = 0; i < steps; i++) {
    // Step i is nearest the room at the bottom and climbs toward the wall.
    const sy = y - (i + 1) * depth;
    p.box(x, sy, FLOOR_Z, w, depth, tread * (i + 1), MAT.wood, { top: scale(MAT.wood, 1.08), sideTint: 0.86 });
    if (ctx.lod > 1) p.box(x, sy + depth - 0.02, FLOOR_Z + tread * (i + 1) - 0.04, w, 0.03, 0.04, MAT.woodDark);
  }
  if (ctx.nav) ctx.nav.costRect(x, y - steps * depth, w, steps * depth, 8);
}

/* =============================================================== Tencent */

/** An arcade cabinet, facing `face`, with something playing on it. */
export function arcade(ctx: BuildCtx, x: number, y: number, face: number, seed: number): void {
  const { p, time } = ctx;
  const tone = [MAT.seal, MAT.red, MAT.led, MAT.lamp][seed % 4];
  orient(ctx, x, y, FLOOR_Z, 0.8, 0.8, 1.9, face, MAT.black, { top: tone });
  const front = at(x, y, face, 0, 0.41);
  orient(ctx, front.x, front.y, FLOOR_Z + 0.9, 0.62, 0.02, 0.5, face, MAT.screen, { emissive: 0.9, glow: 0.5 });
  const marquee = at(x, y, face, 0, 0.41);
  orient(ctx, marquee.x, marquee.y, FLOOR_Z + 1.6, 0.7, 0.02, 0.18, face, tone, { emissive: 1, glow: 0.5 });
  const deck = at(x, y, face, 0, 0.5);
  orient(ctx, deck.x, deck.y, FLOOR_Z + 0.8, 0.7, 0.2, 0.06, face, MAT.darkMetal);
  if (ctx.lod > 1) {
    // Invaders marching across the screen.
    const { rx, ry, fx, fy } = axes(face);
    const step = Math.floor(time * 2) % 6;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const u = -0.22 + c * 0.12 + step * 0.02;
        const px = front.x + rx * u + fx * 0.01;
        const py = front.y + ry * u + fy * 0.01;
        p.dot(px, py, FLOOR_Z + 1.3 - r * 0.1, 2, [MAT.green, MAT.lamp, MAT.red][r], { emissive: 1 });
      }
    }
    p.dot(front.x + rx * Math.sin(time) * 0.2, front.y + ry * Math.sin(time) * 0.2, FLOOR_Z + 0.96, 2, MAT.paper, { emissive: 1 });
  }
  hard(ctx, x, y, 0.8, 0.8, face, 0.05);
}

/** A penguin in a red scarf, taller than the people who walk past it. */
export function penguin(ctx: BuildCtx, x: number, y: number, s = 1): void {
  const { p, time } = ctx;
  const sway = Math.sin(time * 0.8) * 0.03;
  p.cylinder(x, y, FLOOR_Z, 0.6 * s, 0.5 * s, 0.1, MAT.lamp, 10);
  p.cylinder(x + sway, y, FLOOR_Z + 0.1, 0.52 * s, 0.44 * s, 1.1 * s, MAT.black, 12, { top: MAT.black });
  p.cylinder(x + sway, y + 0.08 * s, FLOOR_Z + 0.15, 0.4 * s, 0.38 * s, 0.9 * s, MAT.white, 12);
  p.cylinder(x + sway, y, FLOOR_Z + 1.2 * s, 0.42 * s, 0.38 * s, 0.55 * s, MAT.black, 12, { top: MAT.black });
  p.cylinder(x + sway, y, FLOOR_Z + 1.12 * s, 0.46 * s, 0.42 * s, 0.14 * s, MAT.red, 12);
  if (ctx.lod > 0) {
    p.box(x + sway - 0.08 * s, y + 0.34 * s, FLOOR_Z + 1.4 * s, 0.16 * s, 0.14 * s, 0.08 * s, MAT.lamp);
    for (const u of [-0.12, 0.12]) {
      p.cylinder(x + sway + u * s, y + 0.3 * s, FLOOR_Z + 1.5 * s, 0.07 * s, 0.05 * s, 0.1 * s, MAT.white, 6);
      p.dot(x + sway + u * s, y + 0.36 * s, FLOOR_Z + 1.56 * s, 2, MAT.ink, { emissive: 1 });
    }
    p.box(x + sway + 0.3 * s, y + 0.15 * s, FLOOR_Z + 1.02 * s, 0.14 * s, 0.1 * s, 0.3 * s, MAT.red);
  }
  ctx.nav?.blockRect(x - 0.6 * s, y - 0.5 * s, 1.2 * s, 1.0 * s, 0.05);
}

/** A 3D printer with a model growing on its bed through the day. */
export function printer3d(ctx: BuildCtx, x: number, y: number, z: number): void {
  const { p, time, clock } = ctx;
  for (const [u, v] of [[0, 0], [0.7, 0], [0, 0.7], [0.7, 0.7]]) p.box(x + u, y + v, z, 0.05, 0.05, 0.9, MAT.darkMetal);
  p.box(x, y, z + 0.9, 0.75, 0.75, 0.05, MAT.darkMetal);
  p.box(x + 0.05, y + 0.05, z + 0.12, 0.65, 0.65, 0.03, MAT.metal);
  const grown = ((clock.minutes % 240) / 240) * 0.5;
  p.cylinder(x + 0.37, y + 0.37, z + 0.15, 0.15, 0.15, grown + 0.01, MAT.seal, 8, { emissive: 0.3 });
  if (ctx.lod > 1) {
    const hx = x + 0.37 + Math.sin(time * 5) * 0.13;
    const hy = y + 0.37 + Math.cos(time * 3.7) * 0.13;
    p.box(hx - 0.06, hy - 0.06, z + 0.2 + grown, 0.12, 0.12, 0.1, MAT.lamp, { emissive: 0.5 });
    p.dot(hx, hy, z + 0.18 + grown, 2, MAT.red, { emissive: 1, glow: 0.5 });
  }
}

/* ================================================================ Sakana */

/**
 * An aquarium: a long glass tank of water with a school of fish in it that
 * moves as one, plants along the bottom and bubbles going up the back.
 * Sakana is Japanese for fish, and the lab's idea is that many small things
 * moving together can be cleverer than one large one.
 */
export function aquarium(ctx: BuildCtx, x: number, y: number, w: number, d: number, h = 1.5): void {
  const { p, time } = ctx;
  const base = FLOOR_Z + 0.7;
  p.box(x - 0.05, y - 0.05, FLOOR_Z, w + 0.1, d + 0.1, 0.7, MAT.woodDark, { top: MAT.black });
  p.box(x, y, base, w, d, 0.06, MAT.stone, { top: mix(MAT.stone, MAT.paper, 0.3) });
  // Fish first, then the water and glass over them.
  if (ctx.lod > 0) {
    const n = ctx.lod > 1 ? 24 : 8;
    const cx = x + w / 2 + Math.sin(time * 0.3) * (w / 2 - 0.4);
    const cy = y + d / 2 + Math.sin(time * 0.47) * (d / 2 - 0.2);
    const cz = base + h * 0.5 + Math.sin(time * 0.21) * h * 0.25;
    const heading = Math.cos(time * 0.3) >= 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = hash2(i, 1) * Math.PI * 2 + time * 0.8;
      const r = 0.1 + hash2(1, i) * 0.4;
      const fx = Math.max(x + 0.1, Math.min(x + w - 0.1, cx + Math.cos(a) * r * 1.4));
      const fy = Math.max(y + 0.08, Math.min(y + d - 0.08, cy + Math.sin(a) * r * 0.5));
      const fz = cz + Math.sin(a * 1.3) * r * 0.5;
      const tone = i % 7 === 0 ? MAT.red : i % 3 === 0 ? MAT.lamp : MAT.chrome;
      p.line(fx - heading * 0.06, fy, fz, fx + heading * 0.06, fy, fz, tone, 2.5, { emissive: 0.8 });
    }
    if (ctx.lod > 1) {
      for (let k = 0; k < Math.round(w * 3); k++) {
        const px = x + 0.15 + hash2(k, 4) * (w - 0.3);
        const sway = Math.sin(time * 0.9 + k) * 0.06;
        p.line(px, y + d * 0.7, base + 0.06, px + sway, y + d * 0.7, base + 0.3 + hash2(4, k) * 0.5, MAT.green, 2, { emissive: 0.4 });
      }
      for (let b = 0; b < 8; b++) {
        const t = (time * 0.4 + b / 8) % 1;
        p.dot(x + 0.3 + (b % 2) * (w - 0.6), y + d * 0.8, base + 0.1 + t * (h - 0.2), 1.5, MAT.paper, { emissive: 1, alpha: 0.6 });
      }
    }
  }
  p.box(x, y, base + 0.06, w, d, h - 0.1, MAT.water, { alpha: 0.32, emissive: 0.5, glow: 0.12 });
  p.box(x - 0.03, y - 0.03, base + h - 0.04, w + 0.06, d + 0.06, 0.08, MAT.black);
  ctx.nav?.blockRect(x - 0.05, y - 0.05, w + 0.1, d + 0.1, 0.06);
}

/** A shoji screen: a light timber grid with paper between, glowing a little when lit from behind. */
export function shoji(ctx: BuildCtx, x: number, y: number, length: number, axis: "x" | "y", h = 2.1): void {
  const { p } = ctx;
  const t = 0.08;
  if (axis === "x") p.box(x, y, FLOOR_Z, length, t, h, MAT.paper, { emissive: 0.35 + ctx.lampMix * 0.2 });
  else p.box(x, y, FLOOR_Z, t, length, h, MAT.paper, { emissive: 0.35 + ctx.lampMix * 0.2 });
  if (ctx.lod > 0) {
    const cols = Math.round(length / 0.34);
    for (let i = 0; i <= cols; i++) {
      const s = (i / cols) * length;
      if (axis === "x") p.box(x + s - 0.02, y - 0.01, FLOOR_Z, 0.04, t + 0.02, h, MAT.wood);
      else p.box(x - 0.01, y + s - 0.02, FLOOR_Z, t + 0.02, 0.04, h, MAT.wood);
    }
    for (let z = FLOOR_Z + 0.35; z < FLOOR_Z + h; z += 0.36) {
      if (axis === "x") p.box(x, y - 0.01, z, length, t + 0.02, 0.03, MAT.wood);
      else p.box(x - 0.01, y, z, t + 0.02, length, 0.03, MAT.wood);
    }
  }
  if (axis === "x") ctx.nav?.blockRect(x, y - 0.04, length, t + 0.08, 0.04);
  else ctx.nav?.blockRect(x - 0.04, y, t + 0.08, length, 0.04);
}

/** A low table on a raised floor of mats, with cushions round it. */
export function chabudai(ctx: BuildCtx, x: number, y: number, r = 0.6): void {
  const { p } = ctx;
  p.cylinder(x, y, FLOOR_Z, r * 0.5, r * 0.5, 0.3, MAT.woodDark, 8);
  p.cylinder(x, y, FLOOR_Z + 0.3, r, r, 0.05, MAT.woodDark, 14, { top: MAT.wood });
  if (shows(ctx, 0.2, 2)) p.cylinder(x + 0.1, y, FLOOR_Z + 0.35, 0.06, 0.06, 0.08, MAT.green, 6);
  ctx.nav?.blockRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4, 0.04);
}
