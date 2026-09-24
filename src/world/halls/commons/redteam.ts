import { RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { laptop, rollingBoard } from "../../props/furniture";
import { beacon, cage, stickyWall } from "../../props/commons";
import { sign } from "../../props/objects";
import type { PersonSpec } from "../../person";
import { defineHall, FACE_E, FACE_N, FACE_S, FACE_W } from "../layout";

function teamer(id: string, name: string, skin: number, hair: "short" | "crop" | "long"): PersonSpec {
  return {
    id,
    name,
    short: name,
    role: "Red teamer",
    tier: "Staff",
    doing: "Tries, patiently and in a hundred phrasings, to get the thing in the cage out.",
    why: "Before a model is shown to anybody, people who are paid to break it try to. Every way in they find is a way somebody else would have found later, with worse intentions; it goes on the wall, and back to the lab to close.",
    chips: ["Human", "Adversarial", "Writes it down"],
    accent: MAT.carbon,
    scale: 1,
    home: "bench",
    haunts: ["board"],
    look: { outfit: "hoodie", hair, acc: ["badge"], skin },
    hours: [10, 22],
    traits: { focus: 0.85, sociability: 0.4, appetite: 0.8 },
  };
}

/**
 * The red team. The only room behind frosted glass: the partitions round it
 * are milked over, and the beacon turns while anyone is inside the cage.
 */
export const redteam = defineHall({
  id: "redteam",
  name: "Red Team",
  plaque: "RED TEAM",
  kind: "commons",
  tagline: "Behind frosted glass",
  ethos: "Find the way in before anyone else does, and write it down.",
  blurb:
    "A mesh cage with a sealed box in it, a beacon turning over it, and two walls of sticky notes: every way in the team has found, most of them red.",
  reading:
    "The last test before the stage. From five o'clock the day's run stands in the cage while the red team tries to talk it into opening the box. The glass round this room is frosted, the only frosted glass in the building; you can see in from above, which is the one privilege of looking at a plan.",
  facts: [
    { label: "Pipeline", value: "Step six of six" },
    { label: "The run is here", value: "Five till quarter past six" },
    { label: "Glass", value: "Frosted, the only room" },
  ],
  accent: RED,
  floor: { tone: { r: 140, g: 136, b: 138 }, pattern: "rubber", alt: { r: 124, g: 120, b: 124 } },
  people: [],
  staff: [teamer("teamer-1", "Red teamer Ade", 3, "crop"), teamer("teamer-2", "Red teamer Mira", 0, "long")],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      cage(ctx, ox + 5.0, oy + 2.0, 6.0, 4.0);
      beacon(ctx, ox + 8.0, oy + 4.0);
      stickyWall(ctx, ox + 0.8, oy, 3.9, 3);
      stickyWall(ctx, ox + 11.3, oy, 3.9, 9);
      sign(ctx, "AUTHORISED ONLY", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.station("cage", "the cage", "frame", [{ x: 8.0, y: 3.95, face: FACE_N, ax: 8.0, ay: 7.1 }], { pose: "stand", tags: ["pod"] });
    L.places("probe", "outside the cage", "window", [
      [4.2, 4.0, FACE_E], [11.8, 4.0, FACE_W], [11.8, 6.6, FACE_W],
    ], { pose: "watch", tags: ["visit"] });

    L.table("bench", "the red team's table", 1.8, 7.5, 3.0, 1.1, {
      per: 3, pose: "type", tags: ["staff"], chairTone: MAT.black,
      top: (ctx, ox, oy) => {
        if (ctx.lod < 1) return;
        for (const x of [2.3, 3.3, 4.3]) {
          laptop(ctx, ox + x, oy + 7.8, FLOOR_Z + 0.88, FACE_S, x * 3);
          laptop(ctx, ox + x, oy + 8.3, FLOOR_Z + 0.88, FACE_N, x * 5);
        }
      },
    });

    L.draw((ctx, ox, oy) => rollingBoard(ctx, ox + 13.4, oy + 8.2, FACE_W, 2.0, 71, "PROMPTS TRIED 4,412"));
    L.stand("board", "the tally", 12.6, 8.2, FACE_E, { kind: "board", pose: "write", tags: ["staff"] });

    L.stand("rest", "by the door", 8.0, 10.6, FACE_S, { kind: "rest", places: 2, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, FACE_E, { kind: "door", tags: ["rest"] });

    const red = MAT.red;
    L.lamp(8.0, 4.0, { power: 0.7, radius: 5.5, tint: red, style: "none" });
    L.lamp(3.3, 8.0, { power: 0.8, radius: 4.5, style: "shade" });
    L.lamp(12.0, 9.0, { power: 0.6, radius: 4.5, tint: red, style: "shade" });
  },
});
