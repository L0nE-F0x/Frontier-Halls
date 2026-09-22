/** Deterministic helpers. Everything scattered in the world is a function of a
 *  seed, so a reload puts the same mug on the same desk. */

export function hash2(x: number, y: number): number {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >>> 13)) * 1274126177;
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export function hash1(n: number): number {
  let h = (n | 0) * 2654435761;
  h ^= h >>> 15;
  h = (h * 2246822519) | 0;
  h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise. Used for flicker and drift. */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash1(i);
  const b = hash1(i + 1);
  return a + (b - a) * u;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
