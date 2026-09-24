import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { floorGrid, tube } from "../../engine/shapes";
import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import type { FloorSpec } from "../halls/types";
import { MAT } from "../materials";
import {
  COLUMN_W, DOOR_GAP, DOOR_H, FLOOR_Z, KNEE_H, PART_GLASS, PART_SOLID, PART_T,
  RD, RW, WALL_H, WALL_T, WINDOW_H, WINDOW_Z,
} from "../metrics";

export type WallPlan = {
  northTall: boolean;
  southTall: boolean;
  westTall: boolean;
  eastTall: boolean;
};

export function wallPlan(yaw: number): WallPlan {
  // A wall is drawn full height only when it sits behind the room from where
  // the camera is. The other two are cut to a knee so they never occlude.
  return {
    westTall: yaw === 0 || yaw === 3,
    eastTall: yaw === 1 || yaw === 2,
    northTall: yaw === 0 || yaw === 1,
    southTall: yaw === 2 || yaw === 3,
  };
}

/**
 * A room's floor, laid in its own pattern.
 *
 * The inks keep only lightness from a floor — its hue is stippled back to
 * grey with everything else — so every pattern here is two or three greys
 * laid out the way the material is: planks in long runs, a datacentre's
 * perforated tiles in rows, tatami in its interlocking mats. That, more than
 * anything placed on it, is what tells one room from the next at a distance.
 */
