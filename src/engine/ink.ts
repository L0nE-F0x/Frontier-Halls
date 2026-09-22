import { BLUE_NOISE, NOISE_MASK, NOISE_SIZE } from "./bluenoise";
import { luma } from "./color";
import type { Palette } from "./palettes";
import type { RGB } from "./types";

/*
 * The dither threshold comes from a baked blue-noise tile. Two earlier
 * attempts are worth remembering: an ordered Bayer matrix has rows whose
 * averages alternate high and low, and it striped every floor in the building;
 * interleaved gradient noise fixed the stripes but laid down a diagonal weave
 * of its own, which a large smooth gradient made obvious. See bluenoise.ts.
 */

/** Value hash. Stable per pixel, so the grain does not boil between frames. */
const GRAIN = new Float32Array(4096);
{
  let seed = 0x9e3779b9;
  for (let i = 0; i < GRAIN.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    GRAIN[i] = ((seed >>> 8) & 0xffff) / 0xffff - 0.5;
  }
}

const LUT_BITS = 5;
const LUT_SIZE = 1 << (LUT_BITS * 3);

export type InkTable = {
  palette: Palette;
  inks: RGB[];
  /** Flattened rgb of every ink, for the fast write path. */
  flat: Uint8Array;
  a: Uint8Array;
  b: Uint8Array;
  t: Uint8Array;
};

function nearestPair(c: RGB, inks: RGB[]): { a: number; b: number; t: number } {
  let i0 = 0;
  let i1 = 0;
  let d0 = Infinity;
  let d1 = Infinity;
  for (let i = 0; i < inks.length; i++) {
    const ink = inks[i];
    const dr = c.r - ink.r;
    const dg = c.g - ink.g;
    const db = c.b - ink.b;
    // Weighted to track perceived difference a little better than plain RGB.
    const d = dr * dr * 0.5 + dg * dg * 0.85 + db * db * 0.35;
    if (d < d0) {
      d1 = d0;
      i1 = i0;
      d0 = d;
      i0 = i;
    } else if (d < d1) {
      d1 = d;
      i1 = i;
    }
  }
  const a = inks[i0];
  const b = inks[i1];
  const abx = b.r - a.r;
  const aby = b.g - a.g;
  const abz = b.b - a.b;
  const len = abx * abx + aby * aby + abz * abz;
  const t =
    len === 0 ? 0 : ((c.r - a.r) * abx + (c.g - a.g) * aby + (c.b - a.b) * abz) / len;
  return { a: i0, b: i1, t: t < 0 ? 0 : t > 1 ? 1 : t };
}

export function buildInkTable(palette: Palette): InkTable {
  const inks = [...palette.ramp, ...palette.accents];
  const rampLuma = palette.ramp.map(luma);
  const a = new Uint8Array(LUT_SIZE);
  const b = new Uint8Array(LUT_SIZE);
  const t = new Uint8Array(LUT_SIZE);
  const step = 255 / ((1 << LUT_BITS) - 1);

  for (let ri = 0; ri < 1 << LUT_BITS; ri++) {
    for (let gi = 0; gi < 1 << LUT_BITS; gi++) {
      for (let bi = 0; bi < 1 << LUT_BITS; bi++) {
        const c = { r: ri * step, g: gi * step, b: bi * step };
        const max = Math.max(c.r, c.g, c.b);
        const min = Math.min(c.r, c.g, c.b);
        const sat = (max - min) / 255;
        const index = (ri << (LUT_BITS * 2)) | (gi << LUT_BITS) | bi;
        if (sat < 0.17) {
          const l = luma(c);
          let lo = 0;
          while (lo < rampLuma.length - 2 && rampLuma[lo + 1] < l) lo++;
          const hi = lo + 1;
          const span = rampLuma[hi] - rampLuma[lo] || 1;
          const f = (l - rampLuma[lo]) / span;
          a[index] = lo;
          b[index] = hi;
          t[index] = Math.round(Math.max(0, Math.min(1, f)) * 255);
        } else {
          const pair = nearestPair(c, inks);
          a[index] = pair.a;
          b[index] = pair.b;
          t[index] = Math.round(pair.t * 255);
        }
      }
    }
  }

  const flat = new Uint8Array(inks.length * 3);
  inks.forEach((ink, i) => {
    flat[i * 3] = ink.r;
    flat[i * 3 + 1] = ink.g;
    flat[i * 3 + 2] = ink.b;
  });

  return { palette, inks, flat, a, b, t };
}

/**
 * Reduces the frame to the palette in place. Two inks are chosen per pixel and
 * the blue-noise threshold decides which of the two this pixel actually gets,
 * so a gradient reads as a stipple between neighbours rather than a hard step.
 *
 * `page` is the exact ink the frame was cleared to. It is what the vignette
 * fades toward, so the empty margin of the drawing stays perfectly flat.
 */
export function quantize(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  table: InkTable,
  strength: number,
  grainAmount: number,
  vignette = 0,
  page?: RGB,
): void {
  const { a, b, t, flat } = table;
  const cx = w / 2;
  const cy = h / 2;
  const radial = vignette > 0 ? 1 / (cx * cx + cy * cy) : 0;
  const dither = strength > 0 || grainAmount > 0;
  // The edge treatment fades toward the page rather than toward black. A pixel
  // that is already the page colour is then left exactly alone, which is the
  // whole point of backdrop() picking an exact ink: darkening it instead walks
  // the empty margin of the frame off that ink and into the gap between two
  // ramp steps, where it dithers into a field of dust.
  const pr = page ? page.r : 0;
  const pg = page ? page.g : 0;
  const pb = page ? page.b : 0;

  for (let y = 0; y < h; y++) {
    const rowG = (y * 131) & 4095;
    const noiseRow = (y & NOISE_MASK) * NOISE_SIZE;
    const dy = y - cy;
    const dy2 = dy * dy;
    let i = (y * w) << 2;
    for (let x = 0; x < w; x++, i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let bl = data[i + 2];
      if (vignette > 0) {
        // The vignette rides along here rather than in its own pass, so it is
        // stippled by the same matrix as everything else.
        const dx = x - cx;
        const f = (dx * dx + dy2) * radial;
        const k = vignette * f * f;
        r += (pr - r) * k;
        g += (pg - g) * k;
        bl += (pb - bl) * k;
      }
      const index =
        ((r >> 3) << (LUT_BITS * 2)) | ((g >> 3) << LUT_BITS) | (bl >> 3);
      let pick: number;
      if (dither) {
        const noise =
          (BLUE_NOISE[noiseRow + (x & NOISE_MASK)] - 0.5) * strength +
          GRAIN[(rowG + x * 7) & 4095] * grainAmount;
        pick = (t[index] * (1 / 255) + noise > 0.5 ? b[index] : a[index]) * 3;
      } else {
        pick = (t[index] > 127 ? b[index] : a[index]) * 3;
      }
      data[i] = flat[pick];
      data[i + 1] = flat[pick + 1];
      data[i + 2] = flat[pick + 2];
    }
  }
}

/**
 * The page colour. Picked as an exact ink rather than mixed, because a
 * background that lands between two inks dithers into a loud checkerboard and
 * fights everything drawn on top of it.
 */
export function backdrop(table: InkTable, daylight: number): RGB {
  const ramp = table.palette.ramp;
  const top = table.palette.pageTop;
  const step = daylight > 0.58 ? 0 : daylight > 0.26 ? 1 : daylight > 0.08 ? 2 : 3;
  return ramp[Math.min(ramp.length - 1, Math.max(0, top - step))];
}
