import { AMBER, CYAN, SLATE } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { countdown } from "../../props/commons";
import { crate, pallet } from "../../props/fixtures";
import { shipBell } from "../../props/heroes-west";
import { floorTape, plant, sign } from "../../props/objects";
import { rackSide, rackWall } from "../kit";
import { defineHall, FACE_N } from "../layout";

/** The GPT-6 family, from the index. The gated cyber model is not in the hall. */
export const openai = defineHall({
  id: "openai",
  name: "OpenAI",
  plaque: "OPENAI",
  kind: "lab",
  city: "San Francisco",
  region: "United States",
  tagline: "The shipping floor",
  ethos: "Turn a capable model into something people can use, and offer it broadly.",
  blurb:
    "Racks down the west wall and along the north, a marked bay by the door, tape on the floor, a countdown to the next ship on the wall, and a brass bell on a post that is rung when something goes out.",
  reading:
    "The busiest plan in the building, arranged around throughput: the bay by the east door is for things leaving, the tape marks where they wait, and the countdown on the north wall is always counting down to something. The bell swings at the top of the hour, which in this hall is not much of an exaggeration.",
  facts: [
    { label: "House style", value: "Ship it broadly" },
    { label: "In the hall", value: "{roster}" },
    { label: "Not in the hall", value: "The gated cyber model" },
  ],
  accent: AMBER,
  floor: { tone: { r: 178, g: 168, b: 152 }, pattern: "concrete", alt: { r: 152, g: 142, b: 128 } },
  people: [
    {
      id: "flagship",
      name: "GPT-6 Astra",
      role: "Top of the line",
      tier: "Flagship",
      doing: "Stays at the desk under the warm lamp with one long problem.",
      why: "{short} is the top of the line. The deep work is gathered in the one warm pool of light.",
      chips: ["Flagship", "Reasoning", "Multimodal"],
      accent: AMBER,
      scale: 1.05,
      home: "desk",
      haunts: ["table", "bell"],
      interests: ["teach", "visit"],
      traits: { focus: 0.9, sociability: 0.45, pace: 0.92 },
      look: { outfit: "tee", hair: "short" },
    },
    {
      id: "balanced",
      name: "GPT-6 Sol",
      role: "Everyday work",
      tier: "Balanced",
      doing: "Walks the racks and checks each row.",
      why: "{short} is the balanced tier for ordinary work, so it is the one keeping the rows in order.",
      chips: ["Balanced", "General use", "Tool use"],
      accent: AMBER,
      scale: 0.97,
      home: "racks",
      haunts: ["side-racks", "bay", "rest", "table"],
      traits: { pace: 1.1, focus: 0.3, sociability: 0.66, range: 1.3 },
      carries: "slate",
      look: { outfit: "hoodie", hair: "crop" },
    },
    {
      id: "fast",
      name: "GPT-6 Luna",
      role: "Fast and low-cost",
      tier: "Fast",
      doing: "Covers the floor faster than the others and rings the bell when nobody is looking.",
      why: "{short} is the fast, inexpensive tier. The short jobs move with it.",
      chips: ["Cheapest tier", "Low latency", "High volume"],
      accent: CYAN,
      scale: 0.82,
      home: "bay",
      haunts: ["bell", "door-e", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.8, focus: 0.08, sociability: 0.8, range: 1.8 },
      carries: "papers",
      look: { outfit: "vest", hair: "bun" },
    },
  ],
  layout(L) {
    rackSide(L, "side-racks", 0.9, 1.0, 6.8, 4, "e", "W", { height: 4.6, places: 2 });
    rackWall(L, "racks", 10.4, 4.8, 3, "S", { height: 5.0, places: 2 });
    L.draw((ctx, ox, oy) => {
      countdown(ctx, ox + 3.2, oy, FLOOR_Z + 3.6, ctx.clock.minutes);
      sign(ctx, "SHIPPING", ox + 4.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
      floorTape(ctx, ox + 2.4, oy + 10.2, 11.0, 2.0, MAT.lamp, true);
    });

    L.desk("desk", "the desk under the lamp", 6.2, 5.6, FACE_N, { screens: 2, seed: 41, mug: SLATE, chair: MAT.black });
    L.table("table", "the ship list", 3.4, 8.0, 3.2, 1.1, { per: 3, pose: "read", tags: ["social", "work"], chairTone: MAT.black });

    // The bay by the east door, and the bell.
    L.draw((ctx, ox, oy) => {
      floorTape(ctx, ox + 11.0, oy + 5.2, 3.6, 2.8, MAT.lamp);
      pallet(ctx, ox + 11.4, oy + 5.6);
      crate(ctx, ox + 11.5, oy + 5.7, 0.8, 2, MAT.bench);
      crate(ctx, ox + 13.0, oy + 5.7, 0.72, 1, MAT.bench);
      shipBell(ctx, ox + 9.4, oy + 7.8);
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
    });
    L.stand("bay", "the shipping bay", 12.8, 8.6, FACE_N, { kind: "floor", pose: "read", tags: ["work"] });
    L.stand("bell", "the bell", 9.4, 8.6, FACE_N, { kind: "floor", pose: "watch", tags: ["rest"] });

    L.base({ rest: [12.4, 11.0], front: [3.4, 12.1], west: false });
    L.lamp(6.2, 5.2, { power: 1.3, radius: 7, style: "shade" });
    L.lamp(12.8, 7.2, { power: 0.8, radius: 5, style: "track" });
    L.lamp(3.4, 9.0, { power: 0.7, radius: 4.5, style: "shade" });
  },
});
