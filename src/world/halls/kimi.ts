import { AMBER, CYAN, VIOLET } from "../accents";
import { FLOOR_Z, RD, RW } from "../metrics";
import { whiteboard } from "../props/furniture";
import { motes, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, meetingBay, workstation } from "./kit";
import { FACE_E, FACE_N, station, type HallSpec } from "./types";

/**
 * First room of the Asian quarter, and the hall that currently carries the
 * unfinished frame. The frame is where the next room of this quarter attaches.
 */
export const kimi: HallSpec = {
  id: "kimi",
  key: "9",
  name: "Kimi",
  plaque: "KIMI",
  quarter: "Asia",
  tagline: "The long shift",
  ethos: "Stay on the job longer than a conversation lasts.",
  blurb:
    "The first hall of the Asian quarter, and the open end of the block. Moonshot's line works the long bench; the frame in the outer wall is where the quarter grows next.",
  reading:
    "Kimi took the unfinished frame when the block grew. The flagship holds the bench. The older line still walks the racks. The coding model stands at the frame, which is deliberately not finished.",
  facts: [
    { label: "Quarter", value: "Asia, first room" },
    { label: "House style", value: "Long jobs, open weights" },
    { label: "In the hall", value: "{roster}" },
    { label: "Outer frame", value: "Still open" },
  ],
  accent: AMBER,
  floor: { r: 180, g: 174, b: 166 },
  index: 9,
  lamps: [
    { x: 6.2, y: 5.8, power: 1.25, radius: 7.0 },
    { x: 13.4, y: 6.8, power: 0.85, radius: 5.0 },
  ],
  stations: [
    ...baseStations(),
    station("long", "the long bench", "bench", 6.4, 5.6, FACE_N),
    station("frame", "the open frame", "door", 15.2, 6.5, FACE_E),
  ],
  people: [
    {
      id: "flagship",
      name: "Kimi K3",
      role: "The flagship",
      tier: "Flagship",
      doing: "Holds the long bench and sends the others out.",
      why: "{short} is the top of the line, large enough that the hall keeps it at the bench instead of walking it around the block. The long jobs start here.",
      chips: ["Flagship", "Open weights", "Long context"],
      accent: AMBER,
      scale: 1.04,
      home: "long",
      haunts: ["bench-b", "board", "table"],
      traits: { focus: 0.9, sociability: 0.4, pace: 0.86 },
    },
    {
      id: "previous",
      name: "Kimi K2.6",
      role: "The line that opened the hall",
      tier: "Open weights",
      doing: "Walks the racks. People still ask for it by name.",
      why: "{short} is the line that made a hall necessary. The newer flagship has the bench; this one still knows which rack is which, and it is the one that drifts.",
      chips: ["Mixture of experts", "Open weights", "Agentic"],
      accent: CYAN,
      scale: 0.96,
      home: "racks",
      haunts: ["table", "board", "rest", "door-w"],
      traits: { pace: 1.2, focus: 0.32, sociability: 0.58, range: 1.4 },
    },
    {
      id: "coder",
      name: "Kimi K2.7 Code",
      role: "Stands at the frame",
      tier: "Coding",
      doing: "Works the open frame, where the wall is not finished.",
      why: "The coding line is built to stay on a task after the conversation would have ended. It keeps to the frame, which is the door the next hall will use.",
      chips: ["Coding", "Long jobs", "Open weights"],
      accent: VIOLET,
      scale: 0.9,
      home: "frame",
      haunts: ["door-e", "long", "rest"],
      traits: { pace: 1.35, focus: 0.24, sociability: 0.5, range: 1.2 },
      carries: "case",
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 4, "K", 4.6);
    workstation(ctx, ox + 5.2, oy + 4.6, FACE_N, 111, { screens: 2 });
    workstation(ctx, ox + 10.2, oy + 4.2, FACE_N, 112, { screens: 2 });
    meetingBay(ctx, ox + 2.0, oy + 8.2, 113, "LONG");
    whiteboard(ctx, ox + 8.8, oy + 0.62, FLOOR_Z + 2.9, 3.0, 1.7, 114, "AGENTS");
    sign(ctx, "KIMI", ox + 4.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    plant(ctx, ox + 13.2, oy + 10.6, 1.0);
    corners(ctx, ox, oy, 47);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 18);
  },
};
