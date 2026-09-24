import type { RGB } from "../../engine/types";
import type { BuildCtx } from "../ctx";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import type { PersonSpec } from "../person";
import { rackRow, type Facing } from "../props/fixtures";
import {
  at, BENCH_SEAT, CHAIR_SEAT, chair, desk, deskDims, rollingBoard, roundTable, seatBench, sofa, SOFA_SEAT,
  STOOL_SEAT, stool, table, whiteboard, type DeskOpts,
} from "../props/furniture";
import {
  FACE_E, FACE_N, FACE_S, FACE_W,
  type HallSpec, type LampSpec, type Pose, type Spot, type Station, type StationKind, type Tag,
} from "./types";

type Piece = (ctx: BuildCtx, ox: number, oy: number) => void;

export type StationOpts = {
  pose?: Pose;
  seat?: number;
  /** Height of the platform the spot is on. */
  lift?: number;
  tags?: Tag[];
};

/**
 * Builds a room once, at load: every piece of furniture it places is drawn by
 * the room and, where somebody can use it, becomes a station at the same time.
 *
 * Stations used to be a separate list of coordinates written beside the
 * drawing, and the two drifted: the benches every hall shared were placed
 * inside most halls' desks, so figures went to work standing in the furniture.
 * Here a desk is placed by where its chair is, and that chair is the station.
 */
export class Layout {
  readonly w: number;
  readonly d: number;
  readonly stations: Station[] = [];
  readonly lamps: LampSpec[] = [];
  private pieces: Piece[] = [];

  constructor(w: number, d: number) {
    this.w = w;
    this.d = d;
  }

  /** Draws anything that is not a station: signs, plants, the room's own things. */
  draw(piece: Piece): void {
    this.pieces.push(piece);
  }

  render(ctx: BuildCtx, ox: number, oy: number): void {
    for (const piece of this.pieces) piece(ctx, ox, oy);
  }

  lamp(x: number, y: number, opts: Omit<LampSpec, "x" | "y"> = {}): void {
    this.lamps.push({ x, y, ...opts });
  }

  /** A station from explicit spots. Everything else here is built on this. */
  station(id: string, label: string, kind: StationKind, spots: Spot[], opts: StationOpts = {}): Station {
    if (this.stations.some((s) => s.id === id)) throw new Error(`Station ${id} is defined twice.`);
    if (!spots.length) throw new Error(`Station ${id} has nowhere to stand.`);
    const first = spots[0];
    const station: Station = {
      id,
      label,
      kind,
      x: first.x,
      y: first.y,
      face: first.face,
      capacity: spots.length,
      pose: opts.pose ?? "stand",
      spots,
      seat: opts.seat ?? 0,
      lift: opts.lift ?? 0,
      tags: opts.tags ?? [],
    };
    this.stations.push(station);
    return station;
  }

  /** Somewhere to stand on open floor. `places` lines extra people up beside the first. */
  stand(id: string, label: string, x: number, y: number, face: number, opts: StationOpts & { kind?: StationKind; places?: number; spacing?: number } = {}): Station {
    const n = opts.places ?? 1;
    const gap = opts.spacing ?? 0.85;
    const spots: Spot[] = [];
    for (let i = 0; i < n; i++) {
      const p = at(x, y, face, (i - (n - 1) / 2) * gap, 0);
      spots.push({ x: p.x, y: p.y, face, ax: p.x, ay: p.y });
    }
    return this.station(id, label, opts.kind ?? "floor", spots, opts);
  }

  /** Several named places to stand, each with its own facing. */
  places(id: string, label: string, kind: StationKind, list: [number, number, number][], opts: StationOpts = {}): Station {
    return this.station(id, label, kind, list.map(([x, y, face]) => ({ x, y, face, ax: x, ay: y })), opts);
  }

  /**
   * A desk and its chair. (x, y) is the seat. The approach is behind the
   * chair, so the last step is into the seat from open floor.
   */
  desk(id: string, label: string, x: number, y: number, face: number, opts: DeskOpts & StationOpts & { approach?: "back" | "side" } = {}): Station {
    const style = opts.style ?? "work";
    const standing = style === "standing" || style === "lab";
    this.draw((ctx, ox, oy) => desk(ctx, ox + x, oy + y, face, opts));
    return this.station(id, label, "desk", [deskSpot(x, y, face, standing, opts.approach)], {
      pose: opts.pose ?? "type",
      seat: standing ? 0 : style === "school" ? CHAIR_SEAT - 0.08 : CHAIR_SEAT,
      lift: opts.lift,
      tags: opts.tags ?? ["work"],
    });
  }

