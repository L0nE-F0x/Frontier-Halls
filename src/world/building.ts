import { mix, scale } from "../engine/color";
import type { Lighting } from "../engine/light";
import { Painter } from "../engine/painter";
import { Raster } from "../engine/raster";
import { screenX, screenY } from "../engine/project";
import type { Camera, Lamp, Vec3 } from "../engine/types";
import type { BuildCtx, Quality } from "./ctx";
import { ai2 } from "./halls/ai2";
import { anthropic } from "./halls/anthropic";
import { deepmind } from "./halls/deepmind";
import { deepseek } from "./halls/deepseek";
import { kimi } from "./halls/kimi";
import { meta } from "./halls/meta";
import { mistral } from "./halls/mistral";
import { openai } from "./halls/openai";
import { qwen } from "./halls/qwen";
import { xai } from "./halls/xai";
import { hallSignage } from "./halls/kit";
import type { HallSpec, Station } from "./halls/types";
import { MAT } from "./materials";
import {
  COLUMN_W, DOOR_GAP, FLOOR_Z, PART_T, RD, RW, TRUSS_Z, WALL_H, WALL_T,
} from "./metrics";
import { makeNav, NavGrid } from "./nav";
import { buildGrounds, exteriorLamps, GROUNDS_REACH } from "./grounds";
import { courtClock, pendant } from "./props/fixtures";
import {
  clerestory, column, conduit, courtyard, endWall, hallFloor, longWall, openFrame,
  partitionX, partitionY, trench, wallPlan,
} from "./props/structure";

/**
 * The halls of the building, in the order they were built. To add one: write
 * its file and append it here. Everything else — the plan, navigation, the
 * dock, the keyboard shortcuts, the finder and the minimap — reads this array,
 * and the block re-squares itself around whatever length it is.
 *
 * Ai2 and Kimi are the first rooms of the open-source quarter and the Asian
 * quarter. The original eight stay ungrouped until a later pass sorts them in.
 */
export const halls: HallSpec[] = [
  deepmind, anthropic, openai, xai, meta, mistral, deepseek, qwen, ai2, kimi,
];

/** Hall-local y at which every north-south partition is broken for a doorway. */
export const DOOR_Y = 8.6;
/** Hall-local x at which every east-west partition is broken for a doorway. */
export const DOOR_X = 6.2;

export type SlotKind = "hall" | "court";

export type Slot = {
  col: number;
  row: number;
  /** World coordinates of the slot's north-west corner. */
  x: number;
  y: number;
  kind: SlotKind;
  hall: HallSpec | null;
};

/**
 * The block is a grid, as square as the hall count allows. Eight halls make a
 * three by three with one slot over, and that slot becomes the court at the
 * centre rather than a gap at the edge — which is why the spare slots are
 * picked from the middle outwards.
 */
function gridFor(count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  return { cols, rows: Math.max(1, Math.ceil(count / cols)) };
}

export const GRID = gridFor(halls.length);
export const BLOCK_W = GRID.cols * RW;
export const BLOCK_D = GRID.rows * RD;

export const SLOTS: Slot[] = (() => {
  const { cols, rows } = GRID;
  const spare = cols * rows - halls.length;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const cells: { col: number; row: number; d: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({ col, row, d: Math.hypot(col - cx, row - cy) });
    }
  }
  const courts = new Set(
    [...cells].sort((a, b) => a.d - b.d).slice(0, spare).map((c) => c.row * cols + c.col),
  );
  let next = 0;
  return cells
    .slice()
    .sort((a, b) => a.row * cols + a.col - (b.row * cols + b.col))
    .map<Slot>((cell) => {
      const court = courts.has(cell.row * cols + cell.col);
      return {
        col: cell.col,
        row: cell.row,
        x: cell.col * RW,
        y: cell.row * RD,
        kind: court ? "court" : "hall",
        hall: court ? null : halls[next++] ?? null,
      };
    });
})();

const SLOT_AT = new Map<string, Slot>(SLOTS.map((s) => [`${s.col},${s.row}`, s]));
const SLOT_OF = new Map<string, Slot>(
  SLOTS.filter((s) => s.hall).map((s) => [s.hall!.id, s]),
);

export function slotAt(col: number, row: number): Slot | undefined {
  return SLOT_AT.get(`${col},${row}`);
}

export function slotOf(hall: HallSpec): Slot {
  return SLOT_OF.get(hall.id)!;
}

export function hallOrigin(hall: HallSpec): { x: number; y: number } {
  const slot = slotOf(hall);
  return { x: slot.x, y: slot.y };
}

export function hallById(id: string | null): HallSpec | undefined {
  return id ? halls.find((h) => h.id === id) : undefined;
}

export type WorldStation = Station & { hallId: string; wx: number; wy: number };

