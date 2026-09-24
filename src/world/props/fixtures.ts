import { mix, scale } from "../../engine/color";
import { hash2, noise1 } from "../../engine/rng";
import { castShadow, contactShadow, tube, uprightDisc } from "../../engine/shapes";
import { wallText, worldText } from "../../engine/text";
import type { RGB } from "../../engine/types";
import { shows, type BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z, TRUSS_Z } from "../metrics";
import type { LampStyle } from "../halls/types";

export type Facing = "n" | "s" | "e" | "w";

function ledOn(x: number, y: number, i: number, time: number): number {
  const base = Math.sin(time * 2.1 + x * 1.7 + y * 0.43 + i * 1.31);
  const flick = noise1(time * 6 + i * 3.7 + x);
  return base > -0.25 ? 0.55 + flick * 0.45 : 0.06;
}

/**
 * A rack. Four uprights, a stack of units, vents, and a row of indicators that
 * are the only thing in the hall moving when nobody is in it.
 */
export function rack(
  ctx: BuildCtx,
  x: number, y: number,
  facing: Facing,
  height: number,
  label: string | null,
  body: RGB = MAT.rack,
): void {
  const { p, time } = ctx;
  const along = facing === "n" || facing === "s";
  const w = along ? 1.42 : 0.92;
  const d = along ? 0.92 : 1.42;

  if (ctx.lod === 0) {
    // One block and a lit seam, which is all a rack is from across the block.
    p.box(x, y, FLOOR_Z, w, d, height, body, { top: MAT.rackTrim });
    const on = ledOn(x, y, 0, time) > 0.2;
    if (along) p.box(x + 0.2, facing === "s" ? y + d : y - 0.02, FLOOR_Z + height * 0.45, w - 0.4, 0.02, 0.12, on ? MAT.led : MAT.ledOff, { emissive: 1, glow: on ? 0.5 : 0 });
    else p.box(facing === "e" ? x + w : x - 0.02, y + 0.2, FLOOR_Z + height * 0.45, 0.02, d - 0.4, 0.12, on ? MAT.led : MAT.ledOff, { emissive: 1, glow: on ? 0.5 : 0 });
    ctx.nav?.blockRect(x, y, w, d, 0.15);
    return;
  }

  const units = Math.max(3, Math.round(height / 1.1));
  p.box(x, y, FLOOR_Z, w, d, height, body, { top: MAT.rackTrim });
  if (ctx.lod > 1) {
    p.box(x - 0.05, y - 0.05, FLOOR_Z, w + 0.1, d + 0.1, 0.14, MAT.darkMetal);
    p.box(x - 0.04, y - 0.04, FLOOR_Z + height, w + 0.08, d + 0.08, 0.1, MAT.rackTrim);
  }

  // Face plate on whichever side is the front.
  const fx = facing === "e" ? x + w : facing === "w" ? x - 0.07 : x + 0.09;
  const fy = facing === "n" ? y - 0.07 : facing === "s" ? y + d : y + 0.09;
  const fw = along ? w - 0.18 : 0.02;
  const fd = along ? 0.02 : d - 0.18;

  for (let i = 0; i < units; i++) {
    const z = FLOOR_Z + 0.32 + (i * (height - 0.62)) / units;
    const uh = (height - 0.62) / units - 0.09;
    const bright = ledOn(x, y, i, time);
    const on = bright > 0.2;
    const led = on ? MAT.led : MAT.ledOff;
    // Each unit sits proud of the frame, and its indicator sits proud of that.
    // Everything here is within a few centimetres, so the order matters.
    const shell = i % 2 === 0 ? mix(body, MAT.metal, 0.3) : mix(body, MAT.darkMetal, 0.55);
    if (along) {
      p.box(fx, fy, z, fw, 0.05, uh, shell, { top: mix(shell, MAT.metal, 0.3) });
      p.box(fx + 0.07, fy + 0.04, z + uh * 0.3, fw * 0.18, 0.05, uh * 0.3, led, {
        emissive: on ? 1 : 0.25,
        glow: on ? bright * 0.7 : 0,
      });
      if (ctx.lod > 1) {
        for (let v = 0; v < 5; v++) {
          p.box(fx + fw * 0.45 + v * 0.11, fy + 0.03, z + uh * 0.22, 0.055, 0.04, uh * 0.5, MAT.darkMetal);
        }
      }
    } else {
      p.box(fx, fy, z, 0.05, fd, uh, shell, { top: mix(shell, MAT.metal, 0.3) });
      p.box(fx + 0.04, fy + 0.08, z + uh * 0.3, 0.05, fd * 0.18, uh * 0.3, led, {
        emissive: on ? 1 : 0.25,
        glow: on ? bright * 0.7 : 0,
      });
      if (ctx.lod > 1) {
        for (let v = 0; v < 5; v++) {
          p.box(fx + 0.03, fy + fd * 0.45 + v * 0.11, z + uh * 0.22, 0.04, 0.055, uh * 0.5, MAT.darkMetal);
        }
      }
    }
  }

  if (label && ctx.lod > 1) {
    if (along) {
      wallText(p, label, x + w / 2, fy - 0.05, FLOOR_Z + height - 0.2, 0.034, MAT.paper, {
        align: "center", emissive: 0.6,
      });
    }
  }

  castShadow(p, x, y, w, d, height * 0.16, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.7, MAT.ink);
  ctx.nav?.blockRect(x, y, w, d, 0.15);
}

