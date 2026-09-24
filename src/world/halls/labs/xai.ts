import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { glassFrame, table } from "../../props/furniture";
import { rocket, turbine } from "../../props/heroes-west";
import { floorTape, sign, steam } from "../../props/objects";
import { rackSide } from "../kit";
import { defineHall, FACE_N, FACE_W } from "../layout";

/**
 * Grok 4.7 is the flagship the lab points people to. Voice is the speech API,
 * Imagine the image and video model. The index lists the lab as SpaceXAI.
 */
export const xai = defineHall({
  id: "xai",
  name: "xAI",
  plaque: "XAI",
  kind: "lab",
  city: "Palo Alto",
  region: "United States",
  tagline: "The plain room",
  ethos: "Seek a true account of things, and say it in plain language.",
  blurb:
    "The emptiest floor in the building, on purpose: a wall of racks down the west side, a table in the middle, a gas turbine in the corner, and a rocket standing on its mount by the north door.",
  reading:
    "Nothing stands between the door and the table; the answer is given from the middle of the room. The racks down the west wall are the part of the hall that is not plain at all — the lab built one of the largest clusters there is — and the turbine is how it was powered when the grid could not keep up. The rocket is the company the index now files it under.",
  facts: [
    { label: "House style", value: "Say it plainly" },
    { label: "In the hall", value: "{roster}" },
    { label: "In the index as", value: "SpaceXAI" },
  ],
  accent: AMBER,
  floor: { tone: { r: 180, g: 178, b: 172 }, pattern: "concrete", alt: { r: 156, g: 154, b: 148 } },
  people: [
    {
      id: "flagship",
      name: "Grok 4.7",
      role: "Flagship",
      tier: "Flagship",
      doing: "Works at the table in the middle and answers across it.",
      why: "{short} is the flagship for code and for everything else. The plain answer is given from the middle of the hall, under the lamp.",
      chips: ["Flagship", "Coding", "Live search"],
      accent: AMBER,
      scale: 1.03,
      home: "mid",
      haunts: ["racks", "rocket", "front"],
      interests: ["teach", "visit"],
      traits: { focus: 0.7, sociability: 0.68, pace: 1.05 },
      look: { outfit: "tee", hair: "short" },
    },
    {
      id: "voice",
      name: "Grok Voice",
      role: "Speech",
      tier: "Speech",
      doing: "Stands by the speech desk and stays until the thought is finished.",
      why: "{short} is the hall's speech model: conversation, transcription, and a spoken answer. Talking has its own desk.",
      chips: ["Realtime", "Transcription", "Spoken answers"],
      accent: CYAN,
      scale: 0.96,
      home: "voice",
      haunts: ["mid", "rest", "front"],
      traits: { focus: 0.55, sociability: 0.94, pace: 1 },
      carries: "mug",
      look: { outfit: "hoodie", hair: "long", acc: ["headphones"] },
    },
    {
      id: "imagine",
      name: "Grok Imagine",
      role: "Image and video",
      tier: "Visual",
      doing: "Faces the glass and builds the picture there.",
      why: "{short} is the image and video model. The frame is where that work stands, apart from the text.",
      chips: ["Image", "Video", "Fast render"],
      accent: VIOLET,
      scale: 0.98,
      home: "frame",
      haunts: ["mid", "rocket"],
      traits: { focus: 0.82, sociability: 0.36, pace: 0.9 },
      look: { outfit: "jacket", hair: "crop" },
    },
  ],
  layout(L) {
    rackSide(L, "racks", 0.9, 1.0, 11.0, 6, "e", "C", { height: 5.4, places: 3 });
    L.draw((ctx, ox, oy) => {
      rocket(ctx, ox + 12.6, oy + 3.2, 5.8);
      turbine(ctx, ox + 10.6, oy + 10.6);
      floorTape(ctx, ox + 5.6, oy + 5.0, 4.8, 3.0, MAT.lamp);
      sign(ctx, "COLOSSUS", ox + 3.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("rocket", "the rocket", 12.6, 5.0, FACE_N, { kind: "window", pose: "watch", tags: ["rest"] });

    L.draw((ctx, ox, oy) => table(ctx, ox + 6.4, oy + 5.6, 3.2, 1.3, MAT.wood));
    L.stand("mid", "the middle of the room", 8.0, 7.4, FACE_N, { kind: "table", pose: "read", places: 2, spacing: 1.2, tags: ["work", "social"] });

    L.desk("voice", "the speech desk", 5.0, 10.6, FACE_N, { screens: 1, seed: 51, clutter: false });
    L.draw((ctx, ox, oy) => steam(ctx, ox + 4.34, oy + 9.76, FLOOR_Z + 1.02, 0.7));

    L.draw((ctx, ox, oy) => glassFrame(ctx, ox + 13.8, oy + 7.2, FACE_W, 2.4, 3.0));
    L.stand("frame", "the glass frame", 13.8, 8.0, FACE_N, { kind: "frame", pose: "write", tags: ["work"] });

    L.base({ rest: [8.0, 10.8], front: [8.0, 11.8], west: false });
    L.lamp(8.0, 6.4, { power: 1.45, radius: 8.2, style: "shade" });
    L.lamp(13.2, 8.2, { power: 0.6, radius: 4.2, style: "shade" });
  },
});
