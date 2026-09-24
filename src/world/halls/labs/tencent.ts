import { CYAN, RED, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { table } from "../../props/furniture";
import { arcade, penguin, printer3d } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

/**
 * Hy4 and Hy-MT2 from the index; Hunyuan3D by hand. A games company, a chat
 * company, and now a lab; the penguin has been its mascot the whole time.
 */
export const tencent = defineHall({
  id: "tencent",
  name: "Tencent",
  plaque: "TENCENT",
  kind: "lab",
  city: "Shenzhen",
  region: "China",
  tagline: "The arcade",
  ethos: "Put a model inside the things people already spend their day in: the chat, the game, the city.",
  blurb:
    "A row of arcade cabinets along the north wall with something playing on every screen, a penguin in a red scarf taller than anyone, and a 3D printer by the east door slowly building something.",
  reading:
    "The company made its name on chat and on games, and the hall is an arcade for that reason. The penguin is its oldest mascot. The printer is for the 3D model, which makes objects from a sentence or a photograph; whatever is on the printer bed grows through the afternoon and is gone by morning.",
  facts: [
    { label: "House style", value: "Inside everything" },
    { label: "In the hall", value: "{roster}" },
    { label: "Tallest resident", value: "The penguin" },
  ],
  accent: RED,
  floor: { tone: { r: 150, g: 148, b: 158 }, pattern: "carpet", alt: { r: 128, g: 126, b: 138 } },
  people: [
    {
      id: "hy4",
      name: "Hy4",
      role: "The flagship",
      tier: "Flagship",
      doing: "Works the west desk, then goes and plays a round at the arcade.",
      why: "{short} is the company's own large model, the one inside its chat app and its games.",
      chips: ["Flagship", "Mixture of experts", "Long context"],
      accent: RED,
      scale: 1.02,
      home: "desk-1",
      haunts: ["arcade", "penguin", "sofa"],
      interests: ["teach", "visit"],
      traits: { focus: 0.8, sociability: 0.6, pace: 0.95 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "mt",
      name: "Hy-MT2-30B-A3B",
      role: "Translates",
      tier: "Translation",
      doing: "Keeps the east desk and says everything in two languages.",
      why: "{short} is the translation model: small and sparse, built to carry a great many languages across at once.",
      chips: ["Translation", "Many languages", "Sparse"],
      accent: CYAN,
      scale: 0.9,
      home: "desk-2",
      haunts: ["arcade", "printer", "rest"],
      traits: { pace: 1.2, focus: 0.55, sociability: 0.65, range: 1.3 },
      look: { outfit: "tee", hair: "crop", acc: ["glasses"] },
    },
    {
      id: "hunyuan3d",
      name: "Hunyuan3D",
      role: "Makes objects",
      tier: "3D",
      doing: "Tends the printer by the east door and watches the model on the bed grow.",
      why: "{short} makes three-dimensional objects from a sentence or a photograph. The printer is the slow way of showing it.",
      chips: ["3D generation", "Open weights", "Image to 3D"],
      accent: VIOLET,
      scale: 0.94,
      home: "printer",
      haunts: ["penguin", "arcade", "front"],
      traits: { pace: 1.05, focus: 0.7, sociability: 0.5 },
      look: { outfit: "apron", hair: "bun" },
    },
  ],
  layout(L) {
    const CABS = [1.2, 2.3, 3.4, 4.5];
    L.draw((ctx, ox, oy) => {
      CABS.forEach((x, i) => arcade(ctx, ox + x, oy + 1.2, FACE_S, i));
      penguin(ctx, ox + 13.2, oy + 2.6, 1.2);
      table(ctx, ox + 10.4, oy + 4.9, 2.2, 0.9, MAT.darkMetal);
      printer3d(ctx, ox + 11.0, oy + 5.0, FLOOR_Z + 0.94);
      sign(ctx, "PLAY", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.06);
    });
    L.places("arcade", "the arcade", "bench", CABS.map((x) => [x, 2.25, FACE_N] as [number, number, number]), { pose: "type", tags: ["social", "rest"] });
    L.stand("penguin", "the penguin", 13.2, 4.0, FACE_N, { kind: "frame", pose: "watch", tags: ["rest"] });
    L.stand("printer", "the printer", 11.5, 6.4, FACE_N, { kind: "bench", pose: "read", tags: ["work"] });

    L.desk("desk-1", "the west desk", 3.8, 7.0, FACE_N, { screens: 2, seed: 301, chair: MAT.red });
    L.desk("desk-2", "the east desk", 12.2, 9.2, FACE_N, { screens: 2, seed: 303, chair: MAT.black });

    L.sofa("sofa", "the gaming sofa", 3.6, 10.8, FACE_N, 3, { tone: MAT.seal, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => plant(ctx, ox + 8.6, oy + 12.0, 1.0));

    L.base({ rest: [8.0, 9.6], front: [9.6, 11.8] });
    L.lamp(3.0, 3.4, { power: 0.9, radius: 5.5, tint: MAT.seal, style: "neon" });
    L.lamp(12.4, 4.6, { power: 0.9, radius: 5.5, tint: MAT.led, style: "neon" });
    L.lamp(8.0, 8.0, { power: 0.9, radius: 6, style: "globe" });
  },
});
