import { Lighting } from "./light";
import { rotX, rotY } from "./project";
import type { Raster } from "./raster";
import type { Camera, RGB } from "./types";

export type FaceOpts = {
  /** 0 lit normally, 1 ignores light entirely. */
  emissive?: number;
  alpha?: number;
  /** Written to the glow buffer, so bloom picks it up. */
  glow?: number;
  id?: number;
  /** Skip the facing test. Needed for paper-thin plates seen edge on. */
  noCull?: boolean;
  /** Nudges the surface toward the camera to beat z-fighting on decals. */
  bias?: number;
};

export type BoxOpts = FaceOpts & {
  top?: RGB;
  /** Multiplies the side faces, for a quick two-tone. */
  sideTint?: number;
};

const STRIDE = 20;

/**
 * The single drawing surface the world talks to. It projects, lights and
 * rasterises in one step; the only thing it has to defer is translucency,
 * which it sorts back to front at the end of the frame.
 */
export class Painter {
  cam: Camera;
  light: Lighting;
  raster: Raster;
  /** Every triangle written this frame, for the stats readout. */
  tris = 0;
  /**
   * 0..1 toward washColor, applied after shading. Focusing a hall washes the
   * rest of the wing back so the subject reads without anything being hidden.
   */
  wash = 0;
  washColor: RGB = { r: 214, g: 210, b: 204 };

  /**
   * The yaw rotation and the camera, flattened into plain numbers once a frame.
   * Projection happens a few hundred thousand times per frame, and doing it
   * through function calls that re-derive the rotation each time was costing
   * more than the rasteriser.
   */
  private rax = 1; private ray = 0;
  private rbx = 0; private rby = 1;
  private cx = 0; private cy = 0; private cz = 0;
  private cs = 1; private hw = 0; private hh = 0;
  /** Which axis-aligned faces turn toward the camera, resolved once a frame. */
  private faceXp = true; private faceYp = true;

  private queue = new Float32Array(STRIDE * 512);
  private queueIds = new Uint16Array(512);
  private queued = 0;
  private order: number[] = [];

  constructor(raster: Raster, cam: Camera, light: Lighting) {
    this.raster = raster;
    this.cam = cam;
    this.light = light;
  }

  beginFrame(): void {
    this.queued = 0;
    this.tris = 0;
    const cam = this.cam;
    this.rax = rotX(cam.yaw, 1, 0);
    this.ray = rotX(cam.yaw, 0, 1);
    this.rbx = rotY(cam.yaw, 1, 0);
    this.rby = rotY(cam.yaw, 0, 1);
    this.cx = cam.x;
    this.cy = cam.y;
    this.cz = cam.z;
    this.cs = cam.s;
    this.hw = cam.w * 0.5;
    this.hh = cam.h * 0.5;
    this.faceXp = this.rax + this.rbx > 0.0001;
    this.faceYp = this.ray + this.rby > 0.0001;
  }

  private washOut(): void {
    const k = this.wash;
    if (k <= 0) return;
    const out = this.light.out;
    const c = this.washColor;
    out[0] += (c.r - out[0]) * k;
    out[1] += (c.g - out[1]) * k;
    out[2] += (c.b - out[2]) * k;
  }

  /** True when a face with this world normal turns toward the camera. */
  facing(nx: number, ny: number, nz: number): boolean {
    return (this.rax * nx + this.ray * ny) + (this.rbx * nx + this.rby * ny) + nz > 0.0001;
  }

