import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { castShadow, contactShadow, frameXZ, obox } from "../../engine/shapes";
import { worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z } from "../metrics";

export const DESK_H = 0.82;

/** A working bench. Legs, a top, a modesty rail, and a shelf for the clutter. */
export function bench(
  ctx: BuildCtx,
  x: number, y: number,
  w: number, d: number,
  tone: RGB = MAT.bench,
): void {
  const { p } = ctx;
  const legs: [number, number][] = [
    [x + 0.08, y + 0.08],
    [x + w - 0.22, y + 0.08],
    [x + 0.08, y + d - 0.22],
    [x + w - 0.22, y + d - 0.22],
  ];
  for (const [lx, ly] of legs) p.box(lx, ly, FLOOR_Z, 0.14, 0.14, DESK_H - 0.06, MAT.darkMetal);
  p.box(x + 0.16, y + 0.1, FLOOR_Z + 0.26, w - 0.32, 0.07, 0.12, MAT.darkMetal);
  p.box(x, y, FLOOR_Z + DESK_H - 0.06, w, d, 0.09, tone, { top: scale(tone, 1.07) });
  p.box(x + 0.01, y + 0.01, FLOOR_Z + DESK_H - 0.09, w - 0.02, d - 0.02, 0.03, scale(tone, 0.7));
  castShadow(ctx.p, x, y, w, d, 0.5, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.7, MAT.ink);
  ctx.nav?.blockRect(x, y, w, d, 0.12);
}

/** A long shared table, the kind a hall gathers around. */
export function table(ctx: BuildCtx, x: number, y: number, w: number, d: number): void {
  const { p } = ctx;
  p.box(x + 0.5, y + d * 0.5 - 0.09, FLOOR_Z, 0.18, 0.18, DESK_H - 0.08, MAT.darkMetal);
  p.box(x + w - 0.68, y + d * 0.5 - 0.09, FLOOR_Z, 0.18, 0.18, DESK_H - 0.08, MAT.darkMetal);
  p.box(x + 0.4, y + 0.22, FLOOR_Z + 0.02, 0.36, d - 0.44, 0.07, MAT.darkMetal);
  p.box(x + w - 0.76, y + 0.22, FLOOR_Z + 0.02, 0.36, d - 0.44, 0.07, MAT.darkMetal);
  p.box(x + 0.6, y + d * 0.5 - 0.06, FLOOR_Z + 0.3, w - 1.2, 0.12, 0.12, MAT.darkMetal);
  p.box(x, y, FLOOR_Z + DESK_H - 0.06, w, d, 0.1, MAT.bench, { top: scale(MAT.bench, 1.08) });
  castShadow(p, x, y, w, d, 0.5, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.7, MAT.ink);
  ctx.nav?.blockRect(x, y, w, d, 0.1);
}

