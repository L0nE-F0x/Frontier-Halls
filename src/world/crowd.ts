import type { WorldClock } from "../engine/clock";
import { hash1 } from "../engine/rng";
import { findStation, halls, hallOrigin, type WorldStation } from "./building";
import type { HallSpec } from "./halls/types";
import type { NavGrid } from "./nav";
import { makePerson, setGoal, stepPerson, type Person } from "./person";

/**
 * The director. It does not animate anything; it only decides where each
 * figure should be, once every few seconds, from the clock and the figure's own
 * traits. Everything that looks like intent comes from here.
 */
/** A figure's key across the whole building: a seat id is only unique in its hall. */
export function seatKey(hallId: string, personId: string): string {
  return `${hallId}/${personId}`;
}

export class Crowd {
  people: Person[] = [];
  /**
   * Keyed by hall and seat, not by seat alone. Seat ids are roles — "flagship",
   * "coder", "fast" — and the same role exists in most of the halls.
   */
  byId = new Map<string, Person>();
  byPickId = new Map<number, Person>();
  private nav: NavGrid;
  private claims = new Map<string, Set<string>>();

  constructor(nav: NavGrid) {
    this.nav = nav;
    let pick = 1;
    for (const hall of halls) {
      const origin = hallOrigin(hall);
      for (const spec of hall.people) {
        const home = findStation(hall.id, spec.home);
        const spread = (pick % 3) * 0.6 - 0.6;
        const x = origin.x + (home ? home.x : 8) - Math.sin(home?.face ?? 0) * spread;
        const y = origin.y + (home ? home.y : 6) + Math.cos(home?.face ?? 0) * spread;
        const person = makePerson(spec, hall.id, pick++, x, y, home?.face ?? Math.PI / 2);
        this.people.push(person);
        this.byId.set(seatKey(hall.id, person.id), person);
        this.byPickId.set(person.pickId, person);
        this.claim(hall.id, spec.home, person.id);
      }
    }
  }

  private claim(hallId: string, stationId: string, personId: string): void {
    const key = `${hallId}/${stationId}`;
    let set = this.claims.get(key);
    if (!set) {
      set = new Set();
      this.claims.set(key, set);
    }
    set.add(personId);
  }

  private release(personId: string): void {
    for (const set of this.claims.values()) set.delete(personId);
  }

  /**
   * Where inside a station this figure should stand. Stations that take more
   * than one occupant lay them out in a line across the facing direction, so
   * two figures sent to the same table end up beside each other rather than
   * inside each other — which is also what lets them notice each other.
   */
  private slotFor(station: WorldStation, personId: string): { x: number; y: number } {
    const capacity = station.capacity ?? 1;
    if (capacity < 2) return { x: station.wx, y: station.wy };
    const set = this.claims.get(`${station.hallId}/${station.id}`);
    const members = set ? [...set] : [personId];
    const at = Math.max(0, members.indexOf(personId));
    const offset = (at - (Math.min(members.length, capacity) - 1) / 2) * 0.82;
    return {
      x: station.wx - Math.sin(station.face) * offset,
      y: station.wy + Math.cos(station.face) * offset,
    };
  }

  private free(station: WorldStation, personId: string): boolean {
    const set = this.claims.get(`${station.hallId}/${station.id}`);
    if (!set) return true;
    if (set.has(personId)) return true;
    return set.size < (station.capacity ?? 1);
  }

  /** The figure in a hall's seat, if anyone is in it. */
  at(hallId: string, personId: string): Person | undefined {
    return this.byId.get(seatKey(hallId, personId));
  }

  hallOf(person: Person): HallSpec {
    return halls.find((h) => h.id === person.hallId) ?? halls[0];
  }

  /** Simulated seconds, not real ones, so the schedule tracks the wall clock. */
  update(dt: number, clock: WorldClock, motion: boolean): void {
    for (const person of this.people) {
      stepPerson(person, dt, motion);
      if (!motion) continue;
      person.timer -= dt;
      if (person.timer <= 0 && person.activity !== "walk" && person.activity !== "talk") {
        this.decide(person, clock);
      }
    }
    if (motion) this.mingle(dt);
  }