  private emit(
    x0: number, y0: number, d0: number, r0: number, g0: number, b0: number,
    x1: number, y1: number, d1: number, r1: number, g1: number, b1: number,
    x2: number, y2: number, d2: number, r2: number, g2: number, b2: number,
    alpha: number, glow: number, id: number,
  ): void {
    this.tris++;
    if (alpha >= 1) {
      this.raster.tri(
        x0, y0, d0, r0, g0, b0,
        x1, y1, d1, r1, g1, b1,
        x2, y2, d2, r2, g2, b2,
        1, glow, id,
      );
      return;
    }
    if (this.queued * STRIDE >= this.queue.length) {
      const grown = new Float32Array(this.queue.length * 2);
      grown.set(this.queue);
      this.queue = grown;
      const grownIds = new Uint16Array(this.queueIds.length * 2);
      grownIds.set(this.queueIds);
      this.queueIds = grownIds;
    }
    const q = this.queue;
    let o = this.queued * STRIDE;
    q[o++] = x0; q[o++] = y0; q[o++] = d0; q[o++] = r0; q[o++] = g0; q[o++] = b0;
    q[o++] = x1; q[o++] = y1; q[o++] = d1; q[o++] = r1; q[o++] = g1; q[o++] = b1;
    q[o++] = x2; q[o++] = y2; q[o++] = d2; q[o++] = r2; q[o++] = g2; q[o++] = b2;
    q[o++] = alpha; q[o] = glow;
    this.queueIds[this.queued] = id;
    this.queued++;
  }

  /** Draws the translucent backlog, farthest first. Call once per frame. */
  flush(): void {
    const n = this.queued;
    if (n === 0) return;
    const order = this.order;
    order.length = n;
    const q = this.queue;
    for (let i = 0; i < n; i++) order[i] = i;
    order.sort((a, b) => {
      const da = q[a * STRIDE + 2] + q[a * STRIDE + 8] + q[a * STRIDE + 14];
      const db = q[b * STRIDE + 2] + q[b * STRIDE + 8] + q[b * STRIDE + 14];
      return db - da;
    });
    for (let k = 0; k < n; k++) {
      const o = order[k] * STRIDE;
      this.raster.tri(
        q[o], q[o + 1], q[o + 2], q[o + 3], q[o + 4], q[o + 5],
        q[o + 6], q[o + 7], q[o + 8], q[o + 9], q[o + 10], q[o + 11],
        q[o + 12], q[o + 13], q[o + 14], q[o + 15], q[o + 16], q[o + 17],
        q[o + 18], q[o + 19], this.queueIds[order[k]],
      );
    }
    this.queued = 0;
  }