export function hallFloor(
  ctx: BuildCtx,
  ox: number, oy: number, w: number, d: number,
  floor: FloorSpec, seed: number, id: number,
): void {
  const { p } = ctx;
  const base = floor.tone;
  const alt = floor.alt ?? scale(base, 0.86);
  const lift = scale(base, 1.05);
  // The slab stops just short of the tiles. Ending it exactly at FLOOR_Z puts
  // its top face in the same plane as every tile, and two coplanar surfaces
  // fight for the depth buffer one scanline at a time.
  if (!ctx.nav) p.box(ox, oy, 0, w, d, FLOOR_Z - 0.02, scale(base, 0.7));
  ctx.nav?.openRect(ox + 0.6, oy + 0.6, w - 1.2, d - 1.2);
  if (ctx.nav) return;

  const opts = { bias: 0, id };
  // From across the block the pattern itself is noise, but a floor that is
  // one flat plate reads as a hole in the drawing. Big squares of the two
  // tones keep the rooms telling apart at a distance, for a dozen quads.
  if (ctx.lod === 0) {
    const cell = 4;
    for (let j = 0; j < d; j += cell) {
      for (let i = 0; i < w; i += cell) {
        const n = hash2(ox + i + seed, oy + j);
        const tone = mix(base, alt, floor.pattern === "check" || floor.pattern === "tatami" ? 0.3 + n * 0.3 : n * 0.45);
        p.plate(ox + i, oy + j, FLOOR_Z, Math.min(cell, w - i), Math.min(cell, d - j), tone, opts);
      }
    }
    return;
  }
  const fine = ctx.lod > 1;

  switch (floor.pattern) {
    case "plank": {
      const board = 0.34;
      for (let j = 0; j < d; j += board) {
        const run = 2.4 + hash2(seed, Math.round(j * 10)) * 1.6;
        let i = -hash2(Math.round(j * 10), seed) * run;
        let k = 0;
        while (i < w) {
          const x0 = Math.max(0, i);
          const x1 = Math.min(w, i + run);
          const n = hash2(seed + k, Math.round(j * 13));
          const tone = n > 0.7 ? alt : n < 0.2 ? lift : base;
          if (x1 - x0 > 0.02) p.plate(ox + x0, oy + j, FLOOR_Z, x1 - x0 - (fine ? 0.03 : 0), Math.min(board, d - j) - (fine ? 0.025 : 0), tone, opts);
          i += run;
          k++;
        }
      }
      return;
    }
    case "herringbone": {
      // Basket weave, which is what herringbone resolves to at this size.
      const cell = 0.8;
      for (let j = 0; j < d; j += cell) {
        for (let i = 0; i < w; i += cell) {
          const flip = (Math.round(i / cell) + Math.round(j / cell)) % 2 === 0;
          const cw = Math.min(cell, w - i);
          const cd = Math.min(cell, d - j);
          if (!fine) {
            p.plate(ox + i, oy + j, FLOOR_Z, cw, cd, flip ? base : alt, opts);
            continue;
          }
          for (let s = 0; s < 3; s++) {
            const tone = (s + (flip ? 0 : 1)) % 2 ? base : mix(base, alt, 0.6);
            if (flip) p.plate(ox + i, oy + j + (s * cd) / 3, FLOOR_Z, cw - 0.02, cd / 3 - 0.02, tone, opts);
            else p.plate(ox + i + (s * cw) / 3, oy + j, FLOOR_Z, cw / 3 - 0.02, cd - 0.02, tone, opts);
          }
        }
      }
      return;
    }
    case "concrete": {
      const slab = 4;
      for (let j = 0; j < d; j += slab) {
        for (let i = 0; i < w; i += slab) {
          const n = hash2(ox + i + seed, oy + j);
          const tone = mix(base, n > 0.5 ? alt : lift, 0.25 + n * 0.3);
          p.plate(ox + i, oy + j, FLOOR_Z, Math.min(slab, w - i) - 0.04, Math.min(slab, d - j) - 0.04, tone, opts);
        }
      }
      return;
    }
    case "raised": {
      // Datacentre floor: square tiles, and every third row perforated to let
      // the cold air up in front of the racks.
      const tile = 0.6;
      for (let j = 0; j < d; j += tile) {
        const row = Math.round(j / tile);
        for (let i = 0; i < w; i += tile) {
          const vent = row % 3 === 1;
          const tone = vent ? alt : base;
          p.plate(ox + i, oy + j, FLOOR_Z, Math.min(tile, w - i) - (fine ? 0.04 : 0), Math.min(tile, d - j) - (fine ? 0.04 : 0), tone, opts);
        }
      }
      return;
    }
    case "tatami": {
      // Mats two to one, laid so no four corners ever meet.
      const unit = 0.9;
      for (let j = 0; j < d; j += unit * 2) {
        for (let i = 0; i < w; i += unit * 2) {
          const block = (Math.round(i / (unit * 2)) + Math.round(j / (unit * 2))) % 2;
          const cw = Math.min(unit * 2, w - i);
          const cd = Math.min(unit * 2, d - j);
          if (block === 0) {
            p.plate(ox + i, oy + j, FLOOR_Z, cw - 0.06, Math.min(unit, cd) - 0.06, base, opts);
            if (cd > unit) p.plate(ox + i, oy + j + unit, FLOOR_Z, cw - 0.06, cd - unit - 0.06, lift, opts);
          } else {
            p.plate(ox + i, oy + j, FLOOR_Z, Math.min(unit, cw) - 0.06, cd - 0.06, lift, opts);
            if (cw > unit) p.plate(ox + i + unit, oy + j, FLOOR_Z, cw - unit - 0.06, cd - 0.06, base, opts);
          }
        }
      }
      p.box(ox, oy, FLOOR_Z - 0.03, w, d, 0.02, alt);
      return;
    }
    case "check": {
      const tile = 1;
      for (let j = 0; j < d; j += tile) {
        for (let i = 0; i < w; i += tile) {
          const dark = (Math.round(i) + Math.round(j)) % 2 === 1;
          p.plate(ox + i, oy + j, FLOOR_Z, Math.min(tile, w - i), Math.min(tile, d - j), dark ? alt : base, opts);
        }
      }
      return;
    }
    case "stone": {
      const fw = 1.6;
      const fd = 1.1;
      for (let j = 0; j < d; j += fd) {
        const shift = Math.round(j / fd) % 2 ? fw / 2 : 0;
        for (let i = -shift; i < w; i += fw) {
          const x0 = Math.max(0, i);
          const x1 = Math.min(w, i + fw);
          const n = hash2(ox + Math.round(i * 3) + seed, oy + Math.round(j * 5));
          const tone = mix(base, n > 0.5 ? alt : lift, n * 0.6);
          if (x1 - x0 > 0.05) p.plate(ox + x0, oy + j, FLOOR_Z, x1 - x0 - 0.06, Math.min(fd, d - j) - 0.06, tone, opts);
        }
      }
      return;
    }
    case "rubber":
    case "carpet":
    case "terrazzo":
    case "tile":
    default: {
      const step = ctx.quality === 0 ? 2 : 1;
      const carpet = floor.pattern === "carpet";
      for (let j = 0; j < d; j += step) {
        const dd = Math.min(step, d - j);
        for (let i = 0; i < w; i += step) {
          const ww = Math.min(step, w - i);
          const n = hash2(ox + i + seed, oy + j);
          let tone: RGB;
          if (carpet) tone = (Math.round(i) + Math.round(j)) % 2 ? base : mix(base, alt, 0.45);
          else if (floor.pattern === "rubber") tone = n > 0.85 ? alt : base;
          else tone = n > 0.82 ? alt : n < 0.12 ? lift : base;
          p.plate(ox + i, oy + j, FLOOR_Z, ww, dd, tone, opts);
        }
      }
      if (floor.pattern === "terrazzo" && fine) {
        for (let k = 0; k < w * d * 0.5; k++) {
          const px = ox + hash2(k, seed) * w;
          const py = oy + hash2(seed, k * 3) * d;
          p.plate(px, py, FLOOR_Z + 0.004, 0.09, 0.09, hash2(k, k) > 0.5 ? alt : lift, { bias: 0.01 });
        }
      }
      if (floor.pattern === "tile" && ctx.p.cam.s > 7) {
        floorGrid(ctx.p, ox, oy, FLOOR_Z, w, d, step, MAT.floorGrout, 1, 0.3, base);
      }
    }
  }
}

