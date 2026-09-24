import { describe, expect, it } from "vitest";
import { Lighting } from "../src/engine/light";
import { Painter } from "../src/engine/painter";
import { Raster } from "../src/engine/raster";
import type { Camera } from "../src/engine/types";
import type { BuildCtx, Quality } from "../src/world/ctx";
import {
  allStations, BLOCK_D, BLOCK_W, commons, GRID, halls, hallOrigin, hallPoints, labs, layoutNav,
  PLAN, SLOTS, slotAt, slotOf, blockPoints, roomAt,
} from "../src/world/building";
import { ROSTER } from "../src/world/roster";
import { exteriorPosts, GROUNDS_REACH } from "../src/world/grounds";
import { CHECKPOINT, Crowd } from "../src/world/crowd";
import { RD, RW } from "../src/world/metrics";
import { PALETTES } from "../src/engine/palettes";
import { MAT, retune } from "../src/world/materials";
import { REGIONS } from "../src/world/regions";

retune(PALETTES[0]);
const nav = layoutNav(new Lighting());

/** A clock for the director, at a given hour and speed. */
const clockAt = (hour: number, rate = 4, day = 0) => ({ hour, rate, day });

describe("the plan", () => {
  it("names every room once, in rectangles that match their spans", () => {
    expect(new Set(halls.map((h) => h.id)).size).toBe(halls.length);
    halls.forEach((hall, at) => expect(hall.index).toBe(at));
    for (const hall of halls) {
      const cells = SLOTS.filter((s) => s.room.id === hall.id);
      expect(cells.length, hall.id).toBe(hall.span.cols * hall.span.rows);
      expect(hall.w).toBe(hall.span.cols * RW);
      expect(hall.d).toBe(hall.span.rows * RD);
    }
    expect(SLOTS.length).toBe(GRID.cols * GRID.rows);
    expect(PLAN.every((row) => row.length === GRID.cols)).toBe(true);
  });

  it("gives every room a grid reference, and no two the same", () => {
    const refs = halls.map((h) => h.ref);
    expect(new Set(refs).size).toBe(refs.length);
    for (const hall of halls) {
      const slot = slotOf(hall);
      expect(hall.ref).toMatch(/^[A-K][1-9]$/);
      expect(slotAt(slot.col, slot.row)?.room.id).toBe(hall.id);
    }
  });

  it("puts the commons through the middle and the labs around them", () => {
    expect(labs.length).toBeGreaterThanOrEqual(30);
    expect(commons.length).toBeGreaterThanOrEqual(9);
    for (const slot of SLOTS) {
      const middle = slot.row === 2 || slot.row === 3;
      expect(slot.room.kind, `${slot.col},${slot.row}`).toBe(middle ? "commons" : "lab");
    }
    // The court, with the clock, at the middle of the plan.
    const court = halls.find((h) => h.open)!;
    const o = hallOrigin(court);
    expect(Math.abs(o.x + court.w / 2 - BLOCK_W / 2)).toBeLessThan(0.01);
  });

  it("files every room under exactly one region", () => {
    const seen = REGIONS.flatMap((r) => r.rooms);
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual(halls.map((h) => h.id).sort());
  });

  it("keeps the open frame on the south-east room", () => {
    const corner = slotAt(GRID.cols - 1, GRID.rows - 1)!;
    expect(corner.room.kind).toBe("lab");
  });

  it("frames the block and each room from real geometry", () => {
    expect(blockPoints().length).toBe(8);
    const xs = blockPoints().map((point) => point.x);
    expect(Math.min(...xs)).toBeCloseTo(-GROUNDS_REACH);
    expect(Math.max(...xs)).toBeCloseTo(BLOCK_W + GROUNDS_REACH);
    for (const hall of halls) expect(hallPoints(hall).length).toBe(8);
  });

  it("puts trees and lamps on the sidewalk, outside the walls", () => {
    const posts = exteriorPosts(BLOCK_W, BLOCK_D);
    for (const post of posts) {
      const outside = post.x < -0.2 || post.x > BLOCK_W + 0.2 || post.y < -0.2 || post.y > BLOCK_D + 0.2;
      expect(outside, `${post.kind} at ${post.x},${post.y}`).toBe(true);
    }
  });
});