  /**
   * A lit, planar quad given in world coordinates, wound either way. The four
   * corners are shaded separately, so a lamp crossing a surface reads as a
   * gradient rather than a step — unless the quad is too small for a gradient
   * to show, in which case one sample at the centre does.
   */
  quad(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    base: RGB, nx: number, ny: number, nz: number,
    opts?: FaceOpts,
  ): void {
    if (!opts?.noCull && !this.facing(nx, ny, nz)) return;
    const light = this.light;
    const emissive = opts?.emissive ?? 0;
    const alpha = opts?.alpha ?? 1;
    const glow = opts?.glow ?? 0;
    const id = opts?.id ?? 0;
    const bias = opts?.bias ?? 0;

    const rax = this.rax, ray = this.ray, rbx = this.rbx, rby = this.rby;
    const ox = this.cx, oy = this.cy, oz = this.cz;
    const s = this.cs, hw = this.hw, hh = this.hh;

    let vx = rax * ax + ray * ay - ox;
    let vy = rbx * ax + rby * ay - oy;
    let vz = az - oz;
    const sax = (vx - vy) * s + hw;
    const say = (vx + vy) * s * 0.5 - vz * s + hh;
    const sad = -(vx + vy + vz) - bias;

    vx = rax * bx + ray * by - ox;
    vy = rbx * bx + rby * by - oy;
    vz = bz - oz;
    const sbx = (vx - vy) * s + hw;
    const sby = (vx + vy) * s * 0.5 - vz * s + hh;
    const sbd = -(vx + vy + vz) - bias;

    vx = rax * cx + ray * cy - ox;
    vy = rbx * cx + rby * cy - oy;
    vz = cz - oz;
    const scx = (vx - vy) * s + hw;
    const scy = (vx + vy) * s * 0.5 - vz * s + hh;
    const scd = -(vx + vy + vz) - bias;

    vx = rax * dx + ray * dy - ox;
    vy = rbx * dx + rby * dy - oy;
    vz = dz - oz;
    const sdx = (vx - vy) * s + hw;
    const sdy = (vx + vy) * s * 0.5 - vz * s + hh;
    const sdd = -(vx + vy + vz) - bias;

    // Off the edge of the buffer entirely: nothing further to do.
    const minSx = sax < sbx ? (sax < scx ? (sax < sdx ? sax : sdx) : (scx < sdx ? scx : sdx))
                            : (sbx < scx ? (sbx < sdx ? sbx : sdx) : (scx < sdx ? scx : sdx));
    const maxSx = sax > sbx ? (sax > scx ? (sax > sdx ? sax : sdx) : (scx > sdx ? scx : sdx))
                            : (sbx > scx ? (sbx > sdx ? sbx : sdx) : (scx > sdx ? scx : sdx));
    if (maxSx < 0 || minSx > hw * 2) return;
    const minSy = say < sby ? (say < scy ? (say < sdy ? say : sdy) : (scy < sdy ? scy : sdy))
                            : (sby < scy ? (sby < sdy ? sby : sdy) : (scy < sdy ? scy : sdy));
    const maxSy = say > sby ? (say > scy ? (say > sdy ? say : sdy) : (scy > sdy ? scy : sdy))
                            : (sby > scy ? (sby > sdy ? sby : sdy) : (scy > sdy ? scy : sdy));
    if (maxSy < 0 || minSy > hh * 2) return;

    // A long, thin quad seen on the diagonal covers a sliver of a very large
    // bounding box, and the rasteriser pays for the box. Splitting it along its
    // own length costs a few more triangles and saves an enormous amount of
    // scanning — conduit, cable trays and roof members are all this shape.
    const bboxArea = (maxSx - minSx) * (maxSy - minSy);
    if (bboxArea > 1400) {
      const half1 = Math.abs((sbx - sax) * (scy - say) - (scx - sax) * (sby - say));
      const half2 = Math.abs((scx - sax) * (sdy - say) - (sdx - sax) * (scy - say));
      const covered = (half1 + half2) * 0.5;
      if (covered > 0.5 && bboxArea > covered * 3) {
        const slices = Math.min(10, Math.max(2, Math.round(Math.sqrt(bboxArea / covered))));
        const abLen = Math.abs(bx - ax) + Math.abs(by - ay) + Math.abs(bz - az);
        const adLen = Math.abs(dx - ax) + Math.abs(dy - ay) + Math.abs(dz - az);
        for (let i = 0; i < slices; i++) {
          const t0 = i / slices;
          const t1 = (i + 1) / slices;
          if (abLen >= adLen) {
            this.shadeQuad(
              ax + (bx - ax) * t0, ay + (by - ay) * t0, az + (bz - az) * t0,
              ax + (bx - ax) * t1, ay + (by - ay) * t1, az + (bz - az) * t1,
              dx + (cx - dx) * t1, dy + (cy - dy) * t1, dz + (cz - dz) * t1,
              dx + (cx - dx) * t0, dy + (cy - dy) * t0, dz + (cz - dz) * t0,
              base, nx, ny, nz, emissive, alpha, glow, id, bias,
            );
          } else {
            this.shadeQuad(
              ax + (dx - ax) * t0, ay + (dy - ay) * t0, az + (dz - az) * t0,
              bx + (cx - bx) * t0, by + (cy - by) * t0, bz + (cz - bz) * t0,
              bx + (cx - bx) * t1, by + (cy - by) * t1, bz + (cz - bz) * t1,
              ax + (dx - ax) * t1, ay + (dy - ay) * t1, az + (dz - az) * t1,
              base, nx, ny, nz, emissive, alpha, glow, id, bias,
            );
          }
        }
        return;
      }
    }

    // Opposite corners bound a rectangle, which every quad here effectively is.
    const spanX = cx > ax ? cx - ax : ax - cx;
    const spanY = cy > ay ? cy - ay : ay - cy;
    const spanZ = cz > az ? cz - az : az - cz;
    if (spanX + spanY + spanZ < 1.15) {
      light.shade(base, nx, ny, nz, (ax + cx) * 0.5, (ay + cy) * 0.5, (az + cz) * 0.5, emissive);
      this.washOut();
      const fr = light.out[0], fg = light.out[1], fb = light.out[2];
      this.emit(
        sax, say, sad, fr, fg, fb,
        sbx, sby, sbd, fr, fg, fb,
        scx, scy, scd, fr, fg, fb,
        alpha, glow, id,
      );
      this.emit(
        sax, say, sad, fr, fg, fb,
        scx, scy, scd, fr, fg, fb,
        sdx, sdy, sdd, fr, fg, fb,
        alpha, glow, id,
      );
      return;
    }

    light.shade(base, nx, ny, nz, ax, ay, az, emissive); this.washOut();
    const r0 = light.out[0], g0 = light.out[1], b0 = light.out[2];
    light.shade(base, nx, ny, nz, bx, by, bz, emissive); this.washOut();
    const r1 = light.out[0], g1 = light.out[1], b1 = light.out[2];
    light.shade(base, nx, ny, nz, cx, cy, cz, emissive); this.washOut();
    const r2 = light.out[0], g2 = light.out[1], b2 = light.out[2];
    light.shade(base, nx, ny, nz, dx, dy, dz, emissive); this.washOut();
    const r3 = light.out[0], g3 = light.out[1], b3 = light.out[2];

    this.emit(
      sax, say, sad, r0, g0, b0,
      sbx, sby, sbd, r1, g1, b1,
      scx, scy, scd, r2, g2, b2,
      alpha, glow, id,
    );
    this.emit(
      sax, say, sad, r0, g0, b0,
      scx, scy, scd, r2, g2, b2,
      sdx, sdy, sdd, r3, g3, b3,
      alpha, glow, id,
    );
  }

