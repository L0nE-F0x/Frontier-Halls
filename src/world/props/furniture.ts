import { mix, scale } from "../../engine/color";
import type { BoxOpts } from "../../engine/painter";
import { hash2 } from "../../engine/rng";
import { castShadow, contactShadow, frameXZ, obox } from "../../engine/shapes";
import { worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import { shows, type BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z } from "../metrics";

export const DESK_H = 0.82;
/** Top of an office chair's cushion, above the floor. A seated hip rests here. */
export const CHAIR_SEAT = 0.54;
export const SOFA_SEAT = 0.42;
export const BENCH_SEAT = 0.46;
export const STOOL_SEAT = 0.74;

/* ------------------------------------------------------------ orientation */

/**
 * The frame of something that faces `face`: forward is the way a person using
 * it looks, right is their right hand. Everything placed "in front of the
 * seat" or "at the far edge of the desk" is said in these two numbers, so one
 * desk can be turned to any side of a room.
 */
export function axes(face: number): { fx: number; fy: number; rx: number; ry: number } {
  const fx = Math.cos(face);
  const fy = Math.sin(face);
  return { fx, fy, rx: -fy, ry: fx };
}

/** A point `u` to the right and `v` forward of (x, y), facing `face`. */
export function at(x: number, y: number, face: number, u: number, v: number): { x: number; y: number } {
  const { fx, fy, rx, ry } = axes(face);
  return { x: x + rx * u + fx * v, y: y + ry * u + fy * v };
}

function cardinal(face: number): boolean {
  const q = ((face / (Math.PI / 2)) % 4 + 4) % 4;
  return Math.abs(q - Math.round(q)) < 0.001;
}

/**
 * A box centred at (cx, cy), `along` wide across the facing and `across` deep
 * along it. Turned to a side of the room it is drawn as a plain box, which is
 * three faces instead of five; only an odd angle pays for the turned one.
 */
export function orient(
  ctx: BuildCtx,
  cx: number, cy: number, z: number,
  along: number, across: number, h: number,
  face: number, color: RGB, opts?: BoxOpts,
): void {
  if (cardinal(face)) {
    const ew = Math.abs(Math.cos(face)) < 0.5;
    const w = ew ? along : across;
    const d = ew ? across : along;
    ctx.p.box(cx - w / 2, cy - d / 2, z, w, d, h, color, opts);
  } else {
    obox(ctx.p, cx, cy, z, across, along, h, face, color, opts);
  }
}

/** The axis-aligned rectangle a turned box covers, for the nav grid. */
export function footprint(cx: number, cy: number, along: number, across: number, face: number): [number, number, number, number] {
  const c = Math.abs(Math.cos(face));
  const s = Math.abs(Math.sin(face));
  const w = along * s + across * c;
  const d = along * c + across * s;
  return [cx - w / 2, cy - d / 2, w, d];
}

function solid(ctx: BuildCtx, cx: number, cy: number, along: number, across: number, face: number, pad = 0.1): void {
  if (!ctx.nav) return;
  const [x, y, w, d] = footprint(cx, cy, along, across, face);
  ctx.nav.blockRect(x, y, w, d, pad);
}

/* ---------------------------------------------------------------- benches */

/** A working bench. Legs, a top, a modesty rail, and a shelf for the clutter. */
export function bench(
  ctx: BuildCtx,
  x: number, y: number,
  w: number, d: number,
  tone: RGB = MAT.bench,
): void {
  const { p } = ctx;
  if (ctx.lod > 0) {
    const legs: [number, number][] = [
      [x + 0.08, y + 0.08],
      [x + w - 0.22, y + 0.08],
      [x + 0.08, y + d - 0.22],
      [x + w - 0.22, y + d - 0.22],
    ];
    for (const [lx, ly] of legs) p.box(lx, ly, FLOOR_Z, 0.14, 0.14, DESK_H - 0.06, MAT.darkMetal);
    if (ctx.lod > 1) p.box(x + 0.16, y + 0.1, FLOOR_Z + 0.26, w - 0.32, 0.07, 0.12, MAT.darkMetal);
    p.box(x, y, FLOOR_Z + DESK_H - 0.06, w, d, 0.09, tone, { top: scale(tone, 1.07) });
    castShadow(ctx.p, x, y, w, d, 0.5, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.7, MAT.ink);
  } else {
    p.box(x, y, FLOOR_Z, w, d, DESK_H + 0.03, tone, { top: scale(tone, 1.07), sideTint: 0.7 });
  }
  ctx.nav?.blockRect(x, y, w, d, 0.12);
}

/* ------------------------------------------------------------------ desks */

export type DeskStyle = "work" | "standing" | "carrel" | "laptop" | "drafting" | "school" | "booth" | "lab";

export type DeskOpts = {
  style?: DeskStyle;
  screens?: number;
  tone?: RGB;
  /** Chair colour, or false for none. */
  chair?: RGB | false;
  seed?: number;
  mug?: RGB | false;
  lamp?: boolean;
  clutter?: boolean;
  /** Two letters on a booth's pair of screens, left then right. */
  labels?: [string, string];
};

/** Depth of each style's top, and how far the seat sits from its near edge. */
const DESK_DIMS: Record<DeskStyle, { w: number; d: number; gap: number; h: number }> = {
  work: { w: 2.0, d: 0.92, gap: 0.46, h: DESK_H },
  standing: { w: 1.7, d: 0.8, gap: 0.3, h: 1.08 },
  carrel: { w: 1.5, d: 0.8, gap: 0.46, h: DESK_H },
  laptop: { w: 1.1, d: 0.72, gap: 0.42, h: 0.74 },
  drafting: { w: 1.6, d: 1.0, gap: 0.42, h: 0.9 },
  school: { w: 1.0, d: 0.62, gap: 0.36, h: 0.72 },
  booth: { w: 1.8, d: 0.8, gap: 0.46, h: DESK_H },
  lab: { w: 2.2, d: 0.9, gap: 0.3, h: 0.92 },
};

/** Where a style's seat is relative to its top: returned so stations can say so. */
export function deskDims(style: DeskStyle = "work") {
  return DESK_DIMS[style];
}

/**
 * A desk, placed by where the person using it sits. The seat is the station,
 * and the desk is built in front of it, so the two cannot drift apart: the
 * figure that comes to work here sits exactly on the chair drawn for it.
 */
export function desk(ctx: BuildCtx, sx: number, sy: number, face: number, opts: DeskOpts = {}): void {
  const { p } = ctx;
  const style = opts.style ?? "work";
  const dims = DESK_DIMS[style];
  const tone = opts.tone ?? MAT.bench;
  const seed = opts.seed ?? Math.round(sx * 7 + sy * 13);
  const centre = at(sx, sy, face, 0, dims.gap + dims.d / 2);
  const topZ = FLOOR_Z + dims.h;

  // Top and legs. At a distance, one block.
  if (ctx.lod === 0) {
    orient(ctx, centre.x, centre.y, FLOOR_Z, dims.w, dims.d, dims.h, face, tone, { top: scale(tone, 1.07), sideTint: 0.72 });
  } else {
    orient(ctx, centre.x, centre.y, topZ - 0.07, dims.w, dims.d, 0.07, face, tone, { top: scale(tone, 1.08) });
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const leg = at(centre.x, centre.y, face, u * (dims.w / 2 - 0.1), v * (dims.d / 2 - 0.1));
      p.box(leg.x - 0.05, leg.y - 0.05, FLOOR_Z, 0.1, 0.1, dims.h - 0.07, MAT.darkMetal);
    }
    if (style !== "laptop" && style !== "school") {
      // Modesty panel along the far edge.
      const back = at(centre.x, centre.y, face, 0, dims.d / 2 - 0.05);
      orient(ctx, back.x, back.y, FLOOR_Z + 0.3, dims.w - 0.2, 0.04, dims.h - 0.4, face, scale(tone, 0.78));
    }
    castShadow(p, centre.x - dims.w / 2, centre.y - dims.d / 2, dims.w, dims.d, 0.45, FLOOR_Z,
      ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.6, MAT.ink);
  }

  if (style === "carrel" || style === "booth") {
    // Side panels, and for a carrel a shelf across the back.
    const ph = style === "booth" ? 1.55 : 1.3;
    for (const u of [-1, 1]) {
      const side = at(centre.x, centre.y, face, u * (dims.w / 2 + 0.03), -0.25);
      orient(ctx, side.x, side.y, FLOOR_Z, 0.06, dims.d + 0.6, ph, face, scale(tone, 0.86), { top: MAT.wallTrim });
    }
    if (style === "carrel" && ctx.lod > 0) {
      const shelfAt = at(centre.x, centre.y, face, 0, dims.d / 2 - 0.12);
      orient(ctx, shelfAt.x, shelfAt.y, topZ + 0.42, dims.w, 0.24, 0.05, face, scale(tone, 0.9));
      if (ctx.lod > 1) {
        for (let i = 0; i < 5; i++) {
          const b = at(shelfAt.x, shelfAt.y, face, -dims.w / 2 + 0.2 + i * 0.16, 0);
          orient(ctx, b.x, b.y, topZ + 0.47, 0.1, 0.18, 0.2 + hash2(seed, i) * 0.1, face,
            hash2(i, seed) > 0.5 ? MAT.paper : MAT.cloth);
        }
      }
    }
  }

  if (ctx.lod > 0) {
    const screens = opts.screens ?? (style === "work" || style === "standing" || style === "lab" ? 1 : 0);
    const monitorAt = at(centre.x, centre.y, face, 0, dims.d / 2 - 0.2);
    if (style === "booth") {
      const labels = opts.labels ?? ["A", "B"];
      for (let i = 0; i < 2; i++) {
        const m = at(monitorAt.x, monitorAt.y, face, (i - 0.5) * 0.82, 0);
        screen(ctx, m.x, m.y, topZ, face, seed + i * 5, 0.78, labels[i]);
      }
    } else if (style === "laptop") {
      laptop(ctx, centre.x, centre.y, topZ, face, seed);
    } else if (style === "drafting") {
      const sheetAt = at(centre.x, centre.y, face, 0, 0.05);
      orient(ctx, sheetAt.x, sheetAt.y, topZ + 0.01, dims.w * 0.8, dims.d * 0.72, 0.012, face, MAT.paper, { emissive: 0.25 });
    } else {
      for (let i = 0; i < screens; i++) {
        const off = (i - (screens - 1) / 2) * 0.86;
        const m = at(monitorAt.x, monitorAt.y, face, off, 0);
        screen(ctx, m.x, m.y, topZ, face, seed + i * 3, 1);
      }
    }
    if (ctx.lod > 1) {
      if (style !== "laptop" && style !== "drafting" && style !== "school") {
        const key = at(centre.x, centre.y, face, 0, -dims.d / 2 + 0.26);
        orient(ctx, key.x, key.y, topZ, 0.52, 0.18, 0.03, face, MAT.darkMetal, { top: scale(MAT.darkMetal, 1.3) });
      }
      if (opts.mug !== false && style !== "school") {
        const m = at(centre.x, centre.y, face, -dims.w / 2 + 0.24, -dims.d / 2 + 0.28);
        mugAt(ctx, m.x, m.y, topZ, opts.mug ?? MAT.terracotta);
      }
      if (opts.clutter !== false && style !== "laptop") {
        const pa = at(centre.x, centre.y, face, dims.w / 2 - 0.34, -0.05);
        paperStack(ctx, pa.x, pa.y, topZ, face, 2, seed);
      }
      if (opts.lamp || style === "carrel") {
        const l = at(centre.x, centre.y, face, dims.w / 2 - 0.2, dims.d / 2 - 0.2);
        deskLamp(ctx, l.x, l.y, topZ, face + Math.PI * 0.8, ctx.lampMix);
      }
    }
  }

  const chairTone = opts.chair;
  if (chairTone !== false && style !== "standing" && style !== "lab") {
    if (style === "school") stool(ctx, sx, sy, chairTone ?? MAT.cloth, CHAIR_SEAT - 0.08);
    else chair(ctx, sx, sy, face, chairTone ?? MAT.cloth);
  }
  solid(ctx, centre.x, centre.y, dims.w, dims.d, face, 0.08);
}

