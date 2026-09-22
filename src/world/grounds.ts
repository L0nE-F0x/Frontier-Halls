import { mix, scale } from "../engine/color";
import { screenX, screenY } from "../engine/project";
import { hash2 } from "../engine/rng";
import { contactShadow } from "../engine/shapes";
import type { Lamp } from "../engine/types";
import type { BuildCtx } from "./ctx";
import { MAT } from "./materials";
import { FLOOR_Z } from "./metrics";

/**
 * The grounds stop a little past the curb. The overview frames this box, so a
 * tree canopy has to fit inside it or the camera crops the sidewalk.
 */
export const SETBACK = 0.2;
export const VERGE = 0.85;
export const WALK = 4.4;
/** Canopies stick out past the curb. The overview frames this whole reach. */
export const GROUNDS_REACH = SETBACK + VERGE + WALK + 1.35;

// Dark enough to land on a lower step of the grey ramp than the page. A tone
// near the paper quantises to the same ink and the path disappears.
const WALK_TONE = { r: 132, g: 128, b: 122 };
const VERGE_TONE = { r: 108, g: 96, b: 82 };

type Side = "n" | "s" | "e" | "w";

export type Post = {
  x: number;
  y: number;
  kind: "tree" | "lamp";
  side: Side;
  /** Arm direction for a lamp, axis-aligned, pointing in over the walk. */
  ax: number;
  ay: number;
};

/**
 * Trees and lamps along the outer half of the sidewalk, plus a lamp at each
 * corner. Spacing is wide on purpose: the ring should read as a street, not a
 * hedge.
 */
export function exteriorPosts(blockW: number, blockD: number): Post[] {
  const posts: Post[] = [];
  const out = SETBACK + VERGE + WALK * 0.62;
  const end = 6.5;
  const gap = 14;
  sidePosts(posts, end, blockW - end, gap, (t, i) => ({
    x: t, y: -out, kind: i % 2 === 0 ? "tree" : "lamp", side: "n", ax: 0, ay: 1,
  }));
  sidePosts(posts, end, blockW - end, gap, (t, i) => ({
    x: t, y: blockD + out, kind: i % 2 === 0 ? "tree" : "lamp", side: "s", ax: 0, ay: -1,
  }));
  sidePosts(posts, end, blockD - end, gap, (t, i) => ({
    x: -out, y: t, kind: i % 2 === 0 ? "tree" : "lamp", side: "w", ax: 1, ay: 0,
  }));
  sidePosts(posts, end, blockD - end, gap, (t, i) => ({
    x: blockW + out, y: t, kind: i % 2 === 0 ? "tree" : "lamp", side: "e", ax: -1, ay: 0,
  }));

  const c = SETBACK + VERGE + WALK - 0.8;
  posts.push({ x: -c, y: -c, kind: "lamp", side: "n", ax: 1, ay: 0 });
  posts.push({ x: blockW + c, y: -c, kind: "lamp", side: "n", ax: -1, ay: 0 });
  posts.push({ x: -c, y: blockD + c, kind: "lamp", side: "s", ax: 1, ay: 0 });
  posts.push({ x: blockW + c, y: blockD + c, kind: "lamp", side: "s", ax: -1, ay: 0 });
  return posts;
}

function sidePosts(posts: Post[], from: number, to: number, gap: number, place: (t: number, i: number) => Post): void {
  const span = to - from;
  if (span < gap * 0.6) return;
  const n = Math.max(1, Math.round(span / gap));
  const step = span / n;
  for (let i = 0; i < n; i++) posts.push(place(from + step * (i + 0.5), i));
}

export function exteriorLamps(blockW: number, blockD: number, lampMix: number): Lamp[] {
  const arm = 0.95;
  return exteriorPosts(blockW, blockD).flatMap((post) => {
    if (post.kind !== "lamp") return [];
    const len = Math.hypot(post.ax, post.ay) || 1;
    return [{
      x: post.x + (post.ax / len) * arm,
      y: post.y + (post.ay / len) * arm,
      z: 3.9,
      color: MAT.lamp,
      power: 0.32 + lampMix * 1.05,
      radius: 7.2,
    }];
  });
}

