import { CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { chair } from "../../props/furniture";
import { chessTable, mainframe, quizPodium, thinkSign } from "../../props/heroes-west";
import { plant } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/**
 * Granite, from the index. The oldest company in the building by some way,
 * and the hall keeps two of its old wins on the floor: a chessboard and a
 * game-show podium.
 */
export const ibm = defineHall({
  id: "ibm",
  name: "IBM",
  plaque: "IBM",
  kind: "lab",
  city: "New York",
  region: "United States",
  tagline: "The long memory",
  ethos: "Build the dependable model a company can put in production and forget about.",
  blurb:
    "Mainframe cabinets with their tape reels turning, a boardroom table, a chessboard nobody has put away, a podium with a glowing face, and the word THINK over the door.",
  reading:
    "The one hall where the history is the furniture. The chessboard is for the machine that beat a world champion in 1997 and the podium for the one that won a quiz show in 2011; the word over the door has been on the company's walls for a hundred years. The models doing the work now are small and open, and made to be relied on.",
  facts: [
    { label: "House style", value: "Dependable, open, enterprise" },
    { label: "In the hall", value: "{roster}" },
    { label: "Over the door", value: "THINK" },
  ],
  accent: CYAN,
  floor: { tone: { r: 156, g: 158, b: 164 }, pattern: "carpet", alt: { r: 132, g: 134, b: 142 } },
  people: [
    {
      id: "granite",
      name: "Granite 4.2 8B",
      role: "Small, open, and dependable",
      tier: "Flagship",
      doing: "Keeps the desk by the mainframe and sits in on every meeting at the long table.",
      why: "{short} is IBM's open model: modest in size, licensed so a business can use it, and built to behave the same way every time.",
      chips: ["Open weights", "Enterprise", "Governed"],
      accent: CYAN,
      scale: 1.0,
      home: "desk-1",
      haunts: ["boardroom", "chess", "mainframe"],
      interests: ["teach", "visit"],
      traits: { focus: 0.9, sociability: 0.45, pace: 0.9 },
      look: { outfit: "suit", hair: "short", acc: ["glasses"] },
    },
    {
      id: "micro",
      name: "Granite 4.0 Micro",
      role: "Runs almost anywhere",
      tier: "Small",
      doing: "Carries notes from the boardroom to the mainframe and back.",
      why: "{short} is the smallest of the line, made to run on hardware a long way from any data centre.",
      chips: ["Tiny", "Edge", "Hybrid architecture"],
      accent: VIOLET,
      scale: 0.8,
      home: "desk-2",
      haunts: ["boardroom", "mainframe", "podium", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.6, focus: 0.2, sociability: 0.7, range: 1.6 },
      carries: "papers",
      look: { outfit: "vest", hair: "crop" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      mainframe(ctx, ox + 0.8, oy + 0.7, 3);
      mainframe(ctx, ox + 10.6, oy + 0.7, 3);
      thinkSign(ctx, ox + 8.0, oy, FLOOR_Z + 3.4);
    });
    L.stand("mainframe", "the mainframe", 2.8, 2.35, FACE_N, { kind: "rack", pose: "read", places: 2, spacing: 1.4, tags: ["work"] });

    L.draw((ctx, ox, oy) => {
      chessTable(ctx, ox + 3.8, oy + 5.2);
      chair(ctx, ox + 2.8, oy + 5.2, FACE_E, MAT.woodDark);
      chair(ctx, ox + 4.8, oy + 5.2, FACE_W, MAT.woodDark);
      quizPodium(ctx, ox + 13.0, oy + 4.6);
    });
    L.station("chess", "the chessboard", "table", [
      { x: 2.8, y: 5.2, face: FACE_E, ax: 2.15, ay: 5.2 },
      { x: 4.8, y: 5.2, face: FACE_W, ax: 5.45, ay: 5.2 },
    ], { pose: "read", seat: 0.54, tags: ["social"] });
    L.stand("podium", "the podium", 13.0, 5.8, FACE_N, { kind: "stage", pose: "present", tags: ["rest"] });

    L.table("boardroom", "the boardroom table", 8.8, 6.8, 3.6, 1.2, {
      per: 3, pose: "read", tags: ["social", "work"], tone: MAT.woodDark, chairTone: MAT.black,
    });

    L.desk("desk-1", "the desk by the mainframe", 3.0, 9.4, FACE_N, { screens: 2, seed: 151, tone: MAT.woodDark });
    L.desk("desk-2", "the east desk", 12.8, 11.1, FACE_N, { screens: 1, seed: 153, tone: MAT.woodDark });

    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 5.2, oy + 12.0, 1.1);
      plant(ctx, ox + 14.6, oy + 6.6, 1.2);
    });

    L.base({ rest: [11.2, 12.0], front: [3.4, 12.1] });
    L.lamp(3.8, 5.0, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(10.6, 7.2, { power: 1.1, radius: 6.5, style: "shade" });
  },
});