/** A monitor standing on a desk, facing the person at it. */
export function screen(
  ctx: BuildCtx,
  x: number, y: number, z: number,
  face: number, seed: number, size = 1, label?: string,
): void {
  const { p, time } = ctx;
  const w = 0.8 * size;
  const h = 0.5 * size;
  if (ctx.lod > 1) {
    p.cylinder(x, y, z, 0.13 * size, 0.1 * size, 0.035, MAT.darkMetal, 6);
    orient(ctx, x, y, z + 0.03, 0.06, 0.08, 0.2 * size, face, MAT.darkMetal);
  }
  orient(ctx, x, y, z + 0.2 * size, w, 0.06, h, face, MAT.darkMetal);
  // The face is toward the user, which is backward from the monitor's point
  // of view: the screen sits on the near side of the case.
  const s = at(x, y, face, 0, -0.035);
  const flicker = 0.86 + Math.sin(time * 2.3 + seed) * 0.07;
  orient(ctx, s.x, s.y, z + 0.2 * size + 0.03, w - 0.08, 0.02, h - 0.06, face, mix(MAT.screen, MAT.paper, 0.1), {
    emissive: 0.72 * flicker,
    glow: 0.55 * flicker,
  });
  if (ctx.lod < 2) return;
  if (label) {
    // Lettered for the person at the desk, so it runs along their right hand.
    const { rx, ry, fx, fy } = axes(face);
    worldText(ctx.p, label, s.x - fx * 0.02, s.y - fy * 0.02, z + 0.2 * size + h * 0.5 + 0.12,
      rx, ry, 0, 0, 0, 1, 0.035 * size, MAT.ink, { align: "center", emissive: 1, bias: 0.06 });
    return;
  }
  // Rows of output, scrolling slowly.
  const rows = 5;
  const scroll = (time * 0.22 + seed * 0.37) % 1;
  for (let i = 0; i < rows; i++) {
    const t = (i / rows + scroll) % 1;
    const rz = z + 0.2 * size + 0.06 + t * (h - 0.16);
    const n = hash2(seed + i, Math.floor(time * 0.22 + i));
    const len = (0.2 + n * 0.6) * (w - 0.16);
    const r = at(s.x, s.y, face, -(w - 0.16) / 2 + len / 2 + 0.02, -0.012);
    orient(ctx, r.x, r.y, rz, len, 0.012, 0.026 * size, face, n > 0.72 ? MAT.lamp : MAT.ink, {
      emissive: 0.9, glow: n > 0.72 ? 0.3 : 0,
    });
  }
}

