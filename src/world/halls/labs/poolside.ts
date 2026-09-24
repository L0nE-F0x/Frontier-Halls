import { CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { laptop } from "../../props/furniture";
import { lounger, parasol, pool } from "../../props/heroes-west";
import { palm, sign } from "../../props/objects";
import { defineHall, FACE_N } from "../layout";
import type { Spot } from "../types";

const LOUNGERS = [3.0, 4.6, 11.4, 13.0];

/** Laguna S and Laguna XS, from the index. The lab is called Poolside; so is the hall. */
export const poolside = defineHall({
  id: "poolside",
  name: "Poolside",
  plaque: "POOLSIDE",
  kind: "lab",
  city: "Paris",
  region: "France",
  tagline: "By the pool",
  ethos: "Train for code and nothing else, and see how far that goes.",
  blurb:
    "A swimming pool let into the floor, with a ladder and a board, loungers along its south side with a laptop on each, two striped parasols, and a desk at the deep end.",
  reading:
    "The lab is called Poolside, so the hall has a pool in it; nobody swims. It trains models for writing software and nothing else, which is either a narrow bet or a very focused one depending on who you ask by the water. The light off the surface moves on the ceiling in the evening.",
  facts: [
    { label: "House style", value: "Code, and only code" },
    { label: "In the hall", value: "{roster}" },
    { label: "Swimming", value: "Not observed" },
  ],
  accent: CYAN,
  floor: { tone: { r: 192, g: 190, b: 184 }, pattern: "tile", alt: { r: 164, g: 162, b: 156 } },
  people: [
    {
      id: "s",
      name: "Laguna S 2.1",
      role: "Writes the code",
      tier: "Coding",
      doing: "Works at the desk by the deep end with its feet nearly in the water.",
      why: "{short} is the lab's model for writing software, from a company that trains only for code. It works where it can see the pool.",
      chips: ["Coding", "Agentic", "Code only"],
      accent: CYAN,
      scale: 0.98,
      home: "desk",
      haunts: ["loungers", "rest"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.5, pace: 0.95 },
      look: { outfit: "tee", hair: "crop" },
    },
    {
      id: "xs",
      name: "Laguna XS 2.1",
      role: "The small one",
      tier: "Small",
      doing: "Lies on a lounger with a laptop and does quick work between swims it never takes.",
      why: "{short} is the small model of the line, quick enough to sit in an editor and suggest the next line as it is typed.",
      chips: ["Small", "Fast", "Completion"],
      accent: VIOLET,
      scale: 0.82,
      home: "loungers",
      haunts: ["desk", "front", "door-w"],
      interests: ["learn", "exam"],
      traits: { pace: 1.4, focus: 0.35, sociability: 0.75, range: 1.5 },
      look: { outfit: "vest", hair: "cap" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      pool(ctx, ox + 4.2, oy + 4.0, 7.4, 3.0);
      palm(ctx, ox + 1.2, oy + 2.6, 1.1);
      palm(ctx, ox + 14.8, oy + 5.4, 1.0);
      sign(ctx, "DEEP END", ox + 12.2, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.desk("desk", "the desk at the deep end", 13.0, 3.0, FACE_N, { style: "laptop", seed: 181, chair: MAT.white });

    // Loungers along the south of the pool, legs toward the water.
    L.draw((ctx, ox, oy) => {
      LOUNGERS.forEach((x, i) => {
        lounger(ctx, ox + x, oy + 9.6, FACE_N, i % 2 ? MAT.white : MAT.led);
        if (ctx.lod > 1) laptop(ctx, ox + x, oy + 9.05, FLOOR_Z + 0.4, FACE_N, i * 3);
      });
      parasol(ctx, ox + 3.8, oy + 11.3, MAT.led);
      parasol(ctx, ox + 12.2, oy + 11.3, MAT.lamp);
    });
    L.station("loungers", "a lounger", "lounge", LOUNGERS.map((x): Spot => ({ x, y: 9.6, face: FACE_N, ax: x + 0.62, ay: 9.6 })), {
      pose: "read", seat: 0.4, tags: ["social", "rest", "work"],
    });

    L.base({ rest: [8.0, 9.2], front: [8.0, 10.6] });
    L.lamp(8.0, 5.6, { power: 1.0, radius: 7, tint: MAT.water, style: "track" });
    L.lamp(3.8, 9.6, { power: 0.7, radius: 4.5, style: "none" });
    L.lamp(12.2, 9.6, { power: 0.7, radius: 4.5, style: "none" });
  },
});
