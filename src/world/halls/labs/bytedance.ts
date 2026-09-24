import { CYAN, GREEN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { phoneWall, ringLight, seedlings } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S, FACE_W } from "../layout";

/**
 * ByteDance's research arm, which calls itself Seed: Seed 2.1 Turbo,
 * Seed-2.0-Code and Seed-2.0-Mini, from the index.
 */
export const bytedance = defineHall({
  id: "bytedance",
  name: "ByteDance Seed",
  plaque: "SEED",
  kind: "lab",
  city: "Beijing",
  region: "China",
  tagline: "The nursery",
  ethos: "Plant a great many seeds, and grow the ones that come up.",
  blurb:
    "Trays of seedlings under pink grow lights in the north-east corner, a wall of phone screens each playing something different, and a ring light on a tripod pointed at nobody in particular.",
  reading:
    "The lab is called Seed, and this is the one room in the building where something is literally growing: the trays are under grow lights all day. The phone wall on the north side is the company the lab belongs to, which most of the world knows by a short video; the ring light is for whoever wants to make one.",
  facts: [
    { label: "House style", value: "Grow a great many" },
    { label: "In the hall", value: "{roster}" },
    { label: "Growing", value: "Seedlings, under glass" },
  ],
  accent: GREEN,
  floor: { tone: { r: 176, g: 174, b: 172 }, pattern: "terrazzo", alt: { r: 150, g: 148, b: 146 } },
  people: [
    {
      id: "flagship",
      name: "Seed 2.1 Turbo",
      role: "The flagship",
      tier: "Flagship",
      doing: "Works the west desk and stops at the trays on the way past.",
      why: "{short} is the top of the lab's own line, the model the rest of the company's products lean on.",
      chips: ["Flagship", "Multimodal", "Fast"],
      accent: GREEN,
      scale: 1.02,
      home: "desk-1",
      haunts: ["trays", "wall", "sofa"],
      interests: ["teach", "visit"],
      traits: { focus: 0.84, sociability: 0.5, pace: 1.0 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "code",
      name: "Seed-2.0-Code",
      role: "Writes the code",
      tier: "Coding",
      doing: "Keeps the east desk with two screens of other people's code.",
      why: "{short} is the coding model of the line, built for work that spans a whole repository.",
      chips: ["Coding", "Agentic", "Repo-scale"],
      accent: CYAN,
      scale: 0.93,
      home: "desk-2",
      haunts: ["trays", "rest", "door-w"],
      traits: { pace: 1.2, focus: 0.55, sociability: 0.55, range: 1.3 },
      look: { outfit: "hoodie", hair: "crop", acc: ["headphones"] },
    },
    {
      id: "mini",
      name: "Seed-2.0-Mini",
      role: "Small and quick",
      tier: "Small",
      doing: "Stands in front of the ring light, then runs off to the phone wall.",
      why: "{short} is the small end of the family, fast and cheap enough to run inside something with a very short attention span.",
      chips: ["Small", "Cheap", "Quick"],
      accent: VIOLET,
      scale: 0.8,
      home: "creator",
      haunts: ["wall", "trays", "front", "sofa"],
      interests: ["learn", "exam"],
      traits: { pace: 1.7, focus: 0.1, sociability: 0.85, range: 1.8 },
      carries: "slate",
      look: { outfit: "tee", hair: "long" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      seedlings(ctx, ox + 10.4, oy + 0.9, 4.8, 1.2);
      seedlings(ctx, ox + 10.4, oy + 3.1, 4.8, 1.2);
      phoneWall(ctx, ox + 1.0, oy, 5.9, FLOOR_Z + 1.5);
      ringLight(ctx, ox + 3.6, oy + 4.2, FACE_S);
      sign(ctx, "SEED", ox + 8.2, oy + 0.56, FLOOR_Z + 5.9, 0.06);
    });
    L.stand("trays", "the seedling trays", 12.8, 2.65, FACE_N, { kind: "bench", pose: "pour", places: 2, spacing: 1.6, tags: ["work"] });
    L.stand("wall", "the phone wall", 4.0, 1.7, FACE_N, { kind: "window", pose: "watch", places: 2, spacing: 1.4, tags: ["rest"] });
    L.stand("creator", "in front of the ring light", 3.6, 5.6, FACE_N, { kind: "stage", pose: "present", tags: ["work"] });

    L.desk("desk-1", "the west desk", 7.0, 7.6, FACE_N, { screens: 2, seed: 131 });
    L.desk("desk-2", "the east desk", 10.4, 7.6, FACE_N, { screens: 2, seed: 133 });

    L.sofa("sofa", "the sofa", 13.8, 10.0, FACE_W, 3, { tone: MAT.cloth, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 5.0, oy + 12.0, 1.1);
      plant(ctx, ox + 14.6, oy + 6.2, 1.2);
    });

    L.base({ rest: [12.0, 11.3], front: [3.0, 12.1], east: false });
    L.lamp(12.8, 4.4, { power: 0.8, radius: 5, tint: MAT.seal, style: "neon" });
    L.lamp(5.0, 5.0, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(9.0, 9.4, { power: 0.9, radius: 6, style: "globe" });
  },
});