/** Chair, turned to face something. */
export function chair(ctx: BuildCtx, x: number, y: number, angle: number, tone: RGB = MAT.cloth): void {
  const { p } = ctx;
  const seatZ = FLOOR_Z + 0.44;
  p.cylinder(x - 0.04, y - 0.04, FLOOR_Z, 0.26, 0.26, 0.06, MAT.darkMetal, 7);
  p.box(x - 0.05, y - 0.05, FLOOR_Z + 0.05, 0.1, 0.1, 0.36, MAT.metal);
  obox(p, x, y, seatZ, 0.54, 0.5, 0.1, angle, tone, { top: scale(tone, 1.06) });
  const bx = x - Math.cos(angle) * 0.24;
  const by = y - Math.sin(angle) * 0.24;
  obox(p, bx, by, seatZ + 0.1, 0.1, 0.48, 0.52, angle, scale(tone, 0.92));
  contactShadow(p, x, y, FLOOR_Z, 0.4, 0.26, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.costRect(x - 0.3, y - 0.3, 0.6, 0.6, 2.5);
}

export function stool(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.cylinder(x, y, FLOOR_Z, 0.22, 0.22, 0.05, MAT.darkMetal, 7);
  p.box(x - 0.045, y - 0.045, FLOOR_Z + 0.05, 0.09, 0.09, 0.5, MAT.metal);
  p.cylinder(x, y, FLOOR_Z + 0.55, 0.27, 0.27, 0.09, MAT.cloth, 9);
  contactShadow(p, x, y, FLOOR_Z, 0.3, 0.2, ctx.shadowStrength * 0.5, MAT.ink);
}

/** Open shelving against a wall, with a scatter of boxes and books. */
export function shelf(ctx: BuildCtx, x: number, y: number, w: number, levels = 4, seed = 1): void {
  const { p } = ctx;
  const h = 0.62;
  p.box(x, y, FLOOR_Z, 0.09, 0.42, h * levels + 0.1, MAT.darkMetal);
  p.box(x + w - 0.09, y, FLOOR_Z, 0.09, 0.42, h * levels + 0.1, MAT.darkMetal);
  for (let i = 0; i <= levels; i++) {
    p.box(x, y, FLOOR_Z + i * h, w, 0.42, 0.05, MAT.benchDark, { top: MAT.bench });
  }
  for (let i = 0; i < levels; i++) {
    let cx = x + 0.16;
    let guard = 0;
    while (cx < x + w - 0.3 && guard++ < 24) {
      const n = hash2(seed + i * 13, Math.round(cx * 10));
      if (n < 0.24) {
        cx += 0.18;
        continue;
      }
      const bw = 0.08 + n * 0.16;
      const bh = 0.3 + n * 0.2;
      const tone = n > 0.66 ? MAT.paper : n > 0.4 ? mix(MAT.bench, MAT.paper, 0.4) : MAT.cloth;
      p.box(cx, y + 0.08, FLOOR_Z + i * h + 0.05, bw, 0.26, bh, tone);
      cx += bw + 0.03;
    }
  }
  ctx.nav?.blockRect(x, y, w, 0.42, 0.1);
}

/** A board on a wall, with a handful of marks that mean nothing in particular. */
export function whiteboard(
  ctx: BuildCtx,
  x: number, y: number, z: number,
  w: number, h: number,
  seed: number,
  caption?: string,
): void {
  const { p } = ctx;
  frameXZ(p, x, y, z, w, h, 0.07, 0.09, MAT.metal);
  p.box(x + 0.07, y + 0.02, z + 0.07, w - 0.14, 0.04, h - 0.14, MAT.paper, { emissive: 0.3 });
  const ink = MAT.ink;
  for (let i = 0; i < 9; i++) {
    const n = hash2(seed, i);
    const m = hash2(i, seed + 7);
    const lx = x + 0.2 + n * (w - 0.6);
    const lz = z + 0.22 + m * (h - 0.6);
    const len = 0.14 + n * (w * 0.32);
    if (m > 0.62) {
      p.line(lx, y - 0.01, lz, lx + len, y - 0.01, lz, ink, 1.4, { emissive: 0.8, bias: 0.05 });
    } else if (m > 0.3) {
      p.line(lx, y - 0.01, lz, lx + len * 0.6, y - 0.01, lz + 0.22, MAT.lamp, 1.4, { emissive: 0.9, bias: 0.05 });
      p.line(lx + len * 0.6, y - 0.01, lz + 0.22, lx + len, y - 0.01, lz - 0.05, MAT.lamp, 1.4, { emissive: 0.9, bias: 0.05 });
    } else {
      p.box(lx, y - 0.02, lz, 0.2 + n * 0.3, 0.02, 0.02 + m * 0.16, MAT.led, { emissive: 0.75 });
    }
  }
  if (caption && ctx.quality > 0) {
    worldText(p, caption, x + w / 2, y - 0.03, z + h - 0.18, 1, 0, 0, 0, 0, 1, 0.042, MAT.ink, {
      align: "center", emissive: 0.85, bias: 0.06,
    });
  }
}

/** Pinboard: paper, corners, one thing hanging off. */
export function pinboard(ctx: BuildCtx, x: number, y: number, z: number, w: number, h: number, seed: number): void {
  const { p } = ctx;
  frameXZ(p, x, y, z, w, h, 0.06, 0.08, MAT.benchDark);
  p.box(x + 0.06, y + 0.02, z + 0.06, w - 0.12, 0.03, h - 0.12, scale(MAT.bench, 0.9));
  for (let i = 0; i < 7; i++) {
    const n = hash2(seed + 31, i);
    const m = hash2(i * 5, seed);
    const pw = 0.22 + n * 0.2;
    const ph = 0.26 + m * 0.22;
    p.box(
      x + 0.12 + n * (w - pw - 0.24), y - 0.01,
      z + 0.12 + m * (h - ph - 0.24), pw, 0.02, ph,
      m > 0.5 ? MAT.paper : mix(MAT.paper, MAT.led, 0.25),
      { emissive: 0.35 },
    );
  }
}

/** Tall glass display frame, used where a hall shows its output. */
export function glassFrame(ctx: BuildCtx, x: number, y: number, angle: number, w: number, h: number): void {
  const { p, time } = ctx;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  obox(p, x, y, FLOOR_Z, w + 0.2, 0.22, 0.12, angle, MAT.darkMetal);
  obox(p, x - ca * (w / 2), y - sa * (w / 2), FLOOR_Z, 0.14, 0.2, h, angle, MAT.metal);
  obox(p, x + ca * (w / 2), y + sa * (w / 2), FLOOR_Z, 0.14, 0.2, h, angle, MAT.metal);
  obox(p, x, y, FLOOR_Z + h, w + 0.2, 0.2, 0.12, angle, MAT.metal);
  const shimmer = 0.5 + 0.5 * Math.sin(time * 0.9);
  obox(p, x, y, FLOOR_Z + 0.24, w - 0.1, 0.06, h - 0.4, angle, MAT.glass, {
    emissive: 0.55 + shimmer * 0.3,
    glow: 0.35 + shimmer * 0.25,
    alpha: 0.86,
  });
  contactShadow(p, x, y, FLOOR_Z, w * 0.6, 0.35, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.blockRect(x - w / 2, y - 0.3, w, 0.6, 0.15);
}

/** A hanging banner, the one place a hall gets to state its colour. */
export function banner(
  ctx: BuildCtx,
  x: number, y: number, z: number,
  w: number, h: number,
  tone: RGB,
  text: string,
): void {
  const { p, time } = ctx;
  p.box(x - 0.06, y - 0.05, z + h, w + 0.12, 0.12, 0.1, MAT.darkMetal);
  const sway = Math.sin(time * 0.5 + x * 0.3) * 0.012;
  p.quad(
    x, y, z + h,
    x + w, y, z + h,
    x + w, y + sway, z,
    x, y - sway, z,
    tone, 0, -1, 0, { noCull: true },
  );
  p.quad(
    x, y + 0.02, z + h,
    x + w, y + 0.02, z + h,
    x + w, y + 0.02 + sway, z,
    x, y + 0.02 - sway, z,
    scale(tone, 0.72), 0, 1, 0, { noCull: true },
  );
  worldText(p, text, x + w / 2, y - 0.03, z + h - 0.3, 1, 0, 0, 0, 0, 1, h * 0.052, MAT.paper, {
    align: "center", emissive: 0.7, bias: 0.05,
  });
}
