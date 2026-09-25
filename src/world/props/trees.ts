import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { contactShadow } from "../../engine/shapes";
import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import { MAT } from "../materials";

const TAU = Math.PI * 2;

/** The three trees the street is planted with. */
export type TreeKind = "plane" | "lime" | "birch";

/** How big a tree is, and what it stands in. */
export type TreeOpts = {
  kind?: TreeKind;
  /** Multiplies every dimension. */
  size?: number;
  /** Height of the ground it grows from. */
  ground?: number;
  /** A square iron grate round the trunk, as a street tree has. */
  grate?: boolean;
  /** 0..1: how far into autumn this one has got. */
  turn?: number;
};

/**
 * A mass of leaves: an ellipsoid of quads lit by its own normals, so the top
 * catches the sky and the underside falls into the canopy's shade. Faces that
 * turn away from the camera are culled by the painter, so about half of each
 * one is ever drawn.
 */
export function puff(
  ctx: BuildCtx,
  x: number, y: number, z: number,
  rx: number, ry: number, rz: number,
  tone: RGB, top: RGB,
  bands: number, sides: number, phase = 0,
): void {
  const { p } = ctx;
  for (let i = 0; i < bands; i++) {
    const t0 = -Math.PI / 2 + (i / bands) * Math.PI;
    const t1 = -Math.PI / 2 + ((i + 1) / bands) * Math.PI;
    const c0 = Math.cos(t0);
    const s0 = Math.sin(t0);
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);
    const tm = (t0 + t1) / 2;
    // Underneath is in shade whatever the sky is doing; the crown takes the
    // accent, which is what lets a tree read as green in a grey ink.
    const tint = i === 0 ? scale(tone, 0.7) : i === bands - 1 ? top : i === 1 && bands > 3 ? scale(tone, 0.88) : tone;
    for (let j = 0; j < sides; j++) {
      const a0 = (j / sides) * TAU + phase;
      const a1 = ((j + 1) / sides) * TAU + phase;
      const am = (a0 + a1) / 2;
      // The normal of an ellipsoid is its gradient, not its radius.
      let nx = (Math.cos(tm) * Math.cos(am)) / rx;
      let ny = (Math.cos(tm) * Math.sin(am)) / ry;
      let nz = Math.sin(tm) / rz;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const ca0 = Math.cos(a0);
      const sa0 = Math.sin(a0);
      const ca1 = Math.cos(a1);
      const sa1 = Math.sin(a1);
      p.quad(
        x + rx * c0 * ca0, y + ry * c0 * sa0, z + rz * s0,
        x + rx * c0 * ca1, y + ry * c0 * sa1, z + rz * s0,
        x + rx * c1 * ca1, y + ry * c1 * sa1, z + rz * s1,
        x + rx * c1 * ca0, y + ry * c1 * sa0, z + rz * s1,
        tint, nx, ny, nz,
      );
    }
  }
}

type Mass = { dx: number; dy: number; z: number; r: number; h: number; turned: boolean; ring: number };

/** The rounded outline each kind of canopy fills: radius and height. */
const ENVELOPE: Record<TreeKind, { r: number; h: number; lift: number }> = {
  plane: { r: 1.45, h: 2.3, lift: 0.2 },
  lime: { r: 1.1, h: 3.0, lift: 0.1 },
  birch: { r: 0.8, h: 2.9, lift: 0.4 },
};

/**
 * The masses of one canopy, relative to the top of the trunk: a core, then
 * rings of smaller masses bulging out of a rounded envelope — low round the
 * skirt, more round the shoulders, one on the crown — so the outline is lumpy
 * like leaves and not a stack of discs. Seeded by the tree's position, so the
 * same tree is the same shape every frame and the street is not a row of
 * copies.
 */
