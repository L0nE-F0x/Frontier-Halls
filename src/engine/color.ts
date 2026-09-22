import type { RGB } from "./types";

export function rgb(r: number, g: number, b: number): RGB {
  return { r, g, b };
}

export function css(c: RGB): string {
  return `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
}

export function hex(c: RGB): string {
  const p = (n: number) => Math.round(clamp255(n)).toString(16).padStart(2, "0");
  return `#${p(c.r)}${p(c.g)}${p(c.b)}`;
}

export function clamp255(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = clamp01(t);
  return { r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k };
}

export function scale(c: RGB, k: number): RGB {
  return { r: c.r * k, g: c.g * k, b: c.b * k };
}

/** Pushes a colour toward or away from its own luminance. k > 1 saturates. */
export function saturate(c: RGB, k: number): RGB {
  const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  return {
    r: clamp255(lum + (c.r - lum) * k),
    g: clamp255(lum + (c.g - lum) * k),
    b: clamp255(lum + (c.b - lum) * k),
  };
}

export function luma(c: RGB): number {
  return c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
}

export function parseHex(value: string): RGB {
  const s = value.replace("#", "");
  const n = parseInt(s.length === 3 ? s.replace(/./g, (c) => c + c) : s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
