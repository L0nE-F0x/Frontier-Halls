import { luma, parseHex } from "./color";
import type { RGB } from "./types";

/**
 * A palette is two lists. The ramp is the achromatic ladder every grey is
 * stippled along, darkest first. The accents are the colours a pixel may reach
 * only when it is genuinely that colour, which is what keeps a grey floor from
 * collapsing into amber.
 */
export type Palette = {
  id: string;
  name: string;
  note: string;
  ramp: RGB[];
  accents: RGB[];
  /**
   * Which step of the ramp the page sits on in full daylight. It walks down
   * from here as the day ends. Left at the top of the ramp a palette is a
   * light one; a palette whose whole idea is a dark sheet — a blueprint, a
   * terminal, the building after hours — says so by starting lower, which is
   * what makes it dark at noon as well as at midnight.
   */
  pageTop: number;
  /** Named roles the world reads so materials follow the palette. */
  roles: {
    lamp: RGB;
    led: RGB;
    seal: RGB;
    sky: RGB;
    /**
     * The two colours a lab can wear besides the three every palette has.
     * A palette whose idea is a strict handful of inks — two drums, one tube —
     * does not get more of them; its red and green fall back onto the nearest
     * accent it already has, and those halls share a colour there.
     */
    red: RGB;
    green: RGB;
    ink: RGB;
    paper: RGB;
  };
};

type Spec = {
  id: string;
  name: string;
  note: string;
  ramp: string[];
  accents: string[];
  /** Index into the sorted ramp. Absent means the top of it: a light page. */
  pageTop?: number;
  roles: { lamp: number; led: number; seal: number; sky: number; red: number; green: number };
};

const SPECS: Spec[] = [
  {
    id: "foolscap",
    name: "Foolscap",
    note: "Warm paper, carbon line, one lamp that is allowed to be warm.",
    ramp: ["#201e24", "#3a3841", "#5d5a60", "#827d7c", "#a9a49d", "#d6d2cc"],
    // Brick and sage were added when the block grew past thirty labs: three
    // colours spread over that many rooms stopped telling any of them apart.
    accents: ["#d69236", "#2aa4ac", "#624e9c", "#bf4f3c", "#5f9a55"],
    roles: { lamp: 0, led: 1, seal: 2, sky: 1, red: 3, green: 4 },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    note: "Drawn in white on a wet blue sheet. The lamp reads as heat.",
    ramp: ["#071630", "#12294b", "#1e3f6d", "#3a6a99", "#7ba3cc", "#e0eaf7"],
    // Its pink already does the work of a red, so it only gains a green.
    accents: ["#f2a03c", "#5fd6c4", "#e2617a", "#9fd46e"],
    pageTop: 2,
    roles: { lamp: 0, led: 1, seal: 2, sky: 1, red: 2, green: 3 },
  },
  {
    id: "nightshift",
    name: "Night shift",
    note: "The building after hours. Everything is lamp, LED, or nothing.",
    ramp: ["#0a0a10", "#1a1b24", "#2e303c", "#474a5a", "#6d7183", "#b6b9c6"],
    accents: ["#ffb347", "#3fd0d8", "#c56bd0", "#ff5f52", "#7fe07c"],
    pageTop: 1,
    roles: { lamp: 0, led: 1, seal: 2, sky: 1, red: 3, green: 4 },
  },
  {
    id: "risograph",
    name: "Risograph",
    note: "Two-drum print. Fluorescent pink is the only thing in a hurry.",
    ramp: ["#241f1c", "#453e39", "#6b615a", "#8f857c", "#b8ada2", "#f2ead9"],
    accents: ["#ff4f8b", "#00a3a3", "#ffc93c"],
    roles: { lamp: 2, led: 1, seal: 0, sky: 1, red: 0, green: 1 },
  },
  {
    id: "phosphor",
    name: "Phosphor",
    note: "One tube, one gun. Read it the way you read a terminal.",
    ramp: ["#020604", "#07180e", "#0e3a20", "#1f6b3c", "#43a869", "#7bf0a4"],
    accents: ["#d8ff6b", "#33c9b0", "#f2b13c"],
    pageTop: 1,
    roles: { lamp: 2, led: 0, seal: 1, sky: 1, red: 2, green: 0 },
  },
  {
    id: "foundry",
    name: "Foundry",
    note: "Bone paper, iron line, rust and verdigris. The oldest hall.",
    ramp: ["#1d1a17", "#35302b", "#524b43", "#786e62", "#a89c8a", "#e4dac6"],
    accents: ["#c2562c", "#3f8f7d", "#5b6f9c"],
    roles: { lamp: 0, led: 1, seal: 2, sky: 2, red: 0, green: 1 },
  },
];

function build(spec: Spec): Palette {
  const ramp = spec.ramp.map(parseHex).sort((a, b) => luma(a) - luma(b));
  const accents = spec.accents.map(parseHex);
  return {
    id: spec.id,
    name: spec.name,
    note: spec.note,
    ramp,
    accents,
    pageTop: Math.min(ramp.length - 1, Math.max(0, spec.pageTop ?? ramp.length - 1)),
    roles: {
      lamp: accents[spec.roles.lamp],
      led: accents[spec.roles.led],
      seal: accents[spec.roles.seal],
      sky: accents[spec.roles.sky],
      red: accents[spec.roles.red],
      green: accents[spec.roles.green],
      ink: ramp[0],
      paper: ramp[ramp.length - 1],
    },
  };
}

export const PALETTES: Palette[] = SPECS.map(build);

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
