import { AMBER, CYAN, SLATE } from "../accents";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import { whiteboard } from "../props/furniture";
import { floorTape, motes, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, meetingBay, serviceBay, sideRacks, workstation } from "./kit";
import { FACE_N, FACE_S, station, type HallSpec } from "./types";

/** GPT-5.6 family, generally available since July 2026. The gated cyber model is not in the hall. */
export const openai: HallSpec = {
  id: "openai",
  key: "3",
  name: "OpenAI",
  plaque: "OPENAI",
  tagline: "The shipping floor",
  ethos: "Turn a capable model into something people can use, and offer it broadly.",
  blurb: "The shipping floor. Racks on both walls, one warm lamp, three tiers of the same family at work.",
  reading:
    "The busiest plan in the block. Everything is arranged around throughput: a marked bay by the door, tape on the floor, and a rack line long enough that walking it takes a while.",
  facts: [
    { label: "House style", value: "Ship it broadly" },
    { label: "In the hall", value: "{roster}" },
    { label: "Not in the hall", value: "The gated cyber model" },
  ],
  accent: AMBER,
  floor: { r: 184, g: 172, b: 156 },
  index: 2,
  lamps: [
    { x: 7.8, y: 6.8, power: 1.3, radius: 7.6 },
    { x: 13.4, y: 9.4, power: 0.75, radius: 4.8 },
    { x: 2.6, y: 4.0, power: 0.6, radius: 4.0 },
  ],
  stations: [
    ...baseStations(),
    station("bay", "the shipping bay", "floor", 13.2, 7.2, FACE_S),
    station("aisle-w", "the west aisle", "rack", 2.6, 4.4, FACE_N),
    station("aisle-e", "the east aisle", "rack", 13.0, 3.2, FACE_N),
  ],
  people: [
    {
      id: "flagship",
      name: "GPT-6 Astra",
      role: "Top of the line",
      tier: "Flagship",
      doing: "Stays at the lamp with one long problem.",
      why: "{short} is the top of the line. The deep work is gathered in the one warm pool of light.",
      chips: ["Flagship", "Reasoning", "Multimodal"],
      accent: AMBER,
      scale: 1.05,
      home: "table",
      haunts: ["board", "bench-b"],
      traits: { focus: 0.9, sociability: 0.45, pace: 0.92 },
    },
    {
      id: "balanced",
      name: "GPT-5.6 Terra",
      role: "Everyday work",
      tier: "Balanced",
      doing: "Walks the racks and checks each row.",
      why: "{short} is the balanced tier for ordinary work, so it is the one keeping the rows in order.",
      chips: ["Balanced", "General use", "Tool use"],
      accent: AMBER,
      scale: 0.97,
      home: "aisle-e",
      haunts: ["aisle-w", "racks", "bay", "rest"],
      traits: { pace: 1.1, focus: 0.3, sociability: 0.66, range: 1.3 },
      carries: "slate",
    },
    {
      id: "fast",
      name: "GPT-5.6 Luna",
      role: "Fast and low-cost",
      tier: "Fast",
      doing: "Covers the aisle faster than the others.",
      why: "{short} is the fast, inexpensive tier. The short jobs move with it.",
      chips: ["Cheapest tier", "Low latency", "High volume"],
      accent: CYAN,
      scale: 0.82,
      home: "aisle-w",
      haunts: ["bay", "door-w", "door-e", "rest", "front"],
      traits: { pace: 1.8, focus: 0.08, sociability: 0.8, range: 1.8 },
      carries: "papers",
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 7, "S", 5.2);
    sideRacks(ctx, ox + 0.9, oy, 3, "W", 4.4);
    sideRacks(ctx, ox + RW - 2.0, oy, 3, "E", 4.4);
    workstation(ctx, ox + 4.4, oy + 4.5, FACE_N, 41, { screens: 2, mugTone: SLATE });
    workstation(ctx, ox + 7.2, oy + 4.5, FACE_N, 42);
    meetingBay(ctx, ox + 5.9, oy + 7.6, 44, "SHIP LIST");
    serviceBay(ctx, ox + 11.6, oy + 6.4, 46);
    floorTape(ctx, ox + 2.2, oy + 9.9, RW - 4.4, 2.0, MAT.lamp, true);
    whiteboard(ctx, ox + 12.3, oy + 0.62, FLOOR_Z + 2.9, 2.6, 1.7, 47, "QUEUE");
    sign(ctx, "SHIPPING", ox + 4.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    plant(ctx, ox + 9.6, oy + 11.5, 1.0);
    corners(ctx, ox, oy, 12);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 22);
  },
};