export function rackRow(
  ctx: BuildCtx,
  x: number, y: number,
  count: number,
  pitch: number,
  facing: Facing,
  height: number,
  tag: string,
  body?: RGB,
): void {
  for (let i = 0; i < count; i++) {
    const label = ctx.quality > 1 ? `${tag}${String(i + 1).padStart(2, "0")}` : null;
    if (facing === "n" || facing === "s") rack(ctx, x + i * pitch, y, facing, height, label, body);
    else rack(ctx, x, y + i * pitch, facing, height, label, body);
  }
}

/** Overhead cable tray, hung from the trusses. */
export function cableTray(ctx: BuildCtx, x: number, y: number, length: number, axis: "x" | "y", z = TRUSS_Z - 1.15): void {
  const { p } = ctx;
  if (ctx.lod === 0) return;
  if (axis === "x") {
    p.box(x, y, z, length, 0.5, 0.08, MAT.darkMetal);
    p.box(x, y, z, length, 0.05, 0.16, MAT.darkMetal);
    p.box(x, y + 0.45, z, length, 0.05, 0.16, MAT.darkMetal);
    if (ctx.lod > 1) {
      for (let i = 0.4; i < length; i += 2.6) {
        p.box(x + i, y + 0.2, z + 0.16, 0.06, 0.1, TRUSS_Z - z - 0.16, MAT.metal);
      }
      tube(p, x, y + 0.25, z + 0.13, length, 0.07, "x", MAT.pipe, 5);
    }
  } else {
    p.box(x, y, z, 0.5, length, 0.08, MAT.darkMetal);
    p.box(x, y, z, 0.05, length, 0.16, MAT.darkMetal);
    p.box(x + 0.45, y, z, 0.05, length, 0.16, MAT.darkMetal);
    if (ctx.lod > 1) {
      for (let i = 0.4; i < length; i += 2.6) {
        p.box(x + 0.2, y + i, z + 0.16, 0.1, 0.06, TRUSS_Z - z - 0.16, MAT.metal);
      }
      tube(p, x + 0.25, y, z + 0.13, length, 0.07, "y", MAT.pipe, 5);
    }
  }
}

/**
 * A hanging lamp. The light itself is registered separately, before anything
 * is shaded; this is only what it looks like, and every style gives the same
 * light.
 */
