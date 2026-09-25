import { mix } from "../engine/color";
import { hash1 } from "../engine/rng";
import {
  allStations, BLOCK_D, BLOCK_W, findStation, halls, hallOrigin, roomAt, type WorldStation,
} from "./building";
import type { HallSpec, Tag } from "./halls/types";
import { MAT } from "./materials";
import { RD } from "./metrics";
import type { NavGrid } from "./nav";
import { makePerson, setGoal, stepPerson, type Destination, type Person } from "./person";

/** A figure's key across the whole building: a seat id is only unique in its hall. */
export function seatKey(hallId: string, personId: string): string {
  return `${hallId}/${personId}`;
}

/** The id the day's training run goes by, in the pretraining room's staff. */
export const CHECKPOINT = "checkpoint";

/** What the director needs from the clock. A test can hand it a stub. */
export type ClockLike = { hour: number; rate: number; day?: number };

type Window = [number, number];
const LUNCH: Window = [11.9, 13.9];
const DINNER: Window = [19.4, 20.8];
/** When the kitchen will still feed a figure that set off in time but lives far away. */
const SERVED: Window[] = [[LUNCH[0], LUNCH[1] + 1], [DINNER[0], DINNER[1] + 0.8]];
const COFFEE: Window[] = [[10.2, 11.2], [15.2, 16.2]];
const GYM: Window[] = [[6.1, 8.4], [19.8, 22.2]];
const KEYNOTE: Window = [17.7, 19.5];
const VISITS: Window[] = [[9.4, 11.7], [14.1, 17.3]];

/**
 * When the building starts for the review. Like lunch, the far side of the
 * block has to set off early to be seated when the day's model walks on.
 */
const REVIEW_CALL = KEYNOTE[0] - 0.6;

/** The hours the building changes what it is doing, and everyone looks up. */
const CUES = [6, 8.5, 12, 14, 17.5, 22.5, LUNCH[0], DINNER[0], REVIEW_CALL, KEYNOTE[0], ...COFFEE.map((w) => w[0]), ...GYM.map((w) => w[0]), ...VISITS.map((w) => w[0])];

/** True when the clock has crossed a cue, or been wound, between two readings. */
function crossed(from: number, to: number): boolean {
  const ahead = (to - from + 24) % 24;
  if (ahead > 0.25 && ahead < 23.75) return true;
  if (ahead === 0 || ahead >= 23.75) return false;
  return CUES.some((cue) => (cue - from + 24) % 24 <= ahead && (cue - from + 24) % 24 > 0);
}

function within(h: number, [a, b]: Window): boolean {
  const t = ((h % 24) + 24) % 24;
  return t >= a && t < b;
}

/**
 * Where the day's run is at each hour. It pretrains in the pod from midnight,
 * is taught after lunch, rated, examined and red-teamed through the afternoon,
 * is shown on the stage at the review, and then leaves the building by the
 * open frame in the south-east corner. At midnight the next one starts.
 */
const RUN: { from: number; hall: string; station: string }[] = [
  { from: 0, hall: "pretraining", station: "pod" },
  { from: 12.0, hall: "posttraining", station: "learner" },
  { from: 14.1, hall: "rlhf", station: "subject" },
  { from: 15.6, hall: "evals", station: "track" },
  { from: 17.0, hall: "redteam", station: "cage" },
  { from: 18.2, hall: "stage", station: "podium" },
  { from: 19.6, hall: "", station: "exit" },
];

type Option = { st: WorldStation; weight: number; dwell: [number, number] };

/**
 * The director. It does not animate anything; it only decides where each
 * figure should be, once every so often, from the clock and the figure's own
 * traits. Everything that looks like intent comes from here.
 *
 * With forty rooms it has a building to use, not just a hall. The day has
 * shared hours — a gym before work, lunch in the canteen, the keynote at the
 * review — and a figure only goes if it can get there in time: it works out
 * how long the walk is at its own pace, turns that into minutes on the clock
 * at the speed the clock is running, and leaves early or not at all. So the
 * canteen fills from the halls beside it outward, and the far corners mostly
 * eat at home.
 */