export function laptop(ctx: BuildCtx, x: number, y: number, z: number, face: number, seed = 1): void {
  const base = at(x, y, face, 0, -0.05);
  orient(ctx, base.x, base.y, z, 0.42, 0.3, 0.025, face, MAT.chrome, { top: scale(MAT.chrome, 0.92) });
  const lid = at(x, y, face, 0, 0.11);
  orient(ctx, lid.x, lid.y, z + 0.02, 0.42, 0.025, 0.28, face, MAT.chrome);
  const glass = at(x, y, face, 0, 0.095);
  orient(ctx, glass.x, glass.y, z + 0.04, 0.36, 0.012, 0.22, face, MAT.screen, {
    emissive: 0.7, glow: 0.35 + 0.1 * Math.sin(ctx.time + seed),
  });
}

export function mugAt(ctx: BuildCtx, x: number, y: number, z: number, tone: RGB = MAT.terracotta): void {
  if (!shows(ctx, 0.15, 1.5)) return;
  ctx.p.cylinder(x, y, z, 0.07, 0.07, 0.12, tone, 7, { top: scale(tone, 0.55) });
}

export function paperStack(ctx: BuildCtx, x: number, y: number, z: number, face: number, count = 2, seed = 3): void {
  if (!shows(ctx, 0.4, 1.5)) return;
  for (let i = 0; i < count; i++) {
    const n = hash2(seed + i, i * 7);
    const pt = at(x, y, face, n * 0.1 - 0.05, hash2(i, seed) * 0.08 - 0.04);
    orient(ctx, pt.x, pt.y, z + i * 0.012, 0.36, 0.26, 0.012, face + (n - 0.5) * 0.3, MAT.paper, { emissive: 0.25 });
  }
}

