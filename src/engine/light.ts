import { clamp01, mix, scale } from "./color";
import type { Lamp, RGB, Sky, Vec3 } from "./types";

const A = 1 / 255;

/** Colour of the sky at a given point in the day, and how strong the sun is. */
const SKY_KEYS: { at: number; ambient: RGB; sun: RGB; strength: number }[] = [
  { at: 0.0, ambient: { r: 60, g: 66, b: 90 }, sun: { r: 26, g: 30, b: 56 }, strength: 0.0 },
  { at: 4.5, ambient: { r: 68, g: 74, b: 98 }, sun: { r: 40, g: 44, b: 74 }, strength: 0.04 },
  { at: 6.2, ambient: { r: 108, g: 100, b: 114 }, sun: { r: 176, g: 108, b: 74 }, strength: 0.35 },
  { at: 8.0, ambient: { r: 162, g: 160, b: 166 }, sun: { r: 214, g: 176, b: 132 }, strength: 0.7 },
  { at: 12.0, ambient: { r: 190, g: 191, b: 196 }, sun: { r: 236, g: 226, b: 206 }, strength: 0.92 },
  { at: 16.0, ambient: { r: 178, g: 174, b: 170 }, sun: { r: 232, g: 202, b: 160 }, strength: 0.82 },
  { at: 18.6, ambient: { r: 128, g: 112, b: 116 }, sun: { r: 218, g: 122, b: 78 }, strength: 0.44 },
  { at: 20.2, ambient: { r: 88, g: 86, b: 112 }, sun: { r: 92, g: 68, b: 88 }, strength: 0.1 },
  { at: 24.0, ambient: { r: 60, g: 66, b: 90 }, sun: { r: 26, g: 30, b: 56 }, strength: 0.0 },
];

export function skyAt(hour: number): Sky {
  const t = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].at < t) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const k = clamp01((t - a.at) / (b.at - a.at || 1));
  const ambient = mix(a.ambient, b.ambient, k);
  const strength = a.strength + (b.strength - a.strength) * k;
  const sun = scale(mix(a.sun, b.sun, k), strength);

  // The sun tracks from the -y side over to +y across the day, staying low
  // enough that it rakes across the back wall rather than washing the floor.
  const day = clamp01((t - 5.6) / 12.8);
  const az = Math.PI * (0.18 + day * 0.64);
  const el = Math.max(0.06, Math.sin(day * Math.PI)) * 0.86 + 0.14;
  const hx = Math.cos(az);
  const hy = Math.sin(az);
  const len = Math.hypot(hx, hy, el) || 1;

  return {
    ambient,
    sun,
    sunDir: { x: hx / len, y: hy / len, z: el / len },
    bounce: scale(ambient, 0.45),
    daylight: clamp01(strength / 0.92),
  };
}

/**
 * Per-vertex lighting. Hue lives in the material and the light only changes
 * level and warmth, which is what keeps a grey wall stippling as paper and
 * carbon instead of sliding into the amber ink.
 */
export class Lighting {
  sky: Sky = skyAt(9.5);
  /** Every lamp in the world. */
  all: Lamp[] = [];
  /** The ones that can reach what is currently being drawn. */
  lamps: Lamp[] = [];
  /** Extra multiplier on every lamp, so the halls can dim as a group. */
  lampGain = 1;
  readonly out = new Float32Array(3);
  private region = [-Infinity, Infinity, -Infinity, Infinity];

  reset(sky: Sky): void {
    this.sky = sky;
    this.all.length = 0;
    this.lamps = this.all;
    this.region = [-Infinity, Infinity, -Infinity, Infinity];
  }

  addLamp(lamp: Lamp): void {
    this.all.push(lamp);
  }