export function stationsOf(hall: HallSpec): WorldStation[] {
  const o = hallOrigin(hall);
  return hall.stations.map((s) => ({ ...s, hallId: hall.id, wx: o.x + s.x, wy: o.y + s.y }));
}

const STATION_INDEX = new Map<string, WorldStation>();
for (const hall of halls) {
  for (const s of stationsOf(hall)) STATION_INDEX.set(`${hall.id}/${s.id}`, s);
}

export function findStation(hallId: string, stationId: string): WorldStation | undefined {
  return STATION_INDEX.get(`${hallId}/${stationId}`);
}

export function allStations(): WorldStation[] {
  return [...STATION_INDEX.values()];
}

/** True when a partition should stand between two neighbouring slots. */
function divides(a: Slot | undefined, b: Slot | undefined): boolean {
  return Boolean(a && b && a.kind === "hall" && b.kind === "hall");
}

/* ------------------------------------------------------------------- lights */

/** Registers every lamp before anything is shaded. Power follows the clock. */
export function collectLamps(light: Lighting, lampMix: number): void {
  for (const slot of SLOTS) {
    if (!slot.hall) {
      // The court is lit from above, so it keeps a little light all night.
      light.addLamp({
        x: slot.x + RW / 2, y: slot.y + RD / 2, z: 6.2,
        color: MAT.led, power: 0.35 + lampMix * 0.5, radius: 9,
      });
      continue;
    }
    for (const spec of slot.hall.lamps) {
      const lamp: Lamp = {
        x: slot.x + spec.x,
        y: slot.y + spec.y,
        z: spec.z ?? 5.0,
        color: spec.tint ?? MAT.lamp,
        power: (spec.power ?? 1) * lampMix * 2.3,
        radius: spec.radius ?? 6.5,
      };
      if (lamp.power > 0.001) light.addLamp(lamp);
    }
  }
  // A cool fill in every doorway, so the circulation reads at night.
  for (const slot of SLOTS) {
    const east = slotAt(slot.col + 1, slot.row);
    if (divides(slot, east)) {
      light.addLamp({
        x: slot.x + RW, y: slot.y + DOOR_Y + DOOR_GAP * 0.4, z: 3.4,
        color: MAT.led, power: 0.3 + lampMix * 0.4, radius: 3.4,
      });
    }
    const south = slotAt(slot.col, slot.row + 1);
    if (divides(slot, south)) {
      light.addLamp({
        x: slot.x + DOOR_X + DOOR_GAP * 0.4, y: slot.y + RD, z: 3.4,
        color: MAT.led, power: 0.3 + lampMix * 0.4, radius: 3.4,
      });
    }
  }
  for (const lamp of exteriorLamps(BLOCK_W, BLOCK_D, lampMix)) light.addLamp(lamp);
}

/* -------------------------------------------------------------------- build */

