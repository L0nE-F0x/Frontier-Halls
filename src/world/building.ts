import { mix, scale } from "../engine/color";
import type { Lighting } from "../engine/light";
import { Painter } from "../engine/painter";
import { Raster } from "../engine/raster";
import { screenX, screenY } from "../engine/project";
import type { Camera, Lamp, Vec3 } from "../engine/types";
import type { BuildCtx, Quality } from "./ctx";
import { hallSignage } from "./halls/kit";
import { ROOMS } from "./halls/registry";
import type { HallSpec, Spot, Station } from "./halls/types";
import { MAT } from "./materials";
import { seatOf } from "./roster";
import {
  COLUMN_W, DOOR_GAP, FLOOR_Z, PART_T, RD, RW, TRUSS_Z, WALL_H, WALL_T,
} from "./metrics";
import { makeNav, NavGrid } from "./nav";
import { buildGrounds, exteriorLamps, GROUNDS_REACH } from "./grounds";
import { courtClock, pendant } from "./props/fixtures";
import {
  clerestory, column, conduit, endWall, hallFloor, longWall, openFrame, partitionX, partitionY, wallPlan,
} from "./props/structure";

/**
 * The master plan, drawn the way the building is: north at the top, west on
 * the left. Each cell is one slot of RW by RD; a room that takes more than one
 * slot repeats its name, and has to make a rectangle.
 *
 * It reads as a map of the world. The Americas are the west wing, Europe the
 * middle, the Gulf and India below it, and Asia the east wing, with each lab
 * on the side of the building its city is on — Seattle and Toronto and London
 * and Beijing along the north, the Bay and Hangzhou and Tokyo along the south.
 *
 * Through the middle runs the commons, the rooms every lab shares. The upper
 * row is the order a model is made in, west to east: the corpus, the cluster
 * it is pretrained on, the classroom, the studio where people rate it, the
 * examination hall and the red team. The lower row is where the building
 * lives: the canteen, the court with the clock, the gym, and the stage at the
 * east end where the day's model is shown.
 */
export const PLAN: string[][] = [
  ["amazon", "microsoft", "ai2", "deepmind", "mistral", "kimi", "zai", "bytedance"],
  ["cohere", "ibm", "perplexity", "blackforest", "poolside", "xiaomi", "baidu", "meituan"],
  ["library", "pretraining", "pretraining", "pretraining", "posttraining", "rlhf", "evals", "redteam"],
  ["interp", "canteen", "canteen", "court", "court", "gym", "gym", "stage"],
  ["openai", "anthropic", "thinking", "tii", "deepseek", "qwen", "ant", "upstage"],
  ["xai", "meta", "nvidia", "sarvam", "minimax", "stepfun", "tencent", "sakana"],
];

export const GRID = { cols: PLAN[0].length, rows: PLAN.length };
export const BLOCK_W = GRID.cols * RW;
export const BLOCK_D = GRID.rows * RD;

/** Column letters west to east, and row numbers north to south, as on a drawing. */
export const COL_LABELS = "ABCDEFGHJK".slice(0, GRID.cols).split("");
export const ROW_LABELS = Array.from({ length: GRID.rows }, (_, i) => String(i + 1));

/**
 * Every room in plan order: north row first, west to east. The dock, the
 * finder, the minimap and the schedule on the cover all read this array.
 */
export const halls: HallSpec[] = (() => {
  const seen = new Set<string>();
  const out: HallSpec[] = [];
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const id = PLAN[row][col];
      if (seen.has(id)) continue;
      seen.add(id);
      const room = ROOMS[id];
      if (!room) throw new Error(`The plan names a room "${id}" that has no file.`);
      if (room.id !== id) throw new Error(`Room "${id}" calls itself "${room.id}".`);
      // Its footprint on the plan has to be the rectangle it says it is.
      let c1 = col;
      while (c1 + 1 < GRID.cols && PLAN[row][c1 + 1] === id) c1++;
      let r1 = row;
      while (r1 + 1 < GRID.rows && PLAN[r1 + 1][col] === id) r1++;
      const cols = c1 - col + 1;
      const rows = r1 - row + 1;
      if (cols !== room.span.cols || rows !== room.span.rows) {
        throw new Error(`Room "${id}" is ${room.span.cols}x${room.span.rows} but the plan gives it ${cols}x${rows}.`);
      }
      for (let r = row; r <= r1; r++) {
        for (let c = col; c <= c1; c++) {
          if (PLAN[r][c] !== id) throw new Error(`Room "${id}" is not a rectangle on the plan.`);
        }
      }
      room.index = out.length;
      room.ref = `${COL_LABELS[col]}${ROW_LABELS[row]}`;
      out.push(stage(room));
    }
  }
  for (const id of Object.keys(ROOMS)) {
    if (!seen.has(id)) throw new Error(`Room "${id}" has a file but no place on the plan.`);
  }
  return out;
})();

