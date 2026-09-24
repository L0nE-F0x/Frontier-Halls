import { worldText } from "../../../engine/text";
import { AMBER, CYAN, GREEN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { banner } from "../../props/furniture";
import { crate, pallet } from "../../props/fixtures";
import { floorTape, plant, sign } from "../../props/objects";
import { defineHall, FACE_N } from "../layout";

/** The ladder of sizes, smallest first. Every one of them is a Qwen in the index. */
const LADDER: [number, number, string][] = [
  [10.4, 0.36, "9B"], [10.9, 0.56, "27B"], [11.6, 0.8, "122B"], [12.55, 1.04, "397B"], [13.75, 1.34, "2.4T"],
];

/** Alibaba's Qwen: the depot, where every size of one family is stacked by the door. */
export const qwen = defineHall({
  id: "qwen",
  name: "Qwen",
  plaque: "QWEN",
  kind: "lab",
  city: "Hangzhou",
  region: "China",
  tagline: "The depot",
  ethos: "Release the whole ladder, from the model that runs on a laptop to the one that does not.",
  blurb:
    "A row of crates along the north wall in five sizes, smallest to largest, each marked with how big the model in it is. A loading bay by the east door, and desks for the family between.",
  reading:
    "Every crate in the ladder is the same family at a different size, and every size on it is one the index lists: the smallest runs on a laptop and the largest is measured in trillions. The bay by the east door is for sending them out, which the lab does more of than almost anyone.",
  facts: [
    { label: "House style", value: "Ship every size" },
    { label: "In the hall", value: "{roster}" },
    { label: "Largest crate", value: "2.4 trillion parameters" },
  ],
  accent: AMBER,
  floor: { tone: { r: 172, g: 166, b: 174 }, pattern: "concrete", alt: { r: 148, g: 142, b: 150 } },
  people: [
    {
      id: "max",
      name: "Qwen3.8 Max Prime",
      role: "The big one",
      tier: "Flagship",
      doing: "Keeps the desk by the ladder and lets the smaller sizes do the walking.",
      why: "{short} is the top of the ladder: a model large enough that most people reach it through an API rather than a download.",
      chips: ["Flagship", "Mixture of experts", "Largest size"],
      accent: AMBER,
      scale: 1.04,
      home: "desk-1",
      haunts: ["ladder", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.9, sociability: 0.42, pace: 0.88 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "coder",
      name: "Qwen3 Coder Next",
      role: "Repository work",
      tier: "Coding",
      doing: "Works the bay, checking one size against the next before it ships.",
      why: "The coding line is the part of the family people actually put in their build pipelines, which is why {short} lives next to the door.",
      chips: ["Repo-scale", "Open weights", "Agentic"],
      accent: CYAN,
      scale: 0.93,
      home: "bay",
      haunts: ["ladder", "desk-2", "rest", "door-e"],
      traits: { pace: 1.3, focus: 0.3, sociability: 0.66, range: 1.6 },
      carries: "case",
      look: { outfit: "hoodie", hair: "crop" },
    },
    {
      id: "small",
      name: "Qwen3.8 27B",
      role: "Runs on a laptop",
      tier: "Small",
      doing: "Works from a laptop by the south door and goes out along the corridor.",
      why: "The bottom of the ladder, and the reason the ladder exists: {short} is the size of weights that ends up on other people's machines.",
      chips: ["Runs local", "Open weights", "Many variants"],
      accent: VIOLET,
      scale: 0.78,
      home: "laptop",
      haunts: ["ladder", "bay", "door-w", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.8, focus: 0.1, sociability: 0.8, range: 2.2 },
      carries: "papers",
      look: { outfit: "tee", hair: "cap" },
    },
    {
      id: "omni",
      name: "Qwen3.8 Omni Flash",
      role: "Hears, sees, and speaks",
      tier: "Multimodal",
      doing: "Keeps the desk with the microphone on it and listens to the room.",
      why: "{short} takes in speech, pictures and text and answers aloud: the one in the family that does not need a keyboard.",
      chips: ["Audio", "Vision", "Speech out"],
      accent: GREEN,
      scale: 0.9,
      home: "desk-2",
      haunts: ["table", "front", "bay"],
      traits: { pace: 1.1, focus: 0.5, sociability: 0.75, range: 1.3 },
      look: { outfit: "vest", hair: "long", acc: ["headphones"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      floorTape(ctx, ox + 10.2, oy + 0.6, 5.2, 1.7, MAT.lamp);
      for (const [x, size, label] of LADDER) {
        crate(ctx, ox + x, oy + 0.75, size, 1, MAT.bench);
        if (ctx.lod > 1) {
          worldText(ctx.p, label, ox + x + size / 2, oy + 0.75 + size + 0.01, FLOOR_Z + size * 0.45 + 0.1, 1, 0, 0, 0, 0, 1,
            Math.min(0.03, size / 30), MAT.ink, { align: "center", emissive: 0.9, bias: 0.05 });
        }
      }
      banner(ctx, ox + 1.2, oy + 0.66, FLOOR_Z + 2.4, 1.4, 2.5, MAT.seal, "SIZES");
      sign(ctx, "DEPOT", ox + 12.8, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("ladder", "the ladder of sizes", 12.6, 2.8, FACE_N, { kind: "rack", pose: "read", places: 2, spacing: 1.6, tags: ["work"] });

    // The bay, by the east door.
    L.draw((ctx, ox, oy) => {
      floorTape(ctx, ox + 11.2, oy + 3.6, 3.6, 2.4, MAT.lamp, true);
      pallet(ctx, ox + 11.6, oy + 4.0);
      crate(ctx, ox + 11.7, oy + 4.1, 0.86, 3, MAT.bench);
      crate(ctx, ox + 13.4, oy + 4.2, 0.7, 2, MAT.benchDark);
    });
    L.stand("bay", "the bay", 12.6, 6.1, FACE_N, { kind: "floor", pose: "read", tags: ["work"] });

    L.desk("desk-1", "the desk by the ladder", 3.4, 5.4, FACE_N, { screens: 2, seed: 91, chair: MAT.seal });
    L.desk("desk-2", "the desk with the microphone", 12.4, 8.4, FACE_N, { screens: 1, seed: 93 });
    L.desk("laptop", "the laptop by the door", 4.0, 11.0, FACE_N, { style: "laptop", seed: 95 });

    L.round("table", "the round table", 4.2, 8.4, 0.55, 3, { tone: MAT.wood, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 1.2, oy + 3.2, 1.2);
      plant(ctx, ox + 14.8, oy + 7.2, 1.0);
    });

    L.base({ rest: [11.8, 11.2], front: [2.6, 12.2] });
    L.lamp(3.4, 6.2, { power: 1.1, radius: 6.5, style: "shade" });
    L.lamp(12.6, 5.6, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(8.0, 10.2, { power: 0.7, radius: 5, style: "globe" });
  },
});
