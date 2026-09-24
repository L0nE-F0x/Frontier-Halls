import { AMBER, GREEN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { cushion, rug } from "../../props/furniture";
import { dallah, falconPerch, mashrabiya } from "../../props/heroes-west";
import { palm, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/**
 * The Technology Innovation Institute, which makes Falcon. Not on the index
 * the roster reads, so its seats are held by hand.
 */
export const tii = defineHall({
  id: "tii",
  name: "TII",
  plaque: "TII",
  kind: "lab",
  city: "Abu Dhabi",
  region: "United Arab Emirates",
  tagline: "The majlis",
  ethos: "Build the frontier at home, in the open, and in Arabic as well as English.",
  blurb:
    "Carved lattice screens either side of a sitting room with cushions round a carpet and a coffee pot on the low table, a falcon on its perch, and date palms in the corners.",
  reading:
    "The government institute in Abu Dhabi that makes the Falcon models, and one of the first outside America or China to put a large model's weights out in the open. The middle of the hall is a majlis — the room where guests are received — screened by lattice. The falcon is the national bird, and on the models' name.",
  facts: [
    { label: "House style", value: "Open, and in Arabic" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the perch", value: "A falcon" },
  ],
  accent: GREEN,
  floor: { tone: { r: 186, g: 176, b: 158 }, pattern: "stone", alt: { r: 164, g: 152, b: 134 } },
  people: [
    {
      id: "h1",
      name: "Falcon-H1",
      role: "The hybrid",
      tier: "Flagship",
      doing: "Receives visitors in the majlis, then goes back to its desk by the west screen.",
      why: "{short} is the institute's hybrid line, which mixes attention with a state-space model to do more with less. It is also the host of the room.",
      chips: ["Hybrid architecture", "Open weights", "Efficient"],
      accent: GREEN,
      scale: 1.02,
      home: "desk-1",
      haunts: ["majlis", "perch"],
      interests: ["teach", "visit"],
      traits: { focus: 0.8, sociability: 0.7, pace: 0.9 },
      look: { outfit: "coat", hair: "short" },
    },
    {
      id: "arabic",
      name: "Falcon Arabic",
      role: "Speaks the region's language",
      tier: "Language",
      doing: "Works the east desk and pours the coffee when anyone sits down in the majlis.",
      why: "{short} is built for Arabic first, in its dialects as well as its standard form: a model for the people nearest the institute.",
      chips: ["Arabic", "Dialects", "Open weights"],
      accent: AMBER,
      scale: 0.94,
      home: "desk-2",
      haunts: ["majlis", "perch", "rest"],
      traits: { pace: 1.1, focus: 0.5, sociability: 0.8, range: 1.3 },
      look: { outfit: "coat", hair: "bald", acc: ["scarf"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      mashrabiya(ctx, ox + 5.2, oy + 1.8, 3.8, "y", 2.6);
      mashrabiya(ctx, ox + 10.7, oy + 1.8, 3.8, "y", 2.6);
      rug(ctx, ox + 6.2, oy + 2.4, 3.6, 3.0, { r: 150, g: 112, b: 100 }, MAT.lamp);
      ctx.p.box(ox + 7.4, oy + 3.5, FLOOR_Z, 1.2, 0.8, 0.3, MAT.woodDark, { top: MAT.wood });
      ctx.nav?.blockRect(ox + 7.4, oy + 3.5, 1.2, 0.8, 0.04);
      dallah(ctx, ox + 8.0, oy + 3.9, FLOOR_Z + 0.3);
      for (const [x, y] of [[6.5, 3.9], [9.5, 3.9], [7.3, 5.0], [8.7, 5.0]] as const) cushion(ctx, ox + x, oy + y, MAT.red);
      falconPerch(ctx, ox + 13.4, oy + 3.4);
      sign(ctx, "FALCON", ox + 3.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.places("majlis", "the majlis", "lounge", [
      [6.5, 3.9, FACE_E], [9.5, 3.9, FACE_W], [7.3, 5.0, FACE_N], [8.7, 5.0, FACE_N],
    ], { pose: "eat", seat: 0.14, tags: ["social", "rest"] });
    L.stand("perch", "the falcon's perch", 13.4, 4.6, FACE_N, { kind: "frame", pose: "watch", tags: ["rest"] });

    L.desk("desk-1", "the west desk", 2.8, 7.6, FACE_N, { screens: 2, seed: 231, tone: MAT.wood });
    L.desk("desk-2", "the east desk", 12.6, 7.6, FACE_N, { screens: 1, seed: 233, tone: MAT.wood });

    L.draw((ctx, ox, oy) => {
      palm(ctx, ox + 1.2, oy + 1.4, 1.1);
      palm(ctx, ox + 14.8, oy + 1.4, 1.0);
      palm(ctx, ox + 3.8, oy + 11.8, 0.9);
    });

    L.base({ rest: [12.4, 10.8], front: [11.8, 12.1] });
    for (const [x, y] of [[8.0, 4.0], [2.8, 6.6], [12.6, 6.6]]) {
      L.lamp(x, y, { power: 0.9, radius: 5.5, tint: MAT.lamp, style: "lantern" });
    }
  },
});
