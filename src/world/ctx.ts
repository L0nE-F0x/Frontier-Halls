import type { WorldClock } from "../engine/clock";
import type { Painter } from "../engine/painter";
import type { Sky } from "../engine/types";
import type { NavGrid } from "./nav";

export type Quality = 0 | 1 | 2;

/**
 * How much of an object is worth drawing at the current scale.
 *
 * 0 is the whole block on one screen, where a room is a few dozen pixels and
 * a mug would be a stray dot; 1 is a quarter or a pair of rooms; 2 is a room
 * or closer, where everything is drawn. It is read off the camera, so it is
 * the same answer for every prop in a frame.
 */
export type Lod = 0 | 1 | 2;

/** Everything a prop needs to draw itself. Passed down instead of imported. */
export type BuildCtx = {
  p: Painter;
  /** Real seconds since load. Drives blinking and idle motion. */
  time: number;
  clock: WorldClock;
  sky: Sky;
  /** 0..1, how much the artificial lamps are contributing right now. */
  lampMix: number;
  quality: Quality;
  /** Present only while the layout is being measured for navigation. */
  nav: NavGrid | null;
  /** Direction lamplight throws floor shadows, in world units per unit height. */
  shadowX: number;
  shadowY: number;
  shadowStrength: number;
  /** Set when a single hall is focused; others draw with less detail. */
  focus: string | null;
  /** Detail for this frame; see Lod. Always 2 while navigation is measured. */
  lod: Lod;
};

/** Level of detail for a camera scale, in buffer pixels per world unit. */
export function lodFor(scale: number): Lod {
  return scale >= 6.5 ? 2 : scale >= 2.6 ? 1 : 0;
}

/**
 * True when something `size` world units across would cover at least `px`
 * buffer pixels. The measuring pass always says yes, so a prop that skips its
 * drawing at a distance still registers its footprint.
 */
export function shows(ctx: BuildCtx, size: number, px = 1.2): boolean {
  return ctx.nav !== null || size * ctx.p.cam.s >= px;
}
