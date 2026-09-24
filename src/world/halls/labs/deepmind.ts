import { AMBER, CYAN, GREEN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { chair } from "../../props/furniture";
import { goBoard, phoneBox, proteinHelix } from "../../props/heroes-west";
import { floorTape, plant, robotArm, sign } from "../../props/objects";
import { rackWall } from "../kit";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/**
 * Gemini, Gemma and the robotics line. London, though the company it belongs
 * to is in California: the hall is laid out like a laboratory, and the
 * things on its floor are the results the lab is known for.
 */
export const deepmind = defineHall({
  id: "deepmind",
  name: "Google DeepMind",
  plaque: "DEEPMIND",
  kind: "lab",
  city: "London",
  region: "United Kingdom",
  tagline: "The experiment hall",
  ethos: "Ask the scientific question, then build the system that can study it.",
  blurb:
    "A Go board with a game in progress, a folded protein turning on a plinth, an arm repeating a motion in the corner, and a red telephone box by the west wall that has not had a telephone in it for years.",
  reading:
    "Laid out like a lab rather than an office: the rigs run along the north wall and everything else points at them. The Go board is a nod to the match that made the lab famous, and the stones on it add up through the day. The helix is the protein-folding work. The arm is the part of the research that has a body.",
  facts: [
    { label: "House style", value: "Research first" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the board", value: "Move thirty-seven, somewhere" },
  ],
  accent: CYAN,
  floor: { tone: { r: 164, g: 170, b: 170 }, pattern: "tile", alt: { r: 140, g: 146, b: 146 } },
  people: [
    {
      id: "pro",
      name: "Gemini 3.1 Pro",
      role: "The heavier reading",
      tier: "Flagship",
      doing: "Sits at the Go board between long spells at its desk.",
      why: "{short} is the slower pass on a hard problem. It is drawn to the board for the same reason the lab was: a game you cannot finish by looking it up.",
      chips: ["Deep reasoning", "Long context", "Multimodal"],
      accent: AMBER,
      scale: 1,
      home: "desk-1",
      haunts: ["go", "helix", "board"],
      interests: ["teach", "visit"],
      traits: { focus: 0.86, sociability: 0.4, pace: 0.9 },
      look: { outfit: "jacket", hair: "short", acc: ["glasses"] },
    },
    {
      id: "flash",
      name: "Gemini 3.8 Flash",
      role: "Long-horizon agent work",
      tier: "Workhorse",
      doing: "Walks the rigs and stops at each one.",
      why: "{short} is the model for long agent work. The rigs are the experiment, and it is the one walking them.",
      chips: ["Agentic", "Fast", "Tool use"],
      accent: CYAN,
      scale: 0.94,
      home: "desk-2",
      haunts: ["racks", "arm", "rest", "front"],
      traits: { pace: 1.3, focus: 0.24, sociability: 0.6, range: 1.4 },
      carries: "slate",
      look: { outfit: "tee", hair: "crop" },
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
      haunts: ["helix", "desk-2"],
      traits: { focus: 0.8, sociability: 0.35, pace: 0.85 },
      look: { outfit: "coat", hair: "bun" },
    },
    {
      id: "gemma",
      name: "Gemma 4 31B",
      role: "The open weights",
      tier: "Open",
      doing: "Works on a laptop by the door, which is where things that leave the building are kept.",
      why: "{short} is the open-weight line: smaller models built from the same research, that anyone can download and run. It works nearest the way out.",
      chips: ["Open weights", "Runs local", "Research lineage"],
      accent: GREEN,
      scale: 0.86,
      home: "laptop",
      haunts: ["go", "sofa", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.2, focus: 0.4, sociability: 0.75, range: 1.5 },
      look: { outfit: "hoodie", hair: "long" },
    },
  ],
  layout(L) {
    rackWall(L, "racks", 0.9, 5.8, 4, "T", { height: 4.9, places: 2 });
    L.draw((ctx, ox, oy) => {
      robotArm(ctx, ox + 12.6, oy + 2.9, FLOOR_Z, 0.4);
      floorTape(ctx, ox + 11.3, oy + 1.6, 2.6, 2.6, MAT.lamp);
      proteinHelix(ctx, ox + 9.2, oy + 5.2);
      phoneBox(ctx, ox + 1.2, oy + 6.6);
      sign(ctx, "INSTRUMENT ROW", ox + 3.8, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.wallBoard("board", "the board of marks", 7.4, 3.0, "MOVE 37", 5, { z: FLOOR_Z + 1.5, h: 1.6 });
    L.stand("arm", "the arm bay", 12.6, 4.6, FACE_N, { kind: "frame", pose: "watch", tags: ["work"] });
    L.stand("helix", "the helix", 9.2, 6.4, FACE_N, { kind: "frame", pose: "watch", tags: ["work"] });

    L.desk("desk-1", "the west desk", 3.2, 8.0, FACE_N, { screens: 2, seed: 11, lamp: true });
    L.desk("desk-2", "the middle desk", 6.0, 8.0, FACE_N, { screens: 1, seed: 13 });

    // The Go table, with a player either side.
    L.draw((ctx, ox, oy) => {
      goBoard(ctx, ox + 12.4, oy + 7.0);
      chair(ctx, ox + 11.3, oy + 7.0, FACE_E, MAT.cloth);
      chair(ctx, ox + 13.5, oy + 7.0, FACE_W, MAT.cloth);
    });
    L.station("go", "the Go board", "table", [
      { x: 11.3, y: 7.0, face: FACE_E, ax: 10.65, ay: 7.0 },
      { x: 13.5, y: 7.0, face: FACE_W, ax: 14.15, ay: 7.0 },
    ], { pose: "read", seat: 0.54, tags: ["social", "work"] });

    L.desk("laptop", "the laptop by the door", 12.2, 10.6, FACE_N, { style: "laptop", seed: 17 });
    L.sofa("sofa", "the common room", 3.8, 11.2, FACE_N, 3, { tone: MAT.cloth, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => plant(ctx, ox + 5.2, oy + 9.6, 1.0));

    L.base({ rest: [9.0, 10.4], front: [11.0, 12.1] });
    L.lamp(4.6, 6.2, { power: 1.2, radius: 7, style: "shade" });
    L.lamp(12.4, 5.0, { power: 0.9, radius: 5, style: "track" });
    L.lamp(8.0, 10.4, { power: 0.7, radius: 5, style: "globe" });
  },
});