/** Sidewalk, verge, trees and street lamps. Skipped while navigation is measured. */
export function buildGrounds(ctx: BuildCtx, blockW: number, blockD: number): void {
  if (ctx.nav) return;
  const { p } = ctx;
  const wash = p.wash;
  p.wash = 0;

  const outer = SETBACK + VERGE + WALK;
  const inner = SETBACK + VERGE;
  const sides: { side: Side; x: number; y: number; w: number; d: number; verge: [number, number, number, number] }[] = [
    {
      side: "n",
      x: -outer, y: -outer, w: blockW + outer * 2, d: WALK,
      verge: [-inner, -inner, blockW + inner * 2, VERGE],
    },
    {
      side: "s",
      x: -outer, y: blockD + inner, w: blockW + outer * 2, d: WALK,
      verge: [-inner, blockD + SETBACK, blockW + inner * 2, VERGE],
    },
    {
      side: "w",
      x: -outer, y: -inner, w: WALK, d: blockD + inner * 2,
      verge: [-inner, -SETBACK, VERGE, blockD + SETBACK * 2],
    },
    {
      side: "e",
      x: blockW + inner, y: -inner, w: WALK, d: blockD + inner * 2,
      verge: [blockW + SETBACK, -SETBACK, VERGE, blockD + SETBACK * 2],
    },
  ];

  const shown = new Set<Side>();
  for (const side of sides) {
    if (!rectOnScreen(ctx, side.x - 1.2, side.y - 1.2, side.w + 2.4, side.d + 2.4)) continue;
    shown.add(side.side);
    p.light.setRegion(side.x - 6, side.x + side.w + 6);
    const [vx, vy, vw, vd] = side.verge;
    pave(ctx, vx, vy, vw, vd, VERGE_TONE, 0.045);
    pave(ctx, side.x, side.y, side.w, side.d, WALK_TONE, 0.08);
    curb(ctx, side);
  }

  for (const post of exteriorPosts(blockW, blockD)) {
    if (!shown.has(post.side)) continue;
    if (post.kind === "tree") tree(ctx, post.x, post.y);
    else streetLamp(ctx, post.x, post.y, post.ax, post.ay);
  }

  p.light.clearRegion();
  p.wash = wash;
}

function curb(ctx: BuildCtx, side: { side: Side; x: number; y: number; w: number; d: number }): void {
  const { p } = ctx;
  const t = 0.22;
  const h = 0.16;
  if (side.side === "n") p.box(side.x, side.y, 0.04, side.w, t, h, MAT.wallTrim, { top: MAT.metal });
  else if (side.side === "s") p.box(side.x, side.y + side.d - t, 0.04, side.w, t, h, MAT.wallTrim, { top: MAT.metal });
  else if (side.side === "w") p.box(side.x, side.y, 0.04, t, side.d, h, MAT.wallTrim, { top: MAT.metal });
  else p.box(side.x + side.w - t, side.y, 0.04, t, side.d, h, MAT.wallTrim, { top: MAT.metal });
}

/**
 * Pavers rather than one slab. A single quad this long stipples as a poster;
 * the court taught the same lesson.
 */
function pave(ctx: BuildCtx, x: number, y: number, w: number, d: number, color: { r: number; g: number; b: number }, z: number): void {
  const { p } = ctx;
  if (w <= 0.05 || d <= 0.05) return;
  if (ctx.quality === 0 || p.cam.s < 5.5) {
    p.plate(x, y, z, w, d, color);
    return;
  }
  const step = 1.75;
  for (let j = 0; j < d; j += step) {
    for (let i = 0; i < w; i += step) {
      const pw = Math.min(step, w - i) - 0.07;
      const pd = Math.min(step, d - j) - 0.07;
      if (pw < 0.2 || pd < 0.2) continue;
      const n = hash2(Math.round(x + i), Math.round(y + j));
      const tone = n > 0.82 ? scale(color, 0.9) : n < 0.14 ? scale(color, 1.06) : color;
      p.plate(x + i, y + j, z, pw, pd, tone);
    }
  }
}