export class Crowd {
  people: Person[] = [];
  /**
   * Keyed by hall and seat, not by seat alone. Seat ids are roles — "flagship",
   * "coder", "fast" — and the same role exists in most of the halls.
   */
  byId = new Map<string, Person>();
  byPickId = new Map<number, Person>();
  private nav: NavGrid;
  /** Who holds each spot of each station, by station key. */
  private claims = new Map<string, (string | null)[]>();
  /** The station key and spot each figure holds. */
  private held = new Map<string, { key: string; spot: number }>();
  private byTag = new Map<Tag, WorldStation[]>();
  private exit: { x: number; y: number };
  private decisions = 0;
  private lastHour: number | null = null;

  constructor(nav: NavGrid) {
    this.nav = nav;
    for (const st of allStations()) {
      this.claims.set(`${st.hallId}/${st.id}`, new Array(st.capacity).fill(null));
      for (const tag of st.tags) {
        let list = this.byTag.get(tag);
        if (!list) this.byTag.set(tag, (list = []));
        list.push(st);
      }
    }
    // The frame in the south-east corner is the building's one door out.
    this.exit = { x: BLOCK_W + 1.3, y: BLOCK_D - RD * 0.5 };

    let pick = 1;
    for (const hall of halls) {
      const origin = hallOrigin(hall);
      const cast = [
        ...hall.people.map((spec) => ({ spec, staff: false })),
        ...hall.staff.map((spec) => ({ spec, staff: true })),
      ];
      for (const { spec, staff } of cast) {
        const person = makePerson(spec, hall.id, pick++, origin.x + hall.w / 2, origin.y + hall.d / 2, Math.PI / 2, staff);
        this.people.push(person);
        this.byId.set(seatKey(hall.id, person.id), person);
        this.byPickId.set(person.pickId, person);
        this.place(person, hall);
      }
    }
  }

  /** Puts a figure straight onto its home station, or the nearest free place in its room. */
  private place(person: Person, hall: HallSpec): void {
    const tryIds = [person.home, ...(person.haunts ?? []), "rest", "front"];
    for (const id of tryIds) {
      const st = findStation(hall.id, id);
      if (!st) continue;
      const spot = this.freeSpot(st, person);
      if (spot < 0) continue;
      this.claim(person, st, spot);
      const w = st.world[spot];
      person.x = w.wx;
      person.y = w.wy;
      person.facing = w.face;
      person.goalX = w.wx;
      person.goalY = w.wy;
      person.goalFacing = w.face;
      person.goalStation = st.id;
      person.goalHall = st.hallId;
      person.goalSpot = spot;
      person.leaveX = w.wax;
      person.leaveY = w.way;
      person.pose = st.pose;
      person.goalPose = st.pose;
      person.seat = st.seat;
      person.goalSeat = st.seat;
      person.lift = st.lift;
      person.goalLift = st.lift;
      person.sit = st.seat > 0 ? 1 : 0;
      person.activity = "at";
      return;
    }
  }

  /** The figure in a hall's seat, if anyone is in it. */
  at(hallId: string, personId: string): Person | undefined {
    return this.byId.get(seatKey(hallId, personId));
  }

  hallOf(person: Person): HallSpec {
    return halls.find((h) => h.id === person.hallId) ?? halls[0];
  }

  /** The training run, if the building has one. */
  get checkpoint(): Person | undefined {
    return this.people.find((p) => p.id === CHECKPOINT);
  }

  /** Stations with a tag, anywhere in the building. */
  tagged(tag: Tag): WorldStation[] {
    return this.byTag.get(tag) ?? [];
  }

  /* ------------------------------------------------------------- claims */