export function pendant(ctx: BuildCtx, x: number, y: number, z: number, on: number, style: LampStyle = "shade", tint?: RGB): void {
  const { p } = ctx;
  if (style === "none") return;
  const far = ctx.lod === 0;
  if (!far) p.box(x - 0.03, y - 0.03, z + 0.3, 0.06, 0.06, TRUSS_Z - z - 0.3, MAT.darkMetal);
  const glowTone = tint ? mix(tint, MAT.bulb, 0.5) : MAT.bulb;
  if (style === "shade") {
    p.cylinder(x, y, z + 0.02, 0.56, 0.56, 0.3, MAT.shade, far ? 6 : 10, { sideTint: 0.8, top: scale(MAT.shade, 0.62) });
    if (!far) {
      p.cylinder(x, y, z - 0.12, 0.22, 0.22, 0.16, glowTone, 8, { emissive: 0.35 + on * 0.65, glow: on * 1.25 });
      p.disc(x, y, z, 0.54, 0.54, glowTone, { emissive: 0.5 + on * 0.5, glow: on * 0.7 }, 10);
    }
  } else if (style === "lantern") {
    // Paper: lit through, so the whole body glows when the lamps are on.
    const paper = mix(MAT.paper, glowTone, 0.25 + on * 0.35);
    p.cylinder(x, y, z - 0.45, 0.46, 0.46, 0.9, paper, far ? 6 : 10, { emissive: 0.45 + on * 0.55, glow: on * 0.8 });
    if (!far) {
      p.cylinder(x, y, z + 0.44, 0.3, 0.3, 0.06, MAT.woodDark, 8);
      p.cylinder(x, y, z - 0.5, 0.3, 0.3, 0.06, MAT.woodDark, 8);
      if (tint) p.box(x - 0.47, y - 0.47, z - 0.12, 0.94, 0.94, 0.08, tint, { emissive: 0.6 });
    }
  } else if (style === "globe") {
    p.cylinder(x, y, z - 0.3, 0.42, 0.42, 0.6, glowTone, far ? 6 : 12, { emissive: 0.5 + on * 0.5, glow: on * 1.1 });
    if (!far) p.cylinder(x, y, z + 0.28, 0.12, 0.12, 0.08, MAT.metal, 6);
  } else if (style === "track") {
    p.box(x - 1.6, y - 0.06, z + 0.3, 3.2, 0.12, 0.08, MAT.darkMetal);
    if (!far) {
      for (const u of [-1.2, 0, 1.2]) {
        p.cylinder(x + u, y, z - 0.05, 0.14, 0.14, 0.32, MAT.black, 6);
        p.disc(x + u, y, z - 0.06, 0.12, 0.12, glowTone, { emissive: 1, glow: on * 0.9 }, 6);
      }
    }
  } else if (style === "neon") {
    // A ring of tube in the room's own colour, lit whatever the hour.
    const tone = tint ?? MAT.led;
    const r = 0.8;
    const sides = far ? 6 : 12;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      p.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z, x + Math.cos(a1) * r, y + Math.sin(a1) * r, z, tone, 3, {
        emissive: 1, glow: 0.6 + on * 0.6,
      });
    }
  }
  if (on > 0.05 && !far && style !== "neon") {
    // The pool under the lamp, drawn as light rather than computed as light.
    const pool = mix(tint ? mix(tint, MAT.lamp, 0.5) : MAT.lamp, MAT.paper, 0.35);
    p.disc(x, y, FLOOR_Z, 2.7, 2.7, pool, { alpha: 0.07 + on * 0.13, emissive: 1, bias: 0.02, glow: on * 0.1 }, 14);
  }
}

/** Small articulated task lamp for a desk. */
export function taskLamp(ctx: BuildCtx, x: number, y: number, z: number, angle: number, on: number): void {
  const { p } = ctx;
  p.cylinder(x, y, z, 0.14, 0.14, 0.05, MAT.darkMetal, 8);
  const ax = x + Math.cos(angle) * 0.34;
  const ay = y + Math.sin(angle) * 0.34;
  p.line(x, y, z + 0.04, ax, ay, z + 0.62, MAT.metal, 2.4, { emissive: 0.4 });
  p.line(ax, ay, z + 0.62, ax + Math.cos(angle) * 0.3, ay + Math.sin(angle) * 0.3, z + 0.48, MAT.metal, 2.2, { emissive: 0.4 });
  const hx = ax + Math.cos(angle) * 0.34;
  const hy = ay + Math.sin(angle) * 0.34;
  p.cylinder(hx - 0.09, hy - 0.09, z + 0.36, 0.13, 0.13, 0.12, MAT.shade, 7, { emissive: 0.2 + on * 0.4, glow: on * 0.4 });
}

