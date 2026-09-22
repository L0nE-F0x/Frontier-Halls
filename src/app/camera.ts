import { frameTo } from "../engine/project";
import type { Camera, Vec3, Yaw } from "../engine/types";

export type Insets = { top: number; right: number; bottom: number; left: number };

// Low enough that the whole block genuinely fits, sidewalk and all.
const MIN_S = 1.1;
const MAX_S = 120;

/**
 * Camera handling. Two things matter: a move should settle rather than stop,
 * and re-framing after a rotation should keep looking at whatever you were
 * looking at before.
 */
export class Rig {
  cam: Camera = { x: 60, y: 6, z: 2.4, s: 11, w: 800, h: 600, yaw: 0 };
  goal: { x: number; y: number; z: number; s: number } | null = null;
  insets: Insets = { top: 110, right: 24, bottom: 110, left: 24 };

  private subject: Vec3[] = [];
  private margin = 0.9;
  private marginY = 0.9;
  private velX = 0;
  private velY = 0;
  private settle = 0;

  setViewport(w: number, h: number): void {
    this.cam.w = w;
    this.cam.h = h;
  }

  /** Remembers the subject so rotation and resize can re-fit it. */
  frame(points: Vec3[], margin: number, immediate = false, marginY = margin): void {
    this.subject = points;
    this.margin = margin;
    this.marginY = marginY;
    this.refit(immediate);
  }

  refit(immediate = false): void {
    if (!this.subject.length) return;
    const next = frameTo(this.cam.yaw, this.cam.w, this.cam.h, this.insets, this.subject, this.margin, this.marginY);
    next.s = clamp(next.s, MIN_S, MAX_S);
    if (immediate) {
      this.cam.x = next.x;
      this.cam.y = next.y;
      this.cam.z = next.z;
      this.cam.s = next.s;
      this.goal = null;
      this.velX = 0;
      this.velY = 0;
    } else {
      this.goal = next;
      this.settle = 0;
    }
  }

  rotate(delta: number): Yaw {
    this.cam.yaw = (((this.cam.yaw + delta) % 4) + 4) % 4 as Yaw;
    this.refit(true);
    return this.cam.yaw;
  }

  /** Drag, in backbuffer pixels. */
  pan(dsx: number, dsy: number): void {
    const s = this.cam.s;
    const dvx = (dsx / s + (2 * dsy) / s) / 2;
    const dvy = ((2 * dsy) / s - dsx / s) / 2;
    this.cam.x -= dvx;
    this.cam.y -= dvy;
    this.goal = null;
    this.velX = -dvx;
    this.velY = -dvy;
  }

  release(): void {
    this.settle = 0.42;
  }

  /** Zoom keeping the world point under the cursor where it is. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const cam = this.cam;
    const before = this.viewAt(sx, sy);
    cam.s = clamp(cam.s * factor, MIN_S, MAX_S);
    const after = this.viewAt(sx, sy);
    cam.x += before.vx - after.vx;
    cam.y += before.vy - after.vy;
    this.goal = null;
  }

  zoomCentre(factor: number): void {
    this.zoomAt(factor, this.cam.w / 2, this.cam.h / 2);
  }

  private viewAt(sx: number, sy: number): { vx: number; vy: number } {
    const cam = this.cam;
    const a = (sx - cam.w / 2) / cam.s;
    const b = ((sy - cam.h / 2) / cam.s) * 2;
    return { vx: cam.x + (a + b) / 2, vy: cam.y + (b - a) / 2 };
  }

  update(dt: number): void {
    const cam = this.cam;
    if (this.goal) {
      const k = 1 - Math.pow(0.0035, dt);
      cam.x += (this.goal.x - cam.x) * k;
      cam.y += (this.goal.y - cam.y) * k;
      cam.z += (this.goal.z - cam.z) * k;
      cam.s += (this.goal.s - cam.s) * k;
      if (
        Math.abs(this.goal.x - cam.x) < 0.01 &&
        Math.abs(this.goal.s - cam.s) < 0.02
      ) {
        this.goal = null;
      }
      return;
    }
    if (this.settle > 0) {
      this.settle = Math.max(0, this.settle - dt);
      const decay = Math.pow(0.0006, dt);
      cam.x += this.velX * (dt * 60) * this.settle;
      cam.y += this.velY * (dt * 60) * this.settle;
      this.velX *= decay;
      this.velY *= decay;
    }
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