/**
 * How a tall outer wall is articulated: pilasters on the structural bay, a
 * parapet, and a band of the room's own colour under it.
 */
const BAYS = 4;
const PARAPET = 0.34;

/**
 * The hall's colour as it goes on the outside: pulled well back toward the
 * wall, because thirty saturated stripes around the parapet is the loudest
 * thing in an overview that is otherwise almost entirely grey.
 */
function fascia(accent: RGB): RGB {
  return mix(accent, MAT.wallTop, 0.42);
}

/** Long outer wall running along x. Tall ones carry the clerestory. */
export function longWall(
  ctx: BuildCtx,
  x: number, y: number, length: number,
  tall: boolean,
  facingNorth: boolean,
  band?: RGB,
): void {
  const { p } = ctx;
  const h = tall ? WALL_H : KNEE_H;
  p.box(x, y, 0, length, WALL_T, h, MAT.wall, { top: MAT.wallTop });
  if (ctx.lod > 0) p.box(x, y - 0.04, 0, length, WALL_T + 0.08, 0.28, MAT.baseboard);
  if (!tall) {
    if (ctx.lod > 0) p.box(x, y - 0.05, KNEE_H, length, WALL_T + 0.1, 0.09, MAT.wallTrim);
    ctx.nav?.blockRect(x, y - 0.1, length, WALL_T + 0.2);
    return;
  }
  // The inner face is the one you see: a tall wall only ever stands behind the
  // room it belongs to.
  const face = facingNorth ? y + WALL_T - 0.02 : y - 0.16;
  if (ctx.lod > 0) {
    // A drawn datum line, the height a plan would section at.
    p.box(x, facingNorth ? y + WALL_T - 0.02 : y - 0.06, 2.2, length, 0.08, 0.07, MAT.wallTrim);
    for (let i = 1; i < BAYS; i++) {
      const px = x + (length * i) / BAYS - 0.24;
      p.box(px, face, 0, 0.48, 0.18, h - PARAPET - 0.1, MAT.wallTrim, { top: MAT.wallTop });
    }
  }
  p.box(x, y - 0.09, h - PARAPET, length, WALL_T + 0.18, PARAPET, MAT.wallTop, { top: MAT.metal });
  if (band) {
    p.box(x, facingNorth ? y + WALL_T - 0.03 : y - 0.11, h - PARAPET - 0.16, length, 0.1, 0.12, fascia(band), {
      emissive: 0.3,
    });
  }
  ctx.nav?.blockRect(x, y - 0.1, length, WALL_T + 0.2);
}