  /** Shade and emit a quad that has already been decided on. No split, no cull. */
  private shadeQuad(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    base: RGB, nx: number, ny: number, nz: number,
    emissive: number, alpha: number, glow: number, id: number, bias: number,
  ): void {
    const light = this.light;
    const rax = this.rax, ray = this.ray, rbx = this.rbx, rby = this.rby;
    const ox = this.cx, oy = this.cy, oz = this.cz;
    const s = this.cs, hw = this.hw, hh = this.hh;

    let vx = rax * ax + ray * ay - ox;
    let vy = rbx * ax + rby * ay - oy;
    let vz = az - oz;
    const sax = (vx - vy) * s + hw;
    const say = (vx + vy) * s * 0.5 - vz * s + hh;
    const sad = -(vx + vy + vz) - bias;

    vx = rax * bx + ray * by - ox;
    vy = rbx * bx + rby * by - oy;
    vz = bz - oz;
    const sbx = (vx - vy) * s + hw;
    const sby = (vx + vy) * s * 0.5 - vz * s + hh;
    const sbd = -(vx + vy + vz) - bias;

    vx = rax * cx + ray * cy - ox;
    vy = rbx * cx + rby * cy - oy;
    vz = cz - oz;
    const scx = (vx - vy) * s + hw;
    const scy = (vx + vy) * s * 0.5 - vz * s + hh;
    const scd = -(vx + vy + vz) - bias;

    vx = rax * dx + ray * dy - ox;
    vy = rbx * dx + rby * dy - oy;
    vz = dz - oz;
    const sdx = (vx - vy) * s + hw;
    const sdy = (vx + vy) * s * 0.5 - vz * s + hh;
    const sdd = -(vx + vy + vz) - bias;

    light.shade(base, nx, ny, nz, ax, ay, az, emissive); this.washOut();
    const r0 = light.out[0], g0 = light.out[1], b0 = light.out[2];
    light.shade(base, nx, ny, nz, bx, by, bz, emissive); this.washOut();
    const r1 = light.out[0], g1 = light.out[1], b1 = light.out[2];
    light.shade(base, nx, ny, nz, cx, cy, cz, emissive); this.washOut();
    const r2 = light.out[0], g2 = light.out[1], b2 = light.out[2];
    light.shade(base, nx, ny, nz, dx, dy, dz, emissive); this.washOut();
    const r3 = light.out[0], g3 = light.out[1], b3 = light.out[2];

    this.emit(
      sax, say, sad, r0, g0, b0,
      sbx, sby, sbd, r1, g1, b1,
      scx, scy, scd, r2, g2, b2,
      alpha, glow, id,
    );
    this.emit(
      sax, say, sad, r0, g0, b0,
      scx, scy, scd, r2, g2, b2,
      sdx, sdy, sdd, r3, g3, b3,
      alpha, glow, id,
    );
  }

