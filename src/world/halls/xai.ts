import { AMBER, CYAN, VIOLET } from "../accents";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import { glassFrame, table, whiteboard } from "../props/furniture";
import { floorTape, motes, plant, sign, steam } from "../props/objects";
import { baseStations, computeWall, corners, workstation } from "./kit";
import { FACE_N, FACE_S, FACE_W, station, type HallSpec } from "./types";

/**
 * Grok 4.7 is the flagship the lab points people to.
 * Voice is the speech API. Imagine is the image and video model.
 */
export const xai: HallSpec = {
  id: "xai",
  key: "4",
  name: "xAI",
  plaque: "XAI",
  tagline: "The plain room",
  ethos: "Seek a true account of things, and say it in plain language.",
  blurb: "A clear aisle, one lamp, and a glass frame. The answer is given from the middle of the room.",
  reading:
    "The emptiest floor in the block, on purpose. Nothing stands between the door and the table. The glass frame in the corner is the only place the hall keeps a picture.",
  facts: [
    { label: "House style", value: "Say it plainly" },
    { label: "In the hall", value: "Grok 4.7, Voice, Imagine" },
    { label: "Floor plan", value: "Kept clear" },
  ],
  accent: AMBER,
  floor: { r: 186, g: 184, b: 176 },
  index: 3,
  lamps: [
    { x: 8.0, y: 6.6, power: 1.45, radius: 8.2 },
    { x: 13.4, y: 8.2, power: 0.6, radius: 4.2 },
  ],
  stations: [
    ...baseStations(),
    station("mid", "the middle of the room", "table", 8.0, 6.9, FACE_S),
    station("voice", "the speech bench", "bench", 4.6, 8.6, FACE_N),
    station("frame", "the glass frame", "frame", 13.2, 7.4, FACE_W),
  ],
  people: [
    {
      id: "grok",
      name: "Grok 4.7",
      role: "Flagship",
      tier: "Flagship",
      doing: "Works at the lamp and answers across the table.",
      why: "Grok 4.7 is the flagship for code and for everything else. The plain answer is given from the middle of the hall, under the lamp.",
      chips: ["Flagship", "Coding", "Live search"],
      accent: AMBER,
      scale: 1.03,
      home: "mid",
      haunts: ["board", "front", "racks"],
      traits: { focus: 0.7, sociability: 0.68, pace: 1.05 },
    },
    {
      id: "voice",
      name: "Voice",
      role: "Speech",
      tier: "Speech",
      doing: "Stands by the bench and stays until the thought is finished.",
      why: "Voice is the hall's speech model: conversation, transcription, and a spoken answer. Talking has its own station.",
      chips: ["Realtime", "Transcription", "Spoken answers"],
      accent: CYAN,
      scale: 0.96,
      home: "voice",
      haunts: ["mid", "rest", "front"],
      traits: { focus: 0.55, sociability: 0.94, pace: 1 },
      carries: "mug",
    },
    {
      id: "imagine",
      name: "Imagine",
      role: "Image and video",
      tier: "Visual",
      doing: "Faces the glass and builds the picture there.",
      why: "Imagine is the image and video model. The frame is where that work stands, apart from the text bench.",
      chips: ["Image", "Video", "Fast render"],
      accent: VIOLET,
      scale: 0.98,
      home: "frame",
      haunts: ["bench-b", "mid"],
      traits: { focus: 0.82, sociability: 0.36, pace: 0.9 },
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 4, "X", 4.6);
    table(ctx, ox + 6.4, oy + 6.1, 3.4, 1.6);
    workstation(ctx, ox + 3.4, oy + 7.9, FACE_N, 51, { clutter: false });
    workstation(ctx, ox + 10.4, oy + 4.3, FACE_N, 52);
    glassFrame(ctx, ox + 13.4, oy + 7.9, FACE_W, 2.4, 3.0);
    whiteboard(ctx, ox + 6.4, oy + 0.62, FLOOR_Z + 2.9, 3.4, 2.0, 53, "PLAIN");
    floorTape(ctx, ox + 5.9, oy + 5.6, 4.4, 2.6, MAT.lamp);
    sign(ctx, "ONE ROOM", ox + 12.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    steam(ctx, ox + 3.74, oy + 8.64, FLOOR_Z + 1.02, 0.7);
    plant(ctx, ox + 1.2, oy + 5.0, 1.25);
    corners(ctx, ox, oy, 15);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 24);
  },
};