export function buildBlock(ctx: BuildCtx): void {
  const plan = wallPlan(ctx.p.cam.yaw);
  const p = ctx.p;
  buildGrounds(ctx, BLOCK_W, BLOCK_D);

  for (const slot of SLOTS) {
    if (!onScreen(ctx, slot)) continue;
    const { x: ox, y: oy, hall } = slot;
    p.wash = washFor(ctx, hall?.id ?? "");
    p.light.setRegion(ox - 3, ox + RW + 3);

    // Whichever of this slot's edges lie on the outside of the block.
    if (slot.row === 0) {
      longWall(ctx, ox, 0, RW, plan.northTall, true);
      if (plan.northTall) clerestory(ctx, ox, 0, RW, true);
    }
    if (slot.row === GRID.rows - 1) {
      longWall(ctx, ox, BLOCK_D - WALL_T, RW, plan.southTall, false);
      if (plan.southTall) clerestory(ctx, ox, BLOCK_D - WALL_T, RW, false);
    }
    if (slot.col === 0) endWall(ctx, 0, oy, RD, plan.westTall);
    if (slot.col === GRID.cols - 1) {
      if (hall && hall.index === halls.length - 1) openFrame(ctx, BLOCK_W - WALL_T, oy);
      else endWall(ctx, BLOCK_W - WALL_T, oy, RD, plan.eastTall);
    }

    if (!hall) {
      courtyard(ctx, ox, oy, { r: 168, g: 166, b: 160 }, {
        n: slotAt(slot.col, slot.row - 1)?.kind === "court",
        s: slotAt(slot.col, slot.row + 1)?.kind === "court",
        w: slotAt(slot.col - 1, slot.row)?.kind === "court",
        e: slotAt(slot.col + 1, slot.row)?.kind === "court",
      });
    } else {
      hallFloor(ctx, ox, oy, hall.floor, hall.index * 17, 1000 + hall.index);
      trench(ctx, ox, oy);
      if (slot.row === 0) conduit(ctx, ox, oy);
      if (ctx.quality > 0) trussesFor(ctx, ox, oy);
      hallSignage(ctx, ox, oy, hall.plaque, ctx.p.cam.yaw);
      hallBand(ctx, ox, oy, hall);
      hall.dress(ctx, ox, oy);
      for (const spec of hall.lamps) {
        pendant(ctx, ox + spec.x, oy + spec.y, spec.z ?? 5, ctx.lampMix * Math.min(1, spec.power ?? 1));
      }
    }

    // Partitions are owned by the slot on their west and north side, so each
    // one is built exactly once.
    const east = slotAt(slot.col + 1, slot.row);
    if (divides(slot, east)) {
      partitionX(ctx, ox + RW - PART_T / 2, oy, DOOR_Y);
      doorPlaque(ctx, ox + RW, oy + DOOR_Y + DOOR_GAP * 0.5, east!.hall!, "x");
    }
    const south = slotAt(slot.col, slot.row + 1);
    if (divides(slot, south)) {
      partitionY(ctx, ox, oy + RD - PART_T / 2, DOOR_X);
      doorPlaque(ctx, ox + DOOR_X + DOOR_GAP * 0.5, oy + RD, south!.hall!, "y");
    }
  }

  // One clock for the whole court, even when the court occupies more than one slot.
  const courts = SLOTS.filter((slot) => slot.kind === "court");
  if (courts.length && (ctx.nav || courts.some((slot) => onScreen(ctx, slot)))) {
    const cx = courts.reduce((sum, slot) => sum + slot.x + RW / 2, 0) / courts.length;
    const cy = courts.reduce((sum, slot) => sum + slot.y + RD / 2, 0) / courts.length;
    p.wash = 0;
    p.light.clearRegion();
    courtClock(ctx, cx, cy);
  }

  // Structure stands on the grid, independent of what is in each slot.
  p.wash = 0;
  for (let row = 0; row <= GRID.rows; row++) {
    for (let col = 0; col <= GRID.cols; col++) {
      const x = Math.min(col * RW, BLOCK_W - COLUMN_W) - (col === 0 ? 0 : COLUMN_W / 2);
      const y = Math.min(row * RD, BLOCK_D - COLUMN_W) - (row === 0 ? 0 : COLUMN_W / 2);
      column(ctx, Math.max(0, x), Math.max(0, y));
    }
  }
  p.light.clearRegion();
}

/** How far back a hall is pushed when it is not the one being read. */
export function washFor(ctx: BuildCtx, hallId: string): number {
  if (!ctx.focus || ctx.focus === hallId) return 0;
  const a = SLOTS.find((s) => s.hall?.id === ctx.focus);
  const b = SLOTS.find((s) => s.hall?.id === hallId) ?? SLOTS.find((s) => !s.hall);
  if (!a || !b) return 0.34;
  const away = Math.hypot(a.col - b.col, a.row - b.row);
  return Math.min(0.52, 0.2 + away * 0.09);
}

/**
 * Cheap screen-box test for a whole slot. When one hall is framed, most of the
 * block is off the edge of the buffer and never needs building at all.
 */
function onScreen(ctx: BuildCtx, slot: Slot): boolean {
  if (ctx.nav) return true;
  const cam = ctx.p.cam;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const cx of [slot.x - 1, slot.x + RW + 1]) {
    for (const cy of [slot.y - 1, slot.y + RD + 1]) {
      for (const cz of [0, WALL_H + 1]) {
        const sx = screenX(cam, cx, cy);
        const sy = screenY(cam, cx, cy, cz);
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
    }
  }
  return maxX >= 0 && minX <= cam.w && maxY >= 0 && minY <= cam.h;
}

function trussesFor(ctx: BuildCtx, ox: number, oy: number): void {
  const { p } = ctx;
  const bays = 3;
  for (let i = 1; i <= bays; i++) {
    const x = ox + (RW * i) / (bays + 1);
    p.box(x, oy, TRUSS_Z, 0.14, RD, 0.22, MAT.metal);
    if (ctx.quality > 1) {
      for (let j = 1.6; j < RD - 1.2; j += 3.1) {
        p.box(x - 0.03, oy + j, TRUSS_Z - 0.34, 0.2, 0.12, 0.36, MAT.metal);
      }
    }
  }
}

/** The hall's colour, laid into the floor along its open edge. */
function hallBand(ctx: BuildCtx, ox: number, oy: number, hall: HallSpec): void {
  const { p } = ctx;
  p.plate(ox + 0.4, oy + RD - 1.15, FLOOR_Z, RW - 0.8, 0.22, hall.accent, { emissive: 0.5, bias: 0.02 });
  p.plate(ox + 0.4, oy + RD - 0.82, FLOOR_Z, RW - 0.8, 0.07, scale(hall.accent, 0.6), { emissive: 0.5, bias: 0.02 });
}

