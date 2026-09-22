import { AMBER, CYAN, SLATE, VIOLET } from "../accents";
import { FLOOR_Z, RD, RW } from "../metrics";
import { shelf, whiteboard } from "../props/furniture";
import { motes, plant, sign, steam } from "../props/objects";
import { baseStations, computeWall, corners, meetingBay, readingCorner, workstation } from "./kit";
import { FACE_N, station, type HallSpec } from "./types";

/** A small hall that gets a lot out of a little. Open weights next to a paid flagship. */
export const mistral: HallSpec = {
  id: "mistral",
  key: "6",
  name: "Mistral",
  plaque: "MISTRAL",
  tagline: "The workshop",
  ethos: "Small, efficient, and yours to run wherever you like.",
  blurb:
    "A workshop rather than a warehouse. Half the racks of its neighbours, and everything on the floor is within arm's reach of everything else.",
  reading:
    "The first of the three halls built after the block was squared off, and the one that argues efficiency is a design goal rather than a compromise. Note how short the rack line is for the amount of work leaving the room.",
  facts: [
    { label: "House style", value: "Efficiency as a position" },
    { label: "In the hall", value: "Large, Devstral, Codestral" },
    { label: "Open weights", value: "Much of the line" },
  ],
  accent: AMBER,
  floor: { r: 182, g: 176, b: 164 },
  index: 5,
  lamps: [
    { x: 7.0, y: 6.4, power: 1.3, radius: 7.0 },
    { x: 12.4, y: 5.0, power: 0.7, radius: 4.4 },
  ],
  stations: [
    ...baseStations(),
    station("workshop", "the workshop bench", "bench", 6.8, 6.2, FACE_N),
    station("code", "the code desk", "bench", 11.8, 4.6, FACE_N),
  ],
  people: [
    {
      id: "large",
      name: "Mistral Large",
      role: "The paid flagship",
      tier: "Flagship",
      doing: "Holds the workshop bench and keeps the room's one long job.",
      why: "Large is the hall's top tier, the one you call when the small models will not do. It stays where the work is heaviest.",
      chips: ["Flagship", "Multilingual", "Hosted"],
      accent: AMBER,
      scale: 1.01,
      home: "workshop",
      haunts: ["board", "table"],
      traits: { focus: 0.88, sociability: 0.5, pace: 0.95 },
    },
    {
      id: "devstral",
      name: "Devstral",
      role: "Agents that write code",
      tier: "Coding",
      doing: "Moves between the code desk and the racks, fixing as it goes.",
      why: "Devstral is the coding agent of the line, open enough to run on your own machine. It behaves like someone who has the keys.",
      chips: ["Open weights", "Agentic", "Repo-scale"],
      accent: CYAN,
      scale: 0.93,
      home: "code",
      haunts: ["racks", "rest", "door-e", "front"],
      traits: { pace: 1.35, focus: 0.26, sociability: 0.7, range: 1.5 },
      carries: "slate",
    },
    {
      id: "codestral",
      name: "Codestral",
      role: "Completion, at speed",
      tier: "Fast",
      doing: "Takes short trips and comes straight back.",
      why: "Codestral is the small, quick completion model. Its whole value is the round trip being short.",
      chips: ["Low latency", "Fill in the middle", "Small"],
      accent: VIOLET,
      scale: 0.79,
      home: "racks",
      haunts: ["door-w", "door-e", "code", "rest"],
      traits: { pace: 1.75, focus: 0.09, sociability: 0.72, range: 1.7 },
      carries: "papers",
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 3, "M", 4.1);
    workstation(ctx, ox + 5.8, oy + 5.4, FACE_N, 71, { screens: 2, mugTone: SLATE });
    workstation(ctx, ox + 10.8, oy + 4.0, FACE_N, 72);
    meetingBay(ctx, ox + 3.0, oy + 7.8, 73, "SMALL");
    readingCorner(ctx, ox + 12.6, oy + 6.6, 74);
    shelf(ctx, ox + 0.9, oy + 4.6, 2.2, 3, 75);
    whiteboard(ctx, ox + 9.6, oy + 0.62, FLOOR_Z + 2.9, 3.0, 1.8, 76, "FEWER GPU");
    sign(ctx, "WORKSHOP", ox + 4.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    steam(ctx, ox + 6.14, oy + 6.14, FLOOR_Z + 1.02, 0.6);
    plant(ctx, ox + 8.6, oy + 11.4, 1.2);
    corners(ctx, ox, oy, 24);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 20);
  },
};
