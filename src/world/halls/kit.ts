import { mix, scale } from "../../engine/color";
import { hash2 } from "../../engine/rng";
import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW, TRUSS_Z, WALL_T } from "../metrics";
import { bench, chair, pinboard, shelf, table, whiteboard } from "../props/furniture";
import { cableTray, crate, rackRow, wallClock } from "../props/fixtures";
import { worldText } from "../../engine/text";
import { books, floorTape, keyboard, monitor, mug, papers, plant } from "../props/objects";
import { FACE_E, FACE_N, FACE_S, FACE_W, station, type Station } from "./types";

/** One person's worth of desk: top, chair, screen, keys, and something to drink. */
export function workstation(
  ctx: BuildCtx,
  x: number, y: number,
  angle: number,
  seed: number,
  opts?: { screens?: number; mugTone?: RGB; clutter?: boolean },
): void {
  const screens = opts?.screens ?? 1;
  bench(ctx, x, y, 2.1, 1.05);
  const cx = x + 1.05;
  const cy = y + 0.34;
  for (let i = 0; i < screens; i++) {
    const off = (i - (screens - 1) / 2) * 0.92;
    monitor(ctx, cx + off, cy, angle, seed + i * 3, 1);
  }
  keyboard(ctx, cx, y + 0.72, angle);
  mug(ctx, x + 0.34, y + 0.74, opts?.mugTone ?? MAT.terracotta);
  if (opts?.clutter !== false) papers(ctx, x + 1.72, y + 0.68, 2, seed);
  chair(ctx, cx, y + 1.5, angle + Math.PI);
}

/** The back wall of a hall, filled out with racks and the tray that feeds them. */
export function computeWall(
  ctx: BuildCtx,
  ox: number, oy: number,
  count: number,
  tag: string,
  height = 4.8,
): void {
  const span = RW - 3.2;
  const pitch = span / count;
  rackRow(ctx, ox + 1.6, oy + WALL_T + 0.3, count, pitch, "s", height, tag);
  cableTray(ctx, ox + 1.2, oy + WALL_T + 0.05, RW - 2.4, "x");
  floorTape(ctx, ox + 1.45, oy + WALL_T + 0.12, span + 0.3, 1.5, mix(MAT.lamp, MAT.paper, 0.2), true);
}

/** Racks against an end wall, running along y. */
export function sideRacks(ctx: BuildCtx, x: number, oy: number, count: number, tag: string, height = 4.4): void {
  const span = RD - 4.6;
  const pitch = span / count;
  rackRow(ctx, x, oy + 1.5, count, pitch, "e", height, tag);
}

/** A reading corner: shelves, a low table, a chair nobody is in. */
export function readingCorner(ctx: BuildCtx, x: number, y: number, seed: number): void {
  shelf(ctx, x, y, 2.4, 4, seed);
  table(ctx, x + 0.3, y + 1.5, 1.7, 1.0);
  books(ctx, x + 0.7, y + 1.75, 4, seed + 2, FLOOR_Z + 0.85);
  chair(ctx, x + 1.2, y + 3.0, -Math.PI / 2);
  plant(ctx, x + 2.9, y + 0.5, 1.15);
}

/** A table a hall gathers around, with the board behind it. */
export function meetingBay(
  ctx: BuildCtx,
  x: number, y: number,
  seed: number,
  caption: string,
): void {
  table(ctx, x, y, 3.4, 1.5);
  for (let i = 0; i < 3; i++) chair(ctx, x + 0.7 + i * 1.05, y - 0.85, Math.PI / 2);
  for (let i = 0; i < 3; i++) chair(ctx, x + 0.7 + i * 1.05, y + 2.35, -Math.PI / 2);
  papers(ctx, x + 1.2, y + 0.6, 3, seed, FLOOR_Z + 0.85);
  mug(ctx, x + 2.5, y + 0.9, MAT.cloth, FLOOR_Z + 0.85);
  whiteboard(ctx, x + 0.2, y - 1.65, FLOOR_Z + 1.1, 3.0, 1.8, seed, caption);
}

