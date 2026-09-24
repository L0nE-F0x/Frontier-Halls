import { mix, scale } from "../engine/color";
import type { Painter } from "../engine/painter";
import { hash1 } from "../engine/rng";
import { contactShadow, obox } from "../engine/shapes";
import type { RGB } from "../engine/types";
import type { BuildCtx } from "./ctx";
import type { Pose, Tag } from "./halls/types";
import { MAT } from "./materials";
import { FLOOR_Z } from "./metrics";
import type { NavGrid } from "./nav";

export type Activity = "walk" | "at" | "talk";

export type Traits = {
  /** Walking speed multiplier. */
  pace: number;
  /** How readily this one stops to talk. */
  sociability: number;
  /** How likely it is to stay put when it could wander. */
  focus: number;
  /** How far from its own hall it is willing to go. */
  range: number;
  /** How often it goes to the gym. */
  fitness: number;
  /** How reliably it goes to the canteen at mealtimes. */
  appetite: number;
};

export type Outfit = "tee" | "hoodie" | "jacket" | "leather" | "coat" | "suit" | "apron" | "vest" | "dress";
export type Hair = "short" | "long" | "bun" | "bald" | "cap" | "curly" | "toque" | "crop";
export type Accessory = "glasses" | "headphones" | "badge" | "scarf" | "visor" | "lanyard";

export type Look = {
  outfit?: Outfit;
  hair?: Hair;
  acc?: Accessory[];
  /** 0..3, from lightest to darkest. Picked from the seed when absent. */
  skin?: number;
  /** A little robot on wheels, not a person. The library's crawlers. */
  body?: "human" | "bot";
  /** Trouser tone override. */
  legs?: RGB;
};

export type PersonSpec = {
  id: string;
  name: string;
  /**
   * The name as it goes on a plate in the world. Inside a hall the room
   * already says whose it is, so the vendor stays on the door. Falls back to
   * the full name.
   */
  short?: string;
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
  /** Kinds of shared work it is drawn to in the afternoon. */
  interests?: Tag[];
  traits?: Partial<Traits>;
  carries?: Carried;
  look?: Look;
  /**
   * Hours it keeps, for figures who are not models and go home. Absent means
   * the building's own hours, which is every hour.
   */
  hours?: [number, number];
};

export type Carried = "slate" | "mug" | "papers" | "case" | "tray" | "towel" | "parcel" | null;

export type Person = PersonSpec & {
  hallId: string;
  pickId: number;
  traits: Traits;
  staff: boolean;
  x: number;
  y: number;
  facing: number;
  /** Where it is heading, world space. */
  goalX: number;
  goalY: number;
  goalFacing: number;
  goalStation: string | null;
  goalHall: string | null;
  /** Which of the station's spots it has, or will have. */
  goalSpot: number;
  goalPose: Pose;
  goalSeat: number;
  goalLift: number;
  /** Height of what it is standing on right now. */
  lift: number;
  /** Where it steps back to when it leaves the spot it is on. */
  leaveX: number;
  leaveY: number;
  activity: Activity;
  pose: Pose;
  /** 0..1, how far into sitting down it is. */
  sit: number;
  seat: number;
  path: { x: number; y: number }[];
  pathAt: number;
  speed: number;
  /** Seconds before the next decision. */
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
  /** A multiplier on its drawn size, for a figure that grows. */
  grow: number;
  /** 0..1, drawn at all. A figure that has left the building fades out. */
  presence: number;
  seed: number;
};

const DEFAULT_TRAITS: Traits = { pace: 1, sociability: 0.5, focus: 0.6, range: 1, fitness: 0.3, appetite: 0.7 };

