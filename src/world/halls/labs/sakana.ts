import { AMBER, CYAN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { cushion } from "../../props/furniture";
import { aquarium, chabudai, shoji } from "../../props/heroes-east";
import { bonsai, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/**
 * Fugu Ultra v2, Fugu Max and Namazu, from the index: a pufferfish, another
 * pufferfish, and a catfish. Sakana means fish. The hall at the south-east
 * corner of the building, with the open frame in its east wall.
 */
export const sakana = defineHall({
  id: "sakana",
  name: "Sakana AI",
  plaque: "SAKANA",
  kind: "lab",
  city: "Tokyo",
  region: "Japan",
  tagline: "The aquarium",
  ethos: "Many small models, moving together, can be cleverer than one large one.",
  blurb:
    "A long tank of fish that turn as one along the north wall, a smaller tank for a pufferfish and a catfish, tatami underfoot, shoji screens, paper lanterns, and the open frame in the east wall.",
  reading:
    "Sakana is Japanese for fish, and the lab's founding idea came from watching schools of them: many simple things acting together, the way evolution and collective behaviour do. The models are named for fish too. The frame in the east wall is where the building ends, and where the day's model leaves once it has been shown.",
  facts: [
    { label: "House style", value: "The school, not the fish" },
    { label: "In the hall", value: "{roster}" },
    { label: "In the east wall", value: "The open frame" },
  ],
  accent: RED,
  floor: { tone: { r: 186, g: 180, b: 150 }, pattern: "tatami", alt: { r: 150, g: 144, b: 116 } },
  people: [
    {
      id: "ultra",
      name: "Fugu Ultra v2",
      role: "The pufferfish",
      tier: "Flagship",
      doing: "Works the west desk and spends its breaks watching the school turn.",
      why: "{short} is the lab's largest model, built from the lab's work on merging and evolving models rather than training one from nothing.",
      chips: ["Flagship", "Model merging", "Evolutionary"],
      accent: RED,
      scale: 1.02,
      home: "desk-1",
      haunts: ["tank", "chabudai", "screens"],
      interests: ["teach", "visit"],
      traits: { focus: 0.82, sociability: 0.5, pace: 0.9 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "max",
      name: "Fugu Max",
      role: "The other pufferfish",
      tier: "Balanced",
      doing: "Keeps the desk behind the shoji and walks the tatami between tasks.",
      why: "{short} is the everyday tier of the same family: capable, and priced to be used more often.",
      chips: ["Balanced", "Japanese and English", "Efficient"],
      accent: AMBER,
      scale: 0.95,
      home: "desk-2",
      haunts: ["tank", "small-tank", "rest"],
      traits: { pace: 1.05, focus: 0.55, sociability: 0.6, range: 1.3 },
      look: { outfit: "vest", hair: "bun" },
    },
    {
      id: "namazu",
      name: "Namazu",
      role: "The catfish",
      tier: "Small",
      doing: "Sits by the small tank with the catfish in it, which is the one it is named for.",
      why: "{short} is named for the catfish of Japanese folklore that lives under the islands. It keeps to the small tank.",
      chips: ["Small", "Fast", "Japanese"],
      accent: CYAN,
      scale: 0.84,
      home: "small-tank",
      haunts: ["tank", "chabudai", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.3, focus: 0.4, sociability: 0.7, range: 1.4 },
      look: { outfit: "tee", hair: "crop" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      aquarium(ctx, ox + 0.8, oy + 1.0, 4.8, 1.0, 1.5);
      aquarium(ctx, ox + 10.6, oy + 1.0, 3.0, 1.0, 1.2);
      shoji(ctx, ox + 10.6, oy + 9.2, 2.8, "y");
      bonsai(ctx, ox + 1.4, oy + 7.0, FLOOR_Z + 0.4);
      ctx.p.box(ox + 1.05, oy + 6.75, FLOOR_Z, 0.7, 0.5, 0.4, MAT.woodDark);
      ctx.nav?.blockRect(ox + 1.05, oy + 6.75, 0.7, 0.5, 0.04);
      sign(ctx, "SAKANA", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("tank", "the long tank", 3.2, 2.7, FACE_N, { kind: "window", pose: "watch", places: 3, spacing: 1.2, tags: ["rest", "social"] });
    L.stand("small-tank", "the small tank", 12.1, 2.7, FACE_N, { kind: "window", pose: "watch", tags: ["work"] });
    L.stand("screens", "the screens", 11.6, 10.6, FACE_E, { kind: "window", pose: "watch", tags: ["rest"] });

    L.desk("desk-1", "the west desk", 4.2, 6.8, FACE_N, { screens: 2, seed: 311, tone: MAT.wood });
    L.desk("desk-2", "the desk behind the screens", 13.0, 10.8, FACE_N, { screens: 1, seed: 313, tone: MAT.wood });

    // A low table on the mats with cushions round it.
    L.draw((ctx, ox, oy) => {
      chabudai(ctx, ox + 4.0, oy + 10.4, 0.6);
      for (const [x, y] of [[3.1, 10.4], [4.9, 10.4], [4.0, 11.3]] as const) cushion(ctx, ox + x, oy + y, MAT.red);
    });
    L.places("chabudai", "the low table", "lounge", [[3.1, 10.4, FACE_E], [4.9, 10.4, FACE_W], [4.0, 11.3, FACE_N]], {
      pose: "eat", seat: 0.14, tags: ["social"],
    });

    L.base({ rest: [8.0, 9.8], front: [8.0, 11.8], east: false });
    for (const [x, y] of [[3.2, 4.6], [8.0, 7.0], [12.8, 4.6], [4.0, 9.6]]) L.lamp(x, y, { power: 0.9, radius: 5.4, tint: MAT.paper, style: "lantern" });
  },
});