/** Small plate over each internal doorway naming the hall you are about to enter. */
function doorPlaque(ctx: BuildCtx, x: number, y: number, hall: HallSpec, axis: "x" | "y"): void {
  const { p } = ctx;
  const tone = mix(hall.accent, MAT.ink, 0.25);
  if (axis === "x") p.box(x - 0.05, y - 0.6, 4.68, 0.1, 1.2, 0.34, tone, { emissive: 0.5, noCull: true });
  else p.box(x - 0.6, y - 0.05, 4.68, 1.2, 0.1, 0.34, tone, { emissive: 0.5, noCull: true });
}

/* ----------------------------------------------------------------- framing */

export function blockPoints(): Vec3[] {
  const pts: Vec3[] = [];
  const x0 = -GROUNDS_REACH;
  const y0 = -GROUNDS_REACH;
  const x1 = BLOCK_W + GROUNDS_REACH;
  const y1 = BLOCK_D + GROUNDS_REACH;
  for (const z of [0, WALL_H * 0.72]) {
    pts.push(
      { x: x0, y: y0, z }, { x: x1, y: y0, z },
      { x: x1, y: y1, z }, { x: x0, y: y1, z },
    );
  }
  return pts;
}

export function hallPoints(hall: HallSpec): Vec3[] {
  const { x, y } = hallOrigin(hall);
  const pts: Vec3[] = [];
  // Framed up to the signage band rather than the ridge, so the plaque and the
  // clock are always inside the shot.
  for (const z of [FLOOR_Z, WALL_H * 0.92]) {
    pts.push(
      { x, y, z }, { x: x + RW, y, z },
      { x: x + RW, y: y + RD, z }, { x, y: y + RD, z },
    );
  }
  return pts;
}

export function personPoints(x: number, y: number): Vec3[] {
  const r = 3.4;
  return [
    { x: x - r, y: y - r, z: 0 },
    { x: x + r, y: y - r, z: 0 },
    { x: x + r, y: y + r, z: 3.2 },
    { x: x - r, y: y + r, z: 3.2 },
  ];
}

/* -------------------------------------------------------------- navigation */

/**
 * Runs one build pass against a throwaway painter purely to collect footprints.
 * The props already know what they block, so navigation never drifts from what
 * is actually drawn.
 */
export function layoutNav(light: Lighting): NavGrid {
  const nav = makeNav(BLOCK_W, BLOCK_D);
  nav.clear();
  // A real one-pixel raster rather than a stub, so this pass cannot fall behind
  // whatever the painter learns to draw next.
  const cam: Camera = { x: 0, y: 0, z: 0, s: 1, w: 1, h: 1, yaw: 0 };
  const scratch = new Raster();
  scratch.resize(1, 1);
  const p = new Painter(scratch, cam, light);
  p.beginFrame();
  const ctx: BuildCtx = {
    p,
    time: 0,
    clock: { hands: () => ({ hour: 0, minute: 0, second: 0 }) } as unknown as BuildCtx["clock"],
    sky: { ambient: MAT.wall, sun: MAT.wall, sunDir: { x: 0, y: 0, z: 1 }, bounce: MAT.wall, daylight: 0.5 },
    lampMix: 1,
    quality: 2 as Quality,
    nav,
    shadowX: 0,
    shadowY: 0,
    shadowStrength: 0,
    focus: null,
  };
  buildBlock(ctx);

  // Circulation is always clear, whatever a prop thinks it put there: a lane
  // along the open edge of every hall, and every doorway between slots.
  for (const slot of SLOTS) {
    nav.openRect(slot.x + 0.8, slot.y + DOOR_Y + 1.1, RW - 1.6, 2.4);
    const east = slotAt(slot.col + 1, slot.row);
    if (east) nav.openRect(slot.x + RW - 0.9, slot.y + DOOR_Y + 0.4, 1.8, DOOR_GAP - 0.8);
    const south = slotAt(slot.col, slot.row + 1);
    if (south) nav.openRect(slot.x + DOOR_X + 0.4, slot.y + RD - 0.9, DOOR_GAP - 0.8, 1.8);
  }
  nav.blockRect(-2, -2, BLOCK_W + 4, 2 + WALL_T);
  nav.blockRect(-2, BLOCK_D - WALL_T, BLOCK_W + 4, 2 + WALL_T);
  nav.blockRect(-2, -2, 2 + WALL_T, BLOCK_D + 4);
  nav.blockRect(BLOCK_W - WALL_T, -2, 2 + WALL_T, BLOCK_D + 4);
  return nav;
}
