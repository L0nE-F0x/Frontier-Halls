import { hash2 } from "../../../engine/rng";
import { AMBER, GREEN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { cuckooClock, easel } from "../../props/heroes-west";
import { fir, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

const EASELS: [number, number, number][] = [[2.4, 3.2, 11], [4.6, 3.2, 12], [11.6, 3.2, 13], [13.8, 3.2, 14]];

/**
 * Black Forest Labs, which makes the FLUX image models. Not on the index the
 * roster reads, so its seats are held by hand. A studio in the Black Forest,
 * with the forest's own clock on the wall.
 */
export const blackforest = defineHall({
  id: "blackforest",
  name: "Black Forest Labs",
  plaque: "BLACK FOREST",
  kind: "lab",
  city: "Freiburg",
  region: "Germany",
  tagline: "The studio",
  ethos: "Make the picture the words asked for, and let people run it themselves.",
  blurb:
    "Four easels with paintings resolving out of noise and back into it, fir trees in tubs, paint on the floor, a long table with benches, and a cuckoo clock on the north wall that goes off on the hour.",
  reading:
    "An image lab drawn as a painter's studio. The canvases are diffusion, slowed down to the speed of a painting: each one starts as coloured noise and settles into a picture, then dissolves and begins again. The cuckoo clock reads the same clock as every other in the building, and at the top of each hour it is the only one that says so.",
  facts: [
    { label: "House style", value: "Pictures, open and closed" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the hour", value: "The cuckoo" },
  ],
  accent: GREEN,
  floor: { tone: { r: 160, g: 158, b: 152 }, pattern: "concrete", alt: { r: 136, g: 134, b: 128 } },
  people: [
    {
      id: "pro",
      name: "FLUX Pro",
      role: "The flagship image model",
      tier: "Flagship",
      doing: "Works the drafting table and signs the canvases when they come out right.",
      why: "{short} is the lab's best image model: words in, a picture out, and the pictures are what the lab is known for.",
      chips: ["Image", "Text to image", "Flagship"],
      accent: AMBER,
      scale: 1.02,
      home: "drafting",
      haunts: ["easels", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.45, pace: 0.9 },
      look: { outfit: "coat", hair: "short" },
    },
    {
      id: "kontext",
      name: "FLUX Kontext",
      role: "Edits in context",
      tier: "Editing",
      doing: "Goes from easel to easel changing one thing on each and leaving the rest alone.",
      why: "{short} edits a picture you already have from an instruction, keeping what should stay the same. It is the one in the studio with a fine brush.",
      chips: ["Image editing", "In context", "Consistent"],
      accent: RED,
      scale: 0.95,
      home: "desk",
      haunts: ["easels", "rest", "table"],
      traits: { pace: 1.15, focus: 0.5, sociability: 0.6, range: 1.3 },
      look: { outfit: "vest", hair: "bun" },
    },
    {
      id: "dev",
      name: "FLUX Dev",
      role: "Open weights, for everyone else",
      tier: "Open",
      doing: "Paints at the easels where anybody walking past can watch.",
      why: "{short} is the open-weight model, the one people download and build on. It works in public, at the easels by the door.",
      chips: ["Open weights", "Community", "Image"],
      accent: GREEN,
      scale: 0.9,
      home: "easels",
      haunts: ["table", "front", "door-w"],
      interests: ["learn", "exam"],
      traits: { pace: 1.2, focus: 0.45, sociability: 0.75, range: 1.5 },
      look: { outfit: "apron", hair: "curly" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      for (const [x, y, seed] of EASELS) easel(ctx, ox + x, oy + y, FACE_S, seed);
      cuckooClock(ctx, ox + 8.0, oy, FLOOR_Z + 2.8);
      fir(ctx, ox + 0.9, oy + 1.1, 0.9);
      fir(ctx, ox + 15.1, oy + 1.1, 1.0);
      fir(ctx, ox + 15.0, oy + 6.4, 0.8);
      sign(ctx, "ATELIER", ox + 3.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
      // Paint where it fell.
      if (ctx.lod > 1) {
        const tones = [MAT.red, MAT.lamp, MAT.led, MAT.green, MAT.seal];
        for (let k = 0; k < 40; k++) {
          const px = ox + 1 + hash2(k, 71) * 14;
          const py = oy + 1.8 + hash2(71, k) * 3.6;
          ctx.p.plate(px, py, FLOOR_Z + 0.004, 0.08 + hash2(k, k) * 0.12, 0.06 + hash2(k, 3) * 0.1, tones[k % tones.length], { emissive: 0.4, bias: 0.012 });
        }
      }
    });
    L.places("easels", "the easels", "frame", EASELS.map(([x, y]) => [x, y + 0.95, FACE_N] as [number, number, number]), {
      pose: "write", tags: ["work"],
    });

    L.desk("drafting", "the drafting table", 4.0, 7.8, FACE_N, { style: "drafting", seed: 171, tone: MAT.wood, lamp: true });
    L.desk("desk", "the retouching desk", 11.8, 7.8, FACE_N, { screens: 2, seed: 173 });

    L.table("table", "the long table", 2.0, 9.8, 3.8, 1.0, {
      chairs: "bench", per: 3, pose: "eat", tags: ["social"], tone: MAT.wood, chairTone: MAT.woodDark,
    });

    L.base({ rest: [12.0, 10.6], front: [11.6, 12.1] });
    L.lamp(3.6, 4.6, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(12.6, 4.6, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(8.0, 9.4, { power: 0.8, radius: 5, style: "globe" });
  },
});
