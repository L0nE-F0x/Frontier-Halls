import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import type { PersonSpec } from "../person";

export type StationKind =
  | "bench" | "rack" | "board" | "table" | "frame" | "rest" | "window" | "door" | "floor";

/** A place in a hall a figure can stand, and what it is for. */
export type Station = {
  id: string;
  label: string;
  kind: StationKind;
  /** Hall-local coordinates. */
  x: number;
  y: number;
  /** Direction the figure faces when it gets there, radians. */
  face: number;
  /** How many figures may use it at once. */
  capacity?: number;
};

export type LampSpec = {
  x: number;
  y: number;
  z?: number;
  power?: number;
  radius?: number;
  tint?: RGB;
};

export type Fact = { label: string; value: string };

export type HallSpec = {
  id: string;
  /** Keyboard shortcut, "1".."8". */
  key: string;
  name: string;
  /** Short form for the plaque over the door. */
  plaque: string;
  /** One line under the name in the dossier. */
  tagline: string;
  /** The lab's public ethos, as this room plays it. */
  ethos: string;
  /** Shown when the hall is selected and no model is. */
  blurb: string;
  /** What you are looking at, written for someone standing in the doorway. */
  reading: string;
  facts: Fact[];
  accent: RGB;
  floor: RGB;
  index: number;
  stations: Station[];
  lamps: LampSpec[];
  people: PersonSpec[];
  dress: (ctx: BuildCtx, ox: number, oy: number) => void;
};

export function station(
  id: string, label: string, kind: StationKind,
  x: number, y: number, face: number, capacity = 1,
): Station {
  return { id, label, kind, x, y, face, capacity };
}

/** Radians. The halls are laid out so "south" is the open, camera-facing side. */
export const FACE_N = -Math.PI / 2;
export const FACE_S = Math.PI / 2;
export const FACE_E = 0;
export const FACE_W = Math.PI;