/**
 * A clock face standing in a vertical plane, with hands that track the world
 * clock. `axis` is the one the face looks along.
 */
export function clockFace(
  ctx: BuildCtx,
  axis: "x" | "y",
  x: number, y: number, z: number,
  r: number,
  normal: 1 | -1,
): void {
  const { p, clock } = ctx;
  const ox = axis === "x" ? normal * 0.012 : 0;
  const oy = axis === "y" ? normal * 0.012 : 0;
  uprightDisc(p, axis, x + ox, y + oy, z, r, normal, MAT.paper, {
    noCull: true, emissive: 0.45, bias: 0.02,
  }, ctx.lod > 1 ? 16 : 8);
  if (!shows(ctx, r, 3)) return;

  // A mark at each hour, then the hands, all drawn on the face's own plane.
  const at = (ang: number, len: number) => {
    const a = ang - Math.PI / 2;
    return axis === "y"
      ? { x: x + Math.cos(a) * r * len, y: y + oy * 2, z: z - Math.sin(a) * r * len }
      : { x: x + ox * 2, y: y + Math.cos(a) * r * len, z: z - Math.sin(a) * r * len };
  };
  if (ctx.lod > 1) {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const from = at(ang, i % 3 === 0 ? 0.72 : 0.83);
      const to = at(ang, 0.93);
      p.line(from.x, from.y, from.z, to.x, to.y, to.z, MAT.ink, i % 3 === 0 ? 2 : 1.2, {
        emissive: 1, bias: 0.05,
      });
    }
  }
  const hands = clock.hands();
  const hand = (ang: number, len: number, width: number, tone: RGB) => {
    const tip = at(ang, len);
    const pivot = at(0, 0);
    p.line(pivot.x, pivot.y, pivot.z, tip.x, tip.y, tip.z, tone, width, { emissive: 1, bias: 0.06 });
  };
  hand(hands.hour, 0.52, 2.8, MAT.ink);
  hand(hands.minute, 0.78, 1.8, MAT.ink);
  if (ctx.lod > 1) hand(hands.second, 0.86, 1, MAT.lamp);
}

/** Wall-mounted clock. Every hall carries one and they all read the same time. */
export function wallClock(ctx: BuildCtx, x: number, y: number, z: number, facingY: 1 | -1): void {
  const { p } = ctx;
  const r = 0.42;
  p.box(x - r - 0.06, y - 0.07, z - r - 0.06, (r + 0.06) * 2, 0.14, (r + 0.06) * 2, MAT.wallTrim);
  clockFace(ctx, "y", x, y + facingY * 0.08, z, r, facingY);
}

/**
 * The clock at the middle of the court. It is the one the building keeps time
 * by, and it carries a face on every side so it reads from any hall.
 */
