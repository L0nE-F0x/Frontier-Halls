import { describe, expect, it } from "vitest";
import { Lighting } from "../src/engine/light";
import {
  allStations, BLOCK_D, BLOCK_W, DOOR_Y, GRID, halls, hallOrigin, hallPoints, layoutNav,
  SLOTS, slotOf, blockPoints,
} from "../src/world/building";
import { ROSTER } from "../src/world/roster";
import { exteriorPosts, GROUNDS_REACH } from "../src/world/grounds";
import { Crowd } from "../src/world/crowd";
import { RD, RW } from "../src/world/metrics";
import { PALETTES } from "../src/engine/palettes";
import { retune } from "../src/world/materials";

retune(PALETTES[0]);
const nav = layoutNav(new Lighting());

describe("halls", () => {
  it("are numbered in order with unique ids and keys", () => {
    expect(new Set(halls.map((h) => h.id)).size).toBe(halls.length);
    expect(new Set(halls.map((h) => h.key)).size).toBe(halls.length);
    // A seat id is a role, so "flagship" repeats across the halls. What has to
    // be unique is the seat within its hall, and the pair across the building.
    for (const hall of halls) {
      const ids = hall.people.map((person) => person.id);
      expect(new Set(ids).size, hall.id).toBe(ids.length);
    }
    const seats = halls.flatMap((hall) => hall.people.map((person) => `${hall.id}/${person.id}`));
    expect(new Set(seats).size).toBe(seats.length);
    halls.forEach((hall, at) => expect(hall.index).toBe(at));
  });

  it("give every figure a home station that exists", () => {
    for (const hall of halls) {
      const ids = new Set(hall.stations.map((s) => s.id));
      for (const person of hall.people) {
        expect(ids, `${hall.id}/${person.id} home`).toContain(person.home);
        for (const haunt of person.haunts ?? []) {
          expect(ids, `${hall.id}/${person.id} haunt`).toContain(haunt);
        }
      }
    }
  });

  it("keep every station inside its own hall", () => {
    for (const station of allStations()) {
      const hall = halls.find((h) => h.id === station.hallId)!;
      const o = hallOrigin(hall);
      expect(station.wx).toBeGreaterThanOrEqual(o.x - 0.5);
      expect(station.wx).toBeLessThanOrEqual(o.x + RW + 0.5);
      expect(station.wy).toBeGreaterThanOrEqual(o.y - 0.5);
      expect(station.wy).toBeLessThanOrEqual(o.y + RD + 0.5);
    }
  });

  it("give every figure and hall the copy the dossier needs", () => {
    for (const hall of halls) {
      for (const field of ["name", "plaque", "tagline", "ethos", "blurb", "reading"] as const) {
        expect(hall[field].length, `${hall.id}.${field}`).toBeGreaterThan(2);
      }
      expect(hall.facts.length).toBeGreaterThan(0);
      expect(hall.people.length).toBeGreaterThan(0);
      for (const person of hall.people) {
        expect(person.chips.length, `${person.id} chips`).toBeGreaterThan(0);
        expect(person.why.length, `${person.id} why`).toBeGreaterThan(20);
        expect(person.doing.length).toBeGreaterThan(10);
      }
    }
  });

  it("frames the block and each hall from real geometry", () => {
    expect(blockPoints().length).toBe(8);
    const xs = blockPoints().map((point) => point.x);
    const ys = blockPoints().map((point) => point.y);
    expect(Math.min(...xs)).toBeCloseTo(-GROUNDS_REACH);
    expect(Math.max(...xs)).toBeCloseTo(BLOCK_W + GROUNDS_REACH);
    expect(Math.min(...ys)).toBeCloseTo(-GROUNDS_REACH);
    expect(Math.max(...ys)).toBeCloseTo(BLOCK_D + GROUNDS_REACH);
    expect(BLOCK_W).toBe(GRID.cols * RW);
    expect(BLOCK_D).toBe(GRID.rows * RD);
    for (const hall of halls) expect(hallPoints(hall).length).toBe(8);
  });
});

describe("the block", () => {
  it("lays out as near a square as the hall count allows", () => {
    expect(GRID.cols * GRID.rows).toBeGreaterThanOrEqual(halls.length);
    expect((GRID.cols - 1) * GRID.rows).toBeLessThan(halls.length);
    // A row and a column of halls should be within one slot of each other.
    expect(Math.abs(GRID.cols - GRID.rows)).toBeLessThanOrEqual(1);
  });

  it("gives every hall exactly one slot, and no two halls the same one", () => {
    const used = new Set<string>();
    for (const hall of halls) {
      const slot = slotOf(hall);
      expect(slot).toBeDefined();
      const key = `${slot.col},${slot.row}`;
      expect(used.has(key)).toBe(false);
      used.add(key);
    }
    expect(SLOTS.filter((s) => s.hall).length).toBe(halls.length);
  });

  it("puts the spare slots at the middle of the block, not at its edge", () => {
    const courts = SLOTS.filter((s) => !s.hall);
    expect(courts.length).toBe(GRID.cols * GRID.rows - halls.length);
    const cx = (GRID.cols - 1) / 2;
    const cy = (GRID.rows - 1) / 2;
    const worst = Math.max(...SLOTS.map((s) => Math.hypot(s.col - cx, s.row - cy)));
    for (const court of courts) {
      expect(Math.hypot(court.col - cx, court.row - cy)).toBeLessThan(worst);
    }
  });

  it("keeps the unfinished frame on the south-east hall", () => {
    const last = halls[halls.length - 1];
    const slot = slotOf(last);
    expect(slot.col).toBe(GRID.cols - 1);
    expect(slot.row).toBe(GRID.rows - 1);
  });

  it("puts trees and lamps on the sidewalk, outside the walls", () => {
    const posts = exteriorPosts(BLOCK_W, BLOCK_D);
    expect(posts.some((post) => post.kind === "tree")).toBe(true);
    expect(posts.some((post) => post.kind === "lamp")).toBe(true);
    for (const post of posts) {
      const outside = post.x < -0.2 || post.x > BLOCK_W + 0.2 || post.y < -0.2 || post.y > BLOCK_D + 0.2;
      expect(outside, `${post.kind} at ${post.x},${post.y}`).toBe(true);
      expect(post.x).toBeGreaterThan(-GROUNDS_REACH - 0.2);
      expect(post.x).toBeLessThan(BLOCK_W + GROUNDS_REACH + 0.2);
      expect(post.y).toBeGreaterThan(-GROUNDS_REACH - 0.2);
      expect(post.y).toBeLessThan(BLOCK_D + GROUNDS_REACH + 0.2);
    }
    for (let i = 0; i < posts.length; i++) {
      for (let j = i + 1; j < posts.length; j++) {
        const apart = Math.hypot(posts[i].x - posts[j].x, posts[i].y - posts[j].y);
        expect(apart, `${i} and ${j}`).toBeGreaterThan(2);
      }
    }
  });

  it("keeps every slot inside the block", () => {
    for (const slot of SLOTS) {
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.x + RW).toBeLessThanOrEqual(BLOCK_W);
      expect(slot.y + RD).toBeLessThanOrEqual(BLOCK_D);
    }
  });
});

