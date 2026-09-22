import { AMBER, CYAN, VIOLET } from "../accents";
import { FLOOR_Z, RD, RW } from "../metrics";
import { glassFrame, whiteboard } from "../props/furniture";
import { cabinet, pallet } from "../props/fixtures";
import { floorTape, motes, plant, robotArm, sign } from "../props/objects";
import { baseStations, computeWall, corners, meetingBay, sideRacks, workstation } from "./kit";
import { FACE_N, FACE_S, station, type HallSpec } from "./types";
import { MAT } from "../materials";

/** Gemini lineup in public use, September 2026. */
export const deepmind: HallSpec = {
  id: "deepmind",
  key: "1",
  name: "Google DeepMind",
  plaque: "DEEPMIND",
  tagline: "The experiment hall",
  ethos: "Ask the scientific question, then build the system that can study it.",
  blurb:
    "The first hall on the plan, in the far corner of the block. Instruments along the racks, an arm repeating a motion on the bench, and a board of marks nobody has rubbed out.",
  reading:
    "This hall is laid out like a lab, not an office. The rigs run down the north wall and everything else in the room points at them. The arm in the east bay is the part of the work that has a body.",
  facts: [
    { label: "House style", value: "Research first" },
    { label: "In the hall", value: "{roster}" },
    { label: "Open weights", value: "Gemma, not shown here" },
  ],
  accent: CYAN,
  floor: { r: 164, g: 176, b: 174 },
  index: 0,
  lamps: [
    { x: 7.4, y: 7.2, power: 1.25, radius: 7.4 },
    { x: 12.6, y: 4.2, power: 0.7, radius: 4.6 },
  ],
  stations: [
    ...baseStations(),
    station("arm", "the arm bay", "frame", 12.4, 7.4, FACE_N),
    station("rig", "the instrument row", "rack", 4.4, 3.2, FACE_N),
    station("glass", "the read-out", "frame", 14.3, 8.6, FACE_S),
  ],
  people: [
    {
      id: "pro",
      name: "Gemini 3.1 Pro",
      role: "The heavier reading",
      tier: "Flagship",
      doing: "Stands at the lamp over a board of marks.",
      why: "{short} is the slower pass on a hard problem. The board stays under the lamp until the reading is finished.",
      chips: ["Deep reasoning", "Long context", "Multimodal"],
      accent: AMBER,
      scale: 1,
      home: "board",
      haunts: ["table", "rig"],
      traits: { focus: 0.86, sociability: 0.4, pace: 0.9 },
    },
    {
      id: "flash",
      name: "Gemini 3.8 Flash",
      role: "Long-horizon agent work",
      tier: "Workhorse",
      doing: "Walks the instrument row and stops at each rig.",
      why: "{short} is the current model for long agent work. The racks are the experiment, and it is the one walking them.",
      chips: ["Agentic", "Fast", "Tool use"],
      accent: CYAN,
      scale: 0.94,
      home: "rig",
      haunts: ["racks", "bench-b", "rest", "front"],
      traits: { pace: 1.3, focus: 0.24, sociability: 0.6, range: 1.4 },
      carries: "slate",
    },
    {
      id: "robotics",
      name: "Gemini Robotics",
      role: "A model with a body",
      tier: "Embodied",
      doing: "Tends the arm, then watches it repeat the motion.",
      why: "{short} is the lab's bet that a model should be able to act in the world. The arm is that bet, at the scale of a bench.",
      chips: ["Manipulation", "On-device", "Vision"],
      accent: VIOLET,
      scale: 0.97,
      home: "arm",
      haunts: ["glass", "bench-b"],
      traits: { focus: 0.8, sociability: 0.35, pace: 0.85 },
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 6, "R", 5.1);
    sideRacks(ctx, ox + 0.9, oy, 3, "I", 4.2);
    workstation(ctx, ox + 2.5, oy + 4.4, FACE_N, 11, { screens: 2 });
    workstation(ctx, ox + 10.6, oy + 4.4, FACE_N, 12);
    meetingBay(ctx, ox + 4.2, oy + 7.4, 21, "RUN 4412");
    whiteboard(ctx, ox + 12.1, oy + 0.62, FLOOR_Z + 2.9, 2.6, 1.7, 5, "ARM");
    robotArm(ctx, ox + 12.6, oy + 6.9, FLOOR_Z, 0.4);
    floorTape(ctx, ox + 11.4, oy + 5.9, 2.6, 2.2, MAT.lamp);
    glassFrame(ctx, ox + 14.2, oy + 9.1, FACE_S, 1.9, 2.4);
    cabinet(ctx, ox + 0.95, oy + 7.2, false);
    pallet(ctx, ox + 13.6, oy + 1.4);
    plant(ctx, ox + 9.2, oy + 11.4, 1.1);
    sign(ctx, "INSTRUMENT ROW", ox + 4.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    corners(ctx, ox, oy, 3);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 26);
  },
};
