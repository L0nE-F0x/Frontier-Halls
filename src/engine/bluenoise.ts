/**
 * A 64x64 void-and-cluster blue-noise tile, generated offline and baked in.
 *
 * Interleaved gradient noise was here first. IGN is built for a renderer that
 * accumulates several frames, and on a still frame at this pixel size its
 * structure is plainly visible: turn the grain off and a smooth gradient lays
 * down a diagonal weave. This tile has almost no energy at low frequencies
 * (measured: a low/high power ratio of 0.015, against 1.21 for white noise),
 * so a gradient breaks into an even stipple with no pattern to read.
 *
 * Every one of the 256 levels appears exactly 16 times, which is what keeps a
 * flat mid-tone from drifting light or dark.
 */
const PACKED =
  "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";

export const NOISE_SIZE = 64;
export const NOISE_MASK = NOISE_SIZE - 1;

/** 0..1, one value per cell of the tile. */
export const BLUE_NOISE: Float32Array = (() => {
  const bytes = decode(PACKED);
  const out = new Float32Array(bytes.length);
  // Centres of the 256 buckets, so the mean lands on 0.5 exactly.
  for (let i = 0; i < bytes.length; i++) out[i] = (bytes[i] + 0.5) / 256;
  return out;
})();

/** Signed, -0.5..0.5. The form the dither threshold wants. */
export function blueAt(x: number, y: number): number {
  return BLUE_NOISE[(y & NOISE_MASK) * NOISE_SIZE + (x & NOISE_MASK)] - 0.5;
}

/** Base64 without leaning on atob or Buffer, so tests and the browser agree. */
function decode(text: string): Uint8Array {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Int16Array(256).fill(-1);
  for (let i = 0; i < A.length; i++) lookup[A.charCodeAt(i)] = i;
  const clean = text.replace(/=+$/, "");
  const out = new Uint8Array((clean.length * 3) >> 2);
  let bits = 0;
  let held = 0;
  let at = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = lookup[clean.charCodeAt(i)];
    if (v < 0) continue;
    held = (held << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (held >> bits) & 255;
    }
  }
  return out;
}
