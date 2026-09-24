import { CYAN, GREEN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { counter } from "../../props/furniture";
import { bleachers } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";
import type { Spot } from "../types";

const STEP = 0.45;
const COLS = [1.4, 2.5, 3.6, 4.7];

/** Step 3.7 Flash from the index; Step-Audio by hand. A hall built round a flight of steps. */
export const stepfun = defineHall({
  id: "stepfun",
  name: "StepFun",
  plaque: "STEPFUN",
  kind: "lab",
  city: "Shanghai",
  region: "China",
  tagline: "The steps",
  ethos: "Get to the general model one step at a time, and do not skip any.",
  blurb:
    "Wide wooden steps running up the north-west side of the hall that go nowhere, with people sitting on every one of them, and a mixing desk by the east door.",
  reading:
    "The steps are the room: a small amphitheatre of timber where the lab sits to work, talk, and watch whoever is presenting at the bottom. It is the one kind of staircase in the building that is not meant to take you anywhere, which suits a lab named for climbing.",
  facts: [
    { label: "House style", value: "One step at a time" },
    { label: "In the hall", value: "{roster}" },
    { label: "Steps", value: "Three, going nowhere" },
  ],
  accent: GREEN,
  floor: { tone: { r: 168, g: 164, b: 158 }, pattern: "concrete", alt: { r: 144, g: 140, b: 134 } },
  people: [
    {
      id: "flash",
      name: "Step 3.7 Flash",
      role: "The flagship, at speed",
      tier: "Flagship",
      doing: "Works the east desk and goes to sit on the steps when it wants to think.",
      why: "{short} is the lab's main model: a large, sparse model tuned to answer quickly.",
      chips: ["Mixture of experts", "Fast", "Reasoning"],
      accent: GREEN,
      scale: 1.0,
      home: "desk",
      haunts: ["steps-a", "steps-b", "mixer"],
      interests: ["teach", "visit"],
      traits: { focus: 0.8, sociability: 0.6, pace: 1.0 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "audio",
      name: "Step-Audio",
      role: "Hears and speaks",
      tier: "Speech",
      doing: "Keeps the mixing desk by the east door, with the headphones on.",
      why: "{short} is the lab's speech model, built to listen and answer aloud in one step rather than through a transcript.",
      chips: ["Speech in", "Speech out", "Realtime"],
      accent: CYAN,
      scale: 0.9,
      home: "mixer",
      haunts: ["steps-a", "steps-c", "rest"],
      traits: { pace: 1.1, focus: 0.6, sociability: 0.7, range: 1.3 },
      look: { outfit: "hoodie", hair: "long", acc: ["headphones"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      bleachers(ctx, ox + 0.8, oy + 4.0, 4.8, 3, STEP, 0.9);
      sign(ctx, "STEP", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.07);
    });
    // Three rows: on the bottom step with feet on the floor, then one step up, then two.
    const row = (y: number): Spot[] => COLS.map((x) => ({ x, y, face: FACE_S, ax: x, ay: 4.7 }));
    L.station("steps-a", "the bottom step", "seat", row(3.85), { pose: "read", seat: STEP, tags: ["social", "work"] });
    L.station("steps-b", "the second step", "seat", row(2.95), { pose: "read", seat: STEP, lift: STEP, tags: ["social", "work"] });
    L.station("steps-c", "the top step", "seat", row(2.05), { pose: "read", seat: STEP, lift: STEP * 2, tags: ["social"] });

    L.draw((ctx, ox, oy) => counter(ctx, ox + 11.2, oy + 2.4, 3.4, 0.8, MAT.darkMetal, MAT.black, 0.95));
    L.draw((ctx, ox, oy) => {
      if (ctx.lod < 2) return;
      for (let i = 0; i < 12; i++) {
        ctx.p.dot(ox + 11.5 + (i % 6) * 0.5, oy + 2.6 + Math.floor(i / 6) * 0.3, FLOOR_Z + 0.98, 2, i % 3 ? MAT.led : MAT.lamp, { emissive: 1, glow: 0.3 });
      }
    });
    L.stand("mixer", "the mixing desk", 12.9, 3.8, FACE_N, { kind: "bench", pose: "type", tags: ["work"] });

    L.desk("desk", "the east desk", 11.8, 8.0, FACE_N, { screens: 2, seed: 291 });

    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 6.2, oy + 3.4, 1.2);
      plant(ctx, ox + 8.6, oy + 12.0, 1.0);
    });

    L.base({ rest: [4.0, 10.6], front: [8.0, 11.4] });
    L.lamp(3.2, 3.6, { power: 1.0, radius: 6, style: "track" });
    L.lamp(12.4, 5.6, { power: 0.9, radius: 6, style: "globe" });
    L.lamp(8.0, 9.4, { power: 0.8, radius: 5, style: "globe" });
  },
});