  /** Axis-aligned box. Only the faces that turn toward the camera are drawn. */
  box(
    x: number, y: number, z: number,
    w: number, d: number, h: number,
    color: RGB, opts?: BoxOpts,
  ): void {
    const x1 = x + w;
    const y1 = y + d;
    const z1 = z + h;
    const top = opts?.top ?? color;
    const tint = opts?.sideTint ?? 1;
    const side = tint === 1 ? color : { r: color.r * tint, g: color.g * tint, b: color.b * tint };

    this.quad(x, y, z1, x1, y, z1, x1, y1, z1, x, y1, z1, top, 0, 0, 1, opts);
    if (this.faceXp) {
      this.quad(x1, y, z, x1, y1, z, x1, y1, z1, x1, y, z1, side, 1, 0, 0, opts);
    } else {
      this.quad(x, y, z, x, y, z1, x, y1, z1, x, y1, z, side, -1, 0, 0, opts);
    }
    if (this.faceYp) {
      this.quad(x, y1, z, x, y1, z1, x1, y1, z1, x1, y1, z, side, 0, 1, 0, opts);
    } else {
      this.quad(x, y, z, x1, y, z, x1, y, z1, x, y, z1, side, 0, -1, 0, opts);
    }
  }

  /** A horizontal plate: the top face plus a thin rim, cheaper than a full box. */
  plate(x: number, y: number, z: number, w: number, d: number, color: RGB, opts?: FaceOpts): void {
    this.quad(x, y, z, x + w, y, z, x + w, y + d, z, x, y + d, z, color, 0, 0, 1, opts);
  }

  /** Upright prism with a regular n-gon footprint. Pillars, mugs, plant pots. */
  cylinder(
    x: number, y: number, z: number,
    rx: number, ry: number, h: number,
    color: RGB, sides = 10, opts?: BoxOpts,
  ): void {
    const top = opts?.top ?? color;
    const tint = opts?.sideTint ?? 0.86;
    const side = { r: color.r * tint, g: color.g * tint, b: color.b * tint };
    const z1 = z + h;
    let px = x + rx;
    let py = y;
    for (let i = 1; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const cx = x + Math.cos(a) * rx;
      const cy = y + Math.sin(a) * ry;
      const nx = (px + cx) / 2 - x;
      const ny = (py + cy) / 2 - y;
      const len = Math.hypot(nx, ny) || 1;
      this.quad(px, py, z, cx, cy, z, cx, cy, z1, px, py, z1, side, nx / len, ny / len, 0, opts);
      px = cx;
      py = cy;
    }
    // Fan the cap so lamps fall across it smoothly.
    let ax = x + rx;
    let ay = y;
    for (let i = 1; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const bx = x + Math.cos(a) * rx;
      const by = y + Math.sin(a) * ry;
      this.quad(x, y, z1, ax, ay, z1, bx, by, z1, x, y, z1, top, 0, 0, 1, opts);
      ax = bx;
      ay = by;
    }
  }

  /** Flat ellipse on a horizontal plane. Shadows, light pools, floor decals. */
  disc(
    x: number, y: number, z: number,
    rx: number, ry: number,
    color: RGB, opts?: FaceOpts, sides = 14,
  ): void {
    let ax = x + rx;
    let ay = y;
    for (let i = 1; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const bx = x + Math.cos(a) * rx;
      const by = y + Math.sin(a) * ry;
      this.quad(x, y, z, ax, ay, z, bx, by, z, x, y, z, color, 0, 0, 1, opts);
      ax = bx;
      ay = by;
    }
  }