export function courtClock(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  const shaft = 4.4;
  p.cylinder(x, y, FLOOR_Z, 1.15, 1.15, 0.36, MAT.wallTrim, 12, { top: MAT.metal });
  p.cylinder(x, y, FLOOR_Z + 0.36, 0.82, 0.82, 0.26, MAT.metal, 12, { top: MAT.wallTop });
  p.box(x - 0.44, y - 0.44, FLOOR_Z + 0.6, 0.88, 0.88, shaft, MAT.wallTop, { top: MAT.metal, sideTint: 0.94 });
  p.box(x - 0.5, y - 0.5, FLOOR_Z + 0.6, 1, 1, 0.18, MAT.wallTrim);

  const headZ = FLOOR_Z + 0.6 + shaft + 0.9;
  p.box(x - 0.86, y - 0.86, headZ - 0.9, 1.72, 1.72, 0.2, MAT.wallTrim);
  p.box(x - 0.8, y - 0.8, headZ - 0.7, 1.6, 1.6, 1.5, MAT.wallTop, { top: MAT.wallTrim, sideTint: 0.97 });
  p.box(x - 0.9, y - 0.9, headZ + 0.8, 1.8, 1.8, 0.2, MAT.wallTrim);
  p.cylinder(x, y, headZ + 1, 0.22, 0.22, 0.7, MAT.metal, 8);
  const beacon = 0.5 + 0.5 * Math.sin(time * 1.1);
  p.cylinder(x, y, headZ + 1.7, 0.16, 0.16, 0.22, MAT.lamp, 8, {
    emissive: 1, glow: 0.5 + beacon * 0.6,
  });
  for (const [axis, normal] of [["y", 1], ["y", -1], ["x", 1], ["x", -1]] as ["x" | "y", 1 | -1][]) {
    const fx = axis === "x" ? x + normal * 0.8 : x;
    const fy = axis === "y" ? y + normal * 0.8 : y;
    clockFace(ctx, axis, fx, fy, headZ, 0.62, normal);
  }
  contactShadow(p, x, y, FLOOR_Z, 1.5, 1, ctx.shadowStrength * 0.8, MAT.ink);
  ctx.nav?.blockRect(x - 1.3, y - 1.3, 2.6, 2.6, 0.2);
}

/** Floor-standing cabinet with a sealed front. */
export function cabinet(ctx: BuildCtx, x: number, y: number, sealed: boolean): void {
  const { p } = ctx;
  const w = 1.25;
  const d = 0.78;
  const h = 3.4;
  p.box(x, y, FLOOR_Z, w, d, h, MAT.rack, { top: MAT.rackTrim });
  if (ctx.lod > 0) {
    p.box(x + 0.08, y + d, FLOOR_Z + 0.3, w - 0.16, 0.03, h - 0.6, mix(MAT.rack, MAT.darkMetal, 0.5));
    p.box(x + w / 2 - 0.02, y + d + 0.01, FLOOR_Z + 0.3, 0.04, 0.03, h - 0.6, MAT.darkMetal);
  }
  if (sealed) {
    p.box(x + w / 2 - 0.16, y + d + 0.02, FLOOR_Z + h * 0.5, 0.32, 0.05, 0.22, MAT.seal, {
      emissive: 1, glow: 0.45,
    });
    if (ctx.lod > 1) p.box(x + 0.16, y + d + 0.02, FLOOR_Z + h * 0.5 - 0.02, 0.18, 0.04, 0.04, MAT.darkMetal);
  }
  castShadow(p, x, y, w, d, h * 0.16, FLOOR_Z, ctx.shadowX, ctx.shadowY, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.blockRect(x, y, w, d, 0.12);
}

/** A slow extract fan set in the wall. */
export function fan(ctx: BuildCtx, x: number, y: number, z: number, speed: number): void {
  const { p, time } = ctx;
  const r = 0.4;
  p.box(x - r - 0.08, y - 0.04, z - r - 0.08, (r + 0.08) * 2, 0.1, (r + 0.08) * 2, MAT.darkMetal);
  if (ctx.lod < 2) return;
  const a0 = time * speed;
  for (let i = 0; i < 4; i++) {
    const a = a0 + (i / 4) * Math.PI * 2;
    p.line(x, y - 0.06, z, x + Math.cos(a) * r, y - 0.06, z + Math.sin(a) * r, MAT.metal, 3, {
      emissive: 0.5, bias: 0.04,
    });
  }
  p.cylinder(x - 0.07, y - 0.1, z - 0.07, 0.09, 0.09, 0.06, MAT.darkMetal, 6);
}

/** Crate, pallet and the odd stack of stock. */
export function crate(ctx: BuildCtx, x: number, y: number, size = 0.78, stack = 1, tone?: RGB): void {
  const { p } = ctx;
  for (let i = 0; i < stack; i++) {
    const s = size * (1 - i * 0.12);
    const off = (size - s) / 2;
    const z = FLOOR_Z + i * size * 0.72;
    const t = tone ?? (hash2(x + i, y) > 0.5 ? MAT.bench : MAT.benchDark);
    p.box(x + off, y + off, z, s, s, size * 0.7, t, { top: scale(t, 1.08) });
    if (ctx.lod > 1) p.box(x + off, y + off - 0.01, z + size * 0.22, s, s + 0.02, 0.06, MAT.benchDark);
  }
  if (ctx.lod > 0) contactShadow(p, x + size / 2, y + size / 2, FLOOR_Z, size * 0.75, size * 0.5, ctx.shadowStrength * 0.6, MAT.ink);
  ctx.nav?.blockRect(x, y, size, size, 0.1);
}

export function pallet(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  if (ctx.lod > 1) {
    for (let i = 0; i < 4; i++) p.box(x + i * 0.34, y, FLOOR_Z, 0.22, 1.2, 0.12, MAT.benchDark);
  }
  p.box(x, y, FLOOR_Z + 0.12, 1.24, 1.2, 0.07, MAT.bench);
  ctx.nav?.blockRect(x, y, 1.24, 1.2, 0.05);
}

/* -------------------------------------------------------------- appliances */

/** Drinks machine with a lit front. */
export function vending(ctx: BuildCtx, x: number, y: number, tone: RGB = MAT.red, facingY: 1 | -1 = 1): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 0.9, 0.8, 1.95, tone, { top: scale(tone, 0.8), sideTint: 0.9 });
  const fy = facingY > 0 ? y + 0.8 : y - 0.02;
  p.box(x + 0.08, fy, FLOOR_Z + 0.55, 0.52, 0.02, 1.2, mix(MAT.screen, MAT.paper, 0.3), {
    emissive: 0.7, glow: 0.3 + 0.08 * Math.sin(time * 3 + x),
  });
  if (ctx.lod > 1) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const tone2 = [MAT.lamp, MAT.led, MAT.seal, MAT.green][(r + c) % 4];
        p.box(x + 0.13 + c * 0.16, fy + (facingY > 0 ? 0.01 : -0.01), FLOOR_Z + 0.65 + r * 0.28, 0.1, 0.02, 0.16, tone2, { emissive: 0.6 });
      }
    }
    p.box(x + 0.66, fy, FLOOR_Z + 1.1, 0.16, 0.02, 0.3, MAT.darkMetal);
    p.box(x + 0.1, fy, FLOOR_Z + 0.18, 0.5, 0.02, 0.22, MAT.black);
  }
  ctx.nav?.blockRect(x, y, 0.9, 0.8, 0.08);
}