describe("rooms", () => {
  it("give every figure a home station that exists", () => {
    for (const hall of halls) {
      const ids = new Set(hall.stations.map((s) => s.id));
      for (const person of [...hall.people, ...hall.staff]) {
        expect(ids, `${hall.id}/${person.id} home`).toContain(person.home);
        for (const haunt of person.haunts ?? []) expect(ids, `${hall.id}/${person.id} haunt ${haunt}`).toContain(haunt);
      }
    }
  });

  it("keep every station inside its own room", () => {
    for (const station of allStations()) {
      for (const spot of station.world) {
        expect(roomAt(spot.wx, spot.wy)?.id, `${station.hallId}/${station.id}`).toBe(station.hallId);
      }
    }
  });

  it("give every lab and every figure the copy the dossier needs", () => {
    for (const hall of halls) {
      for (const field of ["name", "plaque", "tagline", "ethos", "blurb", "reading"] as const) {
        expect(hall[field].length, `${hall.id}.${field}`).toBeGreaterThan(2);
      }
      expect(hall.facts.length, hall.id).toBeGreaterThan(0);
      if (hall.kind === "lab") {
        expect(hall.people.length, hall.id).toBeGreaterThan(0);
        expect(hall.city, `${hall.id}.city`).toBeTruthy();
      }
      for (const person of [...hall.people, ...hall.staff]) {
        expect(person.chips.length, `${person.id} chips`).toBeGreaterThan(0);
        expect(person.why.length, `${person.id} why`).toBeGreaterThan(20);
        expect(person.doing.length).toBeGreaterThan(10);
      }
    }
  });

  it("give every lab somewhere to sit and talk", () => {
    for (const hall of labs) {
      expect(hall.stations.some((s) => s.tags.includes("social")), hall.id).toBe(true);
    }
  });

  it("give the day's run every stop on its route", () => {
    for (const [hall, station] of [
      ["pretraining", "pod"], ["posttraining", "learner"], ["rlhf", "subject"],
      ["evals", "track"], ["redteam", "cage"], ["stage", "podium"],
    ]) {
      expect(halls.find((h) => h.id === hall)?.stations.some((s) => s.id === station), `${hall}/${station}`).toBe(true);
    }
  });

  /**
   * Props hung on a north wall used to take a height and no y, and drew
   * themselves on the front of the building whichever room had asked for
   * them: a skyline from the south row turned up in a lab five rows north.
   */
  it("draw only inside their own walls", () => {
    const stray: string[] = [];
    for (const hall of halls) {
      const o = hallOrigin(hall);
      const outside = (x: number, y: number) =>
        x < o.x - 0.6 || x > o.x + hall.w + 0.6 || y < o.y - 0.6 || y > o.y + hall.d + 0.6;
      const points = drawnPoints((ctx) => hall.dress(ctx, o.x, o.y), hall.id);
      const bad = points.find(([x, y]) => outside(x, y));
      if (bad) stray.push(`${hall.id} at ${(bad[0] - o.x).toFixed(2)},${(bad[1] - o.y).toFixed(2)}`);
    }
    expect(stray).toEqual([]);
  });
});