/** Stock, pallets and tape: the part of a hall that is about shipping. */
export function serviceBay(ctx: BuildCtx, x: number, y: number, seed: number): void {
  floorTape(ctx, x, y, 3.2, 2.4, mix(MAT.lamp, MAT.paper, 0.15));
  crate(ctx, x + 0.3, y + 0.3, 0.8, 2);
  crate(ctx, x + 1.4, y + 0.4, 0.72, 1);
  crate(ctx, x + 2.1, y + 1.3, 0.86, 3);
  if (hash2(seed, 3) > 0.5) crate(ctx, x + 0.5, y + 1.5, 0.66, 1);
}

/**
 * The plaque and the clock, hung from the trusses over the middle of the hall
 * and turned to whichever side the camera is on. Hung rather than mounted
 * because in a block plan most halls have no outer wall to mount them to.
 */
export function hallSignage(ctx: BuildCtx, ox: number, oy: number, plaque: string, yaw: number): void {
  const { p } = ctx;
  const towardPositiveY = yaw === 0 || yaw === 1;
  const ny: 1 | -1 = towardPositiveY ? 1 : -1;
  const x = ox + RW * 0.5;
  const y = oy + RD * 0.44;
  const z = FLOOR_Z + 4.3;

  const size = 0.11;
  const w = (plaque.length * 6 - 1) * size + 0.36;
  const h = 7 * size + 0.28;

  for (const hx of [x - w * 0.36, x + w * 0.36]) {
    p.box(hx - 0.03, y - 0.03, z + h, 0.06, 0.06, TRUSS_Z - z - h, MAT.darkMetal);
  }
  p.box(x - w / 2, y - 0.07, z, w, 0.14, h, MAT.sheet, { emissive: 0.32, top: MAT.wallTrim });
  worldText(
    p, plaque, x, y + ny * 0.08, z + h - 0.14,
    1, 0, 0, 0, 0, 1, size, MAT.ink,
    { align: "center", emissive: 0.9, bias: 0.05 },
  );
  wallClock(ctx, x - w / 2 - 0.62, y + ny * 0.06, z + h * 0.5 + 0.46, ny);
}

/** Warmth in the corners: a plant, a poster, a stack nobody has moved. */
export function corners(ctx: BuildCtx, ox: number, oy: number, seed: number): void {
  plant(ctx, ox + RW - 1.1, oy + RD - 1.3, 1.2);
  plant(ctx, ox + 1.0, oy + RD - 1.5, 0.9);
  if (hash2(seed, 11) > 0.45) crate(ctx, ox + RW - 2.4, oy + 1.4, 0.7, 2);
  // A place to put something down on the way past.
  const bx = ox + 5.4 + hash2(seed, 5) * 3.4;
  bench(ctx, bx, oy + RD - 1.45, 1.9, 0.62, MAT.benchDark);
  if (hash2(seed, 7) > 0.5) mug(ctx, bx + 0.5, oy + RD - 1.2, MAT.cloth);
  // Pinned up beside the doorway, where people queue.
  pinboard(ctx, ox + 12.6, oy + 0.56, FLOOR_Z + 1.5, 1.9, 1.2, seed + 4);
}

export function tone(color: RGB, k: number): RGB {
  return scale(color, k);
}

/** The stations every hall has, in hall-local coordinates. Halls add their own. */
export function baseStations(): Station[] {
  return [
    station("bench-a", "the west bench", "bench", 3.3, 5.0, FACE_N),
    station("bench-b", "the east bench", "bench", 11.4, 5.0, FACE_N),
    station("racks", "the rack line", "rack", 8.0, 2.9, FACE_N),
    station("board", "the board", "board", 5.2, 5.3, FACE_N),
    station("table", "the long table", "table", 8.6, 8.2, FACE_N, 4),
    station("front", "the open side", "window", 8.0, 11.3, FACE_S),
    station("rest", "the corridor", "rest", 13.4, 10.9, FACE_S, 3),
    station("door-w", "the west door", "door", 0.1, 10.4, FACE_E),
    station("door-e", "the east door", "door", 15.9, 10.4, FACE_W),
  ];
}
