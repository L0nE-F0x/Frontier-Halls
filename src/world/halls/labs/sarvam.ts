import { AMBER, GREEN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { cushion, lowTable } from "../../props/furniture";
import { bubbleWall, chaiStall, rangoli } from "../../props/heroes-west";
import { vocalBooth } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/**
 * Sarvam: not on the index the roster reads, so its seats are held by hand.
 * A lab building models for India's languages, all of them.
 */
export const sarvam = defineHall({
  id: "sarvam",
  name: "Sarvam",
  plaque: "SARVAM",
  kind: "lab",
  city: "Bengaluru",
  region: "India",
  tagline: "Twenty-two languages",
  ethos: "Build for everyone in the country, in the language they actually speak.",
  blurb:
    "A rangoli laid on the floor inside the north door, a wall of speech bubbles in every colour on the sheet, a recording booth, and a chai counter with the kettle on.",
  reading:
    "India has twenty-two scheduled languages and hundreds more, and most models are good at one of them. This lab builds for the rest. The bubbles on the wall are the languages, one each; the booth is for the voice model, which speaks them. The rangoli at the door is redrawn every morning in the real place and has not been here.",
  facts: [
    { label: "House style", value: "Every language" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the wall", value: "Twenty-two bubbles" },
  ],
  accent: AMBER,
  floor: { tone: { r: 180, g: 170, b: 156 }, pattern: "stone", alt: { r: 158, g: 146, b: 132 } },
  people: [
    {
      id: "sarvam",
      name: "Sarvam-M",
      role: "The lab's reasoning model",
      tier: "Flagship",
      doing: "Keeps the west desk and answers in whichever language it was asked in.",
      why: "{short} is the lab's main model, trained to reason in Indian languages as well as English, which few models do well.",
      chips: ["Indic languages", "Reasoning", "Open weights"],
      accent: AMBER,
      scale: 1.0,
      home: "desk-1",
      haunts: ["bubbles", "chai", "low-table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.82, sociability: 0.6, pace: 0.95 },
      look: { outfit: "vest", hair: "short", acc: ["glasses"] },
    },
    {
      id: "translate",
      name: "Sarvam-Translate",
      role: "Between any two of them",
      tier: "Translation",
      doing: "Works the east desk with a page in one language and a page in another.",
      why: "{short} translates between the country's languages, not just to and from English — the case most translation leaves out.",
      chips: ["Translation", "Indic languages", "Long documents"],
      accent: GREEN,
      scale: 0.94,
      home: "desk-2",
      haunts: ["bubbles", "chai", "rest"],
      traits: { pace: 1.1, focus: 0.6, sociability: 0.6, range: 1.3 },
      carries: "papers",
      look: { outfit: "dress", hair: "long" },
    },
    {
      id: "bulbul",
      name: "Bulbul",
      role: "The voice",
      tier: "Speech",
      doing: "Stands at the microphone in the booth and says everything twice, in two languages.",
      why: "{short} is the speech model, named for a songbird: text in, a voice out, in the languages the rest of the lab reads.",
      chips: ["Text to speech", "Indic voices", "Natural"],
      accent: VIOLET,
      scale: 0.88,
      home: "booth",
      haunts: ["chai", "low-table", "front"],
      traits: { pace: 1.2, focus: 0.5, sociability: 0.8, range: 1.4 },
      look: { outfit: "tee", hair: "curly", acc: ["headphones"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      rangoli(ctx, ox + 8.0, oy + 3.0, 1.2, 2);
      bubbleWall(ctx, ox + 0.8, oy, 4.8, 22);
      vocalBooth(ctx, ox + 10.8, oy + 0.8, ctx.clock.hour > 9 && ctx.clock.hour < 18);
      chaiStall(ctx, ox + 12.8, oy + 4.2);
      sign(ctx, "SARVAM", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("bubbles", "the wall of bubbles", 3.2, 1.8, FACE_N, { kind: "board", pose: "read", places: 2, spacing: 1.6, tags: ["rest"] });
    L.stand("booth", "the booth", 11.8, 2.15, FACE_N, { kind: "stage", pose: "present", tags: ["work"] });
    L.stand("chai", "the chai counter", 13.6, 5.6, FACE_N, { kind: "counter", pose: "stand", places: 2, spacing: 1.0, tags: ["social", "coffee"] });

    L.desk("desk-1", "the west desk", 3.4, 7.2, FACE_N, { screens: 2, seed: 271, tone: MAT.wood });
    L.desk("desk-2", "the east desk", 11.2, 8.0, FACE_N, { screens: 2, seed: 273, tone: MAT.wood });

    // A low table with cushions round it, for anyone who would rather sit on the floor.
    L.draw((ctx, ox, oy) => {
      lowTable(ctx, ox + 3.1, oy + 10.2, 1.2, 0.8, MAT.woodDark);
      for (const [x, y] of [[2.5, 10.6], [4.9, 10.6]] as const) cushion(ctx, ox + x, oy + y, MAT.lamp);
      plant(ctx, ox + 8.6, oy + 12.0, 1.1);
      plant(ctx, ox + 13.4, oy + 12.1, 1.0);
    });
    L.places("low-table", "the low table", "lounge", [[2.5, 10.6, FACE_E], [4.9, 10.6, FACE_W]], { pose: "eat", seat: 0.14, tags: ["social"] });

    L.base({ rest: [12.2, 10.8], front: [8.0, 11.2] });
    for (const [x, y] of [[3.4, 6.2], [11.2, 6.4], [8.0, 9.4]]) L.lamp(x, y, { power: 0.9, radius: 5.8, tint: MAT.lamp, style: "lantern" });
  },
});
