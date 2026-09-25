import { describe, expect, it } from "vitest";
import { Rig } from "../src/app/camera";
import { unrotX, unrotY } from "../src/engine/project";
import type { Vec3 } from "../src/engine/types";

const BLOCK: Vec3[] = [];
for (const z of [0, 4]) BLOCK.push({ x: 0, y: 0, z }, { x: 40, y: 0, z }, { x: 40, y: 30, z }, { x: 0, y: 30, z });

/** A rig looking at a 40 by 30 block, framed and settled. */
function framed(): Rig {
  const rig = new Rig();
  rig.setViewport(400, 240);
  rig.insets = { top: 0, right: 0, bottom: 0, left: 0 };
  rig.frame(BLOCK, 0.95, true);
  return rig;
}

/** The ground point in the middle of the view. */
function middle(rig: Rig): { x: number; y: number } {
  const { cam } = rig;
  return { x: unrotX(cam.yaw, cam.x, cam.y), y: unrotY(cam.yaw, cam.x, cam.y) };
}

describe("the camera", () => {
  it("re-frames its subject when nobody has touched it", () => {
    const rig = framed();
    const s = rig.cam.s;
    rig.setViewport(800, 480);
    rig.refit(true);
    expect(rig.cam.s).toBeCloseTo(s * 2, 1);
    expect(rig.free).toBe(false);
  });

  /**
   * The bug: the app shrinks its buffer when frames run slow, which zooming in
   * makes them do, and every resize re-framed the whole block.
   */
  it("keeps a zoom the user chose, through re-fits and a coarser buffer", () => {
    const rig = framed();
    rig.zoomAt(3, 120, 90);
    expect(rig.free).toBe(true);
    const { x, y, s } = rig.cam;
    rig.refit(true);
    expect(rig.cam).toMatchObject({ x, y, s });
    // A buffer 0.8 the size: same view, fewer pixels to each unit.
    rig.rescale(0.8);
    expect(rig.cam.x).toBe(x);
    expect(rig.cam.y).toBe(y);
    expect(rig.cam.s).toBeCloseTo(s * 0.8, 10);
  });

  it("gives the view back to its subject once something is framed again", () => {
    const rig = framed();
    const s = rig.cam.s;
    rig.pan(30, -12);
    expect(rig.free).toBe(true);
    rig.frame(BLOCK, 0.95, true);
    expect(rig.free).toBe(false);
    expect(rig.cam.s).toBeCloseTo(s, 9);
  });

  it("turns about the middle of the view, at the zoom it is at, once free", () => {
    const rig = framed();
    rig.zoomAt(2.5, 300, 60);
    const before = middle(rig);
    const s = rig.cam.s;
    for (const turn of [1, 1, -1, 1]) {
      rig.rotate(turn);
      const after = middle(rig);
      expect(after.x).toBeCloseTo(before.x, 9);
      expect(after.y).toBeCloseTo(before.y, 9);
      expect(rig.cam.s).toBe(s);
    }
  });

  it("follows a moving figure by how far it moves, keeping the zoom", () => {
    const rig = framed();
    rig.zoomAt(4, 200, 120);
    const s = rig.cam.s;
    rig.track(10, 10);
    const start = middle(rig);
    rig.track(13, 8);
    rig.track(15, 9);
    const end = middle(rig);
    expect(end.x - start.x).toBeCloseTo(5, 9);
    expect(end.y - start.y).toBeCloseTo(-1, 9);
    expect(rig.cam.s).toBe(s);
  });

  it("eases a zoom from the buttons, and adds up quick presses", () => {
    const rig = framed();
    const s = rig.cam.s;
    rig.zoomCentre(1.3);
    rig.update(1 / 60);
    // Partway after one frame, not cut straight to the new scale.
    expect(rig.cam.s).toBeGreaterThan(s);
    expect(rig.cam.s).toBeLessThan(s * 1.3);
    rig.zoomCentre(1.3);
    for (let i = 0; i < 120; i++) rig.update(1 / 60);
    expect(rig.cam.s).toBeCloseTo(s * 1.69, 6);
    // The middle of the view stays put through a zoom about it.
    const c = middle(rig);
    rig.zoomCentre(2);
    for (let i = 0; i < 120; i++) rig.update(1 / 60);
    expect(middle(rig).x).toBeCloseTo(c.x, 9);
    expect(middle(rig).y).toBeCloseTo(c.y, 9);
  });
});