/** Only the labs, which is what most of the interface lists. */
export const labs = halls.filter((h) => h.kind === "lab");
export const commons = halls.filter((h) => h.kind === "commons");

/**
 * Puts the current roster into the hall's seats.
 *
 * Copy written about a seat may name the model with {name} or {short}, and a
 * hall's list of who is in it with {roster}, so a lineup moving on stays a
 * one-file edit instead of a hunt through prose. A seat with nobody in the
 * roster keeps whatever the hall file wrote, which is what makes adding a hall
 * still work before the roster knows about it.
 */
function stage(hall: HallSpec): HallSpec {
  for (const person of hall.people) {
    const seat = seatOf(hall.id, person.id);
    if (!seat) continue;
    person.name = seat.name;
    person.short = seat.short;
  }
  const names = hall.people.map((p) => p.short ?? p.name).join(", ");
  const fill = (text: string, person?: HallSpec["people"][number]) =>
    text
      .replace(/\{name\}/g, person?.name ?? hall.name)
      .replace(/\{short\}/g, person?.short ?? person?.name ?? hall.name)
      .replace(/\{roster\}/g, names);
  for (const person of [...hall.people, ...hall.staff]) {
    person.role = fill(person.role, person);
    person.doing = fill(person.doing, person);
    person.why = fill(person.why, person);
  }
  hall.facts = hall.facts.map((fact) => ({ ...fact, value: fill(fact.value) }));
  hall.reading = fill(hall.reading);
  hall.blurb = fill(hall.blurb);
  return hall;
}

/** Room-local y at which every north-south partition is broken for a doorway. */
export const DOOR_Y = 8.6;
/** Room-local x at which every east-west partition is broken for a doorway. */
export const DOOR_X = 6.2;

export type Slot = {
  col: number;
  row: number;
  /** World coordinates of the slot's north-west corner. */
  x: number;
  y: number;
  room: HallSpec;
};

export const SLOTS: Slot[] = PLAN.flatMap((cells, row) =>
  cells.map((id, col) => ({ col, row, x: col * RW, y: row * RD, room: halls.find((h) => h.id === id)! })),
);

const SLOT_AT = new Map<string, Slot>(SLOTS.map((s) => [`${s.col},${s.row}`, s]));
const ROOM_ORIGIN = new Map<string, Slot>();
for (const slot of SLOTS) if (!ROOM_ORIGIN.has(slot.room.id)) ROOM_ORIGIN.set(slot.room.id, slot);

export function slotAt(col: number, row: number): Slot | undefined {
  return SLOT_AT.get(`${col},${row}`);
}

/** The north-west slot of a room. */
export function slotOf(hall: HallSpec): Slot {
  return ROOM_ORIGIN.get(hall.id)!;
}

export function slotsOf(hall: HallSpec): Slot[] {
  return SLOTS.filter((s) => s.room.id === hall.id);
}

export function hallOrigin(hall: HallSpec): { x: number; y: number } {
  const slot = slotOf(hall);
  return { x: slot.x, y: slot.y };
}

export function hallById(id: string | null): HallSpec | undefined {
  return id ? halls.find((h) => h.id === id) : undefined;
}

/** The room a world point is in. */
export function roomAt(x: number, y: number): HallSpec | undefined {
  return slotAt(Math.floor(x / RW), Math.floor(y / RD))?.room;
}

export type WorldSpot = Spot & { wx: number; wy: number; wax: number; way: number };
export type WorldStation = Station & { hallId: string; wx: number; wy: number; world: WorldSpot[] };

