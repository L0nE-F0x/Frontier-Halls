import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { banner, shelf } from "../../props/furniture";
import { books, papers, plant, poster, sign } from "../../props/objects";
import { rackSide } from "../kit";
import { defineHall, FACE_N, FACE_S } from "../layout";

/**
 * The open-source archive. The weights, the data and the recipe are the
 * point of the room, so it is furnished as a library with a table of open
 * notebooks rather than as a factory.
 */
export const ai2 = defineHall({
  id: "ai2",
  name: "Ai2",
  plaque: "AI2",
  kind: "lab",
  city: "Seattle",
  region: "United States",
  tagline: "The archive",
  ethos: "If you cannot read how it was made, you cannot study it.",
  blurb:
    "Shelves along the north wall, a long table of open notebooks, and the training notes left out where anyone can take them.",
  reading:
    "The lab that publishes everything: the weights, the data they were trained on, the code, and the notes. The table in the middle is the room's centre for that reason — the recipe is left open on it, and Tulu, which is the recipe, sits there teaching. The racks are the smallest in the block, and nobody in the hall seems to mind.",
  facts: [
    { label: "House style", value: "Weights, data and recipe" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the table", value: "The training notes" },
  ],
  accent: CYAN,
  floor: { tone: { r: 170, g: 166, b: 156 }, pattern: "plank", alt: { r: 146, g: 142, b: 132 } },
  people: [
    {
      id: "olmo",
      name: "OLMo",
      role: "The open language line",
      tier: "Flagship",
      doing: "Keeps the desk by the shelves, where the training notes are filed.",
      why: "{short} is why this hall exists. The weights are public, and so is the trail of how they were trained. It does not wander off and leave the notes.",
      chips: ["Fully open", "Weights and data", "Language"],
      accent: CYAN,
      scale: 1.02,
      home: "desk",
      haunts: ["racks", "notes", "shelves"],
      interests: ["teach", "visit"],
      traits: { focus: 0.9, sociability: 0.38, pace: 0.9 },
      look: { outfit: "vest", hair: "long", acc: ["glasses"] },
    },
    {
      id: "molmo",
      name: "Molmo",
      role: "Looks, then answers",
      tier: "Vision",
      doing: "Drifts to the open side and watches whatever is going on in the corridor.",
      why: "{short} is the vision line. It is the one in this room that actually needs a view, so it ends up at the front more than the others.",
      chips: ["Vision", "Open weights", "Points at things"],
      accent: AMBER,
      scale: 0.94,
      home: "front",
      haunts: ["notes", "rest", "shelves"],
      traits: { pace: 1.15, focus: 0.28, sociability: 0.62, range: 1.3 },
      carries: "slate",
      look: { outfit: "tee", hair: "bun" },
    },
    {
      id: "tulu",
      name: "Tulu",
      role: "Teaches the answer",
      tier: "Post-training",
      doing: "Keeps the table of notebooks and walks a reply through out loud.",
      why: "{short} is the post-training recipe: how a raw model learns to answer people. The table is a classroom, and the recipe is left on it.",
      chips: ["Instruction", "Recipe public", "Sits with others"],
      accent: VIOLET,
      scale: 0.9,
      home: "notes",
      haunts: ["shelves", "racks", "reading"],
      interests: ["teach"],
      traits: { focus: 0.55, sociability: 0.84, pace: 1.05 },
      carries: "papers",
      look: { outfit: "dress", hair: "curly", acc: ["scarf"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      shelf(ctx, ox + 0.8, oy + 0.75, 4.6, 5, 101);
      shelf(ctx, ox + 10.6, oy + 0.75, 4.6, 5, 107);
      banner(ctx, ox + 7.1, oy + 0.7, FLOOR_Z + 2.6, 1.8, 2.8, MAT.led, "OPEN");
      poster(ctx, ox + 5.8, oy + 0.62, FLOOR_Z + 1.4, 1.0, 1.2, 3);
      sign(ctx, "ARCHIVE", ox + 12.9, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.stand("shelves", "the shelves", 3.1, 1.95, FACE_N, { kind: "rack", pose: "read", places: 2, spacing: 1.6, tags: ["work"] });

    rackSide(L, "racks", 0.9, 3.6, 3.8, 2, "e", "O", { height: 4.0, places: 1 });

    L.table("notes", "the table of notebooks", 5.2, 5.4, 5.6, 1.3, {
      per: 5, pose: "read", tags: ["work", "social"], tone: MAT.wood, chairTone: MAT.cloth,
      top: (ctx, ox, oy) => {
        for (let i = 0; i < 5; i++) {
          papers(ctx, ox + 5.8 + i * 1.1, oy + 5.75, 2, 11 + i, FLOOR_Z + 0.9);
          if (i % 2) books(ctx, ox + 5.9 + i * 1.1, oy + 6.2, 2, 5 + i, FLOOR_Z + 0.9);
        }
      },
    });

    L.desk("desk", "the notes desk", 13.0, 5.4, FACE_N, { screens: 2, lamp: true, seed: 31, tone: MAT.wood });
    L.sofa("reading", "the reading chairs", 12.4, 9.2, FACE_S, 2, { tone: MAT.cloth, tags: ["social", "rest"] });

    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 3.0, oy + 9.2, 1.2);
      plant(ctx, ox + 4.8, oy + 12.1, 1.0);
    });

    L.base({ rest: [11.6, 11.2], front: [2.8, 12.1] });
    L.lamp(8.0, 6.0, { power: 1.1, radius: 6.8, style: "shade" });
    L.lamp(3.0, 3.4, { power: 0.8, radius: 4.8, style: "globe" });
    L.lamp(12.8, 7.2, { power: 0.8, radius: 4.8, style: "globe" });
  },
});