  /**
   * Many desks that are one station: a classroom, an examination hall, a row
   * of booths. Each desk is a spot, so a class fills desk by desk.
   */
  deskGroup(
    id: string, label: string, seats: [number, number, number][],
    opts: DeskOpts & StationOpts & { approach?: "back" | "side"; kind?: StationKind } = {},
  ): Station {
    const style = opts.style ?? "work";
    const standing = style === "standing" || style === "lab";
    seats.forEach(([x, y, face], i) => {
      this.draw((ctx, ox, oy) => desk(ctx, ox + x, oy + y, face, { ...opts, seed: (opts.seed ?? 1) + i * 11 }));
    });
    return this.station(id, label, opts.kind ?? "desk", seats.map(([x, y, face]) => deskSpot(x, y, face, standing, opts.approach)), {
      pose: opts.pose ?? "type",
      seat: standing ? 0 : style === "school" ? CHAIR_SEAT - 0.08 : CHAIR_SEAT,
      lift: opts.lift,
      tags: opts.tags ?? ["work"],
    });
  }

  /**
   * Loose chairs that are one station: rows in an auditorium, a waiting area.
   * Each chair is approached from behind unless it says otherwise.
   */
  chairs(id: string, label: string, seats: [number, number, number][], opts: StationOpts & { tone?: RGB; approach?: "back" | "side"; kind?: StationKind } = {}): Station {
    this.draw((ctx, ox, oy) => {
      for (const [x, y, face] of seats) chair(ctx, ox + x, oy + y, face, opts.tone);
    });
    return this.station(id, label, opts.kind ?? "seat", seats.map(([x, y, face]) => deskSpot(x, y, face, false, opts.approach)), {
      pose: opts.pose ?? "watch", seat: CHAIR_SEAT, lift: opts.lift, tags: opts.tags ?? ["audience"],
    });
  }

  /** A run of desks side by side, all facing the same way. */
  deskRow(prefix: string, label: string, x: number, y: number, face: number, count: number, opts: DeskOpts & StationOpts & { pitch?: number } = {}): Station[] {
    const pitch = opts.pitch ?? deskDims(opts.style ?? "work").w + 0.2;
    const out: Station[] = [];
    for (let i = 0; i < count; i++) {
      const p = at(x, y, face, (i - (count - 1) / 2) * pitch, 0);
      out.push(this.desk(`${prefix}-${i + 1}`, `${label} ${i + 1}`, p.x, p.y, face, { ...opts, seed: (opts.seed ?? 1) + i * 7 }));
    }
    return out;
  }

  /**
   * A long table with seats down one or both long sides. The seats face the
   * table; each is approached from behind.
   */
  table(
    id: string, label: string,
    x: number, y: number, w: number, d: number,
    opts: StationOpts & {
      sides?: "both" | "north" | "south" | "east" | "west" | "ends";
      per?: number;
      seat?: number;
      chairs?: "chair" | "stool" | "bench" | "none";
      tone?: RGB;
      chairTone?: RGB;
      kind?: StationKind;
      top?: (ctx: BuildCtx, ox: number, oy: number) => void;
    } = {},
  ): Station {
    const sides = opts.sides ?? "both";
    const along = w >= d;
    const per = opts.per ?? Math.max(1, Math.floor((along ? w : d) / 0.95));
    const chairs = opts.chairs ?? "chair";
    const reach = chairs === "bench" ? 0.5 : 0.55;
    const spots: Spot[] = [];
    const seatsOn = (side: "north" | "south" | "east" | "west") => {
      for (let i = 0; i < per; i++) {
        const t = (i + 0.5) / per;
        let sx = 0, sy = 0, face = 0;
        if (side === "north") { sx = x + w * t; sy = y - reach; face = FACE_S; }
        if (side === "south") { sx = x + w * t; sy = y + d + reach; face = FACE_N; }
        if (side === "west") { sx = x - reach; sy = y + d * t; face = FACE_E; }
        if (side === "east") { sx = x + w + reach; sy = y + d * t; face = FACE_W; }
        const back = at(sx, sy, face, 0, -0.62);
        spots.push({ x: sx, y: sy, face, ax: back.x, ay: back.y });
      }
    };
    if (sides === "both") {
      if (along) { seatsOn("north"); seatsOn("south"); } else { seatsOn("west"); seatsOn("east"); }
    } else if (sides === "ends") {
      if (along) { seatsOn("west"); seatsOn("east"); } else { seatsOn("north"); seatsOn("south"); }
    } else {
      seatsOn(sides);
    }
    const seatH = chairs === "bench" ? BENCH_SEAT : chairs === "stool" ? STOOL_SEAT : CHAIR_SEAT;
    this.draw((ctx, ox, oy) => {
      table(ctx, ox + x, oy + y, w, d, opts.tone);
      opts.top?.(ctx, ox, oy);
      if (chairs === "none") return;
      if (chairs === "bench") {
        // One bench per side rather than one per seat.
        const sidesDone = new Set<string>();
        for (const s of spots) {
          const key = `${Math.round(s.face * 100)}`;
          if (sidesDone.has(key)) continue;
          sidesDone.add(key);
          const horizontal = Math.abs(Math.sin(s.face)) > 0.5;
          if (horizontal) seatBench(ctx, ox + x + w / 2, oy + s.y, w, s.face, opts.chairTone);
          else seatBench(ctx, ox + s.x, oy + y + d / 2, d, s.face, opts.chairTone);
        }
        return;
      }
      for (const s of spots) {
        if (chairs === "stool") stool(ctx, ox + s.x, oy + s.y, opts.chairTone);
        else chair(ctx, ox + s.x, oy + s.y, s.face, opts.chairTone);
      }
    });
    return this.station(id, label, opts.kind ?? "table", spots, {
      pose: opts.pose ?? "sit",
      seat: opts.seat ?? seatH,
      tags: opts.tags ?? ["social"],
    });
  }