export function stationsOf(hall: HallSpec): WorldStation[] {
  const o = hallOrigin(hall);
  return hall.stations.map((s) => ({
    ...s,
    hallId: hall.id,
    wx: o.x + s.x,
    wy: o.y + s.y,
    world: s.spots.map((spot) => ({ ...spot, wx: o.x + spot.x, wy: o.y + spot.y, wax: o.x + spot.ax, way: o.y + spot.ay })),
  }));
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
  return Boolean(a && b && a.room.id !== b.room.id);
}

/* ------------------------------------------------------------------- lights */

/** Registers every lamp before anything is shaded. Power follows the clock. */
export function collectLamps(light: Lighting, lampMix: number): void {
  for (const hall of halls) {
    const o = hallOrigin(hall);
    if (hall.open) {
      // The court is lit from above, so it keeps a little light all night.
      light.addLamp({
        x: o.x + hall.w / 2, y: o.y + hall.d / 2, z: 6.2,
        color: MAT.led, power: 0.35 + lampMix * 0.5, radius: 12,
      });
    }
    for (const spec of hall.lamps) {
      const lamp: Lamp = {
        x: o.x + spec.x,
        y: o.y + spec.y,
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

  // Restored at the end: a room that is not the subject is drawn a step
  // plainer as well as washed back, which is most of what makes the subject
  // read as the subject.
  const baseQuality = ctx.quality;
  const baseLod = ctx.lod;

  for (const hall of halls) {
    const o = hallOrigin(hall);
    if (!onScreen(ctx, o.x, o.y, hall.w, hall.d)) continue;
    const subject = !ctx.focus || ctx.focus === hall.id;
    ctx.quality = subject ? baseQuality : (Math.max(0, baseQuality - 1) as Quality);
    // Rooms that are not the subject lose their finest detail too: they are
    // washed back to the paper, and a mug in a washed room is noise.
    ctx.lod = subject || baseLod < 2 ? baseLod : 1;
    p.wash = washFor(ctx, hall.id);
    p.light.setRegion(o.x - 3, o.x + hall.w + 3, o.y - 3, o.y + hall.d + 3);

    if (hall.open) {
      courtFloor(ctx, o.x, o.y, hall.w, hall.d, hall.floor.tone, 1000 + hall.index);
    } else {
      hallFloor(ctx, o.x, o.y, hall.w, hall.d, hall.floor, hall.index * 17, 1000 + hall.index);
      if (ctx.lod > 0 && ctx.quality > 0) trussesFor(ctx, o.x, o.y, hall.w, hall.d);
    }
    if (ctx.focus === hall.id) focusOutline(ctx, o.x, o.y, hall);
    if (!hall.open) hallSignage(ctx, o.x, o.y, hall.w, hall.plaque, ctx.p.cam.yaw);
    if (hall.kind === "lab") hallBand(ctx, o.x, o.y, hall);
    hall.dress(ctx, o.x, o.y);
    for (const spec of hall.lamps) {
      pendant(ctx, o.x + spec.x, o.y + spec.y, spec.z ?? 5, ctx.lampMix * Math.min(1, spec.power ?? 1), spec.style, spec.tint);
    }
  }

  // Walls and partitions, slot by slot: the envelope is the same whatever
  // room fills it, and a partition belongs to the slot on its west or north.
  for (const slot of SLOTS) {
    const { x: ox, y: oy, room } = slot;
    if (!onScreen(ctx, ox, oy, RW, RD)) continue;
    const subject = !ctx.focus || ctx.focus === room.id;
    ctx.lod = subject || baseLod < 2 ? baseLod : 1;
    p.wash = washFor(ctx, room.id);
    p.light.setRegion(ox - 3, ox + RW + 3, oy - 3, oy + RD + 3);
    const band = room.kind === "lab" ? room.accent : undefined;
    if (slot.row === 0) {
      longWall(ctx, ox, 0, RW, plan.northTall, true, band);
      if (plan.northTall) clerestory(ctx, ox, 0, RW, true);
      if (!room.open) conduit(ctx, ox, oy);
    }
    if (slot.row === GRID.rows - 1) {
      longWall(ctx, ox, BLOCK_D - WALL_T, RW, plan.southTall, false, band);
      if (plan.southTall) clerestory(ctx, ox, BLOCK_D - WALL_T, RW, false);
    }
    if (slot.col === 0) endWall(ctx, 0, oy, RD, plan.westTall, band);
    if (slot.col === GRID.cols - 1) {
      if (slot.row === GRID.rows - 1) openFrame(ctx, BLOCK_W - WALL_T, oy);
      else endWall(ctx, BLOCK_W - WALL_T, oy, RD, plan.eastTall, band);
    }
    const east = slotAt(slot.col + 1, slot.row);
    if (divides(slot, east)) {
      partitionX(ctx, ox + RW - PART_T / 2, oy, DOOR_Y, room.id === "redteam" || east!.room.id === "redteam");
      doorPlaque(ctx, ox + RW, oy + DOOR_Y + DOOR_GAP * 0.5, east!.room, "x");
    }
    const south = slotAt(slot.col, slot.row + 1);
    if (divides(slot, south)) {
      partitionY(ctx, ox, oy + RD - PART_T / 2, DOOR_X, room.id === "redteam" || south!.room.id === "redteam");
      doorPlaque(ctx, ox + DOOR_X + DOOR_GAP * 0.5, oy + RD, south!.room, "y");
    }
  }

  ctx.quality = baseQuality;
  ctx.lod = baseLod;

  // One clock for the whole court, stood at its middle.
  const court = halls.find((h) => h.open);
  if (court) {
    const o = hallOrigin(court);
    if (ctx.nav || onScreen(ctx, o.x, o.y, court.w, court.d)) {
      p.wash = washFor(ctx, court.id);
      p.light.clearRegion();
      courtClock(ctx, o.x + court.w / 2, o.y + court.d / 2);
    }
  }

  // Structure stands on the grid, independent of what is in each slot.
  p.wash = 0;
  for (let row = 0; row <= GRID.rows; row++) {
    for (let col = 0; col <= GRID.cols; col++) {
      // Inner columns stand on the partition line; the outer ones are flush
      // with the outside of the wall, so none steps into a room.
      const cx = col === 0 ? 0 : col === GRID.cols ? BLOCK_W - COLUMN_W : col * RW - COLUMN_W / 2;
      const cy = row === 0 ? 0 : row === GRID.rows ? BLOCK_D - COLUMN_W : row * RD - COLUMN_W / 2;
      if (!ctx.nav && !onScreen(ctx, cx - 1, cy - 1, 2, 2)) continue;
      // A grid point inside a room of more than one slot, with no partition
      // meeting it, stands in open floor; the room keeps it clear of a column.
      if (interior(col, row)) continue;
      const near = slotAt(Math.min(col, GRID.cols - 1), Math.min(row, GRID.rows - 1));
      p.wash = near ? washFor(ctx, near.room.id) : 0;
      column(ctx, cx, cy);
    }
  }
  p.wash = 0;
  p.light.clearRegion();
}

/** True when all four slots around a grid point belong to one room. */
function interior(col: number, row: number): boolean {
  const ids = [
    slotAt(col - 1, row - 1), slotAt(col, row - 1), slotAt(col - 1, row), slotAt(col, row),
  ].map((s) => s?.room.id);
  return ids.every((id) => id && id === ids[0]);
}

/** Paving, a kerb and planting: the one room with no roof. */
function courtFloor(ctx: BuildCtx, ox: number, oy: number, w: number, d: number, color: { r: number; g: number; b: number }, id: number): void {
  const { p } = ctx;
  ctx.nav?.openRect(ox + 0.5, oy + 0.5, w - 1, d - 1);
  if (ctx.nav) return;
  p.box(ox, oy, 0, w, d, FLOOR_Z - 0.02, scale(color, 0.72));
  if (ctx.lod === 0) {
    p.plate(ox, oy, FLOOR_Z, w, d, mix(color, MAT.wallTrim, 0.3), { id });
    return;
  }
  const step = 1.6;
  for (let j = 0; j < d; j += step) {
    for (let i = 0; i < w; i += step) {
      const n = Math.abs(Math.sin((ox + i) * 12.9898 + (oy + j) * 78.233)) % 1;
      const tone = mix(color, MAT.wallTrim, 0.25 + n * 0.22);
      p.plate(ox + i, oy + j, FLOOR_Z, Math.min(step, w - i) - 0.08, Math.min(step, d - j) - 0.08, tone, { id });
    }
  }
}

/**
 * How far back a room is pushed when it is not the one being read.
 *
 * Hard enough to actually answer "which room am I in". At the old strength a
 * neighbour came back about as loud as the subject, and entering a hall only
 * moved the camera; the room you asked for has to be the thing on the page.
 */
export function washFor(ctx: BuildCtx, hallId: string): number {
  const to = washToward(ctx.focus, hallId);
  const k = ctx.washK ?? 1;
  if (ctx.washFrom === undefined || k >= 1) return to;
  // Eased from the last focus to this one, rather than switched: going from
  // one room to another, the building used to flash to its new wash in a
  // single frame.
  const from = washToward(ctx.washFrom, hallId);
  return from + (to - from) * k;
}

function washToward(focus: string | null, hallId: string): number {
  if (!focus || focus === hallId) return 0;
  const a = hallById(focus);
  const b = hallById(hallId);
  if (!a || !b) return 0.52;
  const ac = centreSlot(a);
  const bc = centreSlot(b);
  const away = Math.hypot(ac.col - bc.col, ac.row - bc.row);
  return Math.min(0.72, 0.34 + away * 0.13);
}

function centreSlot(hall: HallSpec): { col: number; row: number } {
  const s = slotOf(hall);
  return { col: s.col + (hall.span.cols - 1) / 2, row: s.row + (hall.span.rows - 1) / 2 };
}

/**
 * Cheap screen-box test for a rectangle of the block. When one room is
 * framed, most of the block is off the edge of the buffer and never needs
 * building at all.
 */
function onScreen(ctx: BuildCtx, x: number, y: number, w: number, d: number): boolean {
  if (ctx.nav) return true;
  const cam = ctx.p.cam;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const cx of [x - 1, x + w + 1]) {
    for (const cy of [y - 1, y + d + 1]) {
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

function trussesFor(ctx: BuildCtx, ox: number, oy: number, w: number, d: number): void {
  const { p } = ctx;
  const bays = Math.round(w / RW) * 3;
  for (let i = 1; i <= bays; i++) {
    if (i % 3 === 0 && i < bays) continue;
    const x = ox + (w * i) / (bays + 1);
    p.box(x, oy, TRUSS_Z, 0.14, d, 0.22, MAT.metal);
    if (ctx.lod > 1 && ctx.quality > 1) {
      for (let j = 1.6; j < d - 1.2; j += 3.1) {
        p.box(x - 0.03, oy + j, TRUSS_Z - 0.34, 0.2, 0.12, 0.36, MAT.metal);
      }
    }
  }
}

/**
 * A drawn edge around the room being read. A plan says which room it is about
 * by ruling it, not by moving the page.
 */
function focusOutline(ctx: BuildCtx, ox: number, oy: number, hall: HallSpec): void {
  const { p } = ctx;
  const z = FLOOR_Z + 0.01;
  const inset = 0.34;
  const tone = mix(hall.accent, MAT.ink, 0.2);
  const x0 = ox + inset;
  const y0 = oy + inset;
  const x1 = ox + hall.w - inset;
  const y1 = oy + hall.d - inset;
  const opts = { emissive: 1, bias: 0.08 };
  p.line(x0, y0, z, x1, y0, z, tone, 1.4, opts);
  p.line(x1, y0, z, x1, y1, z, tone, 1.4, opts);
  p.line(x1, y1, z, x0, y1, z, tone, 1.4, opts);
  p.line(x0, y1, z, x0, y0, z, tone, 1.4, opts);
}

/** The lab's colour, laid into the floor along its open edge. */
function hallBand(ctx: BuildCtx, ox: number, oy: number, hall: HallSpec): void {
  const { p } = ctx;
  p.plate(ox + 0.4, oy + hall.d - 1.15, FLOOR_Z, hall.w - 0.8, 0.22, hall.accent, { emissive: 0.5, bias: 0.02 });
  if (ctx.lod > 0) {
    p.plate(ox + 0.4, oy + hall.d - 0.82, FLOOR_Z, hall.w - 0.8, 0.07, scale(hall.accent, 0.6), { emissive: 0.5, bias: 0.02 });
  }
}

/** Small plate over each internal doorway naming the room you are about to enter. */
function doorPlaque(ctx: BuildCtx, x: number, y: number, hall: HallSpec, axis: "x" | "y"): void {
  if (ctx.lod === 0) return;
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
      { x, y, z }, { x: x + hall.w, y, z },
      { x: x + hall.w, y: y + hall.d, z }, { x, y: y + hall.d, z },
    );
  }
  return pts;
}

/** The box around a set of rooms, for framing a quarter of the building. */
export function roomsPoints(rooms: HallSpec[]): Vec3[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const room of rooms) {
    const o = hallOrigin(room);
    x0 = Math.min(x0, o.x);
    y0 = Math.min(y0, o.y);
    x1 = Math.max(x1, o.x + room.w);
    y1 = Math.max(y1, o.y + room.d);
  }
  const pts: Vec3[] = [];
  for (const z of [FLOOR_Z, WALL_H * 0.85]) {
    pts.push({ x: x0, y: y0, z }, { x: x1, y: y0, z }, { x: x1, y: y1, z }, { x: x0, y: y1, z });
  }
  return pts;
}

/**
 * The box a single figure is framed inside.
 *
 * All eight corners, not the four the other framings use: with z on only two
 * of them the vertical span depends on which corners happen to carry it, which
 * is how a 2.25-unit box came out twice as tight as the arithmetic said and
 * filled the frame with one torso.
 *
 * Sized so the figure lands at about a third of the frame — a portrait with
 * the room still around it.
 */
export function personPoints(x: number, y: number): Vec3[] {
  const r = 1.16;
  const top = FLOOR_Z + 2.3;
  const pts: Vec3[] = [];
  for (const z of [FLOOR_Z, top]) {
    pts.push(
      { x: x - r, y: y - r, z }, { x: x + r, y: y - r, z },
      { x: x + r, y: y + r, z }, { x: x - r, y: y + r, z },
    );
  }
  return pts;
}

/* -------------------------------------------------------------- navigation */

/**
 * Runs one build pass against a throwaway painter purely to collect footprints.
 * The props already know what they block, so navigation never drifts from what
 * is actually drawn.
 *
 * It used to force a lane open along the open edge of every hall after the
 * props had registered, whatever they had put there. The lane ran through the
 * corner benches, a reading table and a stack of crates, and figures walked
 * straight through them. Now only the doorways are forced open, and the rooms
 * are laid out to keep their own aisles clear; the tests hold them to it.
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
    lod: 2,
  };
  buildBlock(ctx);

  // The doorways between rooms are always open.
  for (const slot of SLOTS) {
    const east = slotAt(slot.col + 1, slot.row);
    if (divides(slot, east)) nav.openRect(slot.x + RW - 0.9, slot.y + DOOR_Y + 0.4, 1.8, DOOR_GAP - 0.8);
    const south = slotAt(slot.col, slot.row + 1);
    if (divides(slot, south)) nav.openRect(slot.x + DOOR_X + 0.4, slot.y + RD - 0.9, DOOR_GAP - 0.8, 1.8);
  }
  nav.blockRect(-2, -2, BLOCK_W + 4, 2 + WALL_T);
  nav.blockRect(-2, BLOCK_D - WALL_T, BLOCK_W + 4, 2 + WALL_T);
  nav.blockRect(-2, -2, 2 + WALL_T, BLOCK_D + 4);
  // The open frame in the south-east corner is the one way out: the day's
  // run leaves through it once it has been shown. The east wall is two
  // pieces, either side of it, so sealing the grid cannot close it again.
  const frameY = BLOCK_D - RD * 0.5 - DOOR_GAP / 2;
  nav.blockRect(BLOCK_W - WALL_T, -2, 2 + WALL_T, frameY + 2);
  nav.blockRect(BLOCK_W - WALL_T, frameY + DOOR_GAP, 2 + WALL_T, BLOCK_D + 2 - frameY - DOOR_GAP);
  nav.openRect(BLOCK_W - 1.2, frameY + 0.4, 3.2, DOOR_GAP - 0.8);
  nav.seal();
  return nav;
}
