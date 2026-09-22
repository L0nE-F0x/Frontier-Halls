import { mix, scale } from "../engine/color";
import type { Painter } from "../engine/painter";
import { hash1 } from "../engine/rng";
import { contactShadow, obox } from "../engine/shapes";
import type { RGB } from "../engine/types";
import type { BuildCtx } from "./ctx";
import { MAT } from "./materials";
import { FLOOR_Z } from "./metrics";
import type { NavGrid } from "./nav";

export type Activity = "idle" | "work" | "walk" | "talk" | "read" | "watch" | "rest";

export type Traits = {
  /** Walking speed multiplier. */
  pace: number;
  /** How readily this one stops to talk. */
  sociability: number;
  /** How likely it is to stay put when it could wander. */
  focus: number;
  /** How far from its own hall it is willing to go. */
  range: number;
};

export type PersonSpec = {
  id: string;
  name: string;
  /** Short role line, shown under the name. */
  role: string;
  /** One of the hall's tiers, used for grouping in the dossier. */
  tier: string;
  doing: string;
  why: string;
  /** Facts the dossier lists as chips. */
  chips: string[];
  accent: RGB;
  scale: number;
  /** Station id inside the hall this one works at by default. */
  home: string;
  /** Other stations in the hall it drifts to. */
  haunts?: string[];
  traits?: Partial<Traits>;
  carries?: Carried;
};

export type Carried = "slate" | "mug" | "papers" | "case" | null;

export type Person = PersonSpec & {
  hallId: string;
  pickId: number;
  traits: Traits;
  x: number;
  y: number;
  facing: number;
  /** Where it is heading, world space. */
  goalX: number;
  goalY: number;
  goalFacing: number;
  goalStation: string | null;
  activity: Activity;
  path: { x: number; y: number }[];
  pathAt: number;
  speed: number;
  /** Seconds of simulated time before the next decision. */
  timer: number;
  phase: number;
  stride: number;
  talkingTo: string | null;
  talkTimer: number;
  socialCooldown: number;
  carrying: Carried;
  /** Smoothed 0..1, how much of the walk animation is showing. */
  moving: number;
  /** Rises while working, so the figure leans in. */
  effort: number;
  seed: number;
};

const DEFAULT_TRAITS: Traits = { pace: 1, sociability: 0.5, focus: 0.6, range: 1 };

