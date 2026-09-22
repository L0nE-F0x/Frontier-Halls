import { AMBER, CYAN, VIOLET } from "../accents";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import { shelf, table, whiteboard } from "../props/furniture";
import { cabinet } from "../props/fixtures";
import { books, motes, papers, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, readingCorner, workstation } from "./kit";
import { FACE_N, FACE_S, station, type HallSpec } from "./types";

/**
 * Claude lineup in public use, September 2026. Mythos is the class Fable
 * belongs to, so it is not a second figure.
 */
export const anthropic: HallSpec = {
  id: "anthropic",
  key: "2",
  name: "Anthropic",
  plaque: "ANTHROPIC",
  tagline: "The reading room",
  ethos: "Build models that are capable, and that will pause on the requests they should not answer.",
  blurb:
    "A reading room inside the cathedral. Fewer racks than its neighbours, a table of pages, and one cabinet that stays shut.",
  reading:
    "The quietest hall in the block, and the only one where the furniture faces inward. The cabinet on the west wall is sealed; nothing in the room opens it. The table of pages is the centre of the plan.",
  facts: [
    { label: "House style", value: "Capability with a brake on it" },
    { label: "In the hall", value: "Fable 5.1, Opus 5, Sonnet 5, Haiku 4.5" },
    { label: "The cabinet", value: "Stays shut" },
  ],
  accent: VIOLET,
  floor: { r: 172, g: 173, b: 181 },
  index: 1,
  lamps: [
    { x: 7.6, y: 7.0, power: 1.35, radius: 7.8 },
    { x: 3.4, y: 9.0, power: 0.66, radius: 4.2 },
  ],
  stations: [
    ...baseStations(),
    station("pages", "the table of pages", "table", 7.2, 8.0, FACE_N, 3),
    station("cabinet", "the sealed cabinet", "frame", 1.9, 6.9, FACE_S),
    station("stacks", "the stacks", "board", 3.0, 9.6, FACE_N),
  ],
  people: [
    {
      id: "fable",
      name: "Claude Fable 5.1",
      role: "Mythos-class flagship",
      tier: "Flagship",
      doing: "Sits with the pages and finishes one before standing.",
      why: "Fable 5.1 is the flagship for long-horizon work, and it is built to set a risky request down. Here that looks like reading a thing all the way through.",
      chips: ["Mythos class", "Long horizon", "Will decline"],
      accent: VIOLET,
      scale: 1.03,
      home: "pages",
      haunts: ["stacks", "board"],
      traits: { focus: 0.92, sociability: 0.42, pace: 0.85 },
      carries: "papers",
    },
    {
      id: "opus",
      name: "Claude Opus 5",
      role: "The long job",
      tier: "Heavy",
      doing: "Works the bench and does not look up.",
      why: "Opus 5 is the model for the long, careful job. The bench is where that day goes.",
      chips: ["Deep work", "Coding", "Agentic"],
      accent: AMBER,
      scale: 1,
      home: "bench-b",
      haunts: ["racks", "pages"],
      traits: { focus: 0.94, sociability: 0.3, pace: 0.9 },
    },
    {
      id: "sonnet",
      name: "Claude Sonnet 5",
      role: "Daily work",
      tier: "Balanced",
      doing: "Carries a slate between the bench and the pages.",
      why: "Sonnet 5 is the daily pairing of speed and judgment, so Sonnet is the one moving between the two stations.",
      chips: ["Daily driver", "Fast enough", "Good judgment"],
      accent: VIOLET,
      scale: 0.95,
      home: "bench-a",
      haunts: ["pages", "table", "rest", "front", "racks"],
      traits: { pace: 1.12, focus: 0.34, sociability: 0.72, range: 1.2 },
      carries: "slate",
    },
    {
      id: "haiku",
      name: "Claude Haiku 4.5",
      role: "The fast errands",
      tier: "Fast",
      doing: "Ferries short notes along the racks.",
      why: "Haiku 4.5 is the fast, high-volume model. The short trips belong to Haiku.",
      chips: ["High volume", "Low latency", "Cheap"],
      accent: CYAN,
      scale: 0.8,
      home: "racks",
      haunts: ["door-w", "door-e", "rest", "bench-a", "front"],
      traits: { pace: 1.7, focus: 0.1, sociability: 0.85, range: 1.9 },
      carries: "papers",
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 3, "A", 4.3);
    workstation(ctx, ox + 2.5, oy + 4.4, FACE_N, 31, { mugTone: MAT.cloth });
    workstation(ctx, ox + 10.6, oy + 4.4, FACE_N, 32, { screens: 2 });
    table(ctx, ox + 5.6, oy + 7.2, 3.6, 1.7);
    papers(ctx, ox + 6.3, oy + 7.6, 4, 7, FLOOR_Z + 0.85);
    papers(ctx, ox + 7.6, oy + 7.4, 3, 9, FLOOR_Z + 0.85);
    books(ctx, ox + 8.4, oy + 7.8, 3, 4, FLOOR_Z + 0.85);
    readingCorner(ctx, ox + 1.1, oy + 8.4, 17);
    shelf(ctx, ox + 12.6, oy + 6.6, 2.6, 4, 23);
    cabinet(ctx, ox + 1.4, oy + 6.4, true);
    whiteboard(ctx, ox + 4.4, oy + 0.62, FLOOR_Z + 2.8, 3.2, 1.9, 13, "READ IT ALL");
    sign(ctx, "READING ROOM", ox + 11.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    plant(ctx, ox + 14.6, oy + 4.2, 1.3);
    corners(ctx, ox, oy, 8);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 30);
  },
};