function masses(kind: TreeKind, seed: number, turn: number): Mass[] {
  const env = ENVELOPE[kind];
  const rnd = (k: number) => hash2(seed, k * 7 + 3);
  const loose = kind === "birch";
  const cz = env.lift + env.h * 0.5;
  // The core and the crown never turn, so an autumn tree is never all orange.
  let turning = turn > 0.3 ? 1 + (turn > 0.7 ? 1 : 0) : 0;
  const out: Mass[] = [
    { dx: 0, dy: 0, z: cz, r: env.r * 0.72, h: env.h * 0.36, turned: false, ring: 0 },
  ];
  const rings: [number, number, number][] = loose
    ? [[-0.35, 3, 0.46], [0.25, 3, 0.42], [0.7, 2, 0.36]]
    : [[-0.2, 6, 0.5], [0.42, 5, 0.46], [0.95, 2, 0.4]];
  let k = 0;
  rings.forEach(([el, count, size], ringIndex) => {
    for (let i = 0; i < count; i++) {
      const az = (i / count) * TAU + rnd(k) * (TAU / count) * 0.6 + ringIndex * 0.7;
      const c = Math.cos(el);
      // Set a little inside the envelope, so the masses bulge through it.
      const reach = 0.7 + rnd(k + 20) * 0.12;
      const r = env.r * size * (0.88 + rnd(k + 10) * 0.24);
      const turned = turning > 0 && ringIndex < 2 && rnd(k + 40) < turn * 0.5;
      if (turned) turning--;
      out.push({
        dx: env.r * c * Math.cos(az) * reach,
        dy: env.r * c * Math.sin(az) * reach,
        z: cz + (env.h / 2) * Math.sin(el) * reach,
        r,
        h: r * (loose ? 0.8 : 0.88),
        turned,
        ring: ringIndex + 1,
      });
      k++;
    }
  });
  return out;
}

/**
 * A tree: trunk, branches, a canopy of several masses, and its shadow. It
 * used to be two stacked cylinders, which read as a lampshade on a pole.
 */
