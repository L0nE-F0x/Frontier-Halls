import { mix } from "./color";
import type { BoxOpts, FaceOpts, Painter } from "./painter";
import type { RGB } from "./types";

/**
 * Box turned about +z. The figures, chairs and anything that has to face a
 * direction are assembled from these. w runs along the facing angle.
 */
export function obox(
  p: Painter,
  cx: number, cy: number, z: number,
  w: number, d: number, h: number,
  angle: number,
  color: RGB,
  opts?: BoxOpts,
): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const ux = ca * w * 0.5;
  const uy = sa * w * 0.5;
  const vx = -sa * d * 0.5;
  const vy = ca * d * 0.5;
  const z1 = z + h;
  const top = opts?.top ?? color;
  const tint = opts?.sideTint ?? 1;
  const side = tint === 1 ? color : { r: color.r * tint, g: color.g * tint, b: color.b * tint };

  const ax = cx - ux - vx, ay = cy - uy - vy;
  const bx = cx + ux - vx, by = cy + uy - vy;
  const cx2 = cx + ux + vx, cy2 = cy + uy + vy;
  const dx = cx - ux + vx, dy = cy - uy + vy;

  p.quad(ax, ay, z1, bx, by, z1, cx2, cy2, z1, dx, dy, z1, top, 0, 0, 1, opts);
  p.quad(bx, by, z, cx2, cy2, z, cx2, cy2, z1, bx, by, z1, side, ca, sa, 0, opts);
  p.quad(dx, dy, z, ax, ay, z, ax, ay, z1, dx, dy, z1, side, -ca, -sa, 0, opts);
  p.quad(cx2, cy2, z, dx, dy, z, dx, dy, z1, cx2, cy2, z1, side, -sa, ca, 0, opts);
  p.quad(ax, ay, z, bx, by, z, bx, by, z1, ax, ay, z1, side, sa, -ca, 0, opts);
}

/** Horizontal prism running along x or y. Pipes, conduit, rails. */
export function tube(
  p: Painter,
  x: number, y: number, z: number,
  length: number,
  radius: number,
  axis: "x" | "y",
  color: RGB,
  sides = 8,
  opts?: FaceOpts,
): void {
  let px = 0;
  let pz = radius;
  for (let i = 1; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const qx = Math.sin(a) * radius;
    const qz = Math.cos(a) * radius;
    const mx = (px + qx) / 2;
    const mz = (pz + qz) / 2;
    const len = Math.hypot(mx, mz) || 1;
    if (axis === "x") {
      p.quad(
        x, y + px, z + pz,
        x + length, y + px, z + pz,
        x + length, y + qx, z + qz,
        x, y + qx, z + qz,
        color, 0, mx / len, mz / len, opts,
      );
    } else {
      p.quad(
        x + px, y, z + pz,
        x + px, y + length, z + pz,
        x + qx, y + length, z + qz,
        x + qx, y, z + qz,
        color, mx / len, 0, mz / len, opts,
      );
    }
    px = qx;
    pz = qz;
  }
}

/** Soft blob on the floor. Every standing thing gets one; it is what glues it down. */
export function contactShadow(
  p: Painter,
  x: number, y: number, z: number,
  rx: number, ry: number,
  strength: number,
  ink: RGB,
): void {
  if (strength <= 0.01) return;
  p.disc(x, y, z, rx, ry, ink, { alpha: Math.min(0.62, strength * 1.25), emissive: 1, bias: 0.012 }, 10);
}

/**
 * Shadow cast by a box onto the floor, offset along the light. Cheap, wrong in
 * the details, and the only thing that makes a rack look like it is standing on
 * something.
 */
export function castShadow(
  p: Painter,
  x: number, y: number,
  w: number, d: number, h: number,
  floorZ: number,
  dirX: number, dirY: number,
  strength: number,
  ink: RGB,
): void {
  if (strength <= 0.01) return;
  const ox = dirX * h;
  const oy = dirY * h;
  p.quad(
    x + ox, y + oy, floorZ,
    x + w + ox, y + oy, floorZ,
    x + w + ox * 0.15, y + d + oy * 0.15, floorZ,
    x + ox * 0.15, y + d + oy * 0.15, floorZ,
    ink, 0, 0, 1, { alpha: Math.min(0.5, strength), emissive: 1, bias: 0.01, noCull: true },
  );
}

/** Four thin boxes making an open rectangular frame in the x/z plane. */
export function frameXZ(
  p: Painter,
  x: number, y: number, z: number,
  w: number, h: number, thickness: number, depth: number,
  color: RGB,
  opts?: BoxOpts,
): void {
  p.box(x, y, z, thickness, depth, h, color, opts);
  p.box(x + w - thickness, y, z, thickness, depth, h, color, opts);
  p.box(x + thickness, y, z + h - thickness, w - thickness * 2, depth, thickness, color, opts);
  p.box(x + thickness, y, z, w - thickness * 2, depth, thickness, color, opts);
}

/** Grid of lines on a horizontal plane. The floor reads as a plan drawing. */
export function floorGrid(
  p: Painter,
  x: number, y: number, z: number,
  w: number, d: number,
  step: number,
  color: RGB,
  widthPx: number,
  alpha = 1,
  over?: RGB,
): void {
  // Pre-blended against the surface it sits on, so every grid line is an opaque
  // stamped segment rather than a blended quad.
  const tone = over && alpha < 1 ? mix(over, color, alpha) : color;
  const opts: FaceOpts = { emissive: 1, bias: 0.02 };
  for (let i = 0; i <= w + 0.0001; i += step) {
    p.line(x + i, y, z, x + i, y + d, z, tone, widthPx, opts);
  }
  for (let j = 0; j <= d + 0.0001; j += step) {
    p.line(x, y + j, z, x + w, y + j, z, tone, widthPx, opts);
  }
}

/**
 * A disc standing in a vertical plane. p.disc() only lies flat, which is fine
 * for a pool of light on the floor and wrong for anything mounted on a wall.
 */
export function uprightDisc(
  p: Painter,
  axis: "x" | "y",
  cx: number, cy: number, cz: number,
  r: number,
  normal: 1 | -1,
  color: RGB,
  opts?: FaceOpts,
  sides = 16,
): void {
  const nx = axis === "x" ? normal : 0;
  const ny = axis === "y" ? normal : 0;
  let ax = r;
  let az = 0;
  for (let i = 1; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    if (axis === "y") {
      p.quad(cx, cy, cz, cx + ax, cy, cz + az, cx + bx, cy, cz + bz, cx, cy, cz, color, nx, ny, 0, opts);
    } else {
      p.quad(cx, cy, cz, cx, cy + ax, cz + az, cx, cy + bx, cz + bz, cx, cy, cz, color, nx, ny, 0, opts);
    }
    ax = bx;
    az = bz;
  }
}