/** End wall running along y. */
export function endWall(
  ctx: BuildCtx,
  x: number, y: number, depth: number,
  tall: boolean,
  band?: RGB,
): void {
  const { p } = ctx;
  const h = tall ? WALL_H : KNEE_H;
  p.box(x, y, 0, WALL_T, depth, h, MAT.wall, { top: MAT.wallTop });
  if (ctx.lod > 0) p.box(x - 0.04, y, 0, WALL_T + 0.08, depth, 0.28, MAT.baseboard);
  if (!tall) {
    if (ctx.lod > 0) p.box(x - 0.05, y, KNEE_H, WALL_T + 0.1, depth, 0.09, MAT.wallTrim);
    ctx.nav?.blockRect(x - 0.1, y, WALL_T + 0.2, depth);
    return;
  }
  // An end wall at x = 0 is seen from +x; the far one at the other end is seen
  // from -x. Either way the face that shows is the one toward the block.
  const west = x < WALL_T;
  const face = west ? x + WALL_T - 0.02 : x - 0.16;
  if (ctx.lod > 0) {
    for (let i = 1; i < BAYS; i++) {
      const py = y + (depth * i) / BAYS - 0.24;
      p.box(face, py, 0, 0.18, 0.48, h - PARAPET - 0.1, MAT.wallTrim, { top: MAT.wallTop });
    }
  }
  p.box(x - 0.09, y, h - PARAPET, WALL_T + 0.18, depth, PARAPET, MAT.wallTop, { top: MAT.metal });
  if (band) {
    p.box(west ? x + WALL_T - 0.03 : x - 0.11, y, h - PARAPET - 0.16, 0.1, depth, 0.12, fascia(band), {
      emissive: 0.3,
    });
  }
  ctx.nav?.blockRect(x - 0.1, y, WALL_T + 0.2, depth);
}

/** Glazed band near the top of a tall long wall, with the shaft it throws. */
export function clerestory(ctx: BuildCtx, x: number, y: number, length: number, north: boolean): void {
  const { p, sky } = ctx;
  const faceY = north ? y + WALL_T : y - 0.06;
  const lit = sky.daylight;
  const glassColor = mix(MAT.glass, scale(MAT.glass, 0.35), 1 - lit);
  if (ctx.lod === 0) {
    p.box(x + 0.2, faceY - 0.02, WINDOW_Z, length - 0.4, 0.1, WINDOW_H, glassColor, { emissive: 0.25 + lit * 0.6, glow: lit * 0.5 });
    return;
  }
  const bays = Math.max(2, Math.round(length / 2));
  const bayW = length / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x + i * bayW + 0.22;
    const bw = bayW - 0.44;
    p.box(bx, faceY - 0.02, WINDOW_Z, bw, 0.1, WINDOW_H, glassColor, {
      emissive: 0.25 + lit * 0.6,
      glow: lit * 0.5,
    });
    p.box(bx - 0.14, faceY - 0.06, WINDOW_Z - 0.12, 0.14, 0.16, WINDOW_H + 0.24, MAT.wallTrim);
    if (ctx.lod > 1) p.box(bx + bw / 2 - 0.05, faceY - 0.05, WINDOW_Z, 0.1, 0.14, WINDOW_H, MAT.wallTrim);
  }
  p.box(x, faceY - 0.08, WINDOW_Z + WINDOW_H, length, 0.2, 0.18, MAT.wallTrim);
  p.box(x, faceY - 0.08, WINDOW_Z - 0.2, length, 0.2, 0.2, MAT.wallTrim);

  if (lit > 0.08 && ctx.quality > 0 && ctx.lod > 1 && p.wash < 0.05) {
    // A shaft every other bay, raked along the sun. Every bay is more shafts
    // than a room ever has, and each one is a wide blended quad.
    const reach = 4.4;
    const dirY = north ? 1 : -1;
    const tint = mix(sky.sun, MAT.paper, 0.4);
    for (let i = 0; i < bays; i += 2) {
      const bx = x + i * bayW + 0.3;
      const bw = bayW - 0.6;
      const z0 = WINDOW_Z + WINDOW_H * 0.5;
      const y0 = faceY + dirY * 0.06;
      const y1 = y0 + dirY * reach;
      const z1 = Math.max(FLOOR_Z, z0 - reach * 0.95);
      p.quad(
        bx, y0, z0 + WINDOW_H * 0.45,
        bx + bw, y0, z0 + WINDOW_H * 0.45,
        bx + bw + 0.5, y1, z1,
        bx - 0.5, y1, z1,
        tint, 0, 0, 1,
        { alpha: 0.1 + lit * 0.13, emissive: 1, noCull: true, glow: lit * 0.25 },
      );
    }
  }
}

