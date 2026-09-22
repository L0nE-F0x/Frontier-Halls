import { describe, expect, it } from "vitest";
import { Raster } from "../src/engine/raster";

const PAPER = { r: 200, g: 200, b: 200 };
const RED = { r: 255, g: 0, b: 0 };

function fresh(w = 32, h = 32): Raster {
  const r = new Raster();
  r.resize(w, h);
  r.clear(PAPER);
  return r;
}

function at(r: Raster, x: number, y: number): [number, number, number] {
  const i = (y * r.w + x) << 2;
  return [r.col[i], r.col[i + 1], r.col[i + 2]];
}

/** Fills the square (0,0)-(20,20) at a constant depth. */
function square(r: Raster, depth: number, colour: { r: number; g: number; b: number }, id = 0, alpha = 1) {
  const { r: cr, g: cg, b: cb } = colour;
  r.tri(0, 0, depth, cr, cg, cb, 20, 0, depth, cr, cg, cb, 20, 20, depth, cr, cg, cb, alpha, 0, id);
  r.tri(0, 0, depth, cr, cg, cb, 20, 20, depth, cr, cg, cb, 0, 20, depth, cr, cg, cb, alpha, 0, id);
}

describe("clear", () => {
  it("fills with the page colour and resets the buffers", () => {
    const r = fresh();
    expect(at(r, 5, 5)).toEqual([200, 200, 200]);
    expect(r.dep[5 * r.w + 5]).toBe(Infinity);
    expect(r.idAt(5, 5)).toBe(0);
  });
});

describe("depth", () => {
  it("lets the nearer surface win whatever order it arrives in", () => {
    const near = fresh();
    square(near, 5, RED);
    square(near, 1, { r: 0, g: 255, b: 0 });
    expect(at(near, 5, 5)).toEqual([0, 255, 0]);

    const far = fresh();
    square(far, 1, { r: 0, g: 255, b: 0 });
    square(far, 5, RED);
    expect(at(far, 5, 5)).toEqual([0, 255, 0]);
  });

  it("interpolates depth across a triangle", () => {
    const r = fresh();
    r.tri(0, 0, 0, 255, 0, 0, 20, 0, 10, 255, 0, 0, 20, 20, 10, 255, 0, 0, 1, 0, 0);
    expect(r.dep[1 * r.w + 18]).toBeGreaterThan(r.dep[1 * r.w + 2]);
  });
});

describe("ids", () => {
  it("records what covered each pixel, so picking is exact", () => {
    const r = fresh();
    square(r, 2, RED, 7);
    expect(r.idAt(5, 5)).toBe(7);
    expect(r.idAt(30, 30)).toBe(0);
  });

  it("is overwritten when something nearer lands on top", () => {
    const r = fresh();
    square(r, 5, RED, 7);
    square(r, 1, { r: 0, g: 0, b: 255 }, 9);
    expect(r.idAt(5, 5)).toBe(9);
  });

  it("returns nothing outside the buffer", () => {
    const r = fresh();
    expect(r.idAt(-1, 4)).toBe(0);
    expect(r.idAt(4, 999)).toBe(0);
  });
});

describe("blending", () => {
  it("mixes with what is underneath and leaves depth and id alone", () => {
    const r = fresh();
    square(r, 5, { r: 0, g: 0, b: 0 }, 3);
    square(r, 1, { r: 255, g: 255, b: 255 }, 9, 0.5);
    const [red] = at(r, 5, 5);
    expect(red).toBeGreaterThan(100);
    expect(red).toBeLessThan(160);
    expect(r.idAt(5, 5)).toBe(3);
    expect(r.dep[5 * r.w + 5]).toBe(5);
  });
});

describe("segment", () => {
  it("draws a line without scanning the whole bounding box", () => {
    const r = fresh();
    r.segment(2, 2, 1, 28, 15, 1, 255, 0, 0, 1, 0, 4);
    expect(at(r, 2, 2)).toEqual([255, 0, 0]);
    expect(at(r, 28, 15)).toEqual([255, 0, 0]);
    // A point well off the line is untouched, which a triangle fill would not
    // guarantee for something this thin.
    expect(at(r, 4, 14)).toEqual([200, 200, 200]);
    expect(r.idAt(2, 2)).toBe(4);
  });

  it("respects depth", () => {
    const r = fresh();
    square(r, 1, { r: 0, g: 0, b: 255 });
    r.segment(2, 2, 9, 18, 11, 9, 255, 0, 0, 1, 0, 0);
    expect(at(r, 5, 3)).toEqual([0, 0, 255]);
  });

  it("clips rather than writing outside the buffer", () => {
    const r = fresh();
    expect(() => r.segment(-40, -40, 1, 90, 90, 1, 255, 0, 0, 3, 0, 0)).not.toThrow();
    expect(at(r, 16, 16)).toEqual([255, 0, 0]);
  });
});

describe("outline", () => {
  it("rings the pixels carrying an id and leaves the rest alone", () => {
    const r = fresh();
    r.tri(8, 8, 1, 255, 0, 0, 16, 8, 1, 255, 0, 0, 16, 16, 1, 255, 0, 0, 1, 0, 5);
    r.outline(5, { r: 0, g: 0, b: 0 }, 1);
    expect(at(r, 7, 8)).toEqual([0, 0, 0]);
    expect(at(r, 0, 0)).toEqual([200, 200, 200]);
  });

  it("does nothing when the id is not on screen", () => {
    const r = fresh();
    square(r, 1, RED, 2);
    r.outline(99, { r: 0, g: 0, b: 0 }, 1);
    expect(at(r, 5, 5)).toEqual([255, 0, 0]);
  });
});

describe("bloom", () => {
  it("spreads glow into neighbouring pixels", () => {
    const r = fresh();
    r.tri(15, 15, 1, 255, 255, 255, 17, 15, 1, 255, 255, 255, 17, 17, 1, 255, 255, 255, 1, 1, 0);
    const before = at(r, 22, 16)[0];
    r.bloom(4, 1, { r: 255, g: 255, b: 255 });
    expect(at(r, 22, 16)[0]).toBeGreaterThan(before);
  });

  it("does nothing at zero amount", () => {
    const r = fresh();
    r.tri(15, 15, 1, 255, 255, 255, 17, 15, 1, 255, 255, 255, 17, 17, 1, 255, 255, 255, 1, 1, 0);
    r.bloom(4, 0, { r: 255, g: 255, b: 255 });
    expect(at(r, 22, 16)).toEqual([200, 200, 200]);
  });
});