  private decide(person: Person, clock: WorldClock): void {
    const phase = clock.phase().id;
    const hall = this.hallOf(person);
    const roll = hash1(person.seed + Math.floor(person.phase * 7));
    const traits = person.traits;

    // Chance of staying exactly where it is.
    const stayBias =
      phase === "morning" || phase === "afternoon"
        ? traits.focus
        : phase === "night" || phase === "late"
          ? 0.82
          : traits.focus * 0.5;
    if (roll < stayBias) {
      person.timer = 5 + roll * 14;
      return;
    }

    const target = this.pickStation(person, hall, phase, roll);
    if (!target) {
      person.timer = 4 + roll * 8;
      return;
    }
    this.release(person.id);
    this.claim(target.hallId, target.id, person.id);
    const spot = this.slotFor(target, person.id);
    setGoal(person, this.nav, spot.x, spot.y, target.face, target.id);
    person.timer = 8 + roll * 14;
  }

  private pickStation(person: Person, hall: HallSpec, phase: string, roll: number): WorldStation | null {
    const options: WorldStation[] = [];
    const push = (hallId: string, id: string, weight: number) => {
      const s = findStation(hallId, id);
      if (!s || !this.free(s, person.id)) return;
      for (let i = 0; i < weight; i++) options.push(s);
    };

    const haunts = person.haunts ?? [];
    if (phase === "midday" || phase === "review") {
      push(hall.id, "table", 5);
      push(hall.id, "rest", 4);
      push(hall.id, "front", 2);
    }
    if (phase === "night" || phase === "late") {
      push(hall.id, person.home, 6);
      push(hall.id, "racks", 2);
    }
    if (phase === "dawn") {
      push(hall.id, person.home, 5);
      push(hall.id, "rest", 2);
    }
    push(hall.id, person.home, 4);
    for (const id of haunts) push(hall.id, id, 3);

    // The well travelled sometimes visit a neighbour.
    const wander = person.traits.range;
    if (wander > 1.1 && roll > 0.72 && (phase === "review" || phase === "midday" || phase === "afternoon")) {
      const reach = Math.min(halls.length - 1, Math.round(wander));
      const dir = roll > 0.86 ? 1 : -1;
      const other = halls[Math.min(halls.length - 1, Math.max(0, hall.index + dir * (1 + Math.floor(roll * reach))))];
      if (other && other.id !== hall.id) {
        push(other.id, "rest", 3);
        push(other.id, "front", 2);
        push(other.id, "table", 2);
      }
    }
    if (!options.length) return null;
    return options[Math.floor(roll * options.length) % options.length];
  }

  /** Two figures standing near each other with nothing else on go into a conversation. */
  private mingle(_dt: number): void {
    for (let i = 0; i < this.people.length; i++) {
      const a = this.people[i];
      if (a.talkingTo || a.socialCooldown > 0 || a.activity === "walk") continue;
      for (let j = i + 1; j < this.people.length; j++) {
        const b = this.people[j];
        if (b.talkingTo || b.socialCooldown > 0 || b.activity === "walk") continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 6.2 || d2 < 0.02) continue;
        const chance = (a.traits.sociability + b.traits.sociability) * 0.5;
        if (hash1(a.seed + b.seed + Math.floor(a.phase * 3)) > chance) continue;
        const angle = Math.atan2(dy, dx);
        const length = 3.5 + hash1(a.seed + b.seed) * 7;
        a.talkingTo = b.id;
        b.talkingTo = a.id;
        a.activity = "talk";
        b.activity = "talk";
        a.talkTimer = length;
        b.talkTimer = length;
        a.goalFacing = angle;
        b.goalFacing = angle + Math.PI;
        break;
      }
    }
  }

  /** Sends a figure to a named station now, ignoring the schedule. */
  send(person: Person, hallId: string, stationId: string): void {
    const s = findStation(hallId, stationId);
    if (!s) return;
    this.release(person.id);
    this.claim(hallId, stationId, person.id);
    const spot = this.slotFor(s, person.id);
    setGoal(person, this.nav, spot.x, spot.y, s.face, s.id);
    person.timer = 20;
    person.talkingTo = null;
    person.talkTimer = 0;
  }
}