/** Articulated task lamp standing on a desk. */
export function deskLamp(ctx: BuildCtx, x: number, y: number, z: number, angle: number, on: number): void {
  const { p } = ctx;
  p.cylinder(x, y, z, 0.1, 0.1, 0.03, MAT.darkMetal, 6);
  const ex = x + Math.cos(angle) * 0.12;
  const ey = y + Math.sin(angle) * 0.12;
  p.line(x, y, z + 0.03, ex, ey, z + 0.42, MAT.metal, 2, { emissive: 0.4 });
  const hx = ex + Math.cos(angle) * 0.2;
  const hy = ey + Math.sin(angle) * 0.2;
  p.line(ex, ey, z + 0.42, hx, hy, z + 0.36, MAT.metal, 2, { emissive: 0.4 });
  p.cylinder(hx, hy, z + 0.26, 0.09, 0.09, 0.1, MAT.shade, 6, { emissive: 0.25 + on * 0.5, glow: on * 0.45 });
}

/* ----------------------------------------------------------------- tables */

/** A long shared table, the kind a hall gathers around. */
export function table(ctx: BuildCtx, x: number, y: number, w: number, d: number, tone: RGB = MAT.bench): void {
  const { p } = ctx;
  if (ctx.lod === 0) {
    p.box(x, y, FLOOR_Z, w, d, DESK_H + 0.04, tone, { top: scale(tone, 1.08), sideTint: 0.72 });
  } else {
    p.box(x + 0.5, y + d * 0.5 - 0.09, FLOOR_Z, 0.18, 0.18, DESK_H - 0.08, MAT.darkMetal);
    p.box(x + w - 0.68, y + d * 0.5 - 0.09, FLOOR_Z, 0.18, 0.18, DESK_H - 0.08, MAT.darkMetal);
    p.box(x + 0.4, y + 0.22, FLOOR_Z + 0.02, 0.36, d - 0.44, 0.07, MAT.darkMetal);
    p.box(x + w - 0.76, y + 0.22, FLOOR_Z + 0.02, 0.36, d - 0.44, 0.07, MAT.darkMetal);
    if (ctx.lod > 1) p.box(x + 0.6, y + d * 0.5 - 0.06, FLOOR_Z + 0.3, w - 1.2, 0.12, 0.12, MAT.darkMetal);
    p.box(x, y, FLOOR_Z + DESK_H - 0.06, w, d, 0.1, tone, { top: scale(tone, 1.08) });
    castShadow(p, x, y, w, d, 0.5, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.7, MAT.ink);
  }
  ctx.nav?.blockRect(x, y, w, d, 0.1);
}

