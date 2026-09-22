import type { Camera, Vec3, Yaw } from "./types";

/**
 * 2:1 dimetric. In view space +x runs screen-right-and-down, +y runs
 * screen-left-and-down, +z is up. Points that differ along (1,1,1) land on the
 * same pixel, so -(x+y+z) is exactly the distance along the view axis: smaller
 * is nearer. That single fact is what lets the rasteriser depth-test instead of
 * sorting draw calls.
 */

export function rotX(yaw: Yaw, x: number, y: number): number {
  return yaw === 0 ? x : yaw === 1 ? y : yaw === 2 ? -x : -y;
}

export function rotY(yaw: Yaw, x: number, y: number): number {
  return yaw === 0 ? y : yaw === 1 ? -x : yaw === 2 ? -y : x;
}

export function unrotX(yaw: Yaw, vx: number, vy: number): number {
  return yaw === 0 ? vx : yaw === 1 ? -vy : yaw === 2 ? -vx : vy;
}

export function unrotY(yaw: Yaw, vx: number, vy: number): number {
  return yaw === 0 ? vy : yaw === 1 ? vx : yaw === 2 ? -vy : -vx;
}

export function screenX(cam: Camera, x: number, y: number): number {
  const vx = rotX(cam.yaw, x, y) - cam.x;
  const vy = rotY(cam.yaw, x, y) - cam.y;
  return (vx - vy) * cam.s + cam.w * 0.5;
}

export function screenY(cam: Camera, x: number, y: number, z: number): number {
  const vx = rotX(cam.yaw, x, y) - cam.x;
  const vy = rotY(cam.yaw, x, y) - cam.y;
  return (vx + vy) * cam.s * 0.5 - (z - cam.z) * cam.s + cam.h * 0.5;
}

export function depthOf(cam: Camera, x: number, y: number, z: number): number {
  const vx = rotX(cam.yaw, x, y) - cam.x;
  const vy = rotY(cam.yaw, x, y) - cam.y;
  return -(vx + vy + (z - cam.z));
}

/** Screen point for a world point. Allocates; use the component helpers in hot loops. */
export function project(cam: Camera, x: number, y: number, z: number) {
  const vx = rotX(cam.yaw, x, y) - cam.x;
  const vy = rotY(cam.yaw, x, y) - cam.y;
  const vz = z - cam.z;
  return {
    sx: (vx - vy) * cam.s + cam.w * 0.5,
    sy: (vx + vy) * cam.s * 0.5 - vz * cam.s + cam.h * 0.5,
    d: -(vx + vy + vz),
  };
}

/** World point under a screen pixel, on the horizontal plane at height z. */
export function unproject(cam: Camera, sx: number, sy: number, z = 0): { x: number; y: number } {
  const a = (sx - cam.w * 0.5) / cam.s;
  const b = ((sy - cam.h * 0.5) / cam.s + (z - cam.z)) * 2;
  const vx = (a + b) * 0.5 + cam.x;
  const vy = (b - a) * 0.5 + cam.y;
  return { x: unrotX(cam.yaw, vx, vy), y: unrotY(cam.yaw, vx, vy) };
}

/**
 * Camera centre and scale that fit the points inside a viewport, leaving the
 * given insets free for the HUD. margin is the fraction of the free area the
 * bounds are allowed to occupy.
 */
export function frameTo(
  yaw: Yaw,
  viewW: number,
  viewH: number,
  inset: { top: number; right: number; bottom: number; left: number },
  points: Vec3[],
  margin: number,
  marginY = margin,
): { x: number; y: number; z: number; s: number } {
  const freeW = Math.max(32, viewW - inset.left - inset.right);
  const freeH = Math.max(32, viewH - inset.top - inset.bottom);
  let minA = Infinity;
  let maxA = -Infinity;
  let minB = Infinity;
  let maxB = -Infinity;
  let cz = 0;
  for (const p of points) {
    const vx = rotX(yaw, p.x, p.y);
    const vy = rotY(yaw, p.x, p.y);
    const a = vx - vy;
    const b = (vx + vy) * 0.5 - p.z;
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
    cz += p.z;
  }
  cz /= points.length || 1;
  const spanA = Math.max(0.001, maxA - minA);
  const spanB = Math.max(0.001, maxB - minB);
  const s = Math.min((freeW * margin) / spanA, (freeH * marginY) / spanB);

  // Centre of the bounds in screen terms, then shift so it lands in the middle
  // of the free area rather than the middle of the window.
  const midA = (minA + maxA) / 2;
  const midB = (minB + maxB) / 2;
  const wantSx = inset.left + freeW / 2;
  const wantSy = inset.top + freeH / 2;
  const offA = (wantSx - viewW / 2) / s;
  const offB = (wantSy - viewH / 2) / s;
  const a = midA - offA;
  const b = midB - offB;
  // a = vx - vy, b = (vx + vy)/2 - cz  =>  solve for the camera centre.
  const sum = (b + cz) * 2;
  return { x: (sum + a) / 2, y: (sum - a) / 2, z: cz, s };
}