export function makePerson(spec: PersonSpec, hallId: string, pickId: number, x: number, y: number, facing: number, staff = false): Person {
  const seed = Math.abs(hashString(`${hallId}/${spec.id}`));
  const traits: Traits = { ...DEFAULT_TRAITS, ...spec.traits };
  // Anything a hall file did not say is filled from the seed, so two figures
  // with the same traits written down still keep different habits.
  if (spec.traits?.fitness === undefined) traits.fitness = 0.12 + hash1(seed + 21) * 0.5;
  if (spec.traits?.appetite === undefined) traits.appetite = 0.55 + hash1(seed + 23) * 0.4;
  return {
    ...spec,
    hallId,
    pickId,
    staff,
    traits,
    x,
    y,
    facing,
    goalX: x,
    goalY: y,
    goalFacing: facing,
    goalStation: spec.home,
    goalHall: hallId,
    goalSpot: 0,
    goalPose: "stand",
    goalSeat: 0,
    goalLift: 0,
    lift: 0,
    leaveX: x,
    leaveY: y,
    activity: "at",
    pose: "stand",
    sit: 0,
    seat: 0,
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
    grow: 1,
    presence: 1,
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

export type Destination = {
  hallId: string;
  station: string;
  spot: number;
  /** Where it stands or sits. */
  x: number;
  y: number;
  face: number;
  /** The open floor it walks to first. */
  ax: number;
  ay: number;
  pose: Pose;
  seat: number;
  lift: number;
};

/**
 * Sends a figure somewhere. The route is: back off the spot it is on, to the
 * open floor it came in from; across the building on the grid; to the open
 * floor in front of where it is going; and one straight step onto it. Only
 * the middle part is found by search. The two ends are the furniture's own,
 * so a figure never has to find its own way into or out of a chair.
 */
/**
 * Sends a figure to a destination along a route round the furniture. Returns
 * false, and leaves the figure as it was, when there is no route: walking the
 * straight line instead is how a figure ends up going through a wall.
 */
export function setGoal(person: Person, nav: NavGrid, dest: Destination): boolean {
  const startX = person.activity === "walk" ? person.x : person.leaveX;
  const startY = person.activity === "walk" ? person.y : person.leaveY;
  const middle = nav.path(startX, startY, dest.ax, dest.ay);
  if (!middle) return false;
  person.goalX = dest.x;
  person.goalY = dest.y;
  person.goalFacing = dest.face;
  person.goalStation = dest.station;
  person.goalHall = dest.hallId;
  person.goalSpot = dest.spot;
  person.goalPose = dest.pose;
  person.goalSeat = dest.seat;
  person.goalLift = dest.lift;
  const route: { x: number; y: number }[] = [];
  if (person.activity !== "walk" && Math.hypot(person.leaveX - person.x, person.leaveY - person.y) > 0.05) {
    route.push({ x: person.leaveX, y: person.leaveY });
  }
  route.push(...middle);
  if (Math.hypot(dest.ax - dest.x, dest.ay - dest.y) > 0.05) route.push({ x: dest.x, y: dest.y });
  person.path = route;
  person.pathAt = 0;
  person.activity = "walk";
  person.talkingTo = null;
  person.leaveX = dest.ax;
  person.leaveY = dest.ay;
  return true;
}

const ARRIVE = 0.12;
/** How far ahead along its route a walker steers for. */
const LOOK = 0.7;

export function stepPerson(person: Person, dt: number, motion: boolean): void {
  person.phase += dt;
  person.socialCooldown = Math.max(0, person.socialCooldown - dt);
  if (!motion) return;

  if (person.activity === "walk" && person.path.length) {
    const target = person.path[person.pathAt];
    const dist = Math.hypot(target.x - person.x, target.y - person.y);
    // Steer for a point a little ahead on the route rather than for the far
    // end of the segment. Aiming at a waypoint the length of three rooms
    // away, a figure nudged aside by somebody coming the other way walks the
    // rest of the way parallel to its route, and through whatever the route
    // was going round.
    let aimX = target.x;
    let aimY = target.y;
    const from = person.pathAt > 0 ? person.path[person.pathAt - 1] : null;
    if (from) {
      const sx = target.x - from.x;
      const sy = target.y - from.y;
      const len = Math.hypot(sx, sy);
      if (len > LOOK) {
        const along = ((person.x - from.x) * sx + (person.y - from.y) * sy) / len;
        const ahead = Math.min(len, Math.max(0, along) + LOOK);
        aimX = from.x + (sx / len) * ahead;
        aimY = from.y + (sy / len) * ahead;
      }
    }
    const dx = aimX - person.x;
    const dy = aimY - person.y;
    const reach = Math.hypot(dx, dy);
    const last = person.pathAt >= person.path.length - 1;
    // Standing up first, and only then walking off.
    if (person.sit > 0.02) {
      person.sit = Math.max(0, person.sit - dt * 3.2);
      person.speed = 0;
    } else {
      const want = 1.4 * person.traits.pace * (last ? Math.min(1, 0.35 + dist) : 1);
      person.speed += (want - person.speed) * Math.min(1, dt * 6);
    }
    if (dist < ARRIVE) {
      if (last) {
        person.path = [];
        person.speed = 0;
        person.x = target.x;
        person.y = target.y;
        person.activity = "at";
        person.pose = person.goalPose;
        person.seat = person.goalSeat;
        person.timer = Math.max(person.timer, 3);
      } else {
        person.pathAt++;
      }
    } else if (person.sit <= 0.02 && reach > 1e-6) {
      const step = Math.min(reach, person.speed * dt);
      person.x += (dx / reach) * step;
      person.y += (dy / reach) * step;
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
        person.activity = "at";
        person.socialCooldown = 18 + hash1(person.seed + 11) * 40;
        person.timer = Math.min(person.timer, 2);
      }
    }
    person.facing = turnToward(person.facing, person.goalFacing, dt * 4);
    const wantSit = person.seat > 0 ? 1 : 0;
    person.sit += (wantSit - person.sit) * Math.min(1, dt * 4);
  }

  // Up onto a stage for the last step, and down off it for the first.
  let wantLift = 0;
  if (person.activity !== "walk") wantLift = person.goalLift;
  else if (person.pathAt >= person.path.length - 1) {
    const end = person.path[person.path.length - 1];
    if (end && Math.hypot(end.x - person.x, end.y - person.y) < 1.1) wantLift = person.goalLift;
  }
  person.lift += (wantLift - person.lift) * Math.min(1, dt * 5);

  const wantMoving = person.speed > 0.12 ? 1 : 0;
  person.moving += (wantMoving - person.moving) * Math.min(1, dt * 7);
  const wantEffort = person.activity === "at" && (person.pose === "type" || person.pose === "read" || person.pose === "write") ? 1 : 0;
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

function limb(p: Painter, a: Joint, b: Joint, thickness: number, color: RGB): void {
  p.line(a.x, a.y, a.z, b.x, b.y, b.z, color, Math.max(1.6, thickness * p.cam.s), {
    emissive: 0, bias: 0.015,
  });
}

const SKIN: RGB[] = [
  { r: 226, g: 196, b: 170 },
  { r: 204, g: 168, b: 138 },
  { r: 168, g: 128, b: 100 },
  { r: 120, g: 88, b: 70 },
];

/**
 * The figure. Small boxes and capsules, posed by a handful of angles: enough
 * for a walk to read as a walk from across the hall, a figure at a desk to
 * read as sitting at it, and a head to be worth clicking on.
 */
export function drawPerson(ctx: BuildCtx, person: Person, selected: boolean, hovered: boolean): void {
  if (person.presence <= 0.02) return;
  const { p } = ctx;
  const k = person.scale * 1.02 * person.grow;
  const id = person.pickId;
  const look = person.look ?? {};

  if (look.body === "bot") {
    drawBot(ctx, person, k, selected, hovered);
    return;
  }

  // From across the block a figure is a few pixels: a shirt and a head.
  if (ctx.lod === 0) {
    const z = FLOOR_Z + person.lift + (person.sit > 0.5 ? person.seat : 0);
    obox(p, person.x, person.y, z, 0.3 * k, 0.4 * k, (person.sit > 0.5 ? 0.7 : 1.3) * k, person.facing, person.accent, { id });
    obox(p, person.x, person.y, z + (person.sit > 0.5 ? 0.7 : 1.3) * k, 0.26 * k, 0.26 * k, 0.26 * k, person.facing, skinOf(person), { id });
    return;
  }

  const t = person.phase;
  const ca = Math.cos(person.facing);
  const sa = Math.sin(person.facing);
  // A joint `f` ahead of the figure, `s` to its right, `z` above the floor.
  const base = FLOOR_Z + person.lift;
  const J = (f: number, s: number, z: number, from = person): Joint => ({
    x: from.x + ca * f - sa * s,
    y: from.y + sa * f + ca * s,
    z: base + z,
  });

  const pose: Pose = person.activity === "walk" ? "stand" : person.pose;
  const sit = person.sit;
  const walk = person.moving;
  const running = pose === "run" && person.activity === "at";
  const cadence = running ? 11 : 0;
  const stride = running ? t * cadence : person.stride;
  const swingAmt = running ? 0.46 : 0.34 * walk;
  const swing = Math.sin(stride) * swingAmt;
  const swing2 = Math.sin(stride + Math.PI) * swingAmt;
  const bob = Math.abs(Math.sin(stride)) * (running ? 0.07 : 0.045 * walk);
  const breathe = Math.sin(t * 1.5 + person.seed * 0.01) * 0.012;
  const talking = person.activity === "talk";
  const talkNod = talking ? Math.sin(t * 4.6 + person.seed) * 0.03 : 0;

  // Seated hips rest on the seat; standing hips ride on the legs.
  // Heights below are above whatever the figure stands on, which is the
  // floor or a stage; FLOOR_Z is added back through J().
  const standHip = (0.78 + bob + breathe) * k;
  const seatHip = person.seat + 0.05;
  const hipZ = standHip + (seatHip - standHip) * sit;
  const torsoRise = 0.38 * k;
  const chestZ = hipZ + torsoRise;
  const headZ = chestZ + (0.34 + talkNod) * k;
  // A seated figure sits back on the seat, so its hips are behind the spot.
  const hipBack = -0.06 * sit;

  const skin = skinOf(person);
  const trouser = look.legs ?? mix(MAT.carbon, MAT.cloth, 0.22 + hash1(person.seed + 2) * 0.2);
  const outfit = look.outfit ?? "tee";
  const shirt = person.accent;
  const jacketTone = outfit === "leather" ? MAT.black : outfit === "suit" ? mix(MAT.carbon, MAT.cloth, 0.3) : outfit === "coat" ? MAT.white : outfit === "apron" ? MAT.white : shirt;
  const sleeve = outfit === "tee" || outfit === "vest" || outfit === "dress" ? shirt : jacketTone;
  const forearm = outfit === "tee" || outfit === "vest" || outfit === "dress" ? skin : jacketTone;
  const hairTone = mix(MAT.hair, MAT.carbon, hash1(person.seed + 9) * 0.6);

  const shadow = ctx.shadowStrength * (0.75 - walk * 0.15) * person.presence;
  contactShadow(p, person.x, person.y, base, 0.34 * k, 0.21 * k, shadow, MAT.ink);

  /* --------------------------------------------------------------- legs */
  const hipL = J(hipBack * k, -0.1 * k, hipZ);
  const hipR = J(hipBack * k, 0.1 * k, hipZ);
  let kneeL: Joint, kneeR: Joint, footL: Joint, footR: Joint;
  if (pose === "bike" && person.activity === "at") {
    // Pedalling: each foot goes round a small circle below the seat.
    const crank = t * 5.2;
    const pedal = (a: number, s: number) => J(0.34 * k + Math.cos(a) * 0.14 * k, s, 0.26 * k + Math.sin(a) * 0.14 * k);
    footL = pedal(crank, -0.1 * k);
    footR = pedal(crank + Math.PI, 0.1 * k);
    kneeL = J(0.3 * k, -0.11 * k, (footL.z - base + hipZ) / 2 + 0.16 * k);
    kneeR = J(0.3 * k, 0.11 * k, (footR.z - base + hipZ) / 2 + 0.16 * k);
  } else if (pose === "row" && person.activity === "at") {
    const stroke = (Math.sin(t * 2.4) + 1) / 2;
    const reach = 0.14 + stroke * 0.3;
    kneeL = J((0.24 + (1 - stroke) * 0.12) * k, -0.1 * k, person.seat + (0.28 - stroke * 0.18) * k);
    kneeR = J((0.24 + (1 - stroke) * 0.12) * k, 0.1 * k, person.seat + (0.28 - stroke * 0.18) * k);
    footL = J((0.44 + reach * 0.3) * k, -0.1 * k, person.seat - 0.02);
    footR = J((0.44 + reach * 0.3) * k, 0.1 * k, person.seat - 0.02);
  } else if (sit > 0.02) {
    // Blend a standing leg into a seated one: thighs come forward, shins drop.
    const thigh = 0.42 * k * sit;
    const kneeZ = hipZ - (hipZ) * 0.45 * (1 - sit);
    kneeL = J(hipBack * k + thigh + swing * 0.5 * k * (1 - sit), -0.1 * k, kneeZ);
    kneeR = J(hipBack * k + thigh + swing2 * 0.5 * k * (1 - sit), 0.1 * k, kneeZ);
    const footZ = Math.max(0, kneeZ - 0.46 * k);
    footL = J(hipBack * k + thigh + 0.05 * k, -0.1 * k, footZ);
    footR = J(hipBack * k + thigh + 0.05 * k, 0.1 * k, footZ);
  } else {
    kneeL = J(swing * 0.5 * k, -0.1 * k, (hipZ) * 0.55 + (running ? Math.max(0, swing) * 0.2 : 0));
    kneeR = J(swing2 * 0.5 * k, 0.1 * k, (hipZ) * 0.55 + (running ? Math.max(0, swing2) * 0.2 : 0));
    const lift = running ? 0.12 : 0.04 * walk;
    footL = J(swing * k, -0.1 * k, Math.max(0, swing > 0 ? lift : 0) * k);
    footR = J(swing2 * k, 0.1 * k, Math.max(0, swing2 > 0 ? lift : 0) * k);
  }
  limb(p, hipL, kneeL, 0.115 * k, trouser);
  limb(p, hipR, kneeR, 0.115 * k, trouser);
  limb(p, kneeL, footL, 0.1 * k, trouser);
  limb(p, kneeR, footR, 0.1 * k, trouser);
  obox(p, footL.x, footL.y, footL.z, 0.24 * k, 0.13 * k, 0.07 * k, person.facing, MAT.carbon);
  obox(p, footR.x, footR.y, footR.z, 0.24 * k, 0.13 * k, 0.07 * k, person.facing, MAT.carbon);

  /* -------------------------------------------------------------- torso */
  let lean = person.effort * 0.1 + walk * 0.05;
  if (pose === "row" && person.activity === "at") lean = -0.12 + (Math.sin(t * 2.4) + 1) * 0.12;
  if (running) lean = 0.1;
  if (pose === "stretch" && person.activity === "at") lean = 0.2 + Math.sin(t * 0.8) * 0.15;
  const torso = J((lean * 0.4 + hipBack) * k, 0, (hipZ + chestZ) / 2 - 0.19 * k);
  obox(p, torso.x, torso.y, torso.z, 0.27 * k, 0.42 * k, 0.42 * k, person.facing, outfit === "tee" || outfit === "hoodie" || outfit === "vest" || outfit === "dress" ? shirt : jacketTone, {
    top: scale(shirt, 1.1), sideTint: 0.94, id,
  });
  // A jacket shows the shirt down its front; a coat and an apron carry on
  // below the waist.
  if (ctx.lod > 1 && (outfit === "jacket" || outfit === "leather" || outfit === "suit")) {
    const front = J((lean * 0.4 + hipBack + 0.14) * k, 0, (hipZ + chestZ) / 2 - 0.17 * k);
    obox(p, front.x, front.y, front.z, 0.02 * k, 0.12 * k, 0.36 * k, person.facing, outfit === "suit" ? MAT.white : shirt, { id });
  }
  if (outfit === "coat" || outfit === "apron" || outfit === "dress") {
    const skirt = J((hipBack + 0.02) * k, 0, 0);
    const skirtLow = sit > 0.5 ? hipZ - 0.04 : (hipZ) * 0.45;
    obox(p, skirt.x, skirt.y, skirt.z + skirtLow, 0.3 * k, 0.44 * k, hipZ - skirtLow + 0.02, person.facing,
      outfit === "dress" ? shirt : jacketTone, { id });
    if (outfit === "apron" && ctx.lod > 1) {
      const bib = J((lean * 0.4 + hipBack + 0.14) * k, 0, (hipZ + chestZ) / 2 - 0.2 * k);
      obox(p, bib.x, bib.y, bib.z, 0.02 * k, 0.3 * k, 0.4 * k, person.facing, MAT.white, { id });
    }
  } else {
    obox(p, torso.x, torso.y, torso.z - 0.06 * k, 0.3 * k, 0.44 * k, 0.1 * k, person.facing, trouser, { id });
  }
  if (outfit === "vest" && ctx.lod > 1) {
    obox(p, torso.x, torso.y, torso.z + 0.05 * k, 0.29 * k, 0.43 * k, 0.3 * k, person.facing, mix(MAT.carbon, shirt, 0.3), { id });
  }

  /* --------------------------------------------------------------- arms */
  const shoulderF = (lean * 0.5 + hipBack) * k;
  const shL = J(shoulderF, -0.21 * k, chestZ);
  const shR = J(shoulderF, 0.21 * k, chestZ);
  const arms = armPose(person, pose, k, swing, swing2, t, chestZ, shoulderF);
  const elbowL = J(arms.eL[0], arms.eL[1], arms.eL[2]);
  const elbowR = J(arms.eR[0], arms.eR[1], arms.eR[2]);
  const handL = J(arms.hL[0], arms.hL[1], arms.hL[2]);
  const handR = J(arms.hR[0], arms.hR[1], arms.hR[2]);
  limb(p, shL, elbowL, 0.1 * k, sleeve);
  limb(p, shR, elbowR, 0.1 * k, sleeve);
  limb(p, elbowL, handL, 0.085 * k, forearm);
  limb(p, elbowR, handR, 0.085 * k, forearm);
  if (forearm !== skin && ctx.lod > 1) {
    p.dot(handL.x, handL.y, handL.z, Math.max(1.5, 0.08 * k * p.cam.s), skin, { bias: 0.02 });
    p.dot(handR.x, handR.y, handR.z, Math.max(1.5, 0.08 * k * p.cam.s), skin, { bias: 0.02 });
  }

  /* --------------------------------------------------------------- head */
  const headF = (lean * 0.75 + hipBack) * k;
  const neck = J((lean * 0.6 + hipBack) * k, 0, chestZ + 0.04 * k);
  const head = J(headF, 0, headZ);
  limb(p, neck, head, 0.09 * k, skin);
  obox(p, head.x, head.y, head.z - 0.11 * k, 0.21 * k, 0.22 * k, 0.24 * k, person.facing, skin, {
    top: scale(skin, 1.04), id,
  });
  drawHair(p, person, look.hair ?? defaultHair(person), head, k, hairTone, id);
  if (outfit === "hoodie") {
    const hood = J(headF - 0.14 * k, 0, headZ - 0.2 * k);
    obox(p, hood.x, hood.y, hood.z, 0.1 * k, 0.26 * k, 0.2 * k, person.facing, scale(shirt, 0.88), { id });
  }
  if (ctx.lod > 1) drawAccessories(ctx, person, look.acc ?? [], head, k, J, chestZ, lean, hipBack, base);

  /* ------------------------------------------------------ carried things */
  const carrying = person.activity === "walk" || pose === "stand" ? person.carrying : null;
  if (carrying === "slate") {
    const hold = J(0.3 * k, 0, chestZ - 0.18 * k);
    obox(p, hold.x, hold.y, hold.z, 0.06 * k, 0.34 * k, 0.26 * k, person.facing, MAT.darkMetal, { id });
    obox(p, hold.x, hold.y, hold.z + 0.01 * k, 0.02 * k, 0.28 * k, 0.2 * k, person.facing, MAT.screen, {
      emissive: 0.7, glow: 0.4, id,
    });
  } else if (carrying === "mug") {
    const hold = J(0.26 * k, 0.2 * k, chestZ - 0.26 * k);
    p.cylinder(hold.x, hold.y, hold.z, 0.06 * k, 0.06 * k, 0.11 * k, MAT.terracotta, 7, { id });
  } else if (carrying === "papers") {
    const hold = J(0.26 * k, 0, chestZ - 0.24 * k);
    obox(p, hold.x, hold.y, hold.z, 0.05 * k, 0.32 * k, 0.24 * k, person.facing, MAT.paper, { emissive: 0.25, id });
  } else if (carrying === "case") {
    const hold = J(0.1 * k, 0.28 * k, 0.5 * k);
    obox(p, hold.x, hold.y, hold.z, 0.18 * k, 0.4 * k, 0.3 * k, person.facing, MAT.benchDark, { id });
  } else if (carrying === "parcel") {
    const hold = J(0.3 * k, 0, chestZ - 0.3 * k);
    obox(p, hold.x, hold.y, hold.z, 0.34 * k, 0.4 * k, 0.3 * k, person.facing, MAT.bench, { top: scale(MAT.bench, 1.1), id });
  } else if (carrying === "towel") {
    const hold = J(-0.02 * k, 0, chestZ - 0.02 * k);
    obox(p, hold.x, hold.y, hold.z, 0.3 * k, 0.46 * k, 0.04 * k, person.facing, MAT.white, { id });
  }
  // Something to eat on the table in front of a figure that is eating.
  if (pose === "eat" && person.activity !== "walk" && person.seat >= 0.5 && ctx.lod > 1) {
    const plate = J(0.5 * k, 0, person.seat + 0.34);
    p.cylinder(plate.x, plate.y, plate.z, 0.13, 0.13, 0.02, MAT.white, 8);
    p.cylinder(plate.x, plate.y, plate.z + 0.02, 0.08, 0.08, 0.03, [MAT.lamp, MAT.green, MAT.red][person.seed % 3], 6);
  }

  if (talking && ctx.quality > 0) speechBubble(ctx, person, head.z + 0.34 * k);
  if ((selected || hovered) && ctx.quality > 0) {
    const pulse = selected ? 0.75 + 0.25 * Math.sin(ctx.time * 3) : 0.4;
    p.disc(person.x, person.y, base, 0.5 * k, 0.32 * k, MAT.lamp, {
      emissive: 1, alpha: pulse * 0.5, bias: 0.03, glow: pulse * 0.3,
    }, 16);
  }
}

/** Where the elbows and hands go for each pose, as [forward, right, up]. */
function armPose(
  person: Person, pose: Pose, k: number, swing: number, swing2: number, t: number, chest: number, sf: number,
): { eL: number[]; eR: number[]; hL: number[]; hR: number[] } {
  const at = person.activity === "at" || person.activity === "talk";
  const seed = person.seed;
  const talkWave = person.activity === "talk" ? Math.sin(t * 3.1 + seed * 0.3) * 0.2 : 0;
  if (at && pose === "type") {
    const tap = Math.sin(t * 13 + seed) * 0.015;
    return {
      eL: [sf + 0.16 * k, -0.26 * k, chest - 0.26 * k],
      eR: [sf + 0.16 * k, 0.26 * k, chest - 0.26 * k],
      hL: [sf + 0.42 * k, -0.12 * k, chest - 0.3 * k + tap],
      hR: [sf + 0.42 * k, 0.12 * k, chest - 0.3 * k - tap],
    };
  }
  if (at && pose === "eat") {
    const bite = Math.max(0, Math.sin(t * 1.3 + seed));
    return {
      eL: [sf + 0.16 * k, -0.26 * k, chest - 0.26 * k],
      eR: [sf + 0.12 * k, 0.24 * k, chest - 0.26 * k + bite * 0.12 * k],
      hL: [sf + 0.4 * k, -0.14 * k, chest - 0.32 * k],
      hR: [sf + (0.36 - bite * 0.18) * k, 0.1 * k, chest - (0.32 - bite * 0.42) * k],
    };
  }
  if (at && pose === "write") {
    const stroke = Math.sin(t * 2.2 + seed);
    return {
      eL: [sf + 0.04 * k, -0.25 * k, chest - 0.26 * k],
      eR: [sf + 0.22 * k, 0.26 * k, chest + 0.02 * k],
      hL: [sf + 0.08 * k, -0.23 * k, chest - 0.48 * k],
      hR: [sf + 0.46 * k, (0.2 + stroke * 0.12) * k, chest + (0.18 + Math.cos(t * 3.1 + seed) * 0.06) * k],
    };
  }
  if (at && pose === "present") {
    const g = Math.sin(t * 1.6 + seed);
    return {
      eL: [sf + 0.18 * k, -0.3 * k, chest - 0.14 * k],
      eR: [sf + 0.18 * k, 0.3 * k, chest - 0.1 * k + g * 0.08 * k],
      hL: [sf + 0.38 * k, -0.36 * k, chest - 0.1 * k - g * 0.1 * k],
      hR: [sf + 0.42 * k, 0.38 * k, chest + (0.06 + g * 0.2) * k],
    };
  }
  if (at && pose === "lift") {
    const up = (Math.sin(t * 2.2 + seed) + 1) / 2;
    return {
      eL: [sf + 0.04 * k, -0.34 * k, chest + (-0.06 + up * 0.3) * k],
      eR: [sf + 0.04 * k, 0.34 * k, chest + (-0.06 + up * 0.3) * k],
      hL: [sf + 0.06 * k, -0.34 * k, chest + (0.12 + up * 0.52) * k],
      hR: [sf + 0.06 * k, 0.34 * k, chest + (0.12 + up * 0.52) * k],
    };
  }
  if (at && pose === "punch") {
    const a = Math.max(0, Math.sin(t * 5 + seed));
    const b = Math.max(0, Math.sin(t * 5 + seed + Math.PI));
    return {
      eL: [sf + (0.14 + a * 0.18) * k, -0.2 * k, chest - 0.1 * k],
      eR: [sf + (0.14 + b * 0.18) * k, 0.2 * k, chest - 0.1 * k],
      hL: [sf + (0.24 + a * 0.36) * k, -0.1 * k, chest - 0.02 * k],
      hR: [sf + (0.24 + b * 0.36) * k, 0.1 * k, chest - 0.02 * k],
    };
  }
  if (at && pose === "row") {
    const stroke = (Math.sin(t * 2.4) + 1) / 2;
    const reach = (0.5 - stroke * 0.36) * k;
    return {
      eL: [sf + reach * 0.5, -0.24 * k, chest - 0.2 * k],
      eR: [sf + reach * 0.5, 0.24 * k, chest - 0.2 * k],
      hL: [sf + reach, -0.14 * k, chest - 0.22 * k],
      hR: [sf + reach, 0.14 * k, chest - 0.22 * k],
    };
  }
  if (at && pose === "bike") {
    return {
      eL: [sf + 0.2 * k, -0.24 * k, chest - 0.18 * k],
      eR: [sf + 0.2 * k, 0.24 * k, chest - 0.18 * k],
      hL: [sf + 0.42 * k, -0.18 * k, chest - 0.16 * k],
      hR: [sf + 0.42 * k, 0.18 * k, chest - 0.16 * k],
    };
  }
  if (at && pose === "stretch") {
    const s = Math.sin(t * 0.8 + seed);
    return {
      eL: [sf + 0.1 * k, -0.3 * k, chest + 0.12 * k],
      eR: [sf + 0.1 * k, 0.3 * k, chest + 0.12 * k],
      hL: [sf + (0.2 + s * 0.1) * k, -0.2 * k, chest + 0.46 * k],
      hR: [sf + (0.2 + s * 0.1) * k, 0.2 * k, chest + 0.46 * k],
    };
  }
  if (at && pose === "pour") {
    const stir = Math.sin(t * 3 + seed) * 0.06;
    return {
      eL: [sf + 0.2 * k, -0.26 * k, chest - 0.24 * k],
      eR: [sf + 0.2 * k, 0.26 * k, chest - 0.2 * k],
      hL: [sf + 0.44 * k, -0.16 * k, chest - 0.3 * k],
      hR: [sf + (0.46 + stir) * k, (0.16 + stir) * k, chest - 0.22 * k],
    };
  }
  if (at && (pose === "read" || pose === "watch")) {
    const hold = pose === "read" ? 0.3 : 0;
    return {
      eL: [sf + (0.1 + hold * 0.4) * k, -0.25 * k, chest - 0.26 * k],
      eR: [sf + (0.1 + hold * 0.4) * k, 0.25 * k, chest - 0.26 * k],
      hL: [sf + (0.12 + hold) * k, -0.16 * k, chest - (0.46 - hold * 0.4) * k],
      hR: [sf + (0.12 + hold) * k, 0.16 * k, chest - (0.46 - hold * 0.4) * k],
    };
  }
  const running = pose === "run" && at;
  const pump = running ? 1.4 : 1;
  return {
    eL: [sf + swing2 * 0.34 * k * pump, -0.25 * k, chest - (running ? 0.2 : 0.24) * k],
    eR: [sf + swing * 0.34 * k * pump, 0.25 * k, chest - (running ? 0.2 : 0.24) * k],
    hL: [sf + swing2 * 0.62 * k * pump + (running ? 0.18 * k : 0), -0.23 * k, chest - (running ? 0.2 : 0.46) * k],
    hR: [sf + (swing * 0.62 * pump + talkWave) * k + (running ? 0.18 * k : 0), 0.23 * k, chest - (running ? 0.2 : 0.46 - talkWave) * k],
  };
}

function skinOf(person: Person): RGB {
  const i = person.look?.skin ?? Math.floor(hash1(person.seed + 5) * SKIN.length);
  return SKIN[Math.max(0, Math.min(SKIN.length - 1, i))];
}

function defaultHair(person: Person): Hair {
  const n = hash1(person.seed + 31);
  return n < 0.4 ? "short" : n < 0.58 ? "long" : n < 0.7 ? "bun" : n < 0.8 ? "curly" : n < 0.9 ? "crop" : "bald";
}

function drawHair(p: Painter, person: Person, hair: Hair, head: Joint, k: number, tone: RGB, id: number): void {
  const f = person.facing;
  const back = (d: number) => ({ x: head.x - Math.cos(f) * d, y: head.y - Math.sin(f) * d });
  switch (hair) {
    case "bald":
      return;
    case "cap": {
      obox(p, head.x, head.y, head.z + 0.1 * k, 0.23 * k, 0.24 * k, 0.07 * k, f, person.accent, { id });
      const brim = { x: head.x + Math.cos(f) * 0.14 * k, y: head.y + Math.sin(f) * 0.14 * k };
      obox(p, brim.x, brim.y, head.z + 0.1 * k, 0.14 * k, 0.2 * k, 0.02 * k, f, scale(person.accent, 0.8), { id });
      return;
    }
    case "toque": {
      p.cylinder(head.x, head.y, head.z + 0.1 * k, 0.14 * k, 0.14 * k, 0.26 * k, MAT.white, 8, { id });
      return;
    }
    case "long": {
      obox(p, head.x, head.y, head.z + 0.1 * k, 0.225 * k, 0.235 * k, 0.06 * k, f, tone, { id });
      const b = back(0.08 * k);
      obox(p, b.x, b.y, head.z - 0.3 * k, 0.1 * k, 0.26 * k, 0.42 * k, f, tone, { id });
      return;
    }
    case "bun": {
      obox(p, head.x, head.y, head.z + 0.1 * k, 0.225 * k, 0.235 * k, 0.05 * k, f, tone, { id });
      const b = back(0.1 * k);
      p.cylinder(b.x, b.y, head.z + 0.1 * k, 0.07 * k, 0.07 * k, 0.1 * k, tone, 6, { id });
      return;
    }
    case "curly": {
      obox(p, head.x, head.y, head.z + 0.08 * k, 0.27 * k, 0.28 * k, 0.12 * k, f, tone, { id });
      const b = back(0.07 * k);
      obox(p, b.x, b.y, head.z - 0.08 * k, 0.12 * k, 0.28 * k, 0.2 * k, f, tone, { id });
      return;
    }
    case "crop": {
      obox(p, head.x, head.y, head.z + 0.1 * k, 0.215 * k, 0.225 * k, 0.03 * k, f, tone, { id });
      return;
    }
    case "short":
    default: {
      obox(p, head.x, head.y, head.z + 0.1 * k, 0.225 * k, 0.235 * k, 0.06 * k, f, tone, { id });
      const b = back(0.06 * k);
      obox(p, b.x, b.y, head.z - 0.06 * k, 0.1 * k, 0.24 * k, 0.16 * k, f, tone, { id });
    }
  }
}

function drawAccessories(
  ctx: BuildCtx, person: Person, acc: Accessory[], head: Joint, k: number,
  J: (f: number, s: number, z: number) => Joint, chest: number, lean: number, hipBack: number, base: number,
): void {
  const { p } = ctx;
  const f = person.facing;
  const id = person.pickId;
  for (const a of acc) {
    if (a === "glasses") {
      const g = J((lean * 0.75 + hipBack) * k + 0.11 * k, 0, head.z - base + 0.02 * k);
      obox(p, g.x, g.y, g.z - 0.02 * k, 0.02 * k, 0.2 * k, 0.05 * k, f, MAT.ink, { id });
    } else if (a === "headphones") {
      obox(p, head.x, head.y, head.z + 0.15 * k, 0.06 * k, 0.26 * k, 0.03 * k, f, MAT.black, { id });
      for (const s of [-1, 1]) {
        const cup = J((lean * 0.75 + hipBack) * k, s * 0.13 * k, head.z - base - 0.02 * k);
        obox(p, cup.x, cup.y, cup.z - 0.04 * k, 0.1 * k, 0.05 * k, 0.1 * k, f, MAT.black, { id });
      }
    } else if (a === "badge" || a === "lanyard") {
      const b = J((lean * 0.4 + hipBack) * k + 0.14 * k, -0.08 * k, chest - 0.2 * k);
      obox(p, b.x, b.y, b.z, 0.02 * k, 0.08 * k, 0.1 * k, f, MAT.paper, { id, emissive: 0.4 });
      if (a === "lanyard") {
        const top = J((lean * 0.5 + hipBack) * k + 0.1 * k, 0, chest + 0.02 * k);
        p.line(top.x, top.y, top.z, b.x, b.y, b.z + 0.1 * k, person.accent, 1.2, { emissive: 0.5, id });
      }
    } else if (a === "scarf") {
      const n = J((lean * 0.6 + hipBack) * k, 0, chest + 0.02 * k);
      obox(p, n.x, n.y, n.z - 0.04 * k, 0.24 * k, 0.3 * k, 0.07 * k, f, scale(person.accent, 0.85), { id });
    } else if (a === "visor") {
      const v = J((lean * 0.75 + hipBack) * k + 0.1 * k, 0, head.z - base + 0.02 * k);
      obox(p, v.x, v.y, v.z - 0.03 * k, 0.05 * k, 0.24 * k, 0.07 * k, f, MAT.led, { id, emissive: 0.8, glow: 0.3 });
    }
  }
}

/** One of the library's crawlers: a box on wheels with a lamp and an arm. */
function drawBot(ctx: BuildCtx, person: Person, k: number, selected: boolean, hovered: boolean): void {
  const { p, time } = ctx;
  const id = person.pickId;
  const f = person.facing;
  const bob = person.moving * Math.abs(Math.sin(person.stride * 2)) * 0.02;
  contactShadow(p, person.x, person.y, FLOOR_Z, 0.36 * k, 0.26 * k, ctx.shadowStrength * 0.7, MAT.ink);
  obox(p, person.x, person.y, FLOOR_Z + 0.08, 0.56 * k, 0.44 * k, 0.1, f, MAT.darkMetal, { id });
  obox(p, person.x, person.y, FLOOR_Z + 0.18 + bob, 0.5 * k, 0.4 * k, 0.5 * k, f, person.accent, { top: scale(person.accent, 1.1), id });
  if (ctx.lod === 0) return;
  const mast = { x: person.x - Math.cos(f) * 0.12 * k, y: person.y - Math.sin(f) * 0.12 * k };
  p.box(mast.x - 0.03, mast.y - 0.03, FLOOR_Z + 0.68 + bob, 0.06, 0.06, 0.4 * k, MAT.metal);
  const eye = { x: mast.x + Math.cos(f) * 0.06, y: mast.y + Math.sin(f) * 0.06 };
  obox(p, eye.x, eye.y, FLOOR_Z + 0.68 + 0.4 * k + bob, 0.14 * k, 0.24 * k, 0.12 * k, f, MAT.darkMetal, { id });
  const blink = Math.sin(time * 3 + person.seed) > -0.8;
  p.dot(eye.x + Math.cos(f) * 0.08 * k, eye.y + Math.sin(f) * 0.08 * k, FLOOR_Z + 0.74 + 0.4 * k + bob, 2.4,
    blink ? MAT.led : MAT.ledOff, { emissive: 1, glow: blink ? 0.6 : 0 });
  // The arm reaches when the crawler is at a shelf.
  const reach = person.activity === "at" ? (Math.sin(time * 1.4 + person.seed) + 1) * 0.2 : 0;
  const base = { x: person.x + Math.cos(f) * 0.2 * k, y: person.y + Math.sin(f) * 0.2 * k, z: FLOOR_Z + 0.6 + bob };
  const tip = { x: base.x + Math.cos(f) * (0.2 + reach) * k, y: base.y + Math.sin(f) * (0.2 + reach) * k, z: base.z + (0.2 + reach) * k };
  p.line(base.x, base.y, base.z, tip.x, tip.y, tip.z, MAT.metal, Math.max(1.5, 0.05 * p.cam.s), { emissive: 0.3, id });
  if (person.carrying === "papers" || person.activity === "walk") {
    obox(p, person.x, person.y, FLOOR_Z + 0.68 + bob, 0.3 * k, 0.26 * k, 0.08, f, MAT.paper, { id, emissive: 0.2 });
  }
  if ((selected || hovered) && ctx.quality > 0) {
    const pulse = selected ? 0.75 + 0.25 * Math.sin(ctx.time * 3) : 0.4;
    p.disc(person.x, person.y, FLOOR_Z, 0.5 * k, 0.34 * k, MAT.lamp, {
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
