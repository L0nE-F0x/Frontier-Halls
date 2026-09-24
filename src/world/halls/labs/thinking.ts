import { CYAN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { bench } from "../../props/furniture";
import { connectionMachine, toolWall } from "../../props/heroes-west";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N } from "../layout";

/** Inkling and Inkling Small, from the index. A lab named after a machine from 1983, and it keeps one. */
export const thinking = defineHall({
  id: "thinking",
  name: "Thinking Machines",
  plaque: "THINKING MACHINES",
  kind: "lab",
  city: "San Francisco",
  region: "United States",
  tagline: "The tinkerer's bench",
  ethos: "Make frontier models that people can understand and adapt to their own work.",
  blurb:
    "A pegboard of tools over a long workbench, a cube of black cubes in the north-east corner with red lamps blinking all over it, and two desks between them.",
  reading:
    "The lab took its name from a company that built parallel supercomputers in the 1980s, black cubes covered in blinking red lights, and the hall has one in the corner by way of a family portrait. The bench under the tools is for adapting models rather than building them from scratch, which is the lab's other idea.",
  facts: [
    { label: "House style", value: "Adaptable, and explained" },
    { label: "In the hall", value: "{roster}" },
    { label: "In the corner", value: "A machine from 1983" },
  ],
  accent: RED,
  floor: { tone: { r: 164, g: 164, b: 160 }, pattern: "concrete", alt: { r: 140, g: 140, b: 136 } },
  people: [
    {
      id: "inkling",
      name: "Inkling",
      role: "The lab's own model",
      tier: "Flagship",
      doing: "Works at the bench under the tools and adjusts things until they fit.",
      why: "{short} is the lab's flagship, from a company that cares as much about how a model can be fitted to a job as about the model.",
      chips: ["Flagship", "Adaptable", "Research"],
      accent: RED,
      scale: 1.02,
      home: "desk-1",
      haunts: ["bench", "machine", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.86, sociability: 0.5, pace: 0.95 },
      look: { outfit: "jacket", hair: "long" },
    },
    {
      id: "small",
      name: "Inkling Small",
      role: "The small one",
      tier: "Small",
      doing: "Carries parts between the bench and the machine in the corner.",
      why: "{short} is the smaller model of the line, quick and cheap enough to be the one that gets fitted to everything.",
      chips: ["Small", "Fast", "Fine-tunable"],
      accent: CYAN,
      scale: 0.84,
      home: "desk-2",
      haunts: ["bench", "machine", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.5, focus: 0.3, sociability: 0.7, range: 1.5 },
      carries: "case",
      look: { outfit: "vest", hair: "crop" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      toolWall(ctx, ox + 0.8, oy, 4.8);
      bench(ctx, ox + 0.9, oy + 1.4, 4.6, 0.9, MAT.wood);
      connectionMachine(ctx, ox + 12.4, oy + 1.8);
      sign(ctx, "TINKER", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("bench", "the workbench", 3.2, 2.95, FACE_N, { kind: "bench", pose: "pour", places: 2, spacing: 1.6, tags: ["work"] });
    L.stand("machine", "the machine", 11.6, 4.6, FACE_N, { kind: "frame", pose: "watch", tags: ["rest"] });

    L.desk("desk-1", "the west desk", 4.4, 7.2, FACE_N, { screens: 2, seed: 221 });
    L.desk("desk-2", "the east desk", 11.8, 7.8, FACE_N, { screens: 1, seed: 223 });

    L.round("table", "the round table", 12.4, 10.4, 0.55, 3, { tone: MAT.wood, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
      plant(ctx, ox + 15.0, oy + 5.6, 1.2);
    });

    L.base({ rest: [8.0, 9.0], front: [3.2, 12.1] });
    L.lamp(3.2, 4.0, { power: 1.0, radius: 6, style: "track" });
    L.lamp(12.4, 6.4, { power: 0.9, radius: 6, style: "shade" });
    L.lamp(8.0, 9.8, { power: 0.7, radius: 5, style: "globe" });
  },
});
