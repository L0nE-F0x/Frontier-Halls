import { AMBER, CYAN, SLATE, VIOLET } from "../accents";
import { FLOOR_Z, RD, RW } from "../metrics";
import { shelf, whiteboard } from "../props/furniture";
import { motes, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, meetingBay, readingCorner, workstation } from "./kit";
import { FACE_N, station, type HallSpec } from "./types";

/**
 * First room of the open-source quarter. The weights, the data and the recipe
 * are the point of the room, so it is furnished as an archive rather than a
 * factory.
 */
export const ai2: HallSpec = {
  id: "ai2",
  key: "a",
  name: "Ai2",
  plaque: "AI2",
  quarter: "Open source",
  tagline: "The archive",
  ethos: "If you cannot read how it was made, you cannot study it.",
  blurb:
    "The first hall of the open-source quarter. Shelves instead of a warehouse, and the training notes left out where anyone can take them.",
  reading:
    "This row is where the block grew past its first eight halls. Ai2 keeps the open line: language, vision, and the recipe that teaches a raw model to answer.",
  facts: [
    { label: "Quarter", value: "Open source, first room" },
    { label: "House style", value: "Weights, data and recipe" },
    { label: "In the hall", value: "{roster}" },
  ],
  accent: CYAN,
  floor: { r: 174, g: 180, b: 170 },
  index: 8,
  lamps: [
    { x: 6.4, y: 6.2, power: 1.15, radius: 6.8 },
    { x: 12.2, y: 8.4, power: 0.75, radius: 4.6 },
  ],
  stations: [
    ...baseStations(),
    station("stacks", "the stacks", "bench", 4.4, 7.4, FACE_N),
    station("notes", "the notes table", "table", 11.2, 7.2, FACE_N, 2),
  ],
  people: [
    {
      id: "olmo",
      name: "OLMo",
      role: "The open language line",
      tier: "Flagship",
      doing: "Stays with the racks, where the training notes are kept.",
      why: "{short} is why this hall exists. The weights are public, and so is the trail of how they were trained. It does not wander off and leave the notes.",
      chips: ["Fully open", "Weights and data", "Language"],
      accent: CYAN,
      scale: 1.02,
      home: "racks",
      haunts: ["stacks", "board", "bench-a"],
      traits: { focus: 0.9, sociability: 0.38, pace: 0.9 },
    },
    {
      id: "molmo",
      name: "Molmo",
      role: "Looks, then answers",
      tier: "Vision",
      doing: "Drifts to the open side and watches the court.",
      why: "{short} is the vision line. It is the one in this room that actually needs a view, so it ends up at the front more than the others.",
      chips: ["Vision", "Open weights", "Points at things"],
      accent: AMBER,
      scale: 0.94,
      home: "front",
      haunts: ["board", "rest", "notes"],
      traits: { pace: 1.15, focus: 0.28, sociability: 0.62, range: 1.3 },
      carries: "slate",
    },
    {
      id: "tulu",
      name: "Tulu",
      role: "Teaches the answer",
      tier: "Post-training",
      doing: "Keeps the notes table and walks a reply through out loud.",
      why: "Tulu is the post-training recipe: how a raw model learns to answer people. The table is a classroom, and the recipe is left on it.",
      chips: ["Instruction", "Recipe public", "Sits with others"],
      accent: VIOLET,
      scale: 0.9,
      home: "notes",
      haunts: ["table", "stacks", "board"],
      traits: { focus: 0.55, sociability: 0.84, pace: 1.05 },
      carries: "papers",
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 3, "O", 4.2);
    workstation(ctx, ox + 2.6, oy + 4.2, FACE_N, 101, { screens: 1, mugTone: SLATE });
    readingCorner(ctx, ox + 11.4, oy + 5.6, 102);
    meetingBay(ctx, ox + 2.2, oy + 8.0, 103, "NOTES");
    shelf(ctx, ox + 8.4, oy + 3.2, 2.6, 5, 104);
    shelf(ctx, ox + 8.4, oy + 6.2, 2.2, 4, 105);
    whiteboard(ctx, ox + 5.4, oy + 0.62, FLOOR_Z + 2.9, 3.2, 1.8, 106, "OPEN");
    sign(ctx, "ARCHIVE", ox + 12.4, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    plant(ctx, ox + 6.8, oy + 11.2, 1.05);
    corners(ctx, ox, oy, 41);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 16);
  },
};