/** A round table on a pedestal. Cafés, the court, a lab's coffee corner. */
export function roundTable(ctx: BuildCtx, x: number, y: number, r: number, tone: RGB = MAT.bench, h = 0.76): void {
  const { p } = ctx;
  if (ctx.lod > 0) {
    p.cylinder(x, y, FLOOR_Z, r * 0.45, r * 0.45, 0.04, MAT.darkMetal, 8);
    p.box(x - 0.05, y - 0.05, FLOOR_Z, 0.1, 0.1, h - 0.05, MAT.darkMetal);
  }
  p.cylinder(x, y, FLOOR_Z + h - 0.05, r, r, 0.05, tone, ctx.lod > 1 ? 14 : 8, { top: scale(tone, 1.08) });
  contactShadow(p, x, y, FLOOR_Z, r * 0.9, r * 0.6, ctx.shadowStrength * 0.5, MAT.ink);
  ctx.nav?.blockRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4, 0.05);
}

/** Low coffee table. */
export function lowTable(ctx: BuildCtx, x: number, y: number, w: number, d: number, tone: RGB = MAT.woodDark): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z + 0.34, w, d, 0.06, tone, { top: scale(tone, 1.1) });
  if (ctx.lod > 0) {
    for (const [lx, ly] of [[x + 0.06, y + 0.06], [x + w - 0.12, y + 0.06], [x + 0.06, y + d - 0.12], [x + w - 0.12, y + d - 0.12]]) {
      p.box(lx, ly, FLOOR_Z, 0.06, 0.06, 0.34, MAT.darkMetal);
    }
  }
  ctx.nav?.blockRect(x, y, w, d, 0.06);
}

/* ------------------------------------------------------------------ seats */

/** An office chair, facing the way its sitter faces. */
export function chair(ctx: BuildCtx, x: number, y: number, angle: number, tone: RGB = MAT.cloth): void {
  const { p } = ctx;
  if (!shows(ctx, 0.5, 1.4)) return;
  const seatZ = FLOOR_Z + CHAIR_SEAT - 0.1;
  if (ctx.lod > 1) {
    p.cylinder(x, y, FLOOR_Z, 0.26, 0.26, 0.05, MAT.darkMetal, 6);
    p.box(x - 0.04, y - 0.04, FLOOR_Z + 0.05, 0.08, 0.08, seatZ - FLOOR_Z - 0.05, MAT.metal);
  }
  obox(p, x, y, seatZ, 0.5, 0.48, 0.1, angle, tone, { top: scale(tone, 1.06) });
  const bx = x - Math.cos(angle) * 0.24;
  const by = y - Math.sin(angle) * 0.24;
  obox(p, bx, by, seatZ + 0.1, 0.09, 0.46, 0.5, angle, scale(tone, 0.9));
  if (ctx.lod > 0) contactShadow(p, x, y, FLOOR_Z, 0.36, 0.24, ctx.shadowStrength * 0.55, MAT.ink);
  ctx.nav?.costRect(x - 0.3, y - 0.3, 0.6, 0.6, 2.5);
}

export function stool(ctx: BuildCtx, x: number, y: number, tone: RGB = MAT.cloth, seat = STOOL_SEAT): void {
  const { p } = ctx;
  if (!shows(ctx, 0.4, 1.4)) return;
  if (ctx.lod > 1) p.cylinder(x, y, FLOOR_Z, 0.2, 0.2, 0.04, MAT.darkMetal, 6);
  p.box(x - 0.04, y - 0.04, FLOOR_Z + 0.04, 0.08, 0.08, seat - 0.1, MAT.metal);
  p.cylinder(x, y, FLOOR_Z + seat - 0.08, 0.23, 0.23, 0.08, tone, 8);
  ctx.nav?.costRect(x - 0.25, y - 0.25, 0.5, 0.5, 2);
}

/**
 * A sofa for `seats` people, facing `face`. Returns nothing; the Layout that
 * places it knows where each cushion is.
 */
export function sofa(ctx: BuildCtx, x: number, y: number, face: number, seats: number, tone: RGB = MAT.cloth): void {
  const width = seats * 0.72 + 0.34;
  const c = at(x, y, face, 0, -0.08);
  orient(ctx, c.x, c.y, FLOOR_Z + 0.08, width, 0.86, SOFA_SEAT - 0.08, face, tone, { top: scale(tone, 1.06) });
  const back = at(x, y, face, 0, -0.44);
  orient(ctx, back.x, back.y, FLOOR_Z + 0.08, width, 0.22, 0.86, face, scale(tone, 0.88));
  for (const u of [-1, 1]) {
    const arm = at(x, y, face, u * (width / 2 - 0.1), -0.1);
    orient(ctx, arm.x, arm.y, FLOOR_Z + 0.08, 0.2, 0.84, 0.6, face, scale(tone, 0.92));
  }
  if (ctx.lod > 1) {
    for (let i = 0; i < seats; i++) {
      const cu = at(x, y, face, (i - (seats - 1) / 2) * 0.72, -0.04);
      orient(ctx, cu.x, cu.y, FLOOR_Z + SOFA_SEAT, 0.66, 0.66, 0.04, face, scale(tone, 1.1));
    }
  }
  contactShadow(ctx.p, c.x, c.y, FLOOR_Z, width * 0.55, 0.5, ctx.shadowStrength * 0.6, MAT.ink);
  if (ctx.nav) {
    // The seat itself is sat on; only the back and arms are solid.
    const [bx, by, bw, bd] = footprint(back.x, back.y, width, 0.22, face);
    ctx.nav.blockRect(bx, by, bw, bd, 0.06);
    const [cx0, cy0, cw, cd] = footprint(c.x, c.y, width, 0.86, face);
    ctx.nav.costRect(cx0, cy0, cw, cd, 3);
  }
}