  private freeSpot(st: WorldStation, person: Person): number {
    const spots = this.claims.get(`${st.hallId}/${st.id}`);
    if (!spots) return -1;
    const mine = spots.indexOf(person.id + "@" + person.hallId);
    if (mine >= 0) return mine;
    // A line fills from the front, whichever door a figure came in by.
    if (st.tags.includes("queue")) return spots.findIndex((s) => !s);
    // Take the free spot nearest the figure, so two people sent to a long
    // table do not cross over each other to reach their chairs.
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < spots.length; i++) {
      if (spots[i]) continue;
      const w = st.world[i];
      const d = Math.hypot(w.wx - person.x, w.wy - person.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  private claim(person: Person, st: WorldStation, spot: number): void {
    this.release(person);
    const key = `${st.hallId}/${st.id}`;
    const spots = this.claims.get(key);
    if (!spots) return;
    spots[spot] = person.id + "@" + person.hallId;
    this.held.set(seatKey(person.hallId, person.id), { key, spot });
  }

  private release(person: Person): void {
    const mine = this.held.get(seatKey(person.hallId, person.id));
    if (!mine) return;
    const spots = this.claims.get(mine.key);
    if (spots && spots[mine.spot] === person.id + "@" + person.hallId) spots[mine.spot] = null;
    this.held.delete(seatKey(person.hallId, person.id));
  }

  private go(person: Person, st: WorldStation, spot: number): boolean {
    const w = st.world[spot];
    const dest: Destination = {
      hallId: st.hallId, station: st.id, spot,
      x: w.wx, y: w.wy, face: w.face, ax: w.wax, ay: w.way,
      pose: st.pose, seat: st.seat, lift: st.lift,
    };
    // No route, no walk: stay put and think again in a moment.
    if (!setGoal(person, this.nav, dest)) {
      person.timer = Math.max(person.timer, 2);
      return false;
    }
    this.claim(person, st, spot);
    person.queueing = null;
    return true;
  }

  /* ------------------------------------------------------------- update */

  /** Real seconds; the schedule reads the clock. */
  update(dt: number, clock: ClockLike, motion: boolean): void {
    this.script(clock);
    // A new part of the day, or a clock wound straight to one: everyone looks
    // up within a few seconds, instead of finishing an hour-long stay first
    // and arriving at lunch as it ends.
    if (motion) {
      if (this.lastHour !== null && crossed(this.lastHour, clock.hour)) {
        for (const person of this.people) {
          if (person.activity === "at") person.timer = Math.min(person.timer, 0.5 + this.rand(person, 9) * 5);
        }
      }
      this.lastHour = clock.hour;
    }
    for (const person of this.people) {
      stepPerson(person, dt, motion);
      if (!motion) continue;
      person.timer -= dt;
      if (person.timer <= 0 && person.activity === "at") this.decide(person, clock);
    }
    if (motion) {
      this.joinLines();
      this.avoid(dt);
      this.mingle();
    }
  }

  private rand(person: Person, salt = 0): number {
    this.decisions++;
    return hash1(person.seed + Math.floor(person.phase * 7) + salt * 131 + this.decisions * 7919);
  }

  /** Real seconds of walking to a station, at this figure's own pace. */
  private walkSeconds(person: Person, st: WorldStation): number {
    const w = st.world[0];
    // Routes go round furniture and through doorways; a third on top of the
    // straight line is about what the grid adds.
    const d = Math.hypot(w.wx - person.x, w.wy - person.y) * 1.3;
    return d / (1.4 * person.traits.pace);
  }

  /** The clock hour a figure would arrive at a station, leaving now. */
  private arrival(person: Person, st: WorldStation, clock: ClockLike): number {
    return clock.hour + (this.walkSeconds(person, st) * Math.max(0.01, clock.rate)) / 60;
  }

  /** Real seconds to stay, from a span of minutes on the clock. */
  private dwell(minutes: [number, number], roll: number, clock: ClockLike): number {
    const sim = minutes[0] + (minutes[1] - minutes[0]) * roll;
    return Math.max(5, Math.min(90, sim / Math.max(0.05, clock.rate)));
  }

  private decide(person: Person, clock: ClockLike): void {
    if (person.id === CHECKPOINT) {
      person.timer = 1;
      return;
    }
    // Out of the line at the counter, and to the table it came for, or the
    // nearest one with room if that has filled up meanwhile.
    if (person.then) {
      const after = person.then;
      person.then = null;
      const tables = this.tagged("meal").filter((st) => st.hallId === after.hallId);
      tables.sort((a, b) => (a.id === after.station ? -1 : b.id === after.station ? 1 : 0));
      for (const st of tables) {
        const spot = this.freeSpot(st, person);
        if (spot < 0) continue;
        person.timer = after.dwell;
        if (this.go(person, st, spot)) return;
      }
    }
    const options: Option[] = [];
    const offer = (st: WorldStation | undefined, weight: number, dwell: [number, number]) => {
      if (!st || !(weight > 0)) return;
      if (this.freeSpot(st, person) < 0) return;
      options.push({ st, weight, dwell });
    };
    const h = clock.hour;
    const t = person.traits;
    const damp = (st: WorldStation) => 1 / (1 + Math.hypot(st.wx - person.x, st.wy - person.y) / 40);
    /** Offers a few of a tag's stations, each weighted by nearness and by whether it can be reached in time. */
    const shared = (tag: Tag, weight: number, windows: Window[], dwell: [number, number], limit = 4) => {
      const list = this.tagged(tag)
        .filter((st) => st.hallId !== person.hallId || tag === "social")
        .filter((st) => windows.some((w) => within(this.arrival(person, st, clock), w)));
      if (!list.length) return;
      // A handful of the nearest, so a figure goes to the gym it can see
      // rather than the one across the building.
      list.sort((a, b) => Math.hypot(a.wx - person.x, a.wy - person.y) - Math.hypot(b.wx - person.x, b.wy - person.y));
      for (const st of list.slice(0, limit)) offer(st, (weight * damp(st)) / Math.min(limit, list.length), dwell);
    };

    if (person.staff) {
      this.decideStaff(person, clock, offer, shared);
    } else {
      const home = findStation(person.hallId, person.home);
      const deep = within(h, [8.5, 12]) || within(h, [14, 17.5]);
      const night = h >= 22.5 || h < 6;
      const lunch = within(h, LUNCH);
      offer(home, deep ? 7 + t.focus * 6 : night ? 6 : lunch ? 1.5 : 3, [50, 120]);
      for (const id of person.haunts ?? []) offer(findStation(person.hallId, id), deep ? 3 : 1.5, [20, 60]);

      // Lunch is the one hour nearly everybody leaves the room for; dinner
      // is for the ones still in. A figure sets off from half an hour before,
      // and one from the far side of the building may arrive after the hour
      // is out and still be fed.
      if (within(h, [LUNCH[0] - 0.5, LUNCH[1]]) || within(h, [DINNER[0] - 0.5, DINNER[1]])) {
        shared("meal", t.appetite * (lunch ? 34 : 16), SERVED, [70, 100], 8);
      }
      shared("coffee", 1.6 + t.sociability, COFFEE, [10, 20]);
      shared("exercise", t.fitness * 16, GYM, [30, 60], 5);
      if (within(h, [REVIEW_CALL, KEYNOTE[1]])) shared("audience", 18 + t.sociability * 8, [KEYNOTE], [60, 90], 10);
      const interests = person.interests ?? defaultInterests(person);
      for (const tag of interests) shared(tag, 1.1 * t.range * (1 - t.focus * 0.5), VISITS, [25, 50], 3);
      // A figure staying in for lunch goes to its own room's table, or the court.
      if (within(h, LUNCH) || within(h, DINNER)) {
        for (const st of this.tagged("social")) {
          if (st.hallId === person.hallId) offer(st, 2.5, [30, 50]);
        }
        shared("rest", 0.8, [LUNCH, DINNER, [17.5, 22]], [15, 30]);
      }
      // The well travelled visit their neighbours in the afternoon.
      if (t.range > 1.1 && (within(h, [14, 17.5]) || within(h, [17.5, 19.5]))) {
        const neighbours = this.tagged("rest").filter((st) => st.hallId !== person.hallId);
        neighbours.sort((a, b) => Math.hypot(a.wx - person.x, a.wy - person.y) - Math.hypot(b.wx - person.x, b.wy - person.y));
        for (const st of neighbours.slice(0, 4)) offer(st, (t.range - 1) * 1.5, [15, 35]);
      }
      if (night) {
        for (const st of this.tagged("social")) if (st.hallId === person.hallId) offer(st, 1, [30, 60]);
      }
    }

    if (!options.length) {
      person.timer = 4 + this.rand(person) * 6;
      return;
    }
    // Staying where it is counts for a good deal: a figure at its desk in the
    // middle of the morning should mostly still be there in an hour. Not at
    // lunch or at the review, though, unless where it is is the lunch or the
    // review.
    const heldNow = this.held.get(seatKey(person.hallId, person.id));
    const event = within(h, LUNCH) || within(h, [REVIEW_CALL, KEYNOTE[1]]);
    for (const o of options) {
      if (!heldNow || heldNow.key !== `${o.st.hallId}/${o.st.id}`) continue;
      const part = o.st.tags.includes("meal") || o.st.tags.includes("audience");
      o.weight *= event && !part ? 1.2 : 2 + t.focus * 3;
    }
    const total = options.reduce((s, o) => s + o.weight, 0);
    let roll = this.rand(person, 1) * total;
    let choice = options[options.length - 1];
    for (const o of options) {
      roll -= o.weight;
      if (roll <= 0) {
        choice = o;
        break;
      }
    }
    person.timer = this.dwell(choice.dwell, this.rand(person, 2), clock);
    if (heldNow && heldNow.key === `${choice.st.hallId}/${choice.st.id}`) return;
    const spot = this.freeSpot(choice.st, person);
    if (spot < 0) return;
    if (!this.go(person, choice.st, spot)) return;
    // A meal in a room with a serving line starts in the line, unless the
    // figure is already in the room: nobody queues twice for one lunch. The
    // place in line is taken on coming through the door, in update(), not on
    // setting off; a line held for people still three rooms away is a line
    // nobody is standing in.
    const lined = this.tagged("queue").some((st) => st.hallId === choice.st.hallId);
    if (lined && choice.st.tags.includes("meal") && heldNow?.key.split("/")[0] !== choice.st.hallId) {
      person.queueing = { dwell: person.timer };
    }
  }

  /** Diners coming through the door take the next place in the line, if there is one. */
  private joinLines(): void {
    for (const person of this.people) {
      if (!person.queueing || person.activity !== "walk" || !person.goalStation) continue;
      if (roomAt(person.x, person.y)?.id !== person.goalHall) continue;
      const { dwell } = person.queueing;
      const line = this.tagged("queue").find((st) => st.hallId === person.goalHall);
      const place = line ? this.freeSpot(line, person) : -1;
      // A full line: keep walking to the table, and take a place if one
      // comes free before getting there.
      if (!line || place < 0) continue;
      const table = { hallId: person.goalHall, station: person.goalStation, wait: 3 + this.rand(person, 4) * 3, dwell };
      if (this.go(person, line, place)) person.then = table;
    }
  }

  private decideStaff(
    person: Person,
    clock: ClockLike,
    offer: (st: WorldStation | undefined, weight: number, dwell: [number, number]) => void,
    shared: (tag: Tag, weight: number, windows: Window[], dwell: [number, number], limit?: number) => void,
  ): void {
    const h = clock.hour;
    const [start, end] = person.hours ?? [0, 24];
    const on = start <= end ? h >= start && h < end : h >= start || h < end;
    const home = findStation(person.hallId, person.home);
    if (!on) {
      offer(findStation(person.hallId, "rest"), 3, [40, 80]);
      for (const st of this.tagged("social")) if (st.hallId === person.hallId) offer(st, 2, [40, 80]);
      return;
    }
    const bot = person.look?.body === "bot";
    offer(home, bot ? 3 : 8, bot ? [8, 18] : [40, 90]);
    for (const id of person.haunts ?? []) offer(findStation(person.hallId, id), bot ? 3 : 1.5, bot ? [6, 14] : [15, 30]);
    if (!bot) shared("meal", person.traits.appetite * 10, [[12.2, 13.4]], [30, 45], 4);
  }

  /** Moves the training run along its day, and grows it while it trains. */
  private script(clock: ClockLike): void {
    const run = this.checkpoint;
    if (!run) return;
    const h = clock.hour;
    let entry = RUN[0];
    for (const e of RUN) if (h >= e.from) entry = e;
    const number = 4412 + (clock.day ?? 0);
    run.name = `Run ${number}`;
    run.short = `Run ${number}`;
    // It grows through the night as it sees the corpus, and takes on colour
    // as it is taught.
    run.grow = h < 12 ? 0.5 + 0.5 * smooth(h / 12) : 1;
    run.accent = mix(MAT.sheet, MAT.seal, smooth((h - 12) / 6));

    if (entry.station === "exit") {
      if (run.activity === "at" && run.goalStation === "exit") {
        run.presence = Math.max(0, run.presence - 0.02);
        return;
      }
      if (run.goalStation !== "exit") {
        this.release(run);
        setGoal(run, this.nav, {
          hallId: "", station: "exit", spot: 0, x: this.exit.x, y: this.exit.y, face: 0,
          ax: this.exit.x, ay: this.exit.y, pose: "stand", seat: 0, lift: 0,
        });
      }
      // Fades as it goes through the frame.
      run.presence = Math.max(0, Math.min(1, (BLOCK_W + 1.2 - run.x) / 2));
      return;
    }
    const st = findStation(entry.hall, entry.station);
    if (!st) return;
    if (entry.station === "pod") {
      // A new run starts in the pod. If the clock has been wound back or run
      // over midnight, it is simply there: nobody walks into pretraining.
      const w = st.world[0];
      if (Math.hypot(run.x - w.wx, run.y - w.wy) > 0.3 || run.presence < 1) {
        this.claim(run, st, 0);
        run.x = w.wx;
        run.y = w.wy;
        run.facing = w.face;
        run.goalFacing = w.face;
        run.goalStation = "pod";
        run.goalHall = st.hallId;
        run.path = [];
        run.activity = "at";
        run.pose = st.pose;
        run.seat = 0;
        run.sit = 0;
        run.lift = st.lift;
        run.goalLift = st.lift;
        run.leaveX = w.wax;
        run.leaveY = w.way;
        run.presence = 1;
      }
      return;
    }
    run.presence = 1;
    if (run.goalStation === st.id && run.goalHall === st.hallId) return;
    const spot = this.freeSpot(st, run);
    this.go(run, st, spot < 0 ? 0 : spot);
  }

  /**
   * Walkers step aside for each other. Only walkers, and never on the last
   * step into a seat, which has to land exactly where the chair is.
   */
  private avoid(dt: number): void {
    const people = this.people;
    for (const a of people) {
      if (a.activity !== "walk" || a.presence < 0.5) continue;
      if (a.pathAt >= a.path.length - 1) continue;
      let px = 0;
      let py = 0;
      for (const b of people) {
        if (b === a || b.presence < 0.5) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.42 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (0.65 - d) / 0.65;
        px += (dx / d) * push;
        py += (dy / d) * push;
      }
      if (px === 0 && py === 0) continue;
      const nx = a.x + px * dt * 1.2;
      const ny = a.y + py * dt * 1.2;
      if (this.nav.open(nx, ny)) {
        a.x = nx;
        a.y = ny;
      }
    }
  }

  /** Two figures near each other with nothing else on fall into a conversation. */
  private mingle(): void {
    const people = this.people;
    for (let i = 0; i < people.length; i++) {
      const a = people[i];
      if (a.talkingTo || a.socialCooldown > 0 || a.activity !== "at" || a.look?.body === "bot" || a.id === CHECKPOINT) continue;
      for (let j = i + 1; j < people.length; j++) {
        const b = people[j];
        if (b.talkingTo || b.socialCooldown > 0 || b.activity !== "at" || b.look?.body === "bot" || b.id === CHECKPOINT) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 5.8 || d2 < 0.02) continue;
        // Somebody on a treadmill is not stopping for a chat.
        if (busy(a.pose) || busy(b.pose)) continue;
        const chance = (a.traits.sociability + b.traits.sociability) * 0.5;
        if (hash1(a.seed + b.seed + Math.floor(a.phase * 3)) > chance) continue;
        const angle = Math.atan2(dy, dx);
        const length = 3.5 + hash1(a.seed + b.seed) * 7;
        a.talkingTo = seatKey(b.hallId, b.id);
        b.talkingTo = seatKey(a.hallId, a.id);
        a.activity = "talk";
        b.activity = "talk";
        a.talkTimer = length;
        b.talkTimer = length;
        // Standing figures turn to face each other; seated ones stay put.
        if (a.seat === 0) a.goalFacing = angle;
        if (b.seat === 0) b.goalFacing = angle + Math.PI;
        break;
      }
    }
  }
}

function busy(pose: string): boolean {
  return pose === "run" || pose === "bike" || pose === "row" || pose === "lift" || pose === "punch" || pose === "present";
}

function smooth(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
}

/** What a model goes to see in the afternoon, when its hall does not say. */
function defaultInterests(person: Person): Tag[] {
  if (person.scale >= 1) return ["teach", "visit"];
  if (person.scale < 0.88) return ["learn", "exam"];
  return ["visit", "exam"];
}
