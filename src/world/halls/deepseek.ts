import { AMBER, CYAN, VIOLET } from "../accents";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import { whiteboard } from "../props/furniture";
import { cabinet } from "../props/fixtures";
import { floorTape, motes, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, meetingBay, sideRacks, workstation } from "./kit";
import { FACE_N, station, type HallSpec } from "./types";

/** The hall that publishes its method. Reasoning traces are the output here, not a by-product. */
export const deepseek: HallSpec = {
  id: "deepseek",
  key: "7",
  name: "DeepSeek",
  plaque: "DEEPSEEK",
  tagline: "The long working",
  ethos: "Show the working, and show what it cost to get it.",
  blurb:
    "Racks on both walls and a board covered edge to edge. This hall does not hide the middle of its reasoning; it pins it up.",
  reading:
    "The board is the point of the room. Everywhere else in the block the working is thrown away and the answer kept. Here the working is the thing on the wall.",
  facts: [
    { label: "House style", value: "Publish the method" },
    { label: "In the hall", value: "The V line and the R line" },
    { label: "Open weights", value: "Yes, with the paper" },
  ],
  accent: CYAN,
  floor: { r: 168, g: 174, b: 182 },
  index: 6,
  lamps: [
    { x: 7.2, y: 6.2, power: 1.25, radius: 7.2 },
    { x: 3.0, y: 8.8, power: 0.7, radius: 4.4 },
  ],
  stations: [
    ...baseStations(),
    station("trace", "the trace board", "board", 9.0, 2.6, FACE_N),
    station("ledger", "the ledger desk", "bench", 3.2, 6.0, FACE_N),
  ],
  people: [
    {
      id: "reasoner",
      name: "The R line",
      role: "Reasoning, shown",
      tier: "Reasoning",
      doing: "Works the trace board and adds to it without rubbing anything out.",
      why: "The R line is the reasoning model: it thinks in the open, at length, and the trace is part of what you get.",
      chips: ["Chain of thought", "Open weights", "Slow on purpose"],
      accent: VIOLET,
      scale: 1.0,
      home: "trace",
      haunts: ["board", "racks", "table"],
      traits: { focus: 0.93, sociability: 0.38, pace: 0.82 },
      carries: "papers",
    },
    {
      id: "v-line",
      name: "The V line",
      role: "General work, cheaply",
      tier: "Workhorse",
      doing: "Keeps the ledger desk and takes whatever comes through the door.",
      why: "The V line is the general model the hall runs on, priced so that running it a great many times is the normal thing to do.",
      chips: ["General use", "Very cheap", "Open weights"],
      accent: AMBER,
      scale: 0.96,
      home: "ledger",
      haunts: ["bench-b", "racks", "rest", "front"],
      traits: { pace: 1.2, focus: 0.4, sociability: 0.6, range: 1.3 },
      carries: "slate",
    },
    {
      id: "distill",
      name: "The distilled set",
      role: "Small copies of the big one",
      tier: "Small",
      doing: "Runs the same errand the big model would, in a fraction of the time.",
      why: "The distilled models carry the flagship's habits in a much smaller body. They go where the flagship cannot afford to.",
      chips: ["Distilled", "Runs local", "Several sizes"],
      accent: CYAN,
      scale: 0.77,
      home: "racks",
      haunts: ["door-w", "door-e", "ledger", "rest", "front"],
      traits: { pace: 1.7, focus: 0.12, sociability: 0.78, range: 1.9 },
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 6, "D", 5.0);
    sideRacks(ctx, ox + RW - 2.0, oy, 3, "V", 4.4);
    workstation(ctx, ox + 2.3, oy + 5.4, FACE_N, 81, { screens: 2 });
    workstation(ctx, ox + 11.0, oy + 5.4, FACE_N, 82);
    meetingBay(ctx, ox + 5.6, oy + 7.8, 83, "TRACE");
    whiteboard(ctx, ox + 7.6, oy + 0.62, FLOOR_Z + 2.6, 5.4, 2.6, 84, "SHOW THE WORKING");
    cabinet(ctx, ox + 14.2, oy + 8.6, false);
    floorTape(ctx, ox + 6.8, oy + 1.5, 6.0, 1.6, MAT.led, true);
    sign(ctx, "THE WORKING", ox + 3.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    plant(ctx, ox + 1.1, oy + 10.4, 1.3);
    corners(ctx, ox, oy, 28);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 24);
  },
};
