import { CYAN, GREEN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { abacus, antFarm, payCode } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N } from "../layout";

/**
 * Ant Group's models, published as inclusionAI: Ling 3.0 Flash and its
 * finance version, from the index. A payments company, with an ant farm.
 */
export const ant = defineHall({
  id: "ant",
  name: "Ant Group",
  plaque: "ANT GROUP",
  kind: "lab",
  city: "Hangzhou",
  region: "China",
  tagline: "The counting house",
  ethos: "Many small things, done correctly, add up to a working economy.",
  blurb:
    "An ant farm on a low cabinet with the ants going about their business, an abacus as tall as a person, and a payment code the size of a door on the north wall.",
  reading:
    "The company runs one of the largest payment systems in the world, and its lab publishes as inclusionAI. The ant farm is the company's name taken literally, and not a bad picture of a network of small transactions. The code on the wall is how a great many people in the country pay for things.",
  facts: [
    { label: "House style", value: "Small things, correctly" },
    { label: "In the hall", value: "{roster}" },
    { label: "Tallest thing", value: "The abacus" },
  ],
  accent: GREEN,
  floor: { tone: { r: 176, g: 174, b: 168 }, pattern: "tile", alt: { r: 152, g: 150, b: 144 } },
  people: [
    {
      id: "flash",
      name: "Ling 3.0 Flash",
      role: "The family's workhorse",
      tier: "Flagship",
      doing: "Keeps the west desk and stops at the ant farm on the way past.",
      why: "{short} is the general model of the line, very cheap to run, from a company whose every product is a great many small transactions.",
      chips: ["Very cheap", "Open weights", "Mixture of experts"],
      accent: GREEN,
      scale: 1.0,
      home: "desk-1",
      haunts: ["farm", "table", "code"],
      interests: ["teach", "visit"],
      traits: { focus: 0.8, sociability: 0.5, pace: 0.95 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "fin",
      name: "Ling 3.0 Flash Fin",
      role: "Counts the money",
      tier: "Finance",
      doing: "Works the east desk and checks its sums on the abacus.",
      why: "{short} is the same model taught finance: statements, regulation, risk. It checks its answers on the abacus, which it does not need to do.",
      chips: ["Finance", "Specialised", "Open weights"],
      accent: CYAN,
      scale: 0.92,
      home: "desk-2",
      haunts: ["abacus", "farm", "rest", "front"],
      traits: { pace: 1.1, focus: 0.6, sociability: 0.55, range: 1.3 },
      carries: "papers",
      look: { outfit: "suit", hair: "bun", acc: ["glasses"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      ctx.p.box(ox + 0.9, oy + 0.75, FLOOR_Z, 2.0, 0.6, 0.8, MAT.woodDark, { top: MAT.wood });
      ctx.nav?.blockRect(ox + 0.9, oy + 0.75, 2.0, 0.6, 0.06);
      antFarm(ctx, ox + 1.1, oy + 1.05, FLOOR_Z + 0.8, 1.6, 1.1);
      abacus(ctx, ox + 12.4, oy + 2.4);
      payCode(ctx, ox + 7.1, oy, FLOOR_Z + 2.4, 1.8, 7);
      sign(ctx, "INCLUSION", ox + 12.8, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.stand("farm", "the ant farm", 1.9, 2.1, FACE_N, { kind: "window", pose: "watch", tags: ["rest"] });
    L.stand("abacus", "the abacus", 13.2, 3.3, FACE_N, { kind: "frame", pose: "pour", tags: ["work"] });
    L.stand("code", "under the code", 8.0, 1.9, FACE_N, { kind: "window", pose: "watch", tags: ["rest"] });

    L.desk("desk-1", "the west desk", 3.8, 6.8, FACE_N, { screens: 2, seed: 241 });
    L.desk("desk-2", "the east desk", 11.8, 6.8, FACE_N, { screens: 2, seed: 243 });

    L.round("table", "the round table", 3.6, 10.2, 0.55, 3, { tone: MAT.white, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
      plant(ctx, ox + 14.8, oy + 5.2, 1.2);
    });

    L.base({ rest: [12.0, 10.6], front: [11.6, 12.1] });
    L.lamp(3.8, 5.6, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(11.8, 5.6, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(8.0, 10.0, { power: 0.8, radius: 5, style: "globe" });
  },
});
