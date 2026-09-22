import { describe, expect, it } from "vitest";
import { depthOf, frameTo, project, rotX, rotY, unproject, unrotX, unrotY } from "../src/engine/project";
import type { Camera, Vec3, Yaw } from "../src/engine/types";

const YAWS: Yaw[] = [0, 1, 2, 3];

function cam(yaw: Yaw = 0): Camera {
  return { x: 3, y: -2, z: 1.5, s: 14, w: 640, h: 360, yaw };
}

describe("yaw", () => {
  it("round-trips through the inverse for every quarter turn", () => {
    for (const yaw of YAWS) {
      for (const [x, y] of [[0, 0], [7, -3], [-11, 4.5], [120, 13]]) {
        const vx = rotX(yaw, x, y);
        const vy = rotY(yaw, x, y);
        expect(unrotX(yaw, vx, vy)).toBeCloseTo(x, 10);
        expect(unrotY(yaw, vx, vy)).toBeCloseTo(y, 10);
      }
    }
  });

  it("is a rotation, so it preserves length", () => {
    for (const yaw of YAWS) {
      expect(Math.hypot(rotX(yaw, 3, 4), rotY(yaw, 3, 4))).toBeCloseTo(5, 10);
    }
  });
});

describe("project", () => {
  it("unprojects back to the same point on a horizontal plane", () => {
    for (const yaw of YAWS) {
      const c = cam(yaw);
      for (const p of [{ x: 0, y: 0, z: 0 }, { x: 18, y: 7, z: 2.5 }, { x: -4, y: 11, z: 0.18 }]) {
        const s = project(c, p.x, p.y, p.z);
        const back = unproject(c, s.sx, s.sy, p.z);
        expect(back.x).toBeCloseTo(p.x, 8);
        expect(back.y).toBeCloseTo(p.y, 8);
      }
    }
  });

  it("puts points along (1,1,1) on the same pixel, which is what depth sorting relies on", () => {
    const c = cam();
    const a = project(c, 2, 3, 1);
    const b = project(c, 5, 6, 4);
    expect(b.sx).toBeCloseTo(a.sx, 10);
    expect(b.sy).toBeCloseTo(a.sy, 10);
    // Moving along that axis is moving toward the camera, so it must be nearer.
    expect(b.d).toBeLessThan(a.d);
  });

  it("agrees with the standalone depth helper", () => {
    for (const yaw of YAWS) {
      const c = cam(yaw);
      expect(project(c, 9, -2, 3).d).toBeCloseTo(depthOf(c, 9, -2, 3), 10);
    }
  });

  it("moves +x right and down, +y left and down, +z up", () => {
    const c = cam(0);
    const o = project(c, 0, 0, 0);
    const px = project(c, 1, 0, 0);
    const py = project(c, 0, 1, 0);
    const pz = project(c, 0, 0, 1);
    expect(px.sx).toBeGreaterThan(o.sx);
    expect(px.sy).toBeGreaterThan(o.sy);
    expect(py.sx).toBeLessThan(o.sx);
    expect(py.sy).toBeGreaterThan(o.sy);
    expect(pz.sy).toBeLessThan(o.sy);
    expect(pz.sx).toBeCloseTo(o.sx, 10);
  });
});

describe("frameTo", () => {
  const box: Vec3[] = [
    { x: 0, y: 0, z: 0 }, { x: 16, y: 0, z: 0 }, { x: 16, y: 13, z: 0 }, { x: 0, y: 13, z: 0 },
    { x: 0, y: 0, z: 6 }, { x: 16, y: 0, z: 6 }, { x: 16, y: 13, z: 6 }, { x: 0, y: 13, z: 6 },
  ];
  const insets = { top: 40, right: 120, bottom: 50, left: 10 };

  it("fits the subject inside the free area", () => {
    for (const yaw of YAWS) {
      const fit = frameTo(yaw, 640, 360, insets, box, 0.9);
      const c: Camera = { ...fit, w: 640, h: 360, yaw };
      for (const p of box) {
        const s = project(c, p.x, p.y, p.z);
        expect(s.sx).toBeGreaterThanOrEqual(-1);
        expect(s.sx).toBeLessThanOrEqual(641);
        expect(s.sy).toBeGreaterThanOrEqual(-1);
        expect(s.sy).toBeLessThanOrEqual(361);
      }
    }
  });

  it("centres the subject in the free area, not in the window", () => {
    const fit = frameTo(0, 640, 360, insets, box, 0.9);
    const c: Camera = { ...fit, w: 640, h: 360, yaw: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of box) {
      const s = project(c, p.x, p.y, p.z);
      minX = Math.min(minX, s.sx); maxX = Math.max(maxX, s.sx);
      minY = Math.min(minY, s.sy); maxY = Math.max(maxY, s.sy);
    }
    expect((minX + maxX) / 2).toBeCloseTo(insets.left + (640 - insets.left - insets.right) / 2, 6);
    expect((minY + maxY) / 2).toBeCloseTo(insets.top + (360 - insets.top - insets.bottom) / 2, 6);
  });

  it("scales with the margin", () => {
    const tight = frameTo(0, 640, 360, insets, box, 0.5);
    const loose = frameTo(0, 640, 360, insets, box, 1);
    expect(loose.s).toBeCloseTo(tight.s * 2, 6);
  });
});