export function armchair(ctx: BuildCtx, x: number, y: number, face: number, tone: RGB = MAT.cloth): void {
  sofa(ctx, x, y, face, 1, tone);
}

/** A backless bench to sit on, `length` long, facing `face` (either side). */
export function seatBench(ctx: BuildCtx, x: number, y: number, length: number, face: number, tone: RGB = MAT.wood): void {
  const { p } = ctx;
  orient(ctx, x, y, FLOOR_Z + BENCH_SEAT - 0.06, length, 0.42, 0.06, face, tone, { top: scale(tone, 1.08) });
  if (ctx.lod > 0) {
    for (const u of [-1, 1]) {
      const leg = at(x, y, face, u * (length / 2 - 0.2), 0);
      orient(ctx, leg.x, leg.y, FLOOR_Z, 0.08, 0.34, BENCH_SEAT - 0.06, face, MAT.darkMetal);
    }
  }
  contactShadow(p, x, y, FLOOR_Z, length * 0.45, 0.3, ctx.shadowStrength * 0.4, MAT.ink);
  if (ctx.nav) {
    const [bx, by, bw, bd] = footprint(x, y, length, 0.42, face);
    ctx.nav.costRect(bx, by, bw, bd, 2.5);
  }
}

/** A floor cushion around a low table, for the rooms that sit on the floor. */
export function cushion(ctx: BuildCtx, x: number, y: number, tone: RGB = MAT.cloth): void {
  if (!shows(ctx, 0.5, 1.2)) return;
  ctx.p.box(x - 0.28, y - 0.28, FLOOR_Z, 0.56, 0.56, 0.12, tone, { top: scale(tone, 1.08) });
}

/* ---------------------------------------------------------------- storage */

/** Open shelving against a wall, with a scatter of boxes and books. */
export function shelf(ctx: BuildCtx, x: number, y: number, w: number, levels = 4, seed = 1, depth = 0.42): void {
  const { p } = ctx;
  const h = 0.62;
  if (ctx.lod === 0) {
    p.box(x, y, FLOOR_Z, w, depth, h * levels + 0.1, MAT.benchDark, { top: MAT.bench, sideTint: 0.8 });
    ctx.nav?.blockRect(x, y, w, depth, 0.1);
    return;
  }
  p.box(x, y, FLOOR_Z, 0.09, depth, h * levels + 0.1, MAT.darkMetal);
  p.box(x + w - 0.09, y, FLOOR_Z, 0.09, depth, h * levels + 0.1, MAT.darkMetal);
  for (let i = 0; i <= levels; i++) {
    p.box(x, y, FLOOR_Z + i * h, w, depth, 0.05, MAT.benchDark, { top: MAT.bench });
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
      if (ctx.lod > 1) p.box(cx, y + 0.08, FLOOR_Z + i * h + 0.05, bw, depth - 0.16, bh, tone);
      cx += bw + 0.03;
    }
    if (ctx.lod === 1) p.box(x + 0.12, y + 0.08, FLOOR_Z + i * h + 0.05, w - 0.24, depth - 0.16, 0.36, mix(MAT.bench, MAT.paper, 0.35));
  }
  ctx.nav?.blockRect(x, y, w, depth, 0.1);
}

