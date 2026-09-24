import { AMBER, CYAN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { banner, shelfY, stool } from "../../props/furniture";
import { chalkboard, lectern } from "../../props/commons";
import { teaTable } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

/**
 * Zhipu, which publishes as Z.ai: GLM 5.3 Prime, GLM 5.3 and GLM 5.3 Flash,
 * from the index. A university lab that became a company, and the hall is
 * still a seminar room.
 */
export const zai = defineHall({
  id: "zai",
  name: "Z.ai",
  plaque: "Z.AI",
  kind: "lab",
  city: "Beijing",
  region: "China",
  tagline: "The seminar room",
  ethos: "A general language model, built in the open and argued over in front of a blackboard.",
  blurb:
    "Two blackboards covered in working, a lectern, two long seminar tables facing them, shelves down the west wall, and a tea table by the east door.",
  reading:
    "The lab came out of a university and never quite left: the hall is a seminar room, the flagship lectures from the front, and the smaller models take notes at the long tables. GLM is the family's name — a General Language Model — and all three sizes of it are in the room.",
  facts: [
    { label: "House style", value: "The seminar" },
    { label: "In the hall", value: "{roster}" },
    { label: "Open weights", value: "Much of the family" },
  ],
  accent: RED,
  floor: { tone: { r: 168, g: 162, b: 150 }, pattern: "plank", alt: { r: 144, g: 138, b: 128 } },
  people: [
    {
      id: "prime",
      name: "GLM 5.3 Prime",
      role: "The top of the family",
      tier: "Flagship",
      doing: "Lectures from the front, then goes back to its desk to check the working.",
      why: "{short} is the largest of the line, the one the lab puts forward when it is asked what it can do. It gives the seminar.",
      chips: ["Flagship", "Reasoning", "Agentic"],
      accent: RED,
      scale: 1.04,
      home: "desk-1",
      haunts: ["lectern", "boards", "tea"],
      interests: ["teach", "visit"],
      traits: { focus: 0.86, sociability: 0.5, pace: 0.9 },
      look: { outfit: "suit", hair: "short", acc: ["glasses"] },
    },
    {
      id: "main",
      name: "GLM 5.3",
      role: "The everyday model",
      tier: "Balanced",
      doing: "Works at the second desk and answers the questions from the tables.",
      why: "{short} is the version most people use: the same family, at a price that can be run all day.",
      chips: ["General use", "Open weights", "Tool use"],
      accent: AMBER,
      scale: 0.96,
      home: "desk-2",
      haunts: ["seminar-b", "boards", "rest"],
      traits: { pace: 1.1, focus: 0.5, sociability: 0.65, range: 1.3 },
      carries: "papers",
      look: { outfit: "vest", hair: "long" },
    },
    {
      id: "flash",
      name: "GLM 5.3 Flash",
      role: "Fast, and takes notes",
      tier: "Fast",
      doing: "Sits at the seminar table taking notes faster than anyone else in the room.",
      why: "{short} is the quick, cheap end of the family. At a seminar it is the one with the full set of notes.",
      chips: ["Low latency", "Cheap", "High volume"],
      accent: CYAN,
      scale: 0.82,
      home: "seminar-a",
      haunts: ["seminar-b", "tea", "front", "door-w"],
      interests: ["learn", "exam"],
      traits: { pace: 1.6, focus: 0.3, sociability: 0.75, range: 1.6 },
      look: { outfit: "hoodie", hair: "bun" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      chalkboard(ctx, ox + 0.9, oy, 5.4, ["GLM", "P(X) = PRODUCT P(XI | X<I)", "ATTN = SOFTMAX(QK/D)V", "LOSS FALLS AS 1/N^A"], FLOOR_Z + 1.3);
      chalkboard(ctx, ox + 9.7, oy, 5.4, ["SEMINAR 14", "WHAT IS A TOKEN", "WHY DOES SCALE WORK", "WHAT DOES IT KNOW"], FLOOR_Z + 1.3);
      lectern(ctx, ox + 8.0, oy + 2.85, FACE_S);
      shelfY(ctx, ox + 0.65, oy + 3.4, 4.6, 5, 121);
      banner(ctx, ox + 7.3, oy + 0.66, FLOOR_Z + 3.6, 1.4, 1.9, MAT.red, "GLM");
      sign(ctx, "SEMINAR", ox + 12.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("boards", "the blackboards", 3.6, 1.55, FACE_N, { kind: "board", pose: "write", places: 2, spacing: 1.4, tags: ["work", "teach"] });
    L.stand("lectern", "the lectern", 8.0, 2.2, FACE_S, { kind: "stage", pose: "present", tags: ["teach"] });

    L.table("seminar-a", "the west seminar table", 1.8, 4.3, 5.0, 0.9, { sides: "south", per: 4, pose: "read", tags: ["work", "learn", "social"], tone: MAT.wood });
    L.table("seminar-b", "the east seminar table", 9.2, 4.3, 5.0, 0.9, { sides: "south", per: 4, pose: "read", tags: ["work", "learn", "social"], tone: MAT.wood });

    L.desk("desk-1", "the front desk", 4.2, 8.4, FACE_N, { screens: 2, seed: 121, tone: MAT.wood });
    L.desk("desk-2", "the second desk", 11.8, 8.4, FACE_N, { screens: 1, seed: 123, tone: MAT.wood });

    L.draw((ctx, ox, oy) => {
      teaTable(ctx, ox + 12.4, oy + 11.0);
      for (const [x, y] of [[11.3, 11.0], [13.5, 11.0]]) stool(ctx, ox + x, oy + y, MAT.woodDark, 0.44);
      plant(ctx, ox + 5.0, oy + 12.0, 1.1);
    });
    L.places("tea", "the tea table", "table", [[11.3, 11.0, 0], [13.5, 11.0, Math.PI]], { pose: "eat", seat: 0.44, tags: ["social"] });

    L.base({ rest: [8.0, 9.9], front: [3.0, 12.1] });
    L.lamp(4.2, 6.0, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(11.8, 6.0, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(12.4, 10.8, { power: 0.7, radius: 4, style: "lantern", tint: MAT.red });
  },
});
