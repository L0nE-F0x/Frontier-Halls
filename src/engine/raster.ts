import type { RGB } from "./types";

/**
 * A small software rasteriser. Everything the world draws goes through here, so
 * there is one depth buffer, one id buffer and one glow buffer for the whole
 * frame. Depth is the view-axis distance from project(): smaller is nearer.
 *
 * Nothing is anti-aliased on purpose. The frame is quantised to a handful of
 * inks afterwards, and a soft edge only muddies the stipple.
 */
export class Raster {
  w = 0;
  h = 0;
  col = new Uint8ClampedArray(4);
  dep = new Float32Array(1);
  ids = new Uint16Array(1);
  glow = new Float32Array(1);
  private glowA = new Float32Array(1);
  private glowB = new Float32Array(1);
  private gw = 0;
  private gh = 0;
  image: ImageData | null = null;

  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    const n = w * h;
    this.col = new Uint8ClampedArray(n * 4);
    this.dep = new Float32Array(n);
    this.ids = new Uint16Array(n);
    this.glow = new Float32Array(n);
    this.gw = Math.max(1, w >> 1);
    this.gh = Math.max(1, h >> 1);
    this.glowA = new Float32Array(this.gw * this.gh);
    this.glowB = new Float32Array(this.gw * this.gh);
    // Absent outside a browser, which is how the world can be built headlessly
    // for tests and for the navigation pass.
    this.image = typeof ImageData === "function" ? new ImageData(this.col, w, h) : null;
  }

  clear(paper: RGB): void {
    const { dep, ids, glow } = this;
    const words = new Uint32Array(this.col.buffer);
    // Little-endian RGBA. One fill beats four writes per pixel by a wide margin.
    const packed =
      ((255 << 24) | ((paper.b & 255) << 16) | ((paper.g & 255) << 8) | (paper.r & 255)) >>> 0;
    words.fill(packed);
    dep.fill(Infinity);
    ids.fill(0);
    glow.fill(0);
  }

  /**
   * Gouraud triangle. alpha < 1 blends and leaves the depth buffer alone, which
   * is what shadows, glass and light shafts want.
   */
  tri(
    x0: number, y0: number, d0: number, r0: number, g0: number, b0: number,
    x1: number, y1: number, d1: number, r1: number, g1: number, b1: number,
    x2: number, y2: number, d2: number, r2: number, g2: number, b2: number,
    alpha: number, glowAmt: number, id: number,
  ): void {
    const W = this.w;
    const H = this.h;
    let minX = Math.floor(Math.min(x0, x1, x2));
    let maxX = Math.ceil(Math.max(x0, x1, x2));
    let minY = Math.floor(Math.min(y0, y1, y2));
    let maxY = Math.ceil(Math.max(y0, y1, y2));
    if (minX < 0) minX = 0;
    if (minY < 0) minY = 0;
    if (maxX > W - 1) maxX = W - 1;
    if (maxY > H - 1) maxY = H - 1;
    if (minX > maxX || minY > maxY) return;

    let area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0) return;
    if (area < 0) {
      // Keep the winding positive so the inside test is a simple sign check.
      let t = x1; x1 = x2; x2 = t;
      t = y1; y1 = y2; y2 = t;
      t = d1; d1 = d2; d2 = t;
      t = r1; r1 = r2; r2 = t;
      t = g1; g1 = g2; g2 = t;
      t = b1; b1 = b2; b2 = t;
      area = -area;
    }
    const inv = 1 / area;

    const ax0 = -(y2 - y1);
    const ay0 = x2 - x1;
    const ax1 = -(y0 - y2);
    const ay1 = x0 - x2;
    const ax2 = -(y1 - y0);
    const ay2 = x1 - x0;

    // Top-left fill rule. Without it a pixel sitting exactly on the diagonal
    // two triangles share is covered by both, which is invisible for opaque
    // fills and draws a seam down every shadow and every pool of lamplight.
    const tl0 = (y1 === y2 && x2 > x1) || y2 < y1;
    const tl1 = (y2 === y0 && x0 > x2) || y0 < y2;
    const tl2 = (y0 === y1 && x1 > x0) || y1 < y0;

    const px = minX + 0.5;
    const py = minY + 0.5;
    let rw0 = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    let rw1 = (x0 - x2) * (py - y2) - (y0 - y2) * (px - x2);
    let rw2 = (x1 - x0) * (py - y0) - (y1 - y0) * (px - x0);

    const flat = r0 === r1 && r1 === r2 && g0 === g1 && g1 === g2 && b0 === b1 && b1 === b2;
    const opaque = alpha >= 1;
    const { col, dep, ids, glow } = this;

    for (let y = minY; y <= maxY; y++) {
      let w0 = rw0;
      let w1 = rw1;
      let w2 = rw2;
      const row = y * W;
      for (let x = minX; x <= maxX; x++) {
        if (
          (w0 > 0 || (w0 === 0 && tl0)) &&
          (w1 > 0 || (w1 === 0 && tl1)) &&
          (w2 > 0 || (w2 === 0 && tl2))
        ) {
          const p = row + x;
          const d = (w0 * d0 + w1 * d1 + w2 * d2) * inv;
          if (d < dep[p]) {
            const i = p << 2;
            let cr: number;
            let cg: number;
            let cb: number;
            if (flat) {
              cr = r0; cg = g0; cb = b0;
            } else {
              cr = (w0 * r0 + w1 * r1 + w2 * r2) * inv;
              cg = (w0 * g0 + w1 * g1 + w2 * g2) * inv;
              cb = (w0 * b0 + w1 * b1 + w2 * b2) * inv;
            }
            if (opaque) {
              col[i] = cr;
              col[i + 1] = cg;
              col[i + 2] = cb;
              dep[p] = d;
              ids[p] = id;
              glow[p] = glowAmt;
            } else {
              const k = 1 - alpha;
              col[i] = col[i] * k + cr * alpha;
              col[i + 1] = col[i + 1] * k + cg * alpha;
              col[i + 2] = col[i + 2] * k + cb * alpha;
              if (glowAmt > 0) glow[p] += glowAmt * alpha;
            }
          }
        }
        w0 += ax0;
        w1 += ax1;
        w2 += ax2;
      }
      rw0 += ay0;
      rw1 += ay1;
      rw2 += ay2;
    }
  }

  /**
   * Thick line, stamped along its own length. A one-pixel diagonal drawn as two
   * triangles makes the rasteriser scan the whole bounding box to find a couple
   * of hundred covered pixels; the floor grid alone was costing more than every
   * wall in the building. Marching the line instead is proportional to what it
   * actually covers.
   */
  segment(
    x0: number, y0: number, d0: number,
    x1: number, y1: number, d1: number,
    r: number, g: number, b: number,
    width: number, glowAmt: number, id: number,
  ): void {
    const { col, dep, ids, glow, w, h } = this;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(len / 0.62));
    const reach = Math.max(0, Math.ceil(Math.max(0.5, width / 2) - 0.5));
    const inv = 1 / steps;
    const dd = d1 - d0;

    // Whole segment off the buffer.
    if (
      (x0 < -reach && x1 < -reach) || (x0 > w + reach && x1 > w + reach) ||
      (y0 < -reach && y1 < -reach) || (y0 > h + reach && y1 > h + reach)
    ) return;

    for (let i = 0; i <= steps; i++) {
      const t = i * inv;
      const cx = Math.round(x0 + dx * t);
      const cy = Math.round(y0 + dy * t);
      const d = d0 + dd * t;
      for (let oy = -reach; oy <= reach; oy++) {
        const py = cy + oy;
        if (py < 0 || py >= h) continue;
        const row = py * w;
        for (let ox = -reach; ox <= reach; ox++) {
          const px = cx + ox;
          if (px < 0 || px >= w) continue;
          const p = row + px;
          if (d >= dep[p]) continue;
          const at = p << 2;
          col[at] = r;
          col[at + 1] = g;
          col[at + 2] = b;
          dep[p] = d;
          ids[p] = id;
          glow[p] = glowAmt;
        }
      }
    }
  }

  /** One depth-tested pixel. Used by the bitmap font and by point sprites. */
  point(x: number, y: number, d: number, r: number, g: number, b: number, alpha: number, glowAmt: number, id: number): void {
    const px = x | 0;
    const py = y | 0;
    if (px < 0 || py < 0 || px >= this.w || py >= this.h) return;
    const p = py * this.w + px;
    if (d >= this.dep[p]) return;
    const i = p << 2;
    if (alpha >= 1) {
      this.col[i] = r;
      this.col[i + 1] = g;
      this.col[i + 2] = b;
      this.dep[p] = d;
      this.ids[p] = id;
      this.glow[p] = glowAmt;
    } else {
      const k = 1 - alpha;
      this.col[i] = this.col[i] * k + r * alpha;
      this.col[i + 1] = this.col[i + 1] * k + g * alpha;
      this.col[i + 2] = this.col[i + 2] * k + b * alpha;
      if (glowAmt > 0) this.glow[p] += glowAmt * alpha;
    }
  }

  /**
   * Draws a one-pixel halo around every pixel carrying the given id. The id
   * buffer makes this exact, so selection reads as a drawn outline rather than
   * a tinted blob.
   */
  outline(id: number, colour: RGB, thickness: number): void {
    const { ids, col, w, h } = this;
    const t = Math.max(1, Math.round(thickness));
    let lox = w;
    let loy = h;
    let hix = -1;
    let hiy = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (ids[row + x] !== id) continue;
        if (x < lox) lox = x;
        if (x > hix) hix = x;
        if (y < loy) loy = y;
        if (y > hiy) hiy = y;
      }
    }
    if (hix < 0) return;
    lox = Math.max(0, lox - t);
    loy = Math.max(0, loy - t);
    hix = Math.min(w - 1, hix + t);
    hiy = Math.min(h - 1, hiy + t);
    const marks: number[] = [];
    for (let y = loy; y <= hiy; y++) {
      const row = y * w;
      for (let x = lox; x <= hix; x++) {
        if (ids[row + x] === id) continue;
        let near = false;
        for (let dy = -t; dy <= t && !near; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          const r2 = yy * w;
          for (let dx = -t; dx <= t; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            if (ids[r2 + xx] === id) {
              near = true;
              break;
            }
          }
        }
        if (near) marks.push(row + x);
      }
    }
    for (const p of marks) {
      const i = p << 2;
      col[i] = colour.r;
      col[i + 1] = colour.g;
      col[i + 2] = colour.b;
    }
  }

  idAt(x: number, y: number): number {
    const px = x | 0;
    const py = y | 0;
    if (px < 0 || py < 0 || px >= this.w || py >= this.h) return 0;
    return this.ids[py * this.w + px];
  }

  /**
   * Bloom, blurred at half resolution. The frame is about to be reduced to a
   * handful of inks, so the extra precision of a full-resolution blur would be
   * thrown away a moment later.
   */
  bloom(radius: number, amount: number, tint: RGB): void {
    if (amount <= 0 || radius <= 0) return;
    const { glow, glowA, glowB, col, w, h, gw, gh } = this;

    for (let y = 0; y < gh; y++) {
      const src = (y << 1) * w;
      const src2 = Math.min(h - 1, (y << 1) + 1) * w;
      const dst = y * gw;
      for (let x = 0; x < gw; x++) {
        const sx = x << 1;
        const sx2 = Math.min(w - 1, sx + 1);
        glowA[dst + x] =
          (glow[src + sx] + glow[src + sx2] + glow[src2 + sx] + glow[src2 + sx2]) * 0.25;
      }
    }

    const r = Math.max(1, Math.round(radius));
    const norm = 1 / (r * 2 + 1);
    for (let y = 0; y < gh; y++) {
      const row = y * gw;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += glowA[row + clampi(x, gw)];
      for (let x = 0; x < gw; x++) {
        glowB[row + x] = sum * norm;
        sum -= glowA[row + clampi(x - r, gw)];
        sum += glowA[row + clampi(x + r + 1, gw)];
      }
    }
    for (let x = 0; x < gw; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += glowB[clampi(y, gh) * gw + x];
      for (let y = 0; y < gh; y++) {
        glowA[y * gw + x] = sum * norm;
        sum -= glowB[clampi(y - r, gh) * gw + x];
        sum += glowB[clampi(y + r + 1, gh) * gw + x];
      }
    }

    const tr = tint.r * amount;
    const tg = tint.g * amount;
    const tb = tint.b * amount;
    for (let y = 0; y < h; y++) {
      const g = (y >> 1) * gw;
      let i = y * w << 2;
      for (let x = 0; x < w; x++, i += 4) {
        const v = glowA[g + (x >> 1)];
        if (v > 0.006) {
          col[i] += tr * v;
          col[i + 1] += tg * v;
          col[i + 2] += tb * v;
        }
      }
    }
  }

}

function clampi(v: number, n: number): number {
  return v < 0 ? 0 : v >= n ? n - 1 : v;
}