/**
 * Partition between two rooms: solid to chest height, glazed above, open to the
 * trusses, with a doorway punched through. Nothing between two rooms is ever
 * full height — in this projection that would hide the back of the room behind
 * it — so the whole block stays one readable plan.
 */
function partitionRun(
  ctx: BuildCtx,
  /** Position on the axis the partition is perpendicular to. */
  at: number,
  /** Where the partition starts and how far it runs along its own length. */
  from: number,
  length: number,
  /** Where the doorway starts along that length, and how wide. */
  gapFrom: number,
  gapWidth: number,
  axis: "x" | "y",
  /** What the room on the far side has asked for, if anything: frosted glass. */
  frosted = false,
): void {
  const { p } = ctx;
  const gy0 = from + gapFrom;
  const gy1 = gy0 + gapWidth;
  const segments: [number, number][] = [
    [from, gy0 - from],
    [gy1, from + length - gy1],
  ];

  // box() takes a width and a depth; which is which depends on the axis.
  const slab = (a: number, len: number, z: number, h: number, color: RGB, opts?: Parameters<typeof p.box>[7]) => {
    if (axis === "x") p.box(at, a, z, PART_T, len, h, color, opts);
    else p.box(a, at, z, len, PART_T, h, color, opts);
  };
  const trim = (a: number, len: number, z: number, h: number, thickness: number, color: RGB, opts?: Parameters<typeof p.box>[7]) => {
    const inset = (thickness - PART_T) / 2;
    if (axis === "x") p.box(at - inset, a, z, thickness, len, h, color, opts);
    else p.box(a, at - inset, z, len, thickness, h, color, opts);
  };

  for (const [a, len] of segments) {
    if (len <= 0.01) continue;
    slab(a, len, 0, PART_SOLID, MAT.wall, { top: MAT.wallTrim });
    if (axis === "x") ctx.nav?.blockRect(at - 0.12, a, PART_T + 0.24, len);
    else ctx.nav?.blockRect(a, at - 0.12, len, PART_T + 0.24);
    if (ctx.lod === 0) continue;
    trim(a, len, 0, 0.24, PART_T + 0.06, MAT.baseboard);
    trim(a, len, PART_SOLID, 0.11, PART_T + 0.08, MAT.wallTrim);
    // Glazing above, drawn thin and translucent so the hall behind reads through.
    trim(a, len, PART_SOLID + 0.11, PART_GLASS - PART_SOLID - 0.11, PART_T * 0.2, frosted ? MAT.paper : MAT.glass, {
      alpha: frosted ? 0.62 : 0.2, emissive: frosted ? 0.5 : 0.35,
    });
    if (ctx.lod > 1) {
      const mullions = Math.max(1, Math.round(len / 1.6));
      for (let i = 0; i <= mullions; i++) {
        const my = Math.min(a + (len * i) / mullions - 0.03, a + len - 0.06);
        trim(my, 0.06, PART_SOLID + 0.11, PART_GLASS - PART_SOLID - 0.11, PART_T * 0.6, MAT.wallTrim);
      }
    }
    trim(a, len, PART_GLASS, 0.14, PART_T + 0.08, MAT.wallTrim);
  }

  // Door head, jambs and threshold.
  trim(gy0 - 0.18, 0.18, 0, DOOR_H, PART_T + 0.12, MAT.wallTrim);
  trim(gy1, 0.18, 0, DOOR_H, PART_T + 0.12, MAT.wallTrim);
  if (ctx.lod > 0) {
    trim(gy0 - 0.18, gapWidth + 0.36, DOOR_H, 0.22, PART_T + 0.12, MAT.wallTrim);
    trim(gy0, gapWidth, FLOOR_Z - 0.03, 0.05, PART_T + 0.44, MAT.darkMetal);
  }
  if (axis === "x") ctx.nav?.openRect(at - 0.3, gy0 + 0.2, PART_T + 0.6, gapWidth - 0.4);
  else ctx.nav?.openRect(gy0 + 0.2, at - 0.3, gapWidth - 0.4, PART_T + 0.6);
}

