import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { rollingBoard } from "../../props/furniture";
import { crate, pallet } from "../../props/fixtures";
import { conveyor, kivaPod, sphere } from "../../props/heroes-west";
import { floorTape, plant, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_S, FACE_W } from "../layout";

/**
 * Nova Premier, Nova 2 Lite and Nova Micro, from the index. Amazon also runs
 * the machines a good part of the building trains on; the hall is a sorting
 * floor with desks along it for that reason.
 */
export const amazon = defineHall({
  id: "amazon",
  name: "Amazon",
  plaque: "AMAZON",
  kind: "lab",
  city: "Seattle",
  region: "United States",
  tagline: "The fulfilment floor",
  ethos: "Start from the customer and work backwards, and treat every day as the first one.",
  blurb:
    "A conveyor down the middle of the hall carrying parcels past the desks, a drive unit hauling a shelf pod up and down its lane, and a glass dome of plants in the corner.",
  reading:
    "Laid out like a sorting floor because that is the company's own picture of itself: everything that comes in goes out again, faster. The dome in the north-east corner is the Spheres, the greenhouse at its Seattle headquarters, at the scale of a room. The sign on the north wall has said DAY 1 since the company was one room.",
  facts: [
    { label: "House style", value: "Work backwards" },
    { label: "In the hall", value: "{roster}" },
    { label: "Also runs", value: "Other labs' racks" },
  ],
  accent: AMBER,
  floor: { tone: { r: 164, g: 160, b: 152 }, pattern: "concrete", alt: { r: 138, g: 134, b: 128 } },
  people: [
    {
      id: "premier",
      name: "Nova Premier",
      role: "The top of the Nova line",
      tier: "Flagship",
      doing: "Keeps the long desk by the conveyor and signs off what goes out.",
      why: "{short} is the most capable of Amazon's own models, the one the smaller ones are distilled from. It keeps the desk where everything passes.",
      chips: ["Flagship", "Multimodal", "Teacher model"],
      accent: AMBER,
      scale: 1.03,
      home: "desk-1",
      haunts: ["board", "belt"],
      interests: ["teach", "visit"],
      traits: { focus: 0.88, sociability: 0.4, pace: 0.9 },
      look: { outfit: "vest", hair: "short", acc: ["badge"] },
    },
    {
      id: "lite",
      name: "Nova 2 Lite",
      role: "Everyday work, at scale",
      tier: "Workhorse",
      doing: "Walks the belt and picks off whatever the conveyor brings.",
      why: "{short} is the everyday model, priced to run on everything. It is the one on its feet.",
      chips: ["Low cost", "Multimodal", "High volume"],
      accent: CYAN,
      scale: 0.94,
      home: "belt",
      haunts: ["desk-2", "bay", "rest", "table"],
      traits: { pace: 1.25, focus: 0.3, sociability: 0.7, range: 1.4 },
      carries: "parcel",
      look: { outfit: "tee", hair: "cap", acc: ["lanyard"] },
    },
    {
      id: "micro",
      name: "Nova Micro",
      role: "Text only, and quick",
      tier: "Small",
      doing: "Runs between the dome and the bay with one thing at a time.",
      why: "{short} is the smallest of the line: text in, text out, as fast and as cheap as it can be.",
      chips: ["Text only", "Lowest latency", "Cheapest"],
      accent: VIOLET,
      scale: 0.8,
      home: "bay",
      haunts: ["dome", "belt", "door-e", "front"],
      traits: { pace: 1.7, focus: 0.1, sociability: 0.8, range: 1.8 },
      carries: "papers",
      look: { outfit: "hoodie", hair: "crop" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      conveyor(ctx, ox + 1.0, oy + 4.5, 8.6);
      kivaPod(ctx, ox + 2.0, oy + 2.2, ox + 9.2, 0.4);
      sphere(ctx, ox + 13.2, oy + 3.1, 1.6);
      sign(ctx, "DAY 1", ox + 5.6, oy + 0.56, FLOOR_Z + 3.4, 0.1, MAT.paper);
      sign(ctx, "FULFILMENT", ox + 11.0, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.stand("belt", "the conveyor", 8.2, 3.6, FACE_S, { kind: "bench", pose: "pour", places: 2, spacing: 1.6, tags: ["work"] });

    L.desk("desk-1", "the long desk", 3.0, 7.6, FACE_N, { screens: 2, tone: MAT.wood, seed: 3 });
    L.desk("desk-2", "the second desk", 5.8, 7.6, FACE_N, { screens: 1, tone: MAT.wood, seed: 5 });

    // The bay: pallets and parcels waiting to go.
    L.draw((ctx, ox, oy) => {
      floorTape(ctx, ox + 11.6, oy + 5.4, 3.6, 2.4, MAT.lamp);
      pallet(ctx, ox + 12.0, oy + 5.8);
      crate(ctx, ox + 12.1, oy + 5.9, 0.7, 3, MAT.bench);
      crate(ctx, ox + 13.5, oy + 6.0, 0.8, 2, MAT.bench);
    });
    L.stand("bay", "the bay", 13.2, 8.2, FACE_N, { kind: "floor", pose: "read", tags: ["work"] });
    L.stand("dome", "the dome", 11.2, 3.6, FACE_E, { kind: "window", pose: "watch", tags: ["rest"] });

    L.draw((ctx, ox, oy) => rollingBoard(ctx, ox + 1.2, oy + 9.6, FACE_E, 1.8, 7, "WORKING BACKWARDS"));
    L.stand("board", "the board", 1.95, 9.6, FACE_W, { kind: "board", pose: "write", tags: ["work"] });

    L.round("table", "the lunch table", 12.4, 10.2, 0.55, 3, { tone: MAT.wood, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 4.6, oy + 12.1, 1.1);
      plant(ctx, ox + 1.1, oy + 6.4, 1.2);
    });

    L.base({ rest: [4.4, 10.8], front: [2.4, 12.1], west: false });
    L.lamp(4.0, 6.0, { power: 1.2, radius: 7, style: "shade" });
    L.lamp(12.4, 6.6, { power: 1.0, radius: 6, style: "shade" });
  },
});
