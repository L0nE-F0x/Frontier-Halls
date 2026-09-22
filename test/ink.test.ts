import { describe, expect, it } from "vitest";
import { backdrop, buildInkTable, quantize } from "../src/engine/ink";
import { PALETTES } from "../src/engine/palettes";
import { luma } from "../src/engine/color";

function frame(w: number, h: number, fill: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

describe("palettes", () => {
  it("keeps every ramp sorted from dark to light", () => {
    for (const p of PALETTES) {
      const levels = p.ramp.map(luma);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
      expect(p.ramp.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives every palette three accents and distinct ids", () => {
    const ids = new Set(PALETTES.map((p) => p.id));
    expect(ids.size).toBe(PALETTES.length);
    for (const p of PALETTES) expect(p.accents).toHaveLength(3);
  });
});

describe("quantize", () => {
  const table = buildInkTable(PALETTES[0]);
  const inks = table.inks.map((c) => `${c.r},${c.g},${c.b}`);

  it("only ever writes colours from the palette", () => {
    const data = frame(32, 32, (x, y) => [x * 8, y * 8, (x + y) * 4]);
    quantize(data, 32, 32, table, 0.7, 0.2);
    for (let i = 0; i < data.length; i += 4) {
      expect(inks).toContain(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
  });

  it("leaves an exact ink alone, so the page never dithers against itself", () => {
    for (const ink of table.inks) {
      const data = frame(8, 8, () => [ink.r, ink.g, ink.b]);
      quantize(data, 8, 8, table, 0.7, 0.25);
      for (let i = 0; i < data.length; i += 4) {
        expect([data[i], data[i + 1], data[i + 2]]).toEqual([ink.r, ink.g, ink.b]);
      }
    }
  });

  it("stipples a grey between two inks instead of picking one", () => {
    const ramp = PALETTES[0].ramp;
    const mid = {
      r: (ramp[2].r + ramp[3].r) / 2,
      g: (ramp[2].g + ramp[3].g) / 2,
      b: (ramp[2].b + ramp[3].b) / 2,
    };
    const data = frame(64, 64, () => [mid.r, mid.g, mid.b]);
    quantize(data, 64, 64, table, 0.8, 0.1);
    const used = new Set<string>();
    for (let i = 0; i < data.length; i += 4) used.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    expect(used.size).toBe(2);
  });

  it("does not stripe: a flat mid-tone dithers evenly across rows", () => {
    const ramp = PALETTES[0].ramp;
    const mid = {
      r: ramp[3].r * 0.5 + ramp[4].r * 0.5,
      g: ramp[3].g * 0.5 + ramp[4].g * 0.5,
      b: ramp[3].b * 0.5 + ramp[4].b * 0.5,
    };
    const w = 64;
    const h = 64;
    const data = frame(w, h, () => [mid.r, mid.g, mid.b]);
    quantize(data, w, h, table, 0.8, 0);
    const light = `${ramp[4].r},${ramp[4].g},${ramp[4].b}`;
    const perRow: number[] = [];
    for (let y = 0; y < h; y++) {
      let n = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (`${data[i]},${data[i + 1]},${data[i + 2]}` === light) n++;
      }
      perRow.push(n / w);
    }
    // An ordered matrix with alternating row means used to give rows of 0 and 1.
    for (const share of perRow) {
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.85);
    }
  });

  it("darkens the corners when a vignette is applied", () => {
    const data = frame(64, 64, () => [150, 150, 150]);
    quantize(data, 64, 64, table, 0, 0, 0.6);
    const corner = luma({ r: data[0], g: data[1], b: data[2] });
    const middle = (32 * 64 + 32) * 4;
    const centre = luma({ r: data[middle], g: data[middle + 1], b: data[middle + 2] });
    expect(corner).toBeLessThan(centre);
  });
});

describe("backdrop", () => {
  it("is always an exact ink, and gets darker as the day ends", () => {
    const table = buildInkTable(PALETTES[0]);
    const day = backdrop(table, 1);
    const night = backdrop(table, 0);
    expect(table.palette.ramp).toContainEqual(day);
    expect(table.palette.ramp).toContainEqual(night);
    expect(luma(night)).toBeLessThan(luma(day));
  });
});