export function tree(ctx: BuildCtx, x: number, y: number, opts: TreeOpts = {}): void {
  const { p, time, lod } = ctx;
  const seed = Math.round(x * 13.7 + y * 7.1);
  const kind: TreeKind = opts.kind ?? "plane";
  const k = opts.size ?? 1;
  const ground = opts.ground ?? 0;
  const turn = opts.turn ?? 0;
  const birch = kind === "birch";
  // From across the block a tree is a few pixels, and a grey-green that size
  // stipples to nothing: far off, the canopy is drawn larger and greener,
  // easing back to its true size and tone as the camera comes in, so there
  // is no jump where the detail changes.
  const far = Math.max(0, Math.min(1, (4.2 - p.cam.s) / 2.4));
  const grow = 1 + 0.6 * far;

  const trunkH = (birch ? 2.9 : kind === "lime" ? 2.5 : 2.2) * k * (0.92 + hash2(seed, 1) * 0.16) * (1 + 0.25 * far);
  const lean = (hash2(seed, 2) - 0.5) * 0.16 * k;
  const bark = birch ? mix(MAT.white, MAT.paper, 0.3) : MAT.benchDark;

  if (opts.grate && lod > 0) grate(ctx, x, y, ground, k);

  // Trunk, thicker at the foot.
  const r0 = (birch ? 0.13 : 0.2) * k;
  const lower = trunkH * 0.55;
  p.cylinder(x, y, ground, r0, r0, lower, bark, lod > 1 ? 8 : 6, { top: bark });
  p.cylinder(x + lean * 0.5, y, ground + lower, r0 * 0.72, r0 * 0.72, trunkH - lower + 0.25 * k, bark, lod > 1 ? 7 : 5, { top: bark });
  if (birch && lod > 1) {
    // The black marks a birch is known by.
    for (let m = 0; m < 5; m++) {
      const mz = ground + 0.4 + m * 0.48 + hash2(seed, m + 50) * 0.2;
      const a = hash2(seed, m + 60) * TAU;
      p.box(x + Math.cos(a) * r0 * 0.7 - 0.06, y + Math.sin(a) * r0 * 0.7 - 0.02, mz, 0.12, 0.04, 0.05, MAT.ink);
    }
  }

  const crown = ground + trunkH;
  const list = masses(kind, seed, turn);
  // Branches reaching up into the canopy, seen through the gaps.
  if (lod > 0) {
    for (const m of list.filter((q) => q.ring === 2).slice(0, lod > 1 ? 5 : 3)) {
      p.line(x + lean, y, crown - 0.35 * k, x + lean + m.dx * k * 0.8, y + m.dy * k * 0.8, crown + m.z * k * 0.8, bark, lod > 1 ? 2.2 : 1.6);
    }
  }

  // The canopy's shadow, thrown across the ground along the light.
  if (ctx.shadowStrength > 0.01 && lod > 0) {
    const mid = crown + 0.9 * k * grow;
    contactShadow(p, x + ctx.shadowX * mid, y + ctx.shadowY * mid, ground + 0.004, 1.45 * k * grow, 1.15 * k * grow, ctx.shadowStrength * 0.42, MAT.ink);
  }

  const leaf = mix(MAT.leaf, MAT.green, 0.18 + 0.5 * far);
  const crownTop = mix(MAT.leaf, MAT.green, 0.55 + 0.35 * far);
  const autumn = mix(leaf, MAT.lamp, 0.42);
  const autumnTop = mix(MAT.lamp, leaf, 0.25);
  // Far away a tree is its outline: the core and the shoulders, few sides.
  // Close up, all of it, rounder.
  const shown = lod === 0
    ? list.filter((m) => m.ring === 0 || m.ring === 2)
    : lod === 1 ? list.filter((m, i) => m.ring !== 1 || i % 2 === 0) : list;
  const bands = lod > 1 ? 5 : lod === 1 ? 4 : 3;
  const sides = lod > 1 ? 9 : lod === 1 ? 7 : 5;
  shown.forEach((m, i) => {
    // Each mass moves a little on its own in the wind.
    const sway = Math.sin(time * 0.55 + x * 0.7 + i * 1.3) * 0.05 * k;
    const shade = 0.92 + hash2(seed, i + 70) * 0.14;
    const tone = m.turned ? autumn : scale(leaf, shade);
    const top = m.turned ? autumnTop : scale(crownTop, shade);
    const g = k * grow;
    puff(
      ctx,
      x + lean + (m.dx + sway) * g, y + m.dy * g, crown + m.z * g,
      m.r * g, m.r * g * 0.94, m.h * g,
      tone, top, bands, sides, hash2(seed, i) * 0.6,
    );
  });

  // A few leaves already down, from the trees that have started.
  if (lod > 1 && turn > 0.3) {
    const tones = [MAT.lamp, MAT.red, mix(MAT.lamp, MAT.paper, 0.3)];
    const n = Math.round(4 + turn * 10);
    for (let f = 0; f < n; f++) {
      const a = hash2(seed, f + 80) * TAU;
      const d = 0.5 + hash2(seed, f + 90) * 1.5 * k;
      p.plate(x + Math.cos(a) * d, y + Math.sin(a) * d, ground + 0.006, 0.09, 0.07, tones[f % tones.length], { bias: 0.01, emissive: 0.3 });
    }
  }
}

/** The iron grate a street tree stands in, with a ring of soil at the trunk. */
function grate(ctx: BuildCtx, x: number, y: number, ground: number, k: number): void {
  const { p, lod } = ctx;
  const h = 0.65 * k;
  p.box(x - h, y - h, ground, h * 2, h * 2, 0.025, MAT.darkMetal, { top: scale(MAT.darkMetal, 1.12) });
  p.disc(x, y, ground + 0.028, 0.34 * k, 0.34 * k, MAT.soil, { bias: 0.01 }, 10);
  if (lod < 2) return;
  // Slots radiating from the trunk, the way the cast ones are.
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * TAU;
    const c = Math.cos(a);
    const d = Math.sin(a);
    p.line(x + c * 0.4 * k, y + d * 0.4 * k, ground + 0.03, x + c * 0.58 * k, y + d * 0.58 * k, ground + 0.03, MAT.ink, 1, { bias: 0.012 });
  }
}