  /** A round table with chairs around it. */
  round(id: string, label: string, x: number, y: number, r: number, seats: number, opts: StationOpts & { tone?: RGB; chairTone?: RGB; phase?: number; kind?: StationKind } = {}): Station {
    const spots: Spot[] = [];
    const reach = r + 0.5;
    for (let i = 0; i < seats; i++) {
      const a = (opts.phase ?? Math.PI / 4) + (i / seats) * Math.PI * 2;
      const sx = x + Math.cos(a) * reach;
      const sy = y + Math.sin(a) * reach;
      const face = a + Math.PI;
      const back = at(sx, sy, face, 0, -0.6);
      spots.push({ x: sx, y: sy, face, ax: back.x, ay: back.y });
    }
    this.draw((ctx, ox, oy) => {
      roundTable(ctx, ox + x, oy + y, r, opts.tone);
      for (const s of spots) chair(ctx, ox + s.x, oy + s.y, s.face, opts.chairTone);
    });
    return this.station(id, label, opts.kind ?? "table", spots, {
      pose: opts.pose ?? "sit", seat: CHAIR_SEAT, tags: opts.tags ?? ["social"],
    });
  }

  /** A sofa. Sat on from the front, so the approach is in front of each cushion. */
  sofa(id: string, label: string, x: number, y: number, face: number, seats: number, opts: StationOpts & { tone?: RGB } = {}): Station {
    const spots: Spot[] = [];
    for (let i = 0; i < seats; i++) {
      const s = at(x, y, face, (i - (seats - 1) / 2) * 0.72, 0.02);
      const front = at(s.x, s.y, face, 0, 0.78);
      spots.push({ x: s.x, y: s.y, face, ax: front.x, ay: front.y });
    }
    this.draw((ctx, ox, oy) => sofa(ctx, ox + x, oy + y, face, seats, opts.tone));
    return this.station(id, label, "lounge", spots, {
      pose: opts.pose ?? "sit", seat: SOFA_SEAT, tags: opts.tags ?? ["social", "rest"],
    });
  }

  /**
   * A row of racks with a place to stand in front of it. `face` is the way
   * the racks' fronts look; whoever tends them faces the other way.
   */
  racks(id: string, label: string, x: number, y: number, count: number, pitch: number, facing: Facing, height: number, tag: string, opts: StationOpts & { places?: number } = {}): Station {
    this.draw((ctx, ox, oy) => rackRow(ctx, ox + x, oy + y, count, pitch, facing, height, tag));
    // A rack is 1.42 wide across its front whichever way it is turned.
    const span = (count - 1) * pitch + 1.42;
    const places = opts.places ?? Math.min(3, Math.max(1, Math.round(count / 2)));
    const spots: Spot[] = [];
    for (let i = 0; i < places; i++) {
      const t = (i + 0.5) / places;
      let sx: number, sy: number, face: number;
      if (facing === "s") { sx = x + span * t; sy = y + 0.92 + 0.75; face = FACE_N; }
      else if (facing === "n") { sx = x + span * t; sy = y - 0.75; face = FACE_S; }
      else if (facing === "e") { sx = x + 0.92 + 0.75; sy = y + span * t; face = FACE_W; }
      else { sx = x - 0.75; sy = y + span * t; face = FACE_E; }
      spots.push({ x: sx, y: sy, face, ax: sx, ay: sy });
    }
    return this.station(id, label, "rack", spots, { pose: opts.pose ?? "read", tags: opts.tags ?? ["work"] });
  }

