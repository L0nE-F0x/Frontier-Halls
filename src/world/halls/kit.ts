import { mix } from "../../engine/color";
import type { RGB } from "../../engine/types";
import { worldText } from "../../engine/text";
import type { BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z, RD, TRUSS_Z, WALL_T } from "../metrics";
import { cableTray, type Facing } from "../props/fixtures";
import { wallClock } from "../props/fixtures";
import { floorTape, sign } from "../props/objects";
import type { Layout } from "./layout";
import type { Station, Tag } from "./types";

/**
 * The plaque and the clock, hung from the trusses over the middle of the room
 * and turned to whichever side the camera is on. Hung rather than mounted
 * because in a block plan most rooms have no outer wall to mount them to.
 */
export function hallSignage(ctx: BuildCtx, ox: number, oy: number, w: number, plaque: string, yaw: number): void {
  const { p } = ctx;
  const towardPositiveY = yaw === 0 || yaw === 1;
  const ny: 1 | -1 = towardPositiveY ? 1 : -1;
  const x = ox + w * 0.5;
  const y = oy + RD * 0.44;
  // Hung high and lettered small. The rooms are furnished now, and a plaque
  // the size of the old one covered the middle of whatever it named.
  const z = FLOOR_Z + 4.95;

  const size = 0.078;
  const pw = (plaque.length * 6 - 1) * size + 0.36;
  const h = 7 * size + 0.28;

  if (ctx.lod > 0) {
    for (const hx of [x - pw * 0.36, x + pw * 0.36]) {
      p.box(hx - 0.03, y - 0.03, z + h, 0.06, 0.06, TRUSS_Z - z - h, MAT.darkMetal);
    }
  }
  p.box(x - pw / 2, y - 0.07, z, pw, 0.14, h, MAT.sheet, { emissive: 0.32, top: MAT.wallTrim });
  if (ctx.lod === 0) return;
  worldText(
    p, plaque, x, y + ny * 0.08, z + h - 0.14,
    1, 0, 0, 0, 0, 1, size, MAT.ink,
    { align: "center", emissive: 0.9, bias: 0.05 },
  );
  wallClock(ctx, x - pw / 2 - 0.5, y + ny * 0.06, z + h * 0.5, ny);
}

/**
 * A row of racks along the north wall, and the tray that feeds them. The
 * station in front is where a figure goes to read the indicators.
 */
export function rackWall(
  L: Layout, id: string, x: number, span: number, count: number, tag: string,
  opts: { height?: number; body?: RGB; tape?: RGB; places?: number; tags?: Tag[] } = {},
): Station {
  const pitch = count > 1 ? (span - 1.42) / (count - 1) : 0;
  const station = L.racks(id, "the rack line", x, WALL_T + 0.3, count, pitch, "s", opts.height ?? 4.8, tag, {
    places: opts.places, tags: opts.tags,
  });
  L.draw((ctx, ox, oy) => {
    cableTray(ctx, ox + x - 0.4, oy + WALL_T + 0.05, span + 0.8, "x");
    floorTape(ctx, ox + x - 0.15, oy + WALL_T + 0.12, span + 0.3, 1.5, opts.tape ?? mix(MAT.lamp, MAT.paper, 0.2), true);
  });
  return station;
}

/** Racks against a side wall, running along y. */
export function rackSide(
  L: Layout, id: string, x: number, y: number, span: number, count: number, facing: Facing, tag: string,
  opts: { height?: number; places?: number } = {},
): Station {
  const pitch = count > 1 ? (span - 1.42) / (count - 1) : 0;
  return L.racks(id, "the side racks", x, y, count, pitch, facing, opts.height ?? 4.4, tag, { places: opts.places });
}

/** A sign on the north wall, high up. Every lab names its own room once. */
export function wallSign(L: Layout, text: string, x: number, tone?: RGB): void {
  L.draw((ctx, ox, oy) => sign(ctx, text, ox + x, oy + 0.56, FLOOR_Z + 5.9, 0.055, tone));
}
