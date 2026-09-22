import { describe, expect, it } from "vitest";
import { backdrop, buildInkTable, quantize } from "../src/engine/ink";
import { PALETTES } from "../src/engine/palettes";
import { hex, luma } from "../src/engine/color";

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

  it("pulls the corners toward the page when a vignette is applied", () => {
    const page = PALETTES[0].ramp[0];
    const data = frame(64, 64, () => [150, 150, 150]);
    quantize(data, 64, 64, table, 0, 0, 0.6, page);
    const corner = luma({ r: data[0], g: data[1], b: data[2] });
    const middle = (32 * 64 + 32) * 4;
    const centre = luma({ r: data[middle], g: data[middle + 1], b: data[middle + 2] });
    // The page here is the darkest ink, so fading toward it darkens.
    expect(corner).toBeLessThan(centre);
  });

  /*
   * The one the old pair of tests walked straight past: each proved half of
   * this and neither used the other's parameter, so a vignette over the page
   * colour dithered the whole empty margin of the frame into noise.
   */
  it("leaves the page alone under a vignette, however strong", () => {
    for (const page of table.inks) {
      for (const vignette of [0.2, 0.5, 0.8]) {
        const data = frame(48, 48, () => [page.r, page.g, page.b]);
        quantize(data, 48, 48, table, 0.7, 0.25, vignette, page);
        const used = new Set<string>();
        for (let i = 0; i < data.length; i += 4) used.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        expect([...used], `${hex(page)} at ${vignette}`).toEqual([`${page.r},${page.g},${page.b}`]);
      }
    }
  });

  it("still fades anything that is not the page", () => {
    const page = PALETTES[0].ramp[PALETTES[0].ramp.length - 1];
    const data = frame(64, 64, () => [20, 20, 24]);
    quantize(data, 64, 64, table, 0, 0, 0.8, page);
    const corner = luma({ r: data[0], g: data[1], b: data[2] });
    const middle = (32 * 64 + 32) * 4;
    const centre = luma({ r: data[middle], g: data[middle + 1], b: data[middle + 2] });
    expect(corner).toBeGreaterThan(centre);
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

describe("the page a palette sits on", () => {
  it("is an exact ink at every hour, for every palette", () => {
    for (const palette of PALETTES) {
      const table = buildInkTable(palette);
      for (const daylight of [0, 0.07, 0.2, 0.4, 0.7, 1]) {
        expect(palette.ramp, `${palette.id} at ${daylight}`).toContainEqual(backdrop(table, daylight));
      }
    }
  });

  it("never gets lighter as the day ends", () => {
    for (const palette of PALETTES) {
      const table = buildInkTable(palette);
      const hours = [1, 0.4, 0.2, 0].map((d) => luma(backdrop(table, d)));
      for (let i = 1; i < hours.length; i++) {
        expect(hours[i], `${palette.id}`).toBeLessThanOrEqual(hours[i - 1]);
      }
    }
  });

  /*
   * A palette whose whole idea is a dark sheet used to render on a light page:
   * the page was pinned to the lightest step of the ramp for everyone, so
   * "Night shift" and "Phosphor" were light by day and the dark-page branch in
   * the interface was unreachable.
   */
  it("is dark at noon for the palettes that are meant to be dark", () => {
    for (const id of ["blueprint", "nightshift", "phosphor"]) {
      const palette = PALETTES.find((p) => p.id === id)!;
      expect(luma(backdrop(buildInkTable(palette), 1)), id).toBeLessThan(110);
    }
    for (const id of ["foolscap", "risograph", "foundry"]) {
      const palette = PALETTES.find((p) => p.id === id)!;
      expect(luma(backdrop(buildInkTable(palette), 1)), id).toBeGreaterThan(150);
    }
  });
});
