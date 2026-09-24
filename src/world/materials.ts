import { mix, saturate, scale } from "../engine/color";
import type { Palette } from "../engine/palettes";
import type { RGB } from "../engine/types";

/**
 * Surface colours. The neutrals are fixed so they always stipple along the
 * palette's grey ramp; the few coloured roles are pulled from the palette, so
 * switching ink actually re-inks the building instead of only the background.
 */
export const MAT = {
  wall: { r: 140, g: 144, b: 152 } as RGB,
  wallTop: { r: 166, g: 169, b: 176 } as RGB,
  wallTrim: { r: 112, g: 116, b: 126 } as RGB,
  baseboard: { r: 94, g: 98, b: 108 } as RGB,
  ceiling: { r: 96, g: 98, b: 106 } as RGB,
  floorGrout: { r: 84, g: 85, b: 94 } as RGB,
  rack: { r: 78, g: 84, b: 96 } as RGB,
  rackTrim: { r: 104, g: 110, b: 122 } as RGB,
  metal: { r: 146, g: 149, b: 156 } as RGB,
  darkMetal: { r: 100, g: 103, b: 112 } as RGB,
  bench: { r: 146, g: 128, b: 104 } as RGB,
  benchDark: { r: 108, g: 92, b: 72 } as RGB,
  pipe: { r: 88, g: 110, b: 118 } as RGB,
  skin: { r: 216, g: 186, b: 158 } as RGB,
  skinAlt: { r: 168, g: 128, b: 100 } as RGB,
  hair: { r: 58, g: 48, b: 46 } as RGB,
  carbon: { r: 36, g: 34, b: 40 } as RGB,
  paper: { r: 226, g: 220, b: 208 } as RGB,
  cloth: { r: 158, g: 154, b: 150 } as RGB,
  // Light enough to stipple as mid-grey. A dark green has no ink of its own in
  // any of these palettes and collapses into a black blob.
  leaf: { r: 116, g: 148, b: 118 } as RGB,
  soil: { r: 92, g: 76, b: 64 } as RGB,
  terracotta: { r: 172, g: 108, b: 74 } as RGB,
  glass: { r: 150, g: 196, b: 200 } as RGB,
  screen: { r: 112, g: 172, b: 182 } as RGB,

  /*
   * Surfaces the bigger building needed. Every one of these stays under the
   * quantiser's grey threshold (a saturation of 0.17), so they stipple along
   * the ramp as a lightness, never as a colour: a warm wood is a warm grey
   * here, and a lamp falling across it is what is allowed to turn it amber.
   */
  wood: { r: 164, g: 142, b: 116 } as RGB,
  woodDark: { r: 112, g: 96, b: 80 } as RGB,
  concrete: { r: 150, g: 150, b: 146 } as RGB,
  rubber: { r: 74, g: 76, b: 82 } as RGB,
  chrome: { r: 192, g: 196, b: 202 } as RGB,
  white: { r: 228, g: 226, b: 220 } as RGB,
  black: { r: 42, g: 42, b: 48 } as RGB,
  canvas: { r: 196, g: 188, b: 174 } as RGB,
  tatami: { r: 184, g: 178, b: 146 } as RGB,
  stone: { r: 182, g: 172, b: 156 } as RGB,

  // Palette roles, refreshed by retune().
  lamp: { r: 230, g: 168, b: 84 } as RGB,
  bulb: { r: 255, g: 226, b: 156 } as RGB,
  led: { r: 126, g: 232, b: 228 } as RGB,
  ledOff: { r: 38, g: 42, b: 50 } as RGB,
  seal: { r: 124, g: 100, b: 180 } as RGB,
  shade: { r: 206, g: 150, b: 64 } as RGB,
  red: { r: 191, g: 79, b: 60 } as RGB,
  green: { r: 95, g: 154, b: 85 } as RGB,
  /** Water in a pool or a tank: the LED ink let down toward the paper. */
  water: { r: 120, g: 200, b: 204 } as RGB,
  ink: { r: 32, g: 30, b: 36 } as RGB,
  sheet: { r: 214, g: 210, b: 204 } as RGB,
};

export type Material = keyof typeof MAT;

function assign(target: RGB, source: RGB): void {
  target.r = source.r;
  target.g = source.g;
  target.b = source.b;
}

export function retune(palette: Palette): void {
  const { lamp, led, seal, red, green, ink, paper } = palette.roles;
  assign(MAT.lamp, saturate(lamp, 1.1));
  assign(MAT.bulb, mix(lamp, { r: 255, g: 255, b: 255 }, 0.55));
  assign(MAT.shade, scale(lamp, 0.92));
  assign(MAT.led, saturate(led, 1.15));
  assign(MAT.ledOff, mix(led, ink, 0.86));
  assign(MAT.seal, seal);
  assign(MAT.red, red);
  assign(MAT.green, green);
  assign(MAT.water, mix(led, paper, 0.28));
  assign(MAT.ink, ink);
  assign(MAT.sheet, paper);
  assign(MAT.paper, mix(paper, { r: 255, g: 255, b: 255 }, 0.25));
  assign(MAT.screen, mix(led, { r: 220, g: 240, b: 240 }, 0.35));
  assign(MAT.glass, mix(led, paper, 0.45));
}
