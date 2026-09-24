import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import type { PersonSpec } from "../person";

export type StationKind =
  | "desk" | "bench" | "rack" | "board" | "table" | "lounge" | "rest" | "window" | "door"
  | "floor" | "frame" | "meal" | "counter" | "gym" | "seat" | "stage" | "exam" | "booth" | "pod";

/**
 * What a figure does with its body once it gets to a station. The station
 * says, not the figure: a chair is sat on, a treadmill is run on, and a figure
 * that arrives at either takes the pose the furniture asks for.
 */
export type Pose =
  | "stand" | "sit" | "type" | "eat" | "write" | "run" | "bike" | "row" | "lift" | "stretch"
  | "present" | "watch" | "read" | "punch" | "pour";

/**
 * One place to be at a station. `ax, ay` is the approach: a point on open
 * floor the figure walks to first, from which the last step is straight onto
 * the spot. A chair's approach is behind the chair, a counter's is in front of
 * it; the path never has to find its own way into a piece of furniture, which
 * is how figures used to end up walking through their desks.
 */
export type Spot = { x: number; y: number; face: number; ax: number; ay: number };

/**
 * Words the director reads when it is choosing where a figure goes. A lab's
 * desks are "work"; the canteen's tables are "meal"; the gym's machines are
 * "exercise". Anywhere tagged "social" is somewhere to stand and talk.
 */
export type Tag =
  | "work" | "social" | "meal" | "coffee" | "exercise" | "audience" | "visit" | "teach" | "learn"
  | "rate" | "probe" | "exam" | "present" | "staff" | "pod" | "rest" | "queue";

/** A place in a room a figure can use, and what it is for. */
export type Station = {
  id: string;
  label: string;
  kind: StationKind;
  /** The first spot, in room-local coordinates. */
  x: number;
  y: number;
  /** Direction the figure faces when it gets there, radians. */
  face: number;
  /** How many figures may use it at once; always the number of spots. */
  capacity: number;
  pose: Pose;
  spots: Spot[];
  /** Seat height above the floor, for a sitting pose. */
  seat: number;
  /** Height of what the figure stands on: a stage, a riser. 0 is the floor. */
  lift: number;
  tags: Tag[];
};

export type LampStyle = "shade" | "lantern" | "globe" | "track" | "neon" | "none";

export type LampSpec = {
  x: number;
  y: number;
  z?: number;
  power?: number;
  radius?: number;
  tint?: RGB;
  /** What hangs there. The light it gives is the same whatever it looks like. */
  style?: LampStyle;
};

export type Fact = { label: string; value: string };

export type FloorPattern =
  | "tile" | "plank" | "herringbone" | "concrete" | "carpet" | "tatami" | "raised" | "rubber"
  | "check" | "terrazzo" | "stone" | "paving";

/**
 * What a room stands on. Only lightness survives the inks — a floor's hue is
 * stippled back to grey like everything else — so a pattern is two tones of
 * grey laid out, which is also what a floor looks like on a plan.
 */
export type FloorSpec = { tone: RGB; pattern: FloorPattern; alt?: RGB };

export type RoomKind = "lab" | "commons";

export type HallSpec = {
  id: string;
  name: string;
  /** Short form for the plaque hung over the room. */
  plaque: string;
  /** A lab keeps models; the commons are the rooms every lab shares. */
  kind: RoomKind;
  /** Where the lab is, as the dossier and the schedule say it. */
  city?: string;
  /** The country or region, for grouping. */
  region?: string;
  /** One line under the name in the dossier. */
  tagline: string;
  /** The lab's public ethos, as this room plays it. */
  ethos: string;
  /** Shown when the room is selected and no figure is. */
  blurb: string;
  /** What you are looking at, written for someone standing in the doorway. */
  reading: string;
  facts: Fact[];
  accent: RGB;
  floor: FloorSpec;
  index: number;
  /** Grid reference on the plan, like "C5". Filled in by the plan. */
  ref: string;
  /** Size in slots. Most rooms take one; the cluster and the canteen more. */
  span: { cols: number; rows: number };
  /** Size in world units. */
  w: number;
  d: number;
  /** Open to the sky, with paving rather than a floor and no roof structure. */
  open: boolean;
  stations: Station[];
  lamps: LampSpec[];
  /** The models in the room, each in a seat the roster keeps. */
  people: PersonSpec[];
  /** Figures who are not models: raters, cooks, the day's training run. */
  staff: PersonSpec[];
  dress: (ctx: BuildCtx, ox: number, oy: number) => void;
};

/** Radians. The rooms are laid out so "south" is the open, camera-facing side. */
export const FACE_N = -Math.PI / 2;
export const FACE_S = Math.PI / 2;
export const FACE_E = 0;
export const FACE_W = Math.PI;
