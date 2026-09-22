import type { WorldClock } from "../engine/clock";
import type { Painter } from "../engine/painter";
import type { Sky } from "../engine/types";
import type { NavGrid } from "./nav";

export type Quality = 0 | 1 | 2;

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
};