export function makePerson(spec: PersonSpec, hallId: string, pickId: number, x: number, y: number, facing: number): Person {
  const seed = Math.abs(hashString(spec.id));
  return {
    ...spec,
    hallId,
    pickId,
    traits: { ...DEFAULT_TRAITS, ...spec.traits },
    x,
    y,
    facing,
    goalX: x,
    goalY: y,
    goalFacing: facing,
    goalStation: spec.home,
    activity: "work",
    path: [],
    pathAt: 0,
    speed: 0,
    timer: 2 + hash1(seed) * 6,
    phase: hash1(seed + 7) * 10,
    stride: 0,
    talkingTo: null,
    talkTimer: 0,
    socialCooldown: hash1(seed + 3) * 10,
    carrying: spec.carries ?? null,
    moving: 0,
    effort: 0,
    seed,
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export function setGoal(person: Person, nav: NavGrid, x: number, y: number, facing: number, station: string | null): void {
  person.goalX = x;
  person.goalY = y;
  person.goalFacing = facing;
  person.goalStation = station;
  const path = nav.path(person.x, person.y, x, y);
  person.path = path ?? [{ x, y }];
  person.pathAt = 0;
  person.activity = "walk";
}

const ARRIVE = 0.14;

export function stepPerson(person: Person, dt: number, motion: boolean): void {
  person.phase += dt;
  person.socialCooldown = Math.max(0, person.socialCooldown - dt);
  if (!motion) return;

  if (person.activity === "walk" && person.path.length) {
    const target = person.path[person.pathAt];
    const dx = target.x - person.x;
    const dy = target.y - person.y;
    const dist = Math.hypot(dx, dy);
    const last = person.pathAt >= person.path.length - 1;
    const want = 1.35 * person.traits.pace * (last ? Math.min(1, 0.35 + dist) : 1);
    person.speed += (want - person.speed) * Math.min(1, dt * 6);
    if (dist < ARRIVE) {
      if (last) {
        person.path = [];
        person.speed = 0;
        person.activity = person.goalStation === "rest" ? "rest" : "work";
        person.facing = person.goalFacing;
        person.timer = 4 + hash1(person.seed + Math.floor(person.phase)) * 10;
      } else {
        person.pathAt++;
      }
    } else {
      const step = Math.min(dist, person.speed * dt);
      person.x += (dx / dist) * step;
      person.y += (dy / dist) * step;
      const wanted = Math.atan2(dy, dx);
      person.facing = turnToward(person.facing, wanted, dt * 7);
      person.stride += step * 3.1;
    }
  } else {
    person.speed += (0 - person.speed) * Math.min(1, dt * 8);
    if (person.activity === "talk" && person.talkTimer > 0) {
      person.talkTimer -= dt;
      if (person.talkTimer <= 0) {
        person.talkingTo = null;
        person.activity = "work";
        person.socialCooldown = 18 + hash1(person.seed + 11) * 40;
        person.timer = 2;
      }
    }
    person.facing = turnToward(person.facing, person.goalFacing, dt * 4);
  }

  const wantMoving = person.speed > 0.12 ? 1 : 0;
  person.moving += (wantMoving - person.moving) * Math.min(1, dt * 7);
  const wantEffort = person.activity === "work" || person.activity === "read" ? 1 : 0;
  person.effort += (wantEffort - person.effort) * Math.min(1, dt * 2.5);
}

function turnToward(current: number, target: number, amount: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, amount);
}

/* ------------------------------------------------------------------ drawing */

type Joint = { x: number; y: number; z: number };

function ahead(person: Person, forward: number, side: number, z: number): Joint {
  const ca = Math.cos(person.facing);
  const sa = Math.sin(person.facing);
  return {
    x: person.x + ca * forward - sa * side,
    y: person.y + sa * forward + ca * side,
    z: FLOOR_Z + z,
  };
}

function limb(p: Painter, a: Joint, b: Joint, thickness: number, color: RGB): void {
  p.line(a.x, a.y, a.z, b.x, b.y, b.z, color, Math.max(1.6, thickness * p.cam.s), {
    emissive: 0, bias: 0.015,
  });
}

/**
 * The figure. Small boxes and capsules, posed by a handful of angles: enough
 * for a walk to read as a walk from across the hall, and for a head to be worth
 * clicking on.
 */
export function drawPerson(ctx: BuildCtx, person: Person, selected: boolean, hovered: boolean): void {
  const { p } = ctx;
  const k = person.scale * 1.02;
  const t = person.phase;
  const id = person.pickId;

  const walk = person.moving;
  const swing = Math.sin(person.stride) * 0.34 * walk;
  const swing2 = Math.sin(person.stride + Math.PI) * 0.34 * walk;
  const bob = Math.abs(Math.sin(person.stride)) * 0.045 * walk;
  const breathe = Math.sin(t * 1.5 + person.seed * 0.01) * 0.012;
  const lean = person.effort * 0.1 + walk * 0.05;
  const talkNod = person.activity === "talk" ? Math.sin(t * 4.6 + person.seed) * 0.03 : 0;

  const hipZ = (0.78 + bob + breathe) * k;
  const chestZ = (1.16 + bob + breathe) * k;
  const headZ = (1.5 + bob + breathe + talkNod) * k;

  const skin = hash1(person.seed + 5) > 0.5 ? MAT.skin : MAT.skinAlt;
  const trouser = mix(MAT.carbon, MAT.cloth, 0.22 + hash1(person.seed + 2) * 0.2);
  const shirt = person.accent;
  const hairTone = mix(MAT.hair, MAT.carbon, hash1(person.seed + 9) * 0.6);

  contactShadow(p, person.x, person.y, FLOOR_Z, 0.34 * k, 0.21 * k, ctx.shadowStrength * (0.75 - walk * 0.15), MAT.ink);

  // Legs.
  const hipL = ahead(person, 0, -0.1 * k, hipZ);
  const hipR = ahead(person, 0, 0.1 * k, hipZ);
  const kneeL = ahead(person, swing * 0.5 * k, -0.1 * k, hipZ * 0.55);
  const kneeR = ahead(person, swing2 * 0.5 * k, 0.1 * k, hipZ * 0.55);
  const footL = ahead(person, swing * k, -0.1 * k, Math.max(0, swing > 0 ? 0.04 * walk : 0) * k);
  const footR = ahead(person, swing2 * k, 0.1 * k, Math.max(0, swing2 > 0 ? 0.04 * walk : 0) * k);
  limb(p, hipL, kneeL, 0.115 * k, trouser);
  limb(p, hipR, kneeR, 0.115 * k, trouser);
  limb(p, kneeL, footL, 0.1 * k, trouser);
  limb(p, kneeR, footR, 0.1 * k, trouser);
  obox(p, footL.x, footL.y, footL.z, 0.24 * k, 0.13 * k, 0.07 * k, person.facing, MAT.carbon);
  obox(p, footR.x, footR.y, footR.z, 0.24 * k, 0.13 * k, 0.07 * k, person.facing, MAT.carbon);

  // Torso, tipped forward a little when working.
  const torsoC = ahead(person, lean * 0.4 * k, 0, (hipZ + chestZ) / 2 - 0.19 * k);
  obox(p, torsoC.x, torsoC.y, torsoC.z, 0.27 * k, 0.42 * k, 0.42 * k, person.facing, shirt, {
    top: scale(shirt, 1.1), sideTint: 0.94, id,
  });
  obox(p, torsoC.x, torsoC.y, torsoC.z - 0.06 * k, 0.3 * k, 0.44 * k, 0.1 * k, person.facing, trouser, { id });

  // Arms.
  const shL = ahead(person, lean * 0.5 * k, -0.21 * k, chestZ);
  const shR = ahead(person, lean * 0.5 * k, 0.21 * k, chestZ);
  const working = person.activity === "work" || person.activity === "read";
  const reach = working ? 0.32 : 0;
  const talkWave = person.activity === "talk" ? Math.sin(t * 3.1 + person.seed * 0.3) * 0.2 : 0;
  const elbowL = ahead(person, swing2 * 0.34 * k + reach * 0.5 * k, -0.25 * k, chestZ - 0.24 * k);
  const elbowR = ahead(person, swing * 0.34 * k + reach * 0.5 * k, 0.25 * k, chestZ - 0.24 * k);
  const handL = ahead(person, swing2 * 0.62 * k + reach * k, -0.23 * k, chestZ - (working ? 0.3 : 0.46) * k);
  const handR = ahead(person, swing * 0.62 * k + (reach + talkWave) * k, 0.23 * k, chestZ - (working ? 0.3 : 0.46 - talkWave) * k);
  limb(p, shL, elbowL, 0.1 * k, shirt);
  limb(p, shR, elbowR, 0.1 * k, shirt);
  limb(p, elbowL, handL, 0.085 * k, skin);
  limb(p, elbowR, handR, 0.085 * k, skin);

  // Neck and head. The head carries the pick id, so clicking aims at the face.
  const neck = ahead(person, lean * 0.6 * k, 0, chestZ + 0.04 * k);
  const head = ahead(person, lean * 0.75 * k, 0, headZ);
  limb(p, neck, head, 0.09 * k, skin);
  obox(p, head.x, head.y, head.z - 0.11 * k, 0.21 * k, 0.22 * k, 0.24 * k, person.facing, skin, {
    top: scale(skin, 1.04), id,
  });
  obox(p, head.x, head.y, head.z + 0.1 * k, 0.225 * k, 0.235 * k, 0.06 * k, person.facing, hairTone, { id });
  const backOff = -0.06 * k;
  obox(
    p, head.x - Math.cos(person.facing) * backOff * -1, head.y - Math.sin(person.facing) * backOff * -1,
    head.z - 0.06 * k, 0.1 * k, 0.24 * k, 0.16 * k, person.facing, hairTone, { id },
  );

  // Carried things.
  if (person.carrying === "slate") {
    const hold = ahead(person, 0.3 * k, 0, chestZ - 0.18 * k);
    obox(p, hold.x, hold.y, hold.z, 0.06 * k, 0.34 * k, 0.26 * k, person.facing, MAT.darkMetal, { id });
    obox(p, hold.x, hold.y, hold.z + 0.01 * k, 0.02 * k, 0.28 * k, 0.2 * k, person.facing, MAT.screen, {
      emissive: 0.7, glow: 0.4, id,
    });
  } else if (person.carrying === "mug") {
    const hold = ahead(person, 0.26 * k, 0.2 * k, chestZ - 0.26 * k);
    p.cylinder(hold.x, hold.y, hold.z, 0.06 * k, 0.06 * k, 0.11 * k, MAT.terracotta, 7, { id });
  } else if (person.carrying === "papers") {
    const hold = ahead(person, 0.26 * k, 0, chestZ - 0.24 * k);
    obox(p, hold.x, hold.y, hold.z, 0.05 * k, 0.32 * k, 0.24 * k, person.facing, MAT.paper, {
      emissive: 0.25, id,
    });
  } else if (person.carrying === "case") {
    const hold = ahead(person, 0.1 * k, 0.28 * k, 0.5 * k);
    obox(p, hold.x, hold.y, hold.z, 0.18 * k, 0.4 * k, 0.3 * k, person.facing, MAT.benchDark, { id });
  }

  if (person.activity === "talk" && ctx.quality > 0) speechBubble(ctx, person, head.z + 0.34 * k);
  if ((selected || hovered) && ctx.quality > 0) {
    const pulse = selected ? 0.75 + 0.25 * Math.sin(ctx.time * 3) : 0.4;
    p.disc(person.x, person.y, FLOOR_Z, 0.5 * k, 0.32 * k, MAT.lamp, {
      emissive: 1, alpha: pulse * 0.5, bias: 0.03, glow: pulse * 0.3,
    }, 16);
  }
}

/** Three dots over the head. Enough to say "these two are talking". */
function speechBubble(ctx: BuildCtx, person: Person, z: number): void {
  const { p, time } = ctx;
  for (let i = 0; i < 3; i++) {
    const beat = (time * 1.7 + i * 0.28 + person.seed * 0.01) % 2;
    if (beat > 1.1) continue;
    const lift = Math.min(1, beat) * 0.1;
    p.dot(person.x, person.y, z + lift + i * 0.09, 2.4, MAT.paper, {
      emissive: 1, alpha: 0.85, glow: 0.2,
    });
  }
}
