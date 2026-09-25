import { frameTo, rotX, rotY, unrotX, unrotY } from "../engine/project";
import type { Camera, Vec3, Yaw } from "../engine/types";

export type Insets = { top: number; right: number; bottom: number; left: number };

// Low enough that the whole block genuinely fits, sidewalk and all, on a
// phone's width. It was 1.1 for a block of four by three; eight by six needs
// about half that before the cover's plate stops cutting off the east end.
const MIN_S = 0.5;
const MAX_S = 120;

/**
 * Camera handling. Two things matter: a move should settle rather than stop,
 * and re-framing after a rotation should keep looking at whatever you were
 * looking at before.
 *
 * The camera is either framing something — the block, a room, a figure — or
 * it is the user's. Zooming or dragging makes it the user's, and from then on
 * nothing re-frames it until something new is chosen. It used to re-frame on
 * every resize, and the app resizes its own buffer when frames run slow, which
 * zooming in makes them do: a zoom lasted about a second, then the view
 * jumped back out, sped up, refined, and jumped again.
 */
export class Rig {
  cam: Camera = { x: 60, y: 6, z: 2.4, s: 11, w: 800, h: 600, yaw: 0 };
  goal: { x: number; y: number; z: number; s: number } | null = null;
  insets: Insets = { top: 110, right: 24, bottom: 110, left: 24 };
  /** True once the user has zoomed or dragged since anything was framed. */
  free = false;

  private subject: Vec3[] = [];
  /** Where a followed subject was last frame. */
  private tracking: { x: number; y: number } | null = null;
  /** A zoom in progress from the buttons or keys: the scale it is heading for. */
  private easing: { s: number } | null = null;
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
    this.free = false;
    this.tracking = null;
    this.easing = null;
    this.refit(immediate);
  }

  /** Re-fits the subject to the viewport, unless the view is the user's. */
  refit(immediate = false): void {
    if (this.free || !this.subject.length) return;
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

  /**
   * A new backbuffer size is a new unit for the scale: `k` is new buffer
   * pixels per old one. The view keeps its middle and its size on screen.
   */
  rescale(k: number): void {
    if (!(k > 0) || Math.abs(k - 1) < 1e-9) return;
    this.cam.s *= k;
    if (this.goal) this.goal.s *= k;
    if (this.easing) this.easing.s *= k;
  }

  rotate(delta: number): Yaw {
    const cam = this.cam;
    const wx = unrotX(cam.yaw, cam.x, cam.y);
    const wy = unrotY(cam.yaw, cam.x, cam.y);
    cam.yaw = (((cam.yaw + delta) % 4) + 4) % 4 as Yaw;
    if (this.free) {
      // Turn about whatever is in the middle of the view, at the zoom it is at.
      cam.x = rotX(cam.yaw, wx, wy);
      cam.y = rotY(cam.yaw, wx, wy);
      this.goal = null;
      this.velX = 0;
      this.velY = 0;
      this.tracking = null;
    } else {
      this.refit(true);
    }
    return cam.yaw;
  }

  /**
   * Follows a moving subject by how far it has moved since the last frame, so
   * whatever zoom and offset the view has are kept. A figure being followed
   * used to be re-framed every frame, which undid any zoom at once.
   */
  track(x: number, y: number): void {
    if (this.goal) {
      this.tracking = null;
      return;
    }
    const last = this.tracking;
    this.tracking = { x, y };
    if (!last) return;
    const yaw = this.cam.yaw;
    this.cam.x += rotX(yaw, x, y) - rotX(yaw, last.x, last.y);
    this.cam.y += rotY(yaw, x, y) - rotY(yaw, last.x, last.y);
  }

  /** Drag, in backbuffer pixels. */
  pan(dsx: number, dsy: number): void {
    const s = this.cam.s;
    const dvx = (dsx / s + (2 * dsy) / s) / 2;
    const dvy = ((2 * dsy) / s - dsx / s) / 2;
    this.cam.x -= dvx;
    this.cam.y -= dvy;
    this.goal = null;
    this.free = true;
    this.velX = -dvx;
    this.velY = -dvy;
  }

  release(): void {
    this.settle = 0.42;
  }

  /** Zoom keeping the world point under the cursor where it is. */
  zoomAt(factor: number, sx: number, sy: number): void {
    this.easing = null;
    this.scaleAbout(factor, sx, sy);
    this.goal = null;
    this.free = true;
  }

  private scaleAbout(factor: number, sx: number, sy: number): void {
    const cam = this.cam;
    const before = this.viewAt(sx, sy);
    cam.s = clamp(cam.s * factor, MIN_S, MAX_S);
    const after = this.viewAt(sx, sy);
    cam.x += before.vx - after.vx;
    cam.y += before.vy - after.vy;
  }

  /**
   * A step of zoom about the middle of the view, eased over a moment rather
   * than cut, since a button press is a big step. Steps taken quickly add up
   * from where the last one was heading.
   */
  zoomCentre(factor: number): void {
    const from = this.easing?.s ?? this.cam.s;
    this.easing = { s: clamp(from * factor, MIN_S, MAX_S) };
    this.goal = null;
    this.free = true;
  }

  private viewAt(sx: number, sy: number): { vx: number; vy: number } {
    const cam = this.cam;
    const a = (sx - cam.w / 2) / cam.s;
    const b = ((sy - cam.h / 2) / cam.s) * 2;
    return { vx: cam.x + (a + b) / 2, vy: cam.y + (b - a) / 2 };
  }

  update(dt: number): void {
    const cam = this.cam;
    if (this.easing) {
      const k = 1 - Math.pow(0.0005, dt);
      const next = cam.s + (this.easing.s - cam.s) * k;
      if (Math.abs(this.easing.s - next) < this.easing.s * 0.002) {
        this.scaleAbout(this.easing.s / cam.s, cam.w / 2, cam.h / 2);
        this.easing = null;
      } else {
        this.scaleAbout(next / cam.s, cam.w / 2, cam.h / 2);
      }
    }
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