/** A tall bookcase running along y instead of x. */
export function shelfY(ctx: BuildCtx, x: number, y: number, d: number, levels = 4, seed = 1, depth = 0.42): void {
  const { p } = ctx;
  const h = 0.62;
  if (ctx.lod === 0) {
    p.box(x, y, FLOOR_Z, depth, d, h * levels + 0.1, MAT.benchDark, { top: MAT.bench, sideTint: 0.8 });
    ctx.nav?.blockRect(x, y, depth, d, 0.1);
    return;
  }
  p.box(x, y, FLOOR_Z, depth, 0.09, h * levels + 0.1, MAT.darkMetal);
  p.box(x, y + d - 0.09, FLOOR_Z, depth, 0.09, h * levels + 0.1, MAT.darkMetal);
  for (let i = 0; i <= levels; i++) p.box(x, y, FLOOR_Z + i * h, depth, d, 0.05, MAT.benchDark, { top: MAT.bench });
  for (let i = 0; i < levels; i++) {
    let cy = y + 0.16;
    let guard = 0;
    while (cy < y + d - 0.3 && guard++ < 24) {
      const n = hash2(seed + i * 17, Math.round(cy * 10));
      if (n < 0.22) {
        cy += 0.18;
        continue;
      }
      const bw = 0.08 + n * 0.16;
      const tone = n > 0.66 ? MAT.paper : n > 0.4 ? mix(MAT.bench, MAT.paper, 0.4) : MAT.cloth;
      if (ctx.lod > 1) p.box(x + 0.08, cy, FLOOR_Z + i * h + 0.05, depth - 0.16, bw, 0.3 + n * 0.2, tone);
      cy += bw + 0.03;
    }
    if (ctx.lod === 1) p.box(x + 0.08, y + 0.12, FLOOR_Z + i * h + 0.05, depth - 0.16, d - 0.24, 0.36, mix(MAT.bench, MAT.paper, 0.35));
  }
  ctx.nav?.blockRect(x, y, depth, d, 0.1);
}

/** A row of lockers. */
export function lockers(ctx: BuildCtx, x: number, y: number, count: number, axis: "x" | "y", tone: RGB = MAT.metal): void {
  const { p } = ctx;
  const unit = 0.5;
  const w = axis === "x" ? count * unit : 0.5;
  const d = axis === "x" ? 0.5 : count * unit;
  p.box(x, y, FLOOR_Z, w, d, 1.9, tone, { top: scale(tone, 1.06), sideTint: 0.92 });
  if (ctx.lod > 1) {
    for (let i = 1; i < count; i++) {
      if (axis === "x") p.box(x + i * unit - 0.01, y + d, FLOOR_Z + 0.05, 0.02, 0.01, 1.8, MAT.darkMetal);
      else p.box(x + w, y + i * unit - 0.01, FLOOR_Z + 0.05, 0.01, 0.02, 1.8, MAT.darkMetal);
    }
    for (let i = 0; i < count; i++) {
      if (axis === "x") p.box(x + i * unit + 0.2, y + d, FLOOR_Z + 1.5, 0.1, 0.01, 0.06, MAT.darkMetal);
      else p.box(x + w, y + i * unit + 0.2, FLOOR_Z + 1.5, 0.01, 0.1, 0.06, MAT.darkMetal);
    }
  }
  ctx.nav?.blockRect(x, y, w, d, 0.08);
}

/** Filing cabinet, three drawers. */
export function filing(ctx: BuildCtx, x: number, y: number, tone: RGB = MAT.metal): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, 0.5, 0.62, 1.1, tone, { top: scale(tone, 1.05) });
  if (ctx.lod > 1) {
    for (let i = 0; i < 3; i++) {
      p.box(x + 0.05, y + 0.62, FLOOR_Z + 0.1 + i * 0.34, 0.4, 0.01, 0.28, scale(tone, 0.9));
      p.box(x + 0.19, y + 0.625, FLOOR_Z + 0.3 + i * 0.34, 0.12, 0.02, 0.03, MAT.darkMetal);
    }
  }
  ctx.nav?.blockRect(x, y, 0.5, 0.62, 0.06);
}

/** A long counter with a top, used for serving, making coffee, or reception. */
export function counter(
  ctx: BuildCtx,
  x: number, y: number, w: number, d: number,
  tone: RGB = MAT.wood, top: RGB = MAT.stone, h = 0.98,
): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, w, d, h - 0.06, tone, { top: scale(tone, 1.05), sideTint: 0.9 });
  p.box(x - 0.03, y - 0.03, FLOOR_Z + h - 0.06, w + 0.06, d + 0.06, 0.06, top, { top: scale(top, 1.06) });
  if (ctx.lod > 1) p.box(x, y, FLOOR_Z, w, d, 0.1, scale(tone, 0.6));
  castShadow(p, x, y, w, d, h * 0.3, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.blockRect(x, y, w, d, 0.08);
}

/** A rug. Walkable, and a room's way of saying where its sitting area is. */
export function rug(ctx: BuildCtx, x: number, y: number, w: number, d: number, tone: RGB, border?: RGB): void {
  const { p } = ctx;
  p.plate(x, y, FLOOR_Z + 0.012, w, d, tone, { bias: 0.012 });
  if (border && ctx.lod > 0) {
    const b = 0.14;
    const opts = { bias: 0.02 };
    p.plate(x + b, y + b, FLOOR_Z + 0.014, w - b * 2, 0.06, border, opts);
    p.plate(x + b, y + d - b - 0.06, FLOOR_Z + 0.014, w - b * 2, 0.06, border, opts);
    p.plate(x + b, y + b, FLOOR_Z + 0.014, 0.06, d - b * 2, border, opts);
    p.plate(x + w - b - 0.06, y + b, FLOOR_Z + 0.014, 0.06, d - b * 2, border, opts);
  }
}