  /** A whiteboard on the north wall, with a place in front of it to write. */
  wallBoard(id: string, label: string, x: number, w: number, caption: string, seed: number, opts: StationOpts & { z?: number; h?: number; places?: number } = {}): Station {
    const z = opts.z ?? FLOOR_Z + 1.3;
    const h = opts.h ?? 1.7;
    this.draw((ctx, ox, oy) => whiteboard(ctx, ox + x, oy + 0.62, z, w, h, seed, caption));
    return this.stand(id, label, x + w / 2, 1.55, FACE_N, {
      kind: "board", pose: opts.pose ?? "write", tags: opts.tags ?? ["work"], places: opts.places ?? 1,
    });
  }

  /** A whiteboard on wheels, with a place in front of it to write. */
  board(id: string, label: string, x: number, y: number, face: number, w: number, caption: string, seed: number, opts: StationOpts & { places?: number } = {}): Station {
    this.draw((ctx, ox, oy) => rollingBoard(ctx, ox + x, oy + y, face, w, seed, caption));
    const front = at(x, y, face, 0, 0.75);
    return this.stand(id, label, front.x, front.y, face + Math.PI, {
      kind: "board", pose: opts.pose ?? "write", tags: opts.tags ?? ["work"], places: opts.places ?? 1,
    });
  }

  /**
   * The places every lab keeps whatever else is in it: somewhere to stand by
   * the corridor, somewhere at the open south side, and a spot in each
   * doorway it has. A lab on the edge of the block has a wall where the
   * others have a door, so it says which doors it has.
   */
  base(opts: { rest?: [number, number]; front?: [number, number]; west?: boolean; east?: boolean } = {}): void {
    const [rx, ry] = opts.rest ?? [this.w - 3.2, 10.4];
    this.stand("rest", "the corridor", rx, ry, FACE_S, { kind: "rest", places: 3, tags: ["rest", "social"] });
    const [fx, fy] = opts.front ?? [3.0, 12.1];
    this.stand("front", "the open side", fx, fy, FACE_S, { kind: "window", places: 2, tags: ["rest"] });
    if (opts.west !== false) this.stand("door-w", "the west door", 0.9, 10.4, FACE_E, { kind: "door", tags: ["rest"] });
    if (opts.east !== false) this.stand("door-e", "the east door", this.w - 0.9, 10.4, FACE_W, { kind: "door", tags: ["rest"] });
  }
}

/**
 * Where a seat is walked to from. Behind the chair by default; from the side
 * for rows packed too tightly to leave room behind, where the gap between
 * two chairs is the aisle.
 */
function deskSpot(x: number, y: number, face: number, standing: boolean, approach: "back" | "side" = "back"): Spot {
  const a = approach === "side" ? at(x, y, face, 0.8, -0.3) : at(x, y, face, 0, standing ? -0.35 : -0.66);
  return { x, y, face, ax: a.x, ay: a.y };
}

export type HallDef = Omit<
  HallSpec,
  "stations" | "lamps" | "dress" | "index" | "ref" | "w" | "d" | "span" | "open" | "staff"
> & {
  span?: { cols: number; rows: number };
  open?: boolean;
  staff?: PersonSpec[];
  layout: (L: Layout) => void;
};

/** Turns a room's description and its layout into the spec the building reads. */
export function defineHall(def: HallDef): HallSpec {
  const span = def.span ?? { cols: 1, rows: 1 };
  const L = new Layout(RW * span.cols, RD * span.rows);
  def.layout(L);
  const rest: Partial<HallDef> = { ...def };
  delete rest.layout;
  return {
    ...(rest as Omit<HallDef, "layout">),
    span,
    w: L.w,
    d: L.d,
    open: def.open ?? false,
    staff: def.staff ?? [],
    index: -1,
    ref: "",
    stations: L.stations,
    lamps: L.lamps,
    dress: (ctx, ox, oy) => L.render(ctx, ox, oy),
  };
}

export { FACE_E, FACE_N, FACE_S, FACE_W, MAT };
