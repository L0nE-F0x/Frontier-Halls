import { AMBER, CYAN, GREEN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { crate } from "../../props/fixtures";
import { forklift, gpuDie } from "../../props/heroes-west";
import { plant, sign } from "../../props/objects";
import { rackWall } from "../kit";
import { defineHall, FACE_E, FACE_N } from "../layout";

/**
 * Nemotron, in four seats, from the index. The company that makes the chips
 * nearly every other hall trains on, and which also trains models of its own.
 */
export const nvidia = defineHall({
  id: "nvidia",
  name: "NVIDIA",
  plaque: "NVIDIA",
  kind: "lab",
  city: "Santa Clara",
  region: "United States",
  tagline: "The foundry",
  ethos: "Make the machine everyone else's models run on, and show what it can do by training some.",
  blurb:
    "A GPU the size of a rug laid on a plinth in the middle of the hall with its cores rippling green, racks along the north wall, and a forklift running crates up and down the south side.",
  reading:
    "Nearly every rack in the building came out of this hall one way or another, which is what the forklift is for. The die on the plinth is a chip drawn at the scale of a room: the grid of cores in the middle, memory stacked either side, gold at the edges. The flagship wears a leather jacket, and nobody asked it to.",
  facts: [
    { label: "House style", value: "The machine, and a model to prove it" },
    { label: "In the hall", value: "{roster}" },
    { label: "Shipped from here", value: "Most of the building's racks" },
  ],
  accent: GREEN,
  floor: { tone: { r: 150, g: 152, b: 150 }, pattern: "raised", alt: { r: 124, g: 128, b: 124 } },
  people: [
    {
      id: "ultra",
      name: "Nemotron 3 Ultra",
      role: "The largest of the line",
      tier: "Flagship",
      doing: "Keeps the west desk and walks round the die as if it owned it.",
      why: "{short} is the top of the company's own open line, trained to show what its own hardware can do at the largest scale.",
      chips: ["Open weights", "Mixture of experts", "Flagship"],
      accent: GREEN,
      scale: 1.04,
      home: "desk-1",
      haunts: ["die", "racks", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.55, pace: 0.95 },
      look: { outfit: "leather", hair: "short" },
    },
    {
      id: "super",
      name: "Nemotron 3 Super",
      role: "The middle size",
      tier: "Balanced",
      doing: "Works the east desk and checks the racks on the hour.",
      why: "{short} is the mid-sized model of the line, sized to run on a single node and still reason at length.",
      chips: ["Open weights", "Reasoning", "Efficient"],
      accent: CYAN,
      scale: 0.96,
      home: "desk-2",
      haunts: ["racks", "die", "rest"],
      traits: { pace: 1.1, focus: 0.55, sociability: 0.55, range: 1.3 },
      look: { outfit: "tee", hair: "crop" },
    },
    {
      id: "lightning",
      name: "Nemotron 3.5 Lightning",
      role: "The quick one",
      tier: "Fast",
      doing: "Runs between the crates and the forklift lane.",
      why: "{short} is the small, fast model of the family, cheap enough to run on almost anything the company sells.",
      chips: ["Small", "Fast", "Cheap"],
      accent: AMBER,
      scale: 0.82,
      home: "crates",
      haunts: ["die", "door-e", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.8, focus: 0.1, sociability: 0.8, range: 1.8 },
      carries: "parcel",
      look: { outfit: "vest", hair: "cap" },
    },
    {
      id: "safety",
      name: "Nemotron 3.5 Content Safety",
      role: "Checks what comes in",
      tier: "Guard",
      doing: "Stands by the west door and looks at everything that comes through it.",
      why: "{short} is a guard model: it reads what goes into and comes out of the other models and flags what should not pass. It stands where things come in.",
      chips: ["Guardrail", "Classifier", "Small"],
      accent: RED,
      scale: 0.9,
      home: "guard",
      haunts: ["crates", "rest"],
      traits: { focus: 0.9, sociability: 0.4, pace: 1.0 },
      look: { outfit: "jacket", hair: "crop", acc: ["badge"] },
    },
  ],
  layout(L) {
    rackWall(L, "racks", 0.8, 4.8, 3, "H", { height: 5.0, places: 2 });
    L.draw((ctx, ox, oy) => {
      gpuDie(ctx, ox + 6.6, oy + 3.2, 2.8);
      forklift(ctx, ox + 2.8, oy + 11.3, ox + 6.4, 0.5);
      for (const [x, y, n] of [[10.6, 1.0, 2], [11.6, 1.0, 3], [12.6, 1.0, 1], [13.6, 1.0, 2]] as const) crate(ctx, ox + x, oy + y, 0.8, n, MAT.benchDark);
      sign(ctx, "FOUNDRY", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("die", "the die", 8.0, 6.8, FACE_N, { kind: "frame", pose: "watch", places: 2, spacing: 1.4, tags: ["rest"] });
    L.stand("crates", "the crates", 12.0, 2.6, FACE_N, { kind: "floor", pose: "read", places: 2, spacing: 1.4, tags: ["work"] });

    L.desk("desk-1", "the west desk", 3.4, 8.0, FACE_N, { screens: 2, seed: 261, chair: MAT.black });
    L.desk("desk-2", "the east desk", 12.6, 8.0, FACE_N, { screens: 2, seed: 263, chair: MAT.black });
    L.stand("guard", "the west door", 2.0, 9.8, FACE_E, { kind: "door", pose: "stand", tags: ["work"] });

    L.round("table", "the round table", 8.0, 9.0, 0.5, 3, { tone: MAT.black, tags: ["social"] });
    L.draw((ctx, ox, oy) => plant(ctx, ox + 14.8, oy + 6.2, 1.1));

    L.base({ rest: [12.4, 9.8], front: [10.6, 11.8] });
    const green = MAT.green;
    for (const x of [3.4, 8.0, 12.6]) L.lamp(x, 5.6, { power: 1.0, radius: 6, tint: green, style: "track" });
  },
});
