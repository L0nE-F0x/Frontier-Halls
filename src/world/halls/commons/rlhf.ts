import { AMBER, CYAN, GREEN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { dais, scoreboard } from "../../props/commons";
import { palm, sign } from "../../props/objects";
import type { PersonSpec } from "../../person";
import { defineHall, FACE_E, FACE_N, FACE_S, FACE_W } from "../layout";

const BOOTHS: [number, number, number][] = [
  [2.5, 2.8, FACE_W], [2.5, 4.8, FACE_W], [2.5, 6.8, FACE_W],
  [13.5, 2.8, FACE_E], [13.5, 4.8, FACE_E], [13.5, 6.8, FACE_E],
];

function rater(id: string, name: string, accent: typeof AMBER, skin: number, hair: "short" | "long" | "bun" | "curly"): PersonSpec {
  return {
    id,
    name,
    short: name,
    role: "Human rater",
    tier: "Staff",
    doing: "Reads two answers side by side and says which one is better.",
    why: "Reinforcement learning from human feedback starts with people. Two answers to the same prompt go up on the screens, a rater picks the better one, and thousands of those choices train a reward model that stands in for them. The raters are among the few people in the building.",
    chips: ["Human", "A or B", "Thousands a day"],
    accent,
    scale: 1,
    home: "booths",
    look: { outfit: "tee", hair, acc: ["headphones", "lanyard"], skin },
    hours: [8, 20],
    traits: { focus: 0.9, sociability: 0.5, pace: 0.95, appetite: 0.9 },
  };
}

/**
 * The studio. Booths where people choose between two answers, a scoreboard of
 * what they chose, and the dais the day's run stands on while it is judged.
 */
export const rlhf = defineHall({
  id: "rlhf",
  name: "RLHF Studio",
  plaque: "RLHF",
  kind: "commons",
  tagline: "A or B",
  ethos: "Nobody can write down what a good answer is. People can say which of two is better, and that is enough to learn from.",
  blurb:
    "Six booths with two screens each, marked A and B. The scoreboard keeps count of which side is winning and of the reward the day's run is earning from it.",
  reading:
    "Reinforcement learning from human feedback. Raters compare pairs of answers; a reward model learns their taste; the run is trained against the reward model. Between two and half past three the run stands on the dais in the middle while it happens. The sofas at the back are for models who come to watch their own kind being judged.",
  facts: [
    { label: "Pipeline", value: "Step four of six" },
    { label: "Raters", value: "Four, eight till eight" },
    { label: "The run is here", value: "Two till half past three" },
  ],
  accent: GREEN,
  floor: { tone: { r: 164, g: 160, b: 158 }, pattern: "carpet", alt: { r: 150, g: 146, b: 146 } },
  people: [],
  staff: [
    rater("rater-1", "Rater Ines", AMBER, 1, "long"),
    rater("rater-2", "Rater Tomas", CYAN, 3, "short"),
    rater("rater-3", "Rater Priya", VIOLET, 2, "bun"),
    rater("rater-4", "Rater Sam", GREEN, 0, "curly"),
  ],
  layout(L) {
    L.deskGroup("booths", "a rater's booth", BOOTHS, {
      style: "booth", labels: ["A", "B"], tags: ["rate", "staff"], chair: MAT.black, kind: "booth",
    });

    L.draw((ctx, ox, oy) => {
      scoreboard(ctx, ox + 9.9, oy, FLOOR_Z + 2.5, 5.4, 2.4, ctx.clock.minutes);
      dais(ctx, ox + 8.0, oy + 5.2, 0.95, 0.16, MAT.metal);
      sign(ctx, "A OR B", ox + 3.4, oy + 0.56, FLOOR_Z + 5.9, 0.06);
    });
    L.station("subject", "the dais", "stage", [{ x: 8.0, y: 5.2, face: FACE_S, ax: 8.0, ay: 6.9 }], {
      pose: "stand", lift: 0.16, tags: ["pod"],
    });
    L.places("watch", "the edge of the dais", "window", [
      [6.2, 5.2, FACE_E], [9.8, 5.2, FACE_W], [8.0, 7.4, FACE_N],
    ], { pose: "watch", tags: ["visit"] });

    L.sofa("sofa-w", "the west sofa", 3.6, 11.4, FACE_N, 3, { tags: ["visit", "social"], tone: MAT.cloth });
    L.sofa("sofa-e", "the east sofa", 12.4, 11.4, FACE_N, 3, { tags: ["visit", "social"], tone: MAT.cloth });

    L.draw((ctx, ox, oy) => {
      palm(ctx, ox + 5.4, oy + 11.6, 0.9);
      palm(ctx, ox + 10.6, oy + 11.6, 0.9);
    });

    L.stand("rest", "the corridor", 8.0, 10.2, FACE_S, { kind: "rest", places: 3, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, FACE_E, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, FACE_W, { kind: "door", tags: ["rest"] });

    L.lamp(2.6, 4.8, { power: 0.9, radius: 5, style: "track" });
    L.lamp(13.4, 4.8, { power: 0.9, radius: 5, style: "track" });
    L.lamp(8.0, 8.6, { power: 0.8, radius: 5.5, style: "globe" });
  },
});
