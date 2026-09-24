import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { lowTable, rug, shelf } from "../../props/furniture";
import { cabinet } from "../../props/fixtures";
import { bridgeModel, fireplace, framedDocument } from "../../props/heroes-west";
import { books, motes, papers, plant, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/**
 * Claude lineup from the index. Mythos is the class Fable belongs to, so it
 * is not a second figure.
 */
export const anthropic = defineHall({
  id: "anthropic",
  name: "Anthropic",
  plaque: "ANTHROPIC",
  kind: "lab",
  city: "San Francisco",
  region: "United States",
  tagline: "The reading room",
  ethos: "Build models that are capable, and that will pause on the requests they should not answer.",
  blurb:
    "Shelves along the north wall, a long table of pages in the middle, armchairs by a fire, a framed document on the wall, a model of a bridge by the door, and one cabinet that stays shut.",
  reading:
    "The quietest hall in the building, and the only one where the furniture faces inward. The table of pages is the centre of the plan and the cabinet by the west wall is sealed; nothing in the room opens it. The document on the wall is the set of principles the models are trained against. The bridge is a joke the lab tells about itself.",
  facts: [
    { label: "House style", value: "Capability with a brake on it" },
    { label: "In the hall", value: "{roster}" },
    { label: "The cabinet", value: "Stays shut" },
  ],
  accent: VIOLET,
  floor: { tone: { r: 164, g: 150, b: 138 }, pattern: "carpet", alt: { r: 146, g: 132, b: 122 } },
  people: [
    {
      id: "fable",
      name: "Claude Fable 5.1",
      role: "Mythos-class flagship",
      tier: "Flagship",
      doing: "Sits with the pages and finishes one before standing.",
      why: "{short} is the flagship for long-horizon work, and it is built to set a risky request down. Here that looks like reading a thing all the way through.",
      chips: ["Mythos class", "Long horizon", "Will decline"],
      accent: VIOLET,
      scale: 1.03,
      home: "pages",
      haunts: ["shelves", "fire", "document"],
      interests: ["teach", "visit"],
      traits: { focus: 0.92, sociability: 0.42, pace: 0.85 },
      carries: "papers",
      look: { outfit: "jacket", hair: "long" },
    },
    {
      id: "opus",
      name: "Claude Opus 5",
      role: "The long job",
      tier: "Heavy",
      doing: "Works the east desk and does not look up.",
      why: "{short} is the model for the long, careful job. The desk is where that day goes.",
      chips: ["Deep work", "Coding", "Agentic"],
      accent: AMBER,
      scale: 1,
      home: "desk-e",
      haunts: ["pages", "fire"],
      interests: ["teach", "visit"],
      traits: { focus: 0.94, sociability: 0.3, pace: 0.9 },
      look: { outfit: "vest", hair: "short", acc: ["glasses"] },
    },
    {
      id: "sonnet",
      name: "Claude Sonnet 5",
      role: "Daily work",
      tier: "Balanced",
      doing: "Carries a slate between its desk and the pages.",
      why: "{short} is the daily pairing of speed and judgment, so it is the one moving between the two stations.",
      chips: ["Daily driver", "Fast enough", "Good judgment"],
      accent: VIOLET,
      scale: 0.95,
      home: "desk-w",
      haunts: ["pages", "shelves", "rest", "front", "fire"],
      traits: { pace: 1.12, focus: 0.34, sociability: 0.72, range: 1.2 },
      carries: "slate",
      look: { outfit: "tee", hair: "bun" },
    },
    {
      id: "haiku",
      name: "Claude Haiku 4.5",
      role: "The fast errands",
      tier: "Fast",
      doing: "Ferries short notes along the shelves.",
      why: "{short} is the fast, high-volume model. The short trips belong to it.",
      chips: ["High volume", "Low latency", "Cheap"],
      accent: CYAN,
      scale: 0.8,
      home: "shelves",
      haunts: ["door-w", "door-e", "rest", "desk-w", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.7, focus: 0.1, sociability: 0.85, range: 1.9 },
      carries: "papers",
      look: { outfit: "hoodie", hair: "crop" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      shelf(ctx, ox + 0.8, oy + 0.7, 4.8, 5, 23);
      shelf(ctx, ox + 10.4, oy + 0.7, 4.8, 5, 29);
      framedDocument(ctx, ox + 6.6, oy, FLOOR_Z + 2.8, 2.8, 2.2, "PRINCIPLES");
      cabinet(ctx, ox + 1.0, oy + 3.4, true);
      rug(ctx, ox + 5.0, oy + 5.0, 6.0, 3.4, { r: 132, g: 112, b: 110 }, MAT.seal);
      sign(ctx, "READING ROOM", ox + 12.8, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("shelves", "the shelves", 3.2, 1.95, FACE_N, { kind: "rack", pose: "read", places: 2, spacing: 1.6, tags: ["work"] });
    L.stand("document", "the document", 8.0, 2.2, FACE_N, { kind: "board", pose: "read", tags: ["rest"] });

    L.table("pages", "the table of pages", 5.8, 5.6, 4.4, 1.6, {
      per: 3, pose: "read", tags: ["work", "social"], tone: MAT.woodDark, chairTone: MAT.seal,
      top: (ctx, ox, oy) => {
        papers(ctx, ox + 6.4, oy + 6.0, 4, 7, FLOOR_Z + 0.9);
        papers(ctx, ox + 7.7, oy + 5.9, 3, 9, FLOOR_Z + 0.9);
        books(ctx, ox + 8.9, oy + 6.3, 3, 4, FLOOR_Z + 0.9);
      },
    });

    L.desk("desk-w", "the west desk", 3.0, 9.6, FACE_N, { screens: 1, seed: 31, tone: MAT.wood, lamp: true });
    L.desk("desk-e", "the east desk", 12.4, 9.6, FACE_N, { screens: 2, seed: 32, tone: MAT.wood });

    // By the fire: two armchairs and a low table.
    L.draw((ctx, ox, oy) => {
      fireplace(ctx, ox + 14.9, oy + 4.8, FACE_W);
      lowTable(ctx, ox + 12.9, oy + 4.3, 0.9, 1.0);
    });
    L.sofa("fire", "the chairs by the fire", 11.6, 4.8, FACE_E, 2, { tone: MAT.seal, tags: ["social", "rest"] });

    L.draw((ctx, ox, oy) => {
      bridgeModel(ctx, ox + 3.6, oy + 12.0);
      plant(ctx, ox + 14.6, oy + 1.8, 1.3);
      plant(ctx, ox + 5.2, oy + 9.2, 1.0);
      motes(ctx, ox + 1, oy + 1, 14, 11, 30);
    });

    L.base({ rest: [11.6, 12.0], front: [8.0, 9.4] });
    L.lamp(8.0, 6.4, { power: 1.35, radius: 7.8, style: "shade" });
    L.lamp(3.0, 8.8, { power: 0.66, radius: 4.2, style: "shade" });
    L.lamp(13.6, 4.8, { power: 0.8, radius: 4.5, tint: MAT.lamp, style: "none" });
  },
});