/** Tall fridge with glass doors. */
export function fridge(ctx: BuildCtx, x: number, y: number, facingY: 1 | -1 = 1): void {
  const { p } = ctx;
  p.box(x, y, FLOOR_Z, 1.1, 0.78, 2.0, MAT.chrome, { top: MAT.metal });
  const fy = facingY > 0 ? y + 0.78 : y - 0.02;
  p.box(x + 0.06, fy, FLOOR_Z + 0.12, 0.47, 0.02, 1.8, MAT.glass, { emissive: 0.45, glow: 0.2 });
  p.box(x + 0.57, fy, FLOOR_Z + 0.12, 0.47, 0.02, 1.8, MAT.glass, { emissive: 0.45, glow: 0.2 });
  if (ctx.lod > 1) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const tone = [MAT.lamp, MAT.led, MAT.paper, MAT.green, MAT.red][(r * 3 + c) % 5];
        p.box(x + 0.12 + c * 0.15, y + 0.3, FLOOR_Z + 0.25 + r * 0.44, 0.08, 0.08, 0.24, tone);
      }
    }
  }
  ctx.nav?.blockRect(x, y, 1.1, 0.78, 0.08);
}

/** Espresso machine, with a curl of steam when the building is awake. */
export function coffeeMachine(ctx: BuildCtx, x: number, y: number, z: number, facingY: 1 | -1 = 1): void {
  const { p, time } = ctx;
  p.box(x, y, z, 0.7, 0.5, 0.52, MAT.chrome, { top: MAT.darkMetal });
  if (ctx.lod < 2) return;
  const fy = facingY > 0 ? y + 0.5 : y - 0.03;
  p.box(x + 0.1, fy, z + 0.3, 0.5, 0.03, 0.12, MAT.darkMetal);
  for (const u of [0.18, 0.44]) p.box(x + u, fy - (facingY > 0 ? 0 : 0.06), z + 0.14, 0.08, 0.09, 0.14, MAT.black);
  p.dot(x + 0.62, fy, z + 0.46, 2, MAT.red, { emissive: 1, glow: 0.4 });
  for (let i = 0; i < 4; i++) {
    const t = (time * 0.4 + i * 0.25) % 1;
    p.dot(x + 0.35 + Math.sin(time + i) * 0.04, y + 0.25, z + 0.55 + t * 0.5, 2 + t * 2, MAT.paper, {
      emissive: 1, alpha: (1 - t) * 0.25,
    });
  }
}