/** Every ground point a piece of drawing touches, recorded instead of rasterised. */
function drawnPoints(draw: (ctx: BuildCtx) => void, focus: string): [number, number][] {
  const raster = new Raster();
  raster.resize(1, 1);
  const cam: Camera = { x: 0, y: 0, z: 0, s: 1, w: 1, h: 1, yaw: 0 };
  const p = new Painter(raster, cam, new Lighting());
  p.beginFrame();
  const points: [number, number][] = [];
  const spy = p as unknown as Record<string, (...args: number[]) => unknown>;
  const keep = (name: string, read: (a: number[]) => [number, number][]) => {
    const real = spy[name].bind(p);
    spy[name] = (...args: number[]) => {
      points.push(...read(args));
      return real(...args);
    };
  };
  keep("box", (a) => [[a[0], a[1]], [a[0] + a[3], a[1] + a[4]]]);
  keep("plate", (a) => [[a[0], a[1]], [a[0] + a[3], a[1] + a[4]]]);
  keep("line", (a) => [[a[0], a[1]], [a[3], a[4]]]);
  keep("dot", (a) => [[a[0], a[1]]]);
  keep("cylinder", (a) => [[a[0], a[1]]]);
  keep("quad", (a) => [[a[0], a[1]], [a[3], a[4]], [a[6], a[7]], [a[9], a[10]]]);
  const ctx: BuildCtx = {
    p,
    time: 30,
    clock: { hour: 14, minutes: 14 * 60, day: 0, hands: () => ({ hour: 14, minute: 0, second: 0 }) } as unknown as BuildCtx["clock"],
    sky: { ambient: MAT.wall, sun: MAT.wall, sunDir: { x: 0, y: 0, z: 1 }, bounce: MAT.wall, daylight: 0.5 },
    lampMix: 1,
    quality: 2 as Quality,
    nav: null,
    shadowX: 0,
    shadowY: 0,
    shadowStrength: 0,
    focus,
    lod: 2,
  };
  draw(ctx);
  return points;
}

/** The doorways each slot has, as rectangles of floor that must be kept clear. */
function doorZones(): { x: number; y: number; w: number; d: number; name: string }[] {
  const zones: { x: number; y: number; w: number; d: number; name: string }[] = [];
  for (const slot of SLOTS) {
    const east = slotAt(slot.col + 1, slot.row);
    if (east && east.room.id !== slot.room.id) {
      zones.push({ x: slot.x + RW - 1.4, y: slot.y + 8.6, w: 2.8, d: 3.6, name: `${slot.room.id}|${east.room.id}` });
    }
    const south = slotAt(slot.col, slot.row + 1);
    if (south && south.room.id !== slot.room.id) {
      zones.push({ x: slot.x + 6.2, y: slot.y + RD - 1.4, w: 3.6, d: 2.8, name: `${slot.room.id}/${south.room.id}` });
    }
  }
  return zones;
}