  /**
   * Thick line between two world points, widened in screen space. Limbs,
   * cables, clock hands and the floor grid all ride on this.
   */
  line(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    color: RGB, widthPx: number, opts?: FaceOpts,
  ): void {
    const bias = opts?.bias ?? 0.02;
    const rax = this.rax, ray = this.ray, rbx = this.rbx, rby = this.rby;
    const s = this.cs, hw = this.hw, hh = this.hh;
    let vx = rax * ax + ray * ay - this.cx;
    let vy = rbx * ax + rby * ay - this.cy;
    let vz = az - this.cz;
    const sax = (vx - vy) * s + hw;
    const say = (vx + vy) * s * 0.5 - vz * s + hh;
    const sad = -(vx + vy + vz) - bias;
    vx = rax * bx + ray * by - this.cx;
    vy = rbx * bx + rby * by - this.cy;
    vz = bz - this.cz;
    const sbx = (vx - vy) * s + hw;
    const sby = (vx + vy) * s * 0.5 - vz * s + hh;
    const sbd = -(vx + vy + vz) - bias;
    let dx = sbx - sax;
    let dy = sby - say;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) return;
    dx /= len;
    dy /= len;
    const half = Math.max(0.5, widthPx / 2);
    const px = -dy * half;
    const py = dx * half;
    const emissive = opts?.emissive ?? 1;
    let r = color.r;
    let g = color.g;
    let b = color.b;
    if (emissive < 1) {
      this.light.shade(color, 0, 0, 1, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, emissive);
      this.washOut();
      r = this.light.out[0];
      g = this.light.out[1];
      b = this.light.out[2];
    } else if (this.wash > 0) {
      const k = this.wash;
      r += (this.washColor.r - r) * k;
      g += (this.washColor.g - g) * k;
      b += (this.washColor.b - b) * k;
    }
    const alpha = opts?.alpha ?? 1;
    const glow = opts?.glow ?? 0;
    const id = opts?.id ?? 0;
    if (alpha >= 1) {
      this.tris += 1;
      this.raster.segment(sax, say, sad, sbx, sby, sbd, r, g, b, widthPx, glow, id);
      return;
    }
    this.emit(
      sax + px, say + py, sad, r, g, b,
      sbx + px, sby + py, sbd, r, g, b,
      sbx - px, sby - py, sbd, r, g, b,
      alpha, glow, id,
    );
    this.emit(
      sax + px, say + py, sad, r, g, b,
      sbx - px, sby - py, sbd, r, g, b,
      sax - px, say - py, sad, r, g, b,
      alpha, glow, id,
    );
  }

  /** Screen-space square centred on a world point. Motes, sparks, LED dots. */
  dot(x: number, y: number, z: number, sizePx: number, color: RGB, opts?: FaceOpts): void {
    const vx = this.rax * x + this.ray * y - this.cx;
    const vy = this.rbx * x + this.rby * y - this.cy;
    const vz = z - this.cz;
    const sx = (vx - vy) * this.cs + this.hw;
    const sy = (vx + vy) * this.cs * 0.5 - vz * this.cs + this.hh;
    const d = -(vx + vy + vz) - (opts?.bias ?? 0.02);
    const h = Math.max(0.5, sizePx / 2);
    const alpha = opts?.alpha ?? 1;
    const glow = opts?.glow ?? 0;
    const id = opts?.id ?? 0;
    const r = color.r, g = color.g, b = color.b;
    this.emit(
      sx - h, sy - h, d, r, g, b,
      sx + h, sy - h, d, r, g, b,
      sx + h, sy + h, d, r, g, b,
      alpha, glow, id,
    );
    this.emit(
      sx - h, sy - h, d, r, g, b,
      sx + h, sy + h, d, r, g, b,
      sx - h, sy + h, d, r, g, b,
      alpha, glow, id,
    );
  }

  /** World-space pixel, used by the bitmap font. */
  pixel(x: number, y: number, z: number, sizePx: number, color: RGB, alpha: number, glow: number, id: number): void {
    this.dot(x, y, z, sizePx, color, { alpha, glow, id, bias: 0.04 });
  }
}
