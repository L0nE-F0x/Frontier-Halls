import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import { floorGrid, tube } from "../../engine/shapes";
import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { bench } from "./furniture";
import { floorTape, plant } from "./objects";
import {
  COLUMN_W, DOOR_GAP, DOOR_H, FLOOR_Z, KNEE_H, PART_GLASS, PART_SOLID, PART_T,
  RD, RW, TRUSS_Z, WALL_H, WALL_T, WINDOW_H, WINDOW_Z,
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

/** Floor tiles, grout, a worn patch or two, and the cable trench. */
export function hallFloor(ctx: BuildCtx, ox: number, oy: number, color: RGB, seed: number, id: number): void {
  const { p } = ctx;
  const step = ctx.quality === 0 ? 2 : 1;
  const dark = scale(color, 0.9);
  for (let j = 0; j < RD; j += step) {
    const d = Math.min(step, RD - j);
    for (let i = 0; i < RW; i += step) {
      const w = Math.min(step, RW - i);
      const n = hash2(ox + i + seed, oy + j);
      const tile = n > 0.82 ? dark : n < 0.12 ? scale(color, 1.05) : color;
      p.plate(ox + i, oy + j, FLOOR_Z, w, d, tile, { bias: 0, id });
    }
  }
  // The slab stops just short of the tiles. Ending it exactly at FLOOR_Z puts
  // its top face in the same plane as every tile, and two coplanar surfaces
  // fight for the depth buffer one scanline at a time.
  p.box(ox, oy, 0, RW, RD, FLOOR_Z - 0.02, scale(color, 0.7));
  if (ctx.p.cam.s > 7) floorGrid(ctx.p, ox, oy, FLOOR_Z, RW, RD, step, MAT.floorGrout, 1, 0.3, color);
  ctx.nav?.openRect(ox + 0.6, oy + 0.6, RW - 1.2, RD - 1.2);
}

/** A recessed run of cable trench with a grated cover. */
export function trench(ctx: BuildCtx, ox: number, oy: number): void {
  const { p } = ctx;
  const x = ox + 2.4;
  const y = oy + RD * 0.62;
  const w = RW - 4.8;
  p.box(x, y, FLOOR_Z - 0.14, w, 0.42, 0.12, MAT.trench);
  for (let i = 0; i < w; i += 0.34) {
    p.box(x + i, y + 0.03, FLOOR_Z - 0.02, 0.18, 0.36, 0.035, MAT.darkMetal);
  }
  ctx.nav?.costRect(x, y, w, 0.42, 1.4);
}

/**
 * How a tall outer wall is articulated: pilasters on the structural bay, a
 * parapet, and a band of the room's own colour under it.
 *
 * Left plain, the envelope is one flat slab of MAT.wall with a datum line on
 * it, and at overview zoom it reads as a grey ribbon wrapped around a very
 * detailed interior. These are the cheapest marks that make it architecture:
 * the pilasters give the ribbon a rhythm that matches the columns inside, and
 * the parapet gives it a top edge that catches the sky.
 */
const BAYS = 4;
const PARAPET = 0.34;

/**
 * The hall's colour as it goes on the outside: pulled well back toward the
 * wall, because ten saturated stripes around the parapet is the loudest thing
 * in an overview that is otherwise almost entirely grey.
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
  p.box(x, y - 0.04, 0, length, WALL_T + 0.08, 0.28, MAT.baseboard);
  if (!tall) {
    p.box(x, y - 0.05, KNEE_H, length, WALL_T + 0.1, 0.09, MAT.wallTrim);
    ctx.nav?.blockRect(x, y - 0.1, length, WALL_T + 0.2);
    return;
  }
  // The inner face is the one you see: a tall wall only ever stands behind the
  // room it belongs to.
  const face = facingNorth ? y + WALL_T - 0.02 : y - 0.16;
  // A drawn datum line, the height a plan would section at.
  p.box(x, facingNorth ? y + WALL_T - 0.02 : y - 0.06, 2.2, length, 0.08, 0.07, MAT.wallTrim);
  if (ctx.quality > 0) {
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
  p.box(x - 0.04, y, 0, WALL_T + 0.08, depth, 0.28, MAT.baseboard);
  if (!tall) {
    p.box(x - 0.05, y, KNEE_H, WALL_T + 0.1, depth, 0.09, MAT.wallTrim);
    ctx.nav?.blockRect(x - 0.1, y, WALL_T + 0.2, depth);
    return;
  }
  // An end wall at x = 0 is seen from +x; the far one at the other end is seen
  // from -x. Either way the face that shows is the one toward the block.
  const west = x < WALL_T;
  const face = west ? x + WALL_T - 0.02 : x - 0.16;
  if (ctx.quality > 0) {
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
  const bays = Math.max(2, Math.round(length / 2));
  const bayW = length / bays;
  const lit = sky.daylight;
  const glassColor = mix(MAT.glass, scale(MAT.glass, 0.35), 1 - lit);
  for (let i = 0; i < bays; i++) {
    const bx = x + i * bayW + 0.22;
    const bw = bayW - 0.44;
    p.box(bx, faceY - 0.02, WINDOW_Z, bw, 0.1, WINDOW_H, glassColor, {
      emissive: 0.25 + lit * 0.6,
      glow: lit * 0.5,
    });
    p.box(bx - 0.14, faceY - 0.06, WINDOW_Z - 0.12, 0.14, 0.16, WINDOW_H + 0.24, MAT.wallTrim);
    p.box(bx + bw / 2 - 0.05, faceY - 0.05, WINDOW_Z, 0.1, 0.14, WINDOW_H, MAT.wallTrim);
  }
  p.box(x, faceY - 0.08, WINDOW_Z + WINDOW_H, length, 0.2, 0.18, MAT.wallTrim);
  p.box(x, faceY - 0.08, WINDOW_Z - 0.2, length, 0.2, 0.2, MAT.wallTrim);

  if (lit > 0.08 && ctx.quality > 0 && p.wash < 0.05) {
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
 * Partition between two halls: solid to chest height, glazed above, open to the
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
    trim(a, len, 0, 0.24, PART_T + 0.06, MAT.baseboard);
    trim(a, len, PART_SOLID, 0.11, PART_T + 0.08, MAT.wallTrim);
    // Glazing above, drawn thin and translucent so the hall behind reads through.
    trim(a, len, PART_SOLID + 0.11, PART_GLASS - PART_SOLID - 0.11, PART_T * 0.2, MAT.glass, {
      alpha: 0.2, emissive: 0.35,
    });
    const mullions = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i <= mullions; i++) {
      const my = Math.min(a + (len * i) / mullions - 0.03, a + len - 0.06);
      trim(my, 0.06, PART_SOLID + 0.11, PART_GLASS - PART_SOLID - 0.11, PART_T * 0.6, MAT.wallTrim);
    }
    trim(a, len, PART_GLASS, 0.14, PART_T + 0.08, MAT.wallTrim);
    if (axis === "x") ctx.nav?.blockRect(at - 0.12, a, PART_T + 0.24, len);
    else ctx.nav?.blockRect(a, at - 0.12, len, PART_T + 0.24);
  }

  // Door head, jambs and threshold.
  trim(gy0 - 0.18, 0.18, 0, DOOR_H, PART_T + 0.12, MAT.wallTrim);
  trim(gy1, 0.18, 0, DOOR_H, PART_T + 0.12, MAT.wallTrim);
  trim(gy0 - 0.18, gapWidth + 0.36, DOOR_H, 0.22, PART_T + 0.12, MAT.wallTrim);
  trim(gy0, gapWidth, FLOOR_Z - 0.03, 0.05, PART_T + 0.44, MAT.darkMetal);
  if (axis === "x") ctx.nav?.openRect(at - 0.3, gy0 + 0.2, PART_T + 0.6, gapWidth - 0.4);
  else ctx.nav?.openRect(gy0 + 0.2, at - 0.3, gapWidth - 0.4, PART_T + 0.6);
}

/** Partition running along y, dividing two halls side by side. */
export function partitionX(ctx: BuildCtx, x: number, oy: number, doorY: number): void {
  partitionRun(ctx, x, oy, RD, doorY, DOOR_GAP, "x");
}

/** Partition running along x, dividing one row of halls from the next. */
export function partitionY(ctx: BuildCtx, ox: number, y: number, doorX: number): void {
  partitionRun(ctx, y, ox, RW, doorX, DOOR_GAP, "y");
}

/**
 * The court at the middle of the block: paving instead of tiles, open to the
 * sky, and the master clock every wall clock in the building is reading.
 */
export function courtyard(
  ctx: BuildCtx,
  ox: number,
  oy: number,
  color: RGB,
  open: { n: boolean; s: boolean; e: boolean; w: boolean } = { n: false, s: false, e: false, w: false },
): void {
  const { p } = ctx;
  p.box(ox, oy, 0, RW, RD, FLOOR_Z - 0.02, scale(color, 0.72));
  const step = 1.6;
  for (let j = 0; j < RD; j += step) {
    for (let i = 0; i < RW; i += step) {
      const n = hash2(ox + i, oy + j);
      const tone = mix(color, MAT.wallTrim, 0.25 + n * 0.22);
      p.plate(ox + i, oy + j, FLOOR_Z, Math.min(step, RW - i) - 0.08, Math.min(step, RD - j) - 0.08, tone);
    }
  }
  // A kerb, so the court reads as outside rather than as a hall with no walls.
  // An edge shared with another court slot is left open: those slots are one yard.
  const kerbs: [number, number, number, number, boolean][] = [
    [ox, oy, RW, 0.34, open.n],
    [ox, oy + RD - 0.34, RW, 0.34, open.s],
    [ox, oy, 0.34, RD, open.w],
    [ox + RW - 0.34, oy, 0.34, RD, open.e],
  ];
  for (const [x, y, w, d, skip] of kerbs) {
    if (skip) continue;
    p.box(x, y, FLOOR_Z - 0.02, w, d, 0.16, MAT.wallTrim, { top: MAT.metal });
  }
  ctx.nav?.openRect(ox + 0.5, oy + 0.5, RW - 1, RD - 1);

  // Planting and seating, so the court reads as somewhere people actually stand.
  // The clock itself is placed once, at the middle of every court slot.
  for (const [px, py, size] of [
    [2.6, 2.4, 1.5], [RW - 2.6, 2.4, 1.35], [2.6, RD - 2.6, 1.4], [RW - 2.6, RD - 2.6, 1.55],
    [RW * 0.5, 1.9, 1.1], [RW * 0.5, RD - 1.9, 1.15],
  ] as [number, number, number][]) {
    plant(ctx, ox + px, oy + py, size);
  }
  for (const [bx, by, bw, bd] of [
    [RW * 0.5 - 2.6, 3.9, 2.2, 0.62], [RW * 0.5 + 0.4, 3.9, 2.2, 0.62],
    [RW * 0.5 - 2.6, RD - 4.5, 2.2, 0.62], [RW * 0.5 + 0.4, RD - 4.5, 2.2, 0.62],
  ] as [number, number, number, number][]) {
    bench(ctx, ox + bx, oy + by, bw, bd, MAT.bench);
  }
  floorTape(ctx, ox + RW * 0.5 - 2.4, oy + RD * 0.5 - 2.4, 4.8, 4.8, MAT.wallTrim);
}

export function column(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.box(x, y, 0, COLUMN_W, COLUMN_W, WALL_H, MAT.wallTrim, { top: MAT.metal });
  p.box(x - 0.06, y - 0.06, 0, COLUMN_W + 0.12, COLUMN_W + 0.12, 0.3, MAT.baseboard);
  p.box(x - 0.08, y - 0.08, WALL_H - 0.34, COLUMN_W + 0.16, COLUMN_W + 0.16, 0.34, MAT.darkMetal);
  ctx.nav?.blockRect(x - 0.1, y - 0.1, COLUMN_W + 0.2, COLUMN_W + 0.2);
}

/** Open roof structure. Nothing above it, so the halls stay lit and readable. */
export function trusses(ctx: BuildCtx, ox: number, oy: number): void {
  const { p } = ctx;
  const bays = 4;
  for (let i = 0; i <= bays; i++) {
    const x = ox + (RW * i) / bays;
    if (i === bays) break;
    p.box(x + 0.2, oy, TRUSS_Z, 0.22, RD, 0.34, MAT.darkMetal);
    if (ctx.quality > 0) {
      for (let j = 0.9; j < RD - 0.6; j += 1.9) {
        p.box(x + 0.14, oy + j, TRUSS_Z - 0.5, 0.34, 0.16, 0.52, MAT.darkMetal);
      }
    }
  }
  p.box(ox, oy + 1.1, TRUSS_Z + 0.34, RW, 0.24, 0.2, MAT.darkMetal);
  p.box(ox, oy + RD - 1.5, TRUSS_Z + 0.34, RW, 0.24, 0.2, MAT.darkMetal);
}

/** Cable run along the top of the back wall, with a drop to the floor trench. */
export function conduit(ctx: BuildCtx, ox: number, oy: number): void {
  const { p } = ctx;
  tube(p, ox, oy + WALL_T + 0.22, WALL_H - 0.95, RW, 0.15, "x", MAT.pipe, 6);
  tube(p, ox, oy + WALL_T + 0.52, WALL_H - 1.28, RW, 0.11, "x", MAT.pipe, 6);
  const dropX = ox + RW - 1.5;
  p.box(dropX, oy + WALL_T + 0.16, 1.2, 0.2, 0.2, WALL_H - 2.15, MAT.pipe);
  for (let z = 1.6; z < WALL_H - 1.2; z += 1.5) {
    p.box(dropX - 0.06, oy + WALL_T + 0.1, z, 0.32, 0.32, 0.12, MAT.darkMetal);
  }
}

/** The open frame at the end of the block, where the next quarter attaches. */
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
