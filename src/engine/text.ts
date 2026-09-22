import type { FaceOpts, Painter } from "./painter";
import { screenX, screenY } from "./project";
import type { RGB } from "./types";

/** 5x7 glyphs, bit 4 is the left column. Uppercase, digits and the marks the signage needs. */
const GLYPH: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ",": [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  ":": [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ";": [0, 0b01100, 0b01100, 0, 0b01100, 0b00100, 0b01000],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  '"': [0b01010, 0b01010, 0b01010, 0, 0, 0, 0],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  "?": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0, 0b00100],
  "-": [0, 0, 0, 0b11111, 0, 0, 0],
  "+": [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "[": [0b01110, 0b01000, 0b01000, 0b01000, 0b01000, 0b01000, 0b01110],
  "]": [0b01110, 0b00010, 0b00010, 0b00010, 0b00010, 0b00010, 0b01110],
  "&": [0b01100, 0b10010, 0b10010, 0b01100, 0b10101, 0b10010, 0b01101],
  "=": [0, 0, 0b11111, 0, 0b11111, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0b11111],
  "#": [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  "*": [0, 0b10101, 0b01110, 0b11111, 0b01110, 0b10101, 0],
  "<": [0b00010, 0b00100, 0b01000, 0b10000, 0b01000, 0b00100, 0b00010],
  ">": [0b01000, 0b00100, 0b00010, 0b00001, 0b00010, 0b00100, 0b01000],
  "%": [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  "·": [0, 0, 0, 0b01100, 0b01100, 0, 0],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
const TRACK = 1;

export function textCells(text: string): number {
  return text.length * (GLYPH_W + TRACK) - TRACK;
}

export type TextOpts = FaceOpts & {
  /** "left" | "center" | "right", measured along the right vector. */
  align?: "left" | "center" | "right";
  /** Extra cells of leading between characters. */
  track?: number;
};

/**
 * Paints text onto a plane in world space, so signage is lit, occluded and
 * rotated with everything else. Each row of a glyph is merged into runs before
 * it is drawn, which keeps a plaque down to a couple of dozen quads.
 */
export function worldText(
  p: Painter,
  text: string,
  ox: number, oy: number, oz: number,
  rx: number, ry: number, rz: number,
  ux: number, uy: number, uz: number,
  size: number,
  color: RGB,
  opts?: TextOpts,
): void {
  const chars = text.toUpperCase();

  // A glyph cell smaller than a pixel loses whole rows of every letter, because
  // a sub-pixel quad can miss every pixel centre. Text that cannot be read is
  // better left out than drawn in pieces.
  const cam = p.cam;
  const cellW = Math.hypot(
    screenX(cam, ox + rx * size, oy + ry * size) - screenX(cam, ox, oy),
    screenY(cam, ox + rx * size, oy + ry * size, oz + rz * size) - screenY(cam, ox, oy, oz),
  );
  const cellH = Math.hypot(
    screenX(cam, ox + ux * size, oy + uy * size) - screenX(cam, ox, oy),
    screenY(cam, ox + ux * size, oy + uy * size, oz + uz * size) - screenY(cam, ox, oy, oz),
  );
  if (cellW < 0.85 || cellH < 0.85) return;

  const track = TRACK + (opts?.track ?? 0);
  const advance = GLYPH_W + track;
  const width = (chars.length * advance - track) * size;
  let start = 0;
  if (opts?.align === "center") start = -width / 2;
  else if (opts?.align === "right") start = -width;

  const nx = ry * uz - rz * uy;
  const ny = rz * ux - rx * uz;
  const nz = rx * uy - ry * ux;
  const faceOpts: FaceOpts = { ...opts, noCull: opts?.noCull ?? true };

  for (let i = 0; i < chars.length; i++) {
    const rows = GLYPH[chars[i]];
    if (!rows) continue;
    const cx = start + i * advance * size;
    for (let row = 0; row < GLYPH_H; row++) {
      const bits = rows[row];
      if (!bits) continue;
      let col = 0;
      while (col < GLYPH_W) {
        if (!(bits & (1 << (GLYPH_W - 1 - col)))) {
          col++;
          continue;
        }
        let end = col;
        while (end < GLYPH_W && bits & (1 << (GLYPH_W - 1 - end))) end++;
        const x0 = cx + col * size;
        const x1 = cx + end * size;
        const y0 = -row * size;
        const y1 = -(row + 1) * size;
        p.quad(
          ox + rx * x0 + ux * y0, oy + ry * x0 + uy * y0, oz + rz * x0 + uz * y0,
          ox + rx * x1 + ux * y0, oy + ry * x1 + uy * y0, oz + rz * x1 + uz * y0,
          ox + rx * x1 + ux * y1, oy + ry * x1 + uy * y1, oz + rz * x1 + uz * y1,
          ox + rx * x0 + ux * y1, oy + ry * x0 + uy * y1, oz + rz * x0 + uz * y1,
          color, nx, ny, nz, faceOpts,
        );
        col = end;
      }
    }
  }
}

/** Convenience for signage on a wall that faces -y (the back wall of a hall). */
export function wallText(
  p: Painter,
  text: string,
  x: number, y: number, z: number,
  size: number,
  color: RGB,
  opts?: TextOpts,
): void {
  worldText(p, text, x, y, z, 1, 0, 0, 0, 0, 1, size, color, opts);
}