  /**
   * Narrows the lamp list to the part of the block about to be drawn. Shading
   * is per vertex and the block is wide, so this is the difference between
   * testing a handful of lamps and testing all of them, tens of thousands of
   * times.
   *
   * It narrows on both axes. Filtering by x alone was enough for a block three
   * rows deep; with six rows every column's slice carried every lamp in the
   * column, and a room was shaded against lamps five rooms away.
   */
  setRegion(xFrom: number, xTo: number, yFrom = -Infinity, yTo = Infinity): void {
    const r = this.region;
    if (xFrom === r[0] && xTo === r[1] && yFrom === r[2] && yTo === r[3]) return;
    this.region = [xFrom, xTo, yFrom, yTo];
    const near: Lamp[] = [];
    for (const lamp of this.all) {
      if (lamp.x + lamp.radius < xFrom || lamp.x - lamp.radius > xTo) continue;
      if (lamp.y + lamp.radius < yFrom || lamp.y - lamp.radius > yTo) continue;
      near.push(lamp);
    }
    this.lamps = near;
  }

  clearRegion(): void {
    this.lamps = this.all;
    this.region = [-Infinity, Infinity, -Infinity, Infinity];
  }

  shade(base: RGB, nx: number, ny: number, nz: number, x: number, y: number, z: number, emissive: number): void {
    const out = this.out;
    if (emissive >= 1) {
      out[0] = base.r;
      out[1] = base.g;
      out[2] = base.b;
      return;
    }
    const sky = this.sky;
    const hemi = 0.64 + 0.36 * nz;
    const low = 1 - hemi;
    let lr = (sky.ambient.r * hemi + sky.bounce.r * low) * A;
    let lg = (sky.ambient.g * hemi + sky.bounce.g * low) * A;
    let lb = (sky.ambient.b * hemi + sky.bounce.b * low) * A;

    const sd = nx * sky.sunDir.x + ny * sky.sunDir.y + nz * sky.sunDir.z;
    if (sd > 0) {
      lr += sky.sun.r * A * sd;
      lg += sky.sun.g * A * sd;
      lb += sky.sun.b * A * sd;
    }

    const lamps = this.lamps;
    const gain = this.lampGain;
    for (let i = 0; i < lamps.length; i++) {
      const lamp = lamps[i];
      const dx = lamp.x - x;
      const dy = lamp.y - y;
      const dz = lamp.z - z;
      const r2 = dx * dx + dy * dy + dz * dz;
      const rad = lamp.radius;
      if (r2 > rad * rad) continue;
      const dist = Math.sqrt(r2) || 0.0001;
      const fall = 1 - dist / rad;
      // Softer than inverse-square. A lamp in a drawing is allowed to reach
      // further than a lamp in physics, and the room has to stay readable.
      const att = fall * (0.35 + 0.65 * fall);
      // Wrapped diffuse: a face turned away still picks up a little, which
      // reads as bounce inside a small room.
      const ndl = (dx * nx + dy * ny + dz * nz) / dist;
      const wrap = ndl > -0.3 ? (ndl + 0.3) / 1.3 : 0;
      const k = att * wrap * lamp.power * gain * A;
      if (k <= 0) continue;
      lr += lamp.color.r * k;
      lg += lamp.color.g * k;
      lb += lamp.color.b * k;
    }

    const em = emissive > 0 ? emissive : 0;
    const keep = 1 - em;
    out[0] = base.r * (lr * keep + em * 1.15);
    out[1] = base.g * (lg * keep + em * 1.15);
    out[2] = base.b * (lb * keep + em * 1.15);
  }

  /** Total lamp energy reaching a point, ignoring orientation. Used by fog and motes. */
  energyAt(x: number, y: number, z: number): number {
    let e = 0;
    for (const lamp of this.lamps) {
      const d = Math.hypot(lamp.x - x, lamp.y - y, lamp.z - z);
      if (d >= lamp.radius) continue;
      const fall = 1 - d / lamp.radius;
      e += fall * fall * lamp.power * this.lampGain;
    }
    return e;
  }
}

export const NX: Vec3 = { x: 1, y: 0, z: 0 };
export const NY: Vec3 = { x: 0, y: 1, z: 0 };
export const NZ: Vec3 = { x: 0, y: 0, z: 1 };
