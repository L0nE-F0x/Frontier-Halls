import { AMBER, GREEN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { rollingBoard, seatBench } from "../../props/furniture";
import { crate } from "../../props/fixtures";
import { longCat, pickupLockers, scooter } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_S, FACE_W } from "../layout";

/**
 * LongCat 2.0 from the index, LongCat Flash by hand. A lab inside a company
 * that delivers food to a great many doors a day, named after a cat.
 */
export const meituan = defineHall({
  id: "meituan",
  name: "Meituan",
  plaque: "MEITUAN",
  kind: "lab",
  city: "Beijing",
  region: "China",
  tagline: "The dispatch office",
  ethos: "Get the right thing to the right door, a great many times a day.",
  blurb:
    "Three yellow scooters parked in a row with their boxes on the back, a wall of pickup lockers, a board of today's orders, and a cat along the bench by the west wall that is much longer than a cat.",
  reading:
    "The company is a delivery network, and the hall is its dispatch office: the scooters by the east wall, the lockers where orders wait, a board of routes. Somebody in the lab named its model LongCat, and the cat is on the bench by the west wall, all of it.",
  facts: [
    { label: "House style", value: "Right door, right time" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the bench", value: "A long cat" },
  ],
  accent: AMBER,
  floor: { tone: { r: 178, g: 172, b: 158 }, pattern: "tile", alt: { r: 154, g: 148, b: 136 } },
  people: [
    {
      id: "flagship",
      name: "LongCat 2.0",
      role: "The long one",
      tier: "Flagship",
      doing: "Keeps the desk by the scooters and works out routes nobody else could.",
      why: "{short} is Meituan's own model, from a company that has to decide where a great many riders go next, all day. It keeps the desk nearest the scooters.",
      chips: ["Flagship", "Mixture of experts", "Agentic"],
      accent: AMBER,
      scale: 1.02,
      home: "desk",
      haunts: ["board", "scooters", "cat"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.5, pace: 0.95 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "flash",
      name: "LongCat Flash",
      role: "Quick, and on the move",
      tier: "Fast",
      doing: "Walks between the scooters and the lockers, checking orders.",
      why: "{short} is the fast line of the family, built for the kind of quick decision a delivery network makes a million times a day.",
      chips: ["Fast", "Agentic", "Open weights"],
      accent: GREEN,
      scale: 0.86,
      home: "scooters",
      haunts: ["lockers", "board", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.7, focus: 0.15, sociability: 0.8, range: 1.7 },
      carries: "parcel",
      look: { outfit: "vest", hair: "cap" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      pickupLockers(ctx, ox + 0.8, oy + 0.7, 4.6);
      for (const x of [11.4, 12.6, 13.8]) scooter(ctx, ox + x, oy + 2.4, FACE_S, MAT.lamp);
      crate(ctx, ox + 14.4, oy + 4.2, 0.7, 2, MAT.lamp);
      sign(ctx, "DISPATCH", ox + 12.6, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("lockers", "the lockers", 3.1, 1.9, FACE_N, { kind: "rack", pose: "read", places: 2, spacing: 1.6, tags: ["work"] });
    L.stand("scooters", "the scooters", 12.6, 4.0, FACE_N, { kind: "floor", pose: "read", places: 2, spacing: 1.2, tags: ["work"] });

    L.draw((ctx, ox, oy) => rollingBoard(ctx, ox + 1.2, oy + 5.2, FACE_E, 1.8, 211, "ORDERS"));
    L.stand("board", "the board of orders", 1.95, 5.2, FACE_W, { kind: "board", pose: "write", tags: ["work"] });

    L.desk("desk", "the desk by the scooters", 11.8, 7.8, FACE_N, { screens: 2, seed: 213 });

    // The bench and the cat on it. The cat has the east end; there is room
    // for two at the west end.
    L.draw((ctx, ox, oy) => {
      seatBench(ctx, ox + 3.6, oy + 8.0, 4.0, FACE_S, MAT.wood);
      longCat(ctx, ox + 3.4, oy + 8.0, 1.6);
    });
    L.places("cat", "the bench with the cat", "lounge", [[2.1, 8.0, FACE_S], [2.8, 8.0, FACE_S]], { pose: "sit", seat: 0.46, tags: ["social", "rest"] });

    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
      plant(ctx, ox + 14.8, oy + 11.8, 1.2);
    });

    L.base({ rest: [12.0, 10.6], front: [3.0, 12.1], east: false });
    L.lamp(12.6, 4.6, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(4.0, 6.0, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(9.0, 10.0, { power: 0.8, radius: 5, style: "globe" });
  },
});