function tree(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const n = hash2(x, y);
  const trunk = 2.15 + n * 0.55;
  const sway = Math.sin(time * 0.55 + x * 0.7) * 0.06;
  p.cylinder(x, y, FLOOR_Z, 0.28, 0.28, trunk, MAT.benchDark, 7, { top: MAT.soil });
  const crown = FLOOR_Z + trunk - 0.15;
  // MAT.leaf is a pale grey-green on purpose. A real dark green has no ink in
  // these palettes and collapses into a black blob. The crown is wide because
  // the whole block is on screen at once and a small canopy becomes one pixel.
  p.cylinder(x + sway, y, crown, 1.55, 1.15, 1.7, MAT.leaf, 8, { top: scale(MAT.leaf, 1.08) });
  if (ctx.quality > 0) {
    p.cylinder(x + sway + 0.2, y - 0.1, crown + 0.85, 0.95, 0.7, 0.9, scale(MAT.leaf, 0.88), 7);
  }
  if (ctx.quality > 0) contactShadow(p, x, y, FLOOR_Z, 0.7, 0.45, ctx.shadowStrength * 0.45, MAT.ink);
}

function streetLamp(ctx: BuildCtx, x: number, y: number, ax: number, ay: number): void {
  const { p } = ctx;
  const pole = 4.1;
  const arm = 0.95;
  const len = Math.hypot(ax, ay) || 1;
  const nx = ax / len;
  const ny = ay / len;
  const hx = x + nx * arm;
  const hy = y + ny * arm;
  const hz = FLOOR_Z + pole;

  p.cylinder(x, y, FLOOR_Z, 0.42, 0.42, 0.16, MAT.darkMetal, 8);
  p.box(x - 0.1, y - 0.1, FLOOR_Z + 0.12, 0.2, 0.2, pole, MAT.wallTrim);
  if (Math.abs(nx) >= Math.abs(ny)) {
    const left = Math.min(x, hx);
    p.box(left, y - 0.04, hz - 0.04, Math.abs(hx - x), 0.08, 0.08, MAT.darkMetal);
  } else {
    const front = Math.min(y, hy);
    p.box(x - 0.04, front, hz - 0.04, 0.08, Math.abs(hy - y), 0.08, MAT.darkMetal);
  }
  p.box(hx - 0.38, hy - 0.38, hz - 0.42, 0.76, 0.76, 0.28, MAT.darkMetal);
  const on = ctx.lampMix;
  // The head is the lamp accent itself, fully lit, so it stays amber after the
  // frame is reduced to the palette instead of stippling back to grey.
  p.box(hx - 0.22, hy - 0.22, hz - 0.5, 0.44, 0.44, 0.16, MAT.lamp, {
    emissive: 1,
    glow: 0.35 + on * 0.9,
  });
  if (on > 0.08) {
    const pool = mix(MAT.lamp, MAT.paper, 0.35);
    p.disc(hx, hy, FLOOR_Z, 2.8, 2.8, pool, {
      alpha: 0.06 + on * 0.12,
      emissive: 1,
      bias: 0.02,
      glow: on * 0.1,
    }, 12);
  }
}

function rectOnScreen(ctx: BuildCtx, x: number, y: number, w: number, d: number): boolean {
  const cam = ctx.p.cam;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cx of [x, x + w]) {
    for (const cy of [y, y + d]) {
      for (const cz of [0, 4.2]) {
        const sx = screenX(cam, cx, cy);
        const sy = screenY(cam, cx, cy, cz);
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
    }
  }
  return maxX >= -12 && minX <= cam.w + 12 && maxY >= -12 && minY <= cam.h + 12;
}