/** Partition running along y, dividing two rooms side by side. */
export function partitionX(ctx: BuildCtx, x: number, oy: number, doorY: number, frosted = false): void {
  partitionRun(ctx, x, oy, RD, doorY, DOOR_GAP, "x", frosted);
}

/** Partition running along x, dividing one row of rooms from the next. */
export function partitionY(ctx: BuildCtx, ox: number, y: number, doorX: number, frosted = false): void {
  partitionRun(ctx, y, ox, RW, doorX, DOOR_GAP, "y", frosted);
}

export function column(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.box(x, y, 0, COLUMN_W, COLUMN_W, WALL_H, MAT.wallTrim, { top: MAT.metal });
  if (ctx.lod > 0) {
    p.box(x - 0.06, y - 0.06, 0, COLUMN_W + 0.12, COLUMN_W + 0.12, 0.3, MAT.baseboard);
    p.box(x - 0.08, y - 0.08, WALL_H - 0.34, COLUMN_W + 0.16, COLUMN_W + 0.16, 0.34, MAT.darkMetal);
  }
  ctx.nav?.blockRect(x - 0.1, y - 0.1, COLUMN_W + 0.2, COLUMN_W + 0.2);
}

/** Cable run along the top of the back wall, with a drop to the floor. */
export function conduit(ctx: BuildCtx, ox: number, oy: number, length = RW): void {
  const { p } = ctx;
  if (ctx.lod === 0) return;
  tube(p, ox, oy + WALL_T + 0.22, WALL_H - 0.95, length, 0.15, "x", MAT.pipe, 6);
  if (ctx.lod < 2) return;
  tube(p, ox, oy + WALL_T + 0.52, WALL_H - 1.28, length, 0.11, "x", MAT.pipe, 6);
  const dropX = ox + length - 1.5;
  p.box(dropX, oy + WALL_T + 0.16, 1.2, 0.2, 0.2, WALL_H - 2.15, MAT.pipe);
  for (let z = 1.6; z < WALL_H - 1.2; z += 1.5) {
    p.box(dropX - 0.06, oy + WALL_T + 0.1, z, 0.32, 0.32, 0.12, MAT.darkMetal);
  }
}

/** The open frame at the end of the block, where the next room attaches. */
export function openFrame(ctx: BuildCtx, x: number, oy: number): void {
  const { p } = ctx;
  const gy = oy + RD * 0.5 - DOOR_GAP / 2;
  p.box(x, oy, 0, WALL_T, gy - oy, KNEE_H, MAT.wall, { top: MAT.wallTrim });
  p.box(x, gy + DOOR_GAP, 0, WALL_T, oy + RD - gy - DOOR_GAP, KNEE_H, MAT.wall, { top: MAT.wallTrim });
  p.box(x - 0.08, gy - 0.3, 0, WALL_T + 0.16, 0.3, DOOR_H + 0.6, MAT.wallTrim);
  p.box(x - 0.08, gy + DOOR_GAP, 0, WALL_T + 0.16, 0.3, DOOR_H + 0.6, MAT.wallTrim);
  p.box(x - 0.08, gy - 0.3, DOOR_H + 0.6, WALL_T + 0.16, DOOR_GAP + 0.6, 0.3, MAT.wallTrim);
  p.box(x - 0.3, gy, FLOOR_Z - 0.02, WALL_T + 0.6, DOOR_GAP, 0.06, MAT.metal);
  const pulse = 0.55 + 0.45 * Math.sin(ctx.time * 1.6);
  p.box(x + 0.1, gy + DOOR_GAP / 2 - 0.16, DOOR_H + 0.2, 0.14, 0.32, 0.18, MAT.seal, {
    emissive: 1,
    glow: 0.5 + pulse * 0.5,
  });
  ctx.nav?.blockRect(x - 0.1, oy, WALL_T + 0.2, gy - oy);
  ctx.nav?.blockRect(x - 0.1, gy + DOOR_GAP, WALL_T + 0.2, oy + RD - gy - DOOR_GAP);
}
