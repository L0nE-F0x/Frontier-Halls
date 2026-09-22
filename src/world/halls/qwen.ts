import { AMBER, CYAN, SLATE, VIOLET } from "../accents";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import { banner, shelf, whiteboard } from "../props/furniture";
import { crate, pallet } from "../props/fixtures";
import { floorTape, motes, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, serviceBay, sideRacks, workstation } from "./kit";
import { FACE_E, FACE_N, station, type HallSpec } from "./types";

/** The last hall built, and the one still unfinished. Its outer frame is where the block grows next. */
export const qwen: HallSpec = {
  id: "qwen",
  key: "8",
  name: "Qwen",
  plaque: "QWEN",
  tagline: "The depot",
  ethos: "Release the whole ladder, from the model that runs on a laptop to the one that does not.",
  blurb:
    "The near corner of the block. A depot rather than a studio: sizes stacked by the door, and an open frame where the next hall will attach.",
  reading:
    "Every crate in this bay is the same family at a different size. The frame on the outer wall is deliberately unfinished. The block has been squared off around a bigger plan twice already.",
  facts: [
    { label: "House style", value: "Ship every size" },
    { label: "In the hall", value: "The dense line, the MoE line, the coder" },
    { label: "Outer frame", value: "Still open" },
  ],
  accent: VIOLET,
  floor: { r: 178, g: 172, b: 178 },
  index: 7,
  lamps: [
    { x: 6.6, y: 6.4, power: 1.2, radius: 7.0 },
    { x: 12.8, y: 9.8, power: 0.9, radius: 5.4 },
  ],
  stations: [
    ...baseStations(),
    station("depot", "the size bay", "floor", 12.2, 7.6, FACE_E),
    station("small", "the small bench", "bench", 3.0, 8.4, FACE_N),
    station("frame", "the open frame", "door", 15.2, 10.4, FACE_E),
  ],
  people: [
    {
      id: "flagship",
      name: "The MoE flagship",
      role: "The big one",
      tier: "Flagship",
      doing: "Keeps the bench and lets the smaller sizes do the walking.",
      why: "The top of the ladder: a sparse model large enough that most people reach it through an API rather than a download.",
      chips: ["Mixture of experts", "Open weights", "Largest size"],
      accent: AMBER,
      scale: 1.04,
      home: "bench-b",
      haunts: ["board", "racks", "table"],
      traits: { focus: 0.9, sociability: 0.42, pace: 0.88 },
    },
    {
      id: "coder",
      name: "The coder",
      role: "Repository work",
      tier: "Coding",
      doing: "Works the depot, checking one size against the next.",
      why: "The coding line is the part of the family people actually put in their build pipelines, which is why it lives next to the door.",
      chips: ["Repo-scale", "Open weights", "Agentic"],
      accent: CYAN,
      scale: 0.93,
      home: "depot",
      haunts: ["frame", "racks", "rest", "door-w"],
      traits: { pace: 1.3, focus: 0.3, sociability: 0.66, range: 1.6 },
      carries: "case",
    },
    {
      id: "small",
      name: "The small sizes",
      role: "Runs on a laptop",
      tier: "Small",
      doing: "Goes out through the frame and comes back with something.",
      why: "The bottom of the ladder, and the reason the ladder exists. These are the weights that end up on other people's machines.",
      chips: ["Runs local", "Half a gigabyte up", "Many variants"],
      accent: VIOLET,
      scale: 0.76,
      home: "small",
      haunts: ["frame", "depot", "door-w", "rest", "front"],
      traits: { pace: 1.8, focus: 0.1, sociability: 0.8, range: 2.4 },
      carries: "papers",
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 5, "Q", 4.7);
    sideRacks(ctx, ox + 0.9, oy, 3, "L", 4.2);
    workstation(ctx, ox + 9.9, oy + 4.3, FACE_N, 91, { screens: 2, mugTone: SLATE });
    workstation(ctx, ox + 2.2, oy + 7.6, FACE_N, 92);
    serviceBay(ctx, ox + 10.8, oy + 6.2, 93);
    pallet(ctx, ox + 12.8, oy + 9.0);
    crate(ctx, ox + 12.9, oy + 9.1, 0.86, 3);
    crate(ctx, ox + 14.0, oy + 6.4, 0.7, 2);
    shelf(ctx, ox + 5.2, oy + 6.4, 2.8, 5, 94);
    floorTape(ctx, ox + 10.3, oy + 5.7, 5.0, 4.6, MAT.lamp, true);
    banner(ctx, ox + 6.6, oy + 0.66, FLOOR_Z + 2.4, 1.4, 2.5, VIOLET, "SIZES");
    whiteboard(ctx, ox + 2.6, oy + 0.62, FLOOR_Z + 2.9, 2.8, 1.7, 95, "LADDER");
    sign(ctx, "DEPOT", ox + 12.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    plant(ctx, ox + 7.8, oy + 11.5, 1.1);
    corners(ctx, ox, oy, 33);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 22);
  },
};