describe("navigation", () => {
  it("can walk from the first hall to the last", () => {
    const from = allStations().find((s) => s.hallId === halls[0].id && s.id === "bench-a")!;
    const to = allStations().find((s) => s.hallId === halls[halls.length - 1].id && s.id === "rest")!;
    const path = nav.path(from.wx, from.wy, to.wx, to.wy);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);
    const end = path![path!.length - 1];
    expect(Math.hypot(end.x - to.wx, end.y - to.wy)).toBeLessThan(0.1);
  });

  it("routes through the doorway rather than through a partition", () => {
    const first = SLOTS.find((s) => s.col === 0 && s.row === 0)!;
    const second = SLOTS.find((s) => s.col === 1 && s.row === 0)!;
    const path = nav.path(first.x + RW * 0.5, 5, second.x + RW * 0.5, 5);
    expect(path).not.toBeNull();
    // Anything crossing the shared partition has to do it inside the door gap.
    for (let i = 1; i < path!.length; i++) {
      const a = path![i - 1];
      const b = path![i];
      if ((a.x - RW) * (b.x - RW) < 0) {
        expect(b.y).toBeGreaterThan(DOOR_Y - 0.8);
      }
    }
  });

  it("can reach every station a figure might be sent to", () => {
    const start = allStations().find((s) => s.id === "rest")!;
    for (const station of allStations()) {
      if (station.kind === "door") continue;
      const path = nav.path(start.wx, start.wy, station.wx, station.wy);
      expect(path, `${station.hallId}/${station.id}`).not.toBeNull();
    }
  });

  it("refuses to stand inside a wall", () => {
    expect(nav.walkable(nav.cx(-1.5), nav.cy(RD / 2))).toBe(false);
    expect(nav.walkable(nav.cx(RW * 0.5), nav.cy(-1))).toBe(false);
  });
});

describe("crowd", () => {
  it("places one figure per model, each with a pick id", () => {
    const crowd = new Crowd(nav);
    const total = halls.reduce((n, h) => n + h.people.length, 0);
    expect(crowd.people.length).toBe(total);
    expect(new Set(crowd.people.map((p) => p.pickId)).size).toBe(total);
    expect(crowd.people.every((p) => p.pickId > 0 && p.pickId < 1000)).toBe(true);
  });

  it("keeps everyone inside the building while the day runs", () => {
    const crowd = new Crowd(nav);
    const clock = new (class {
      minutes = 9 * 60;
      hour = 9;
      phase() { return { id: "morning" }; }
    })() as never;
    for (let i = 0; i < 4000; i++) crowd.update(1 / 60, clock, true);
    for (const person of crowd.people) {
      expect(person.x, person.id).toBeGreaterThan(-1);
      expect(person.x, person.id).toBeLessThan(BLOCK_W + 1);
      expect(person.y, person.id).toBeGreaterThan(-1);
      expect(person.y, person.id).toBeLessThan(BLOCK_D + 1);
      expect(Number.isFinite(person.x)).toBe(true);
    }
  });

  it("moves people around rather than leaving them where they started", () => {
    const crowd = new Crowd(nav);
    const clock = new (class {
      minutes = 12 * 60 + 40;
      hour = 12.67;
      phase() { return { id: "midday" }; }
    })() as never;
    const before = crowd.people.map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < 6000; i++) crowd.update(1 / 60, clock, true);
    const moved = crowd.people.filter((p, i) => Math.hypot(p.x - before[i].x, p.y - before[i].y) > 0.5);
    expect(moved.length).toBeGreaterThan(crowd.people.length / 3);
  });
});

describe("the roster", () => {
  it("has a seat for every figure in the building", () => {
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

  it("leaves no template token in the copy the dossier shows", () => {
    const token = /\{(name|short|roster)\}/;
    for (const hall of halls) {
      expect(hall.reading, `${hall.id}.reading`).not.toMatch(token);
      expect(hall.blurb, `${hall.id}.blurb`).not.toMatch(token);
      for (const fact of hall.facts) expect(fact.value, `${hall.id}.${fact.label}`).not.toMatch(token);
      for (const person of hall.people) {
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
    // Seats with a rule change hands on their own. "The newest arrival" was
    // true of GPT-6 Astra for eighteen days and then wrong on the live site.
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