describe("navigation", () => {
  it("walks every approach on open floor", () => {
    const bad: string[] = [];
    for (const station of allStations()) {
      station.world.forEach((spot, i) => {
        if (!nav.open(spot.wax, spot.way)) bad.push(`${station.hallId}/${station.id}#${i}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it("never takes the last step into a seat through a piece of furniture", () => {
    const bad: string[] = [];
    for (const station of allStations()) {
      station.world.forEach((spot, i) => {
        // The last few centimetres end against the furniture on purpose.
        if (!nav.segmentClear(spot.wax, spot.way, spot.wx, spot.wy, 0.1, 0.42)) bad.push(`${station.hallId}/${station.id}#${i}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it("keeps every doorway clear of furniture", () => {
    const bad: string[] = [];
    for (const zone of doorZones()) {
      for (let y = zone.y + 0.2; y < zone.y + zone.d - 0.1; y += 0.2) {
        for (let x = zone.x + 0.2; x < zone.x + zone.w - 0.1; x += 0.2) {
          if (nav.solidAt(x, y)) {
            bad.push(`${zone.name} at ${x.toFixed(1)},${y.toFixed(1)}`);
            x = Infinity;
            y = Infinity;
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("can reach every station from the court", () => {
    const start = allStations().find((s) => s.hallId === "court" && s.id === "rest")!;
    const unreachable: string[] = [];
    for (const station of allStations()) {
      for (const spot of station.world) {
        if (!nav.path(start.wx, start.wy, spot.wax, spot.way)) unreachable.push(`${station.hallId}/${station.id}`);
      }
    }
    expect([...new Set(unreachable)]).toEqual([]);
  });

  it("routes through doorways rather than through partitions", () => {
    const a = slotAt(0, 0)!;
    const b = slotAt(1, 0)!;
    const path = nav.path(a.x + RW * 0.5, a.y + 10.4, b.x + RW * 0.5, b.y + 10.4);
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const p = path![i - 1];
      const q = path![i];
      if ((p.x - RW) * (q.x - RW) < 0) expect(q.y).toBeGreaterThan(8.2);
    }
  });

  it("refuses to stand inside a wall", () => {
    expect(nav.walkable(nav.cx(-1.5), nav.cy(RD / 2))).toBe(false);
    expect(nav.walkable(nav.cx(RW * 0.5), nav.cy(-1))).toBe(false);
  });
});

describe("the crowd", () => {
  it("places one figure per seat and per member of staff, each with a pick id", () => {
    const crowd = new Crowd(nav);
    const total = halls.reduce((n, h) => n + h.people.length + h.staff.length, 0);
    expect(crowd.people.length).toBe(total);
    expect(new Set(crowd.people.map((p) => p.pickId)).size).toBe(total);
    expect(crowd.people.every((p) => p.pickId > 0 && p.pickId < 1000)).toBe(true);
  });

  /**
   * The bug this building was rebuilt around: figures walking through their
   * own desks. Every walking figure, every step of a whole day, is held
   * against the real footprints of the furniture.
   */
  it("never walks a figure through furniture, all day", () => {
    const crowd = new Crowd(nav);
    const through = new Map<string, string>();
    const dt = 1 / 20;
    let hour = 5.5;
    for (let step = 0; step < 24 * 60 * 3; step++) {
      hour = (hour + (dt * 20) / 60) % 24;
      crowd.update(dt, clockAt(hour, 20), true);
      for (const person of crowd.people) {
        if (person.activity !== "walk" || person.presence < 0.5) continue;
        // Stepping into or out of a seat ends against the furniture; the
        // walk between is what must be clear.
        const end = person.path[person.path.length - 1];
        if (end && Math.hypot(end.x - person.x, end.y - person.y) < 0.9) continue;
        if (person.pathAt === 0 && Math.hypot(person.leaveX - person.x, person.leaveY - person.y) < 0.9) continue;
        if (nav.solidAt(person.x, person.y, -0.08)) {
          through.set(`${person.hallId}/${person.id}`, `${person.x.toFixed(2)},${person.y.toFixed(2)} at ${hour.toFixed(2)}`);
        }
      }
    }
    expect([...through.entries()].slice(0, 12)).toEqual([]);
  });

  it("keeps everyone inside the building while the day runs", () => {
    const crowd = new Crowd(nav);
    for (let i = 0; i < 4000; i++) crowd.update(1 / 60, clockAt(9 + i / 4000), true);
    for (const person of crowd.people) {
      if (person.id === CHECKPOINT) continue;
      expect(person.x, person.id).toBeGreaterThan(-1);
      expect(person.x, person.id).toBeLessThan(BLOCK_W + 1);
      expect(person.y, person.id).toBeGreaterThan(-1);
      expect(person.y, person.id).toBeLessThan(BLOCK_D + 1);
      expect(Number.isFinite(person.x)).toBe(true);
    }
  });

  it("fills the canteen at lunch", () => {
    const crowd = new Crowd(nav);
    // From before noon to twenty past one, at the default speed.
    let hour = 11.2;
    while (hour < 13.35) {
      hour += (1 / 20) * (2 / 60);
      crowd.update(1 / 20, clockAt(hour, 2), true);
    }
    const eating = crowd.people.filter((p) => roomAt(p.x, p.y)?.id === "canteen" || roomAt(p.x, p.y)?.id === "court");
    expect(eating.length).toBeGreaterThan(12);
  });

  it("queues at the counter before sitting down to lunch", () => {
    const crowd = new Crowd(nav);
    let hour = 11.6;
    let longest = 0;
    const queued = new Set<string>();
    const seated = new Set<string>();
    while (hour < 13.4) {
      hour += (1 / 20) * (2 / 60);
      crowd.update(1 / 20, clockAt(hour, 2), true);
      let line = 0;
      for (const p of crowd.people) {
        if (p.activity !== "at" || p.goalHall !== "canteen") continue;
        const who = `${p.hallId}/${p.id}`;
        if (p.goalStation === "queue") {
          line++;
          queued.add(who);
        } else if (p.goalPose === "eat") seated.add(who);
      }
      longest = Math.max(longest, line);
    }
    expect(longest).toBeGreaterThanOrEqual(3);
    // Most who sat down to eat stood in the line first. The rest came in at
    // the peak, found every place in it taken, and went straight to a table.
    const lined = [...seated].filter((who) => queued.has(who));
    expect(seated.size).toBeGreaterThan(8);
    expect(lined.length).toBeGreaterThanOrEqual(seated.size / 2);
  });

  it("walks the day's run from the pod to the stage", () => {
    const crowd = new Crowd(nav);
    const run = crowd.checkpoint!;
    expect(run).toBeDefined();
    crowd.update(0.1, clockAt(3), true);
    expect(roomAt(run.x, run.y)?.id).toBe("pretraining");
    let hour = 18.2;
    while (hour < 19.5) {
      crowd.update(1 / 20, clockAt(hour, 1), true);
      hour += (1 / 20) / 60;
    }
    expect(roomAt(run.x, run.y)?.id).toBe("stage");
  });
});

describe("the roster", () => {
  it("has a seat for every model in a lab", () => {
    for (const hall of halls) {
      for (const person of hall.people) {
        expect(ROSTER, `${hall.id}/${person.id}`).toHaveProperty(`${hall.id}/${person.id}`);
      }
    }
  });

  it("seats nobody who is not in a hall, so a rename cannot go unnoticed", () => {
    const seats = new Set(halls.flatMap((hall) => hall.people.map((p) => `${hall.id}/${p.id}`)));
    for (const key of Object.keys(ROSTER)) expect(seats, key).toContain(key);
  });

  it("gives staff no seat: they are not models", () => {
    for (const hall of halls) {
      for (const person of hall.staff) expect(ROSTER).not.toHaveProperty(`${hall.id}/${person.id}`);
    }
  });

  it("leaves no template token in the copy the dossier shows", () => {
    const token = /\{(name|short|roster)\}/;
    for (const hall of halls) {
      expect(hall.reading, `${hall.id}.reading`).not.toMatch(token);
      expect(hall.blurb, `${hall.id}.blurb`).not.toMatch(token);
      for (const fact of hall.facts) expect(fact.value, `${hall.id}.${fact.label}`).not.toMatch(token);
      for (const person of [...hall.people, ...hall.staff]) {
        expect(person.why, `${person.id}.why`).not.toMatch(token);
        expect(person.doing, `${person.id}.doing`).not.toMatch(token);
        expect(person.role, `${person.id}.role`).not.toMatch(token);
      }
    }
  });

  it("names every figure from the roster, not from the hall file", () => {
    for (const hall of halls) {
      for (const person of hall.people) {
        const seat = ROSTER[`${hall.id}/${person.id}`];
        expect(person.name, `${hall.id}/${person.id}`).toBe(seat.name);
        expect(person.short, `${hall.id}/${person.id} short`).toBe(seat.short);
      }
    }
  });

  it("makes no claim about a moving seat that its next occupant would falsify", () => {
    const dated = /\b(newest|latest|just (shipped|released|arrived))\b/i;
    for (const hall of halls) {
      for (const person of hall.people) {
        if (ROSTER[`${hall.id}/${person.id}`]?.source !== "openrouter") continue;
        for (const field of ["role", "doing", "why"] as const) {
          expect(person[field], `${hall.id}/${person.id}.${field}`).not.toMatch(dated);
        }
      }
    }
  });

  it("lists the hall's cast in the fact that promises it", () => {
    for (const hall of halls) {
      const roster = hall.facts.find((f) => f.label === "In the hall");
      if (!roster) continue;
      for (const person of hall.people) {
        expect(roster.value, `${hall.id} names ${person.id}`).toContain(person.short ?? person.name);
      }
    }
  });
});
