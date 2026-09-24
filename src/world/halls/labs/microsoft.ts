import { CYAN, GREEN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { chair, rollingBoard } from "../../props/furniture";
import { cockpit, fourSquare, paperclip } from "../../props/heroes-west";
import { plant, sign } from "../../props/objects";
import { rackWall } from "../kit";
import { defineHall, FACE_E, FACE_N, FACE_S, FACE_W } from "../layout";

/**
 * Phi, from the index, and MAI, Microsoft AI's own line, held by hand. The
 * racks along the north wall run a good deal more than the two models in the
 * room; the hall hosts other labs' work as well as its own.
 */
export const microsoft = defineHall({
  id: "microsoft",
  name: "Microsoft",
  plaque: "MICROSOFT",
  kind: "lab",
  city: "Redmond",
  region: "United States",
  tagline: "The host",
  ethos: "Put a copilot beside everyone who works, and run the machines the rest of the industry runs on.",
  blurb:
    "Four squares let into the floor by the door, a cockpit with two seats in the north-west corner, a long row of racks, and a paperclip two metres tall that nobody will say who made.",
  reading:
    "Microsoft trains its own models and hosts a great many other people's, and the hall reads as both: a row of racks that is longer than two figures need, and a cockpit where the figure in the right-hand seat is the copilot. The paperclip by the east door is older than anything else in the building.",
  facts: [
    { label: "House style", value: "A copilot for everyone" },
    { label: "In the hall", value: "{roster}" },
    { label: "Also runs", value: "Other labs' models" },
  ],
  accent: CYAN,
  floor: { tone: { r: 172, g: 172, b: 170 }, pattern: "carpet", alt: { r: 150, g: 150, b: 150 } },
  people: [
    {
      id: "mai",
      name: "MAI",
      role: "Microsoft AI's own line",
      tier: "Flagship",
      doing: "Sits in the right-hand seat of the cockpit and checks the instruments.",
      why: "{short} is the line Microsoft AI trains itself, beside the partner models it hosts. It sits in the copilot's seat, which is a joke the hall makes about itself.",
      chips: ["In-house", "Voice and text", "The copilot's seat"],
      accent: CYAN,
      scale: 1.02,
      home: "cockpit",
      haunts: ["desk-1", "board", "racks"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.5, pace: 0.95 },
      look: { outfit: "jacket", hair: "short", acc: ["badge"] },
    },
    {
      id: "phi",
      name: "Phi 4",
      role: "Small, and taught from textbooks",
      tier: "Small",
      doing: "Works the desk by the racks with a stack of textbooks it wrote itself.",
      why: "{short} is Microsoft's small open model, trained heavily on synthetic, textbook-like data to see how far a small model can be pushed by what it reads rather than how much.",
      chips: ["Open weights", "Small", "Synthetic data"],
      accent: GREEN,
      scale: 0.84,
      home: "desk-2",
      haunts: ["racks", "board", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.3, focus: 0.45, sociability: 0.6, range: 1.4 },
      carries: "papers",
      look: { outfit: "tee", hair: "curly", acc: ["glasses"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      cockpit(ctx, ox + 3.2, oy + 3.4, FACE_N);
      paperclip(ctx, ox + 13.8, oy + 3.0);
      fourSquare(ctx, ox + 6.3, oy + 8.8, 3.4);
      sign(ctx, "COPILOT", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    // Pilot on the left, copilot on the right, both facing the panel.
    L.draw((ctx, ox, oy) => {
      chair(ctx, ox + 2.6, oy + 3.5, FACE_N, MAT.black);
      chair(ctx, ox + 3.8, oy + 3.5, FACE_N, MAT.black);
    });
    L.station("cockpit", "the cockpit", "desk", [
      { x: 3.8, y: 3.5, face: FACE_N, ax: 3.8, ay: 4.25 },
      { x: 2.6, y: 3.5, face: FACE_N, ax: 2.6, ay: 4.25 },
    ], { pose: "type", seat: 0.54, tags: ["work"] });

    rackWall(L, "racks", 6.6, 6.2, 4, "AZ", { height: 4.6, places: 2 });

    L.desk("desk-1", "the east desk", 11.8, 7.0, FACE_N, { screens: 2, seed: 21, chair: MAT.black });
    L.desk("desk-2", "the desk by the racks", 8.8, 7.0, FACE_N, { screens: 1, seed: 23, chair: MAT.black });

    L.draw((ctx, ox, oy) => rollingBoard(ctx, ox + 14.6, oy + 6.2, FACE_W, 1.8, 29, "RESPONSIBLE AI"));
    L.stand("board", "the board", 13.85, 6.2, FACE_E, { kind: "board", pose: "write", tags: ["work"] });

    L.sofa("sofa", "the sofa", 3.2, 7.4, FACE_S, 3, { tone: MAT.cloth, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 4.9, oy + 12.1, 1.1);
      plant(ctx, ox + 12.2, oy + 12.1, 1.0);
    });

    L.base({ rest: [12.2, 10.6], front: [3.2, 12.1] });
    L.lamp(3.2, 5.4, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(10.4, 5.4, { power: 1.1, radius: 6.5, style: "globe" });
    L.lamp(8.0, 10.2, { power: 0.8, radius: 5, style: "globe" });
  },
});
