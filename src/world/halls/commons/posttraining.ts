import { VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { shelf } from "../../props/furniture";
import { chalkboard, globe, lectern } from "../../props/commons";
import { plant, poster, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

const WEST = [1.6, 3.2, 4.8];
const EAST = [11.2, 12.8, 14.4];
const ROWS = [4.6, 6.4, 8.2];

/**
 * The classroom. A raw pretrained model knows a great deal and cannot yet
 * hold a conversation; this is where it is shown how. The lessons on the
 * boards are demonstrations — a question, and the answer somebody wanted.
 */
export const posttraining = defineHall({
  id: "posttraining",
  name: "Post-training",
  plaque: "POST-TRAINING",
  kind: "commons",
  tagline: "The classroom",
  ethos: "A pretrained model has read everything and been asked nothing. Teach it to answer.",
  blurb:
    "Two boards of lessons, eighteen desks, a lectern. The front desk on the west side is kept for the day's run, which sits its first lesson here after lunch.",
  reading:
    "Supervised fine-tuning, drawn as a school. The boards hold demonstrations: questions, and the answers somebody wanted to see. The bigger models from the labs come in the afternoon to teach at the boards, and the smaller ones sit at the desks to learn from them, which is roughly how distillation works.",
  facts: [
    { label: "Pipeline", value: "Step three of six" },
    { label: "Taught by", value: "Visiting flagships" },
    { label: "The run is here", value: "Noon to two" },
  ],
  accent: VIOLET,
  floor: { tone: { r: 176, g: 168, b: 156 }, pattern: "plank", alt: { r: 156, g: 148, b: 136 } },
  people: [],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      chalkboard(ctx, ox + 0.8, oy, 4.8, ["LESSON ONE", "Q  WHAT IS 7 X 8", "A  56", "Q  WHO WROTE HAMLET", "A  SHAKESPEARE"]);
      chalkboard(ctx, ox + 10.4, oy, 4.8, ["HOUSE RULES", "BE HELPFUL", "BE HONEST", "SAY SO WHEN UNSURE", "SHOW YOUR WORKING"]);
      lectern(ctx, ox + 3.2, oy + 2.95, FACE_S);
    });
    L.stand("board-w", "the lesson board", 3.2, 1.5, FACE_N, { kind: "board", pose: "write", tags: ["teach"] });
    L.stand("board-e", "the rules board", 12.6, 1.5, FACE_N, { kind: "board", pose: "write", tags: ["teach"] });
    L.stand("lectern", "the lectern", 3.2, 2.3, FACE_S, { kind: "stage", pose: "present", tags: ["teach"] });

    // The front desk on the west side is the run's; everything else is a class.
    L.desk("learner", "the front desk", 4.8, 4.6, FACE_N, { style: "school", approach: "side", pose: "read", tags: ["pod"], chair: MAT.seal });
    const seats: [number, number, number][] = [];
    for (const y of ROWS) {
      for (const x of [...WEST, ...EAST]) {
        if (x === 4.8 && y === 4.6) continue;
        seats.push([x, y, FACE_N]);
      }
    }
    L.deskGroup("desks", "a desk in the class", seats, { style: "school", approach: "side", pose: "read", tags: ["learn"] });

    L.draw((ctx, ox, oy) => {
      shelf(ctx, ox + 1.6, oy + 11.9, 4.0, 3, 61);
      shelf(ctx, ox + 10.4, oy + 11.9, 4.0, 3, 67);
      globe(ctx, ox + 1.1, oy + 2.4);
      poster(ctx, ox + 6.4, oy + 0.6, FLOOR_Z + 3.4, 1.4, 1.0, 5, [MAT.lamp, MAT.lamp, MAT.paper]);
      plant(ctx, ox + 14.2, oy + 12.15, 1.0);
      sign(ctx, "CLASSROOM", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });

    L.stand("rest", "the corridor", 12.4, 10.6, FACE_S, { kind: "rest", places: 3, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, 0, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, Math.PI, { kind: "door", tags: ["rest"] });

    L.lamp(3.2, 5.8, { power: 1.1, radius: 6.5, style: "shade" });
    L.lamp(12.8, 5.8, { power: 1.1, radius: 6.5, style: "shade" });
    L.lamp(8.0, 10.2, { power: 0.7, radius: 5, style: "globe" });
  },
});