/* ------------------------------------------------------------------ walls */

/** A board on a wall, with a handful of marks that mean nothing in particular. */
export function whiteboard(
  ctx: BuildCtx,
  x: number, y: number, z: number,
  w: number, h: number,
  seed: number,
  caption?: string,
): void {
  const { p } = ctx;
  if (ctx.lod === 0) {
    p.box(x, y, z, w, 0.06, h, MAT.paper, { emissive: 0.3 });
    return;
  }
  frameXZ(p, x, y, z, w, h, 0.07, 0.09, MAT.metal);
  p.box(x + 0.07, y + 0.02, z + 0.07, w - 0.14, 0.04, h - 0.14, MAT.paper, { emissive: 0.3 });
  if (ctx.lod < 2) return;
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

/**
 * A whiteboard on wheels, turned to face into the room. The ones on the wall
 * only work for a room with a wall behind it; most rooms here have glass.
 * `face` is the way its writing surface looks, toward whoever reads it.
 */
export function rollingBoard(ctx: BuildCtx, x: number, y: number, face: number, w: number, seed: number, caption?: string): void {
  const { p } = ctx;
  const h = 1.3;
  const z = FLOOR_Z + 0.75;
  for (const u of [-1, 1]) {
    const leg = at(x, y, face, u * (w / 2), 0);
    p.box(leg.x - 0.04, leg.y - 0.04, FLOOR_Z, 0.08, 0.08, z + h - FLOOR_Z, MAT.metal);
    if (ctx.lod > 1) orient(ctx, leg.x, leg.y, FLOOR_Z, 0.1, 0.6, 0.05, face, MAT.darkMetal);
  }
  orient(ctx, x, y, z, w, 0.05, h, face, MAT.paper, { emissive: 0.3 });
  if (ctx.lod > 1) {
    const { rx, ry, fx, fy } = axes(face);
    const sx = x + fx * 0.035;
    const sy = y + fy * 0.035;
    for (let i = 0; i < 7; i++) {
      const n = hash2(seed, i);
      const m = hash2(i, seed + 3);
      const u0 = -w / 2 + 0.15 + n * (w - 0.5);
      const z0 = z + 0.15 + m * (h - 0.35);
      const len = 0.12 + n * w * 0.3;
      const tone = m > 0.6 ? MAT.ink : m > 0.3 ? MAT.lamp : MAT.led;
      p.line(sx + rx * u0, sy + ry * u0, z0, sx + rx * (u0 + len), sy + ry * (u0 + len), z0 + (m - 0.5) * 0.14, tone, 1.3, {
        emissive: 0.9, bias: 0.05,
      });
    }
    if (caption) {
      worldText(p, caption, sx, sy, z + h - 0.12, -rx, -ry, 0, 0, 0, 1, 0.034, MAT.ink, {
        align: "center", emissive: 0.9, bias: 0.07,
      });
    }
  }
  if (ctx.nav) {
    const [bx, by, bw, bd] = footprint(x, y, w + 0.1, 0.5, face);
    ctx.nav.blockRect(bx, by, bw, bd, 0.05);
  }
}

/** Pinboard: paper, corners, one thing hanging off. */
export function pinboard(ctx: BuildCtx, x: number, y: number, z: number, w: number, h: number, seed: number): void {
  const { p } = ctx;
  if (ctx.lod === 0) return;
  frameXZ(p, x, y, z, w, h, 0.06, 0.08, MAT.benchDark);
  p.box(x + 0.06, y + 0.02, z + 0.06, w - 0.12, 0.03, h - 0.12, scale(MAT.bench, 0.9));
  if (ctx.lod < 2) return;
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
  if (ctx.lod > 0) {
    worldText(p, text, x + w / 2, y - 0.03, z + h - 0.3, 1, 0, 0, 0, 0, 1, h * 0.052, MAT.paper, {
      align: "center", emissive: 0.7, bias: 0.05,
    });
  }
}

/** A free-standing screen of panels, like a folding room divider. */
export function divider(ctx: BuildCtx, x: number, y: number, length: number, axis: "x" | "y", h = 1.7, tone: RGB = MAT.canvas): void {
  const { p } = ctx;
  const panels = Math.max(2, Math.round(length / 0.7));
  const step = length / panels;
  for (let i = 0; i < panels; i++) {
    const t = scale(tone, i % 2 ? 0.94 : 1);
    if (axis === "x") p.box(x + i * step + 0.02, y, FLOOR_Z + 0.06, step - 0.04, 0.06, h, t);
    else p.box(x, y + i * step + 0.02, FLOOR_Z + 0.06, 0.06, step - 0.04, h, t);
  }
  if (axis === "x") ctx.nav?.blockRect(x, y - 0.05, length, 0.16, 0.06);
  else ctx.nav?.blockRect(x - 0.05, y, 0.16, length, 0.06);
}