/** Water cooler with its jug. */
export function waterCooler(ctx: BuildCtx, x: number, y: number): void {
  const { p } = ctx;
  p.box(x - 0.2, y - 0.2, FLOOR_Z, 0.4, 0.4, 0.95, MAT.white, { top: MAT.metal });
  p.cylinder(x, y, FLOOR_Z + 0.95, 0.17, 0.17, 0.42, MAT.water, 8, { emissive: 0.3, alpha: 0.85 });
  ctx.nav?.blockRect(x - 0.2, y - 0.2, 0.4, 0.4, 0.08);
}

/** Office printer on a stand, with a sheet halfway out. */
export function printer(ctx: BuildCtx, x: number, y: number): void {
  const { p, time } = ctx;
  p.box(x, y, FLOOR_Z, 0.9, 0.7, 0.62, MAT.darkMetal);
  p.box(x + 0.05, y + 0.05, FLOOR_Z + 0.62, 0.8, 0.6, 0.38, MAT.white, { top: scale(MAT.white, 0.94) });
  if (ctx.lod > 1) {
    const out = (Math.sin(time * 0.6 + x) + 1) * 0.12;
    p.box(x + 0.2, y + 0.58, FLOOR_Z + 0.82, 0.5, 0.1 + out, 0.01, MAT.paper, { emissive: 0.3 });
    p.dot(x + 0.75, y + 0.66, FLOOR_Z + 0.95, 2, MAT.green, { emissive: 1, glow: 0.3 });
  }
  ctx.nav?.blockRect(x, y, 0.9, 0.7, 0.08);
}

/** A kitchen sink in a run of counter. */
export function sink(ctx: BuildCtx, x: number, y: number, z: number): void {
  if (ctx.lod < 2) return;
  const { p } = ctx;
  p.box(x, y, z - 0.02, 0.6, 0.42, 0.03, MAT.chrome, { top: scale(MAT.chrome, 0.7) });
  p.box(x + 0.27, y + 0.02, z, 0.06, 0.06, 0.32, MAT.chrome);
  p.box(x + 0.27, y + 0.02, z + 0.3, 0.06, 0.2, 0.05, MAT.chrome);
}

/** A standing sign on a post, lettered on both faces. Wayfinding in the commons. */
export function postSign(ctx: BuildCtx, x: number, y: number, text: string, tone: RGB = MAT.ink, h = 2.3): void {
  const { p } = ctx;
  p.box(x - 0.04, y - 0.04, FLOOR_Z, 0.08, 0.08, h, MAT.darkMetal);
  const w = text.length * 0.07 * 6 * 0.5 + 0.3;
  p.box(x - w / 2, y - 0.04, FLOOR_Z + h - 0.02, w, 0.08, 0.4, tone, { emissive: 0.4 });
  if (ctx.lod > 1) {
    for (const s of [1, -1]) {
      worldText(p, text, x, y + s * 0.05, FLOOR_Z + h + 0.29, s, 0, 0, 0, 0, 1, 0.035, MAT.paper, {
        align: "center", emissive: 1, bias: 0.05,
      });
    }
  }
  ctx.nav?.blockRect(x - 0.08, y - 0.08, 0.16, 0.16, 0.05);
}
