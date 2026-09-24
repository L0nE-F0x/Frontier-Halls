import { mix } from "../../../engine/color";
import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { musicStudio, skyline, vocalBooth } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N } from "../layout";

/**
 * MiniMax M3 and M2-her, from the index; Hailuo, the video model, by hand.
 * The one lab in the building that makes music and film as well as text.
 */
export const minimax = defineHall({
  id: "minimax",
  name: "MiniMax",
  plaque: "MINIMAX",
  kind: "lab",
  city: "Shanghai",
  region: "China",
  tagline: "The studio",
  ethos: "A model should be able to talk, sing and make pictures move, not only write.",
  blurb:
    "The river front at night cut out in black on the north wall, a wall of video screens over the door, a keyboard between two speakers, and a vocal booth with the red light on.",
  reading:
    "The lab makes text, voice, music and video models, and the hall is a production studio for all four. The skyline is the city across the river from the old town, the tower of spheres on its needle and the tall one that twists. The booth's light is on whenever somebody is recording, which is most of the afternoon.",
  facts: [
    { label: "House style", value: "Every medium" },
    { label: "In the hall", value: "{roster}" },
    { label: "Recording", value: "Most afternoons" },
  ],
  accent: VIOLET,
  floor: { tone: { r: 152, g: 148, b: 160 }, pattern: "carpet", alt: { r: 130, g: 126, b: 140 } },
  people: [
    {
      id: "m3",
      name: "MiniMax M3",
      role: "The flagship",
      tier: "Flagship",
      doing: "Works the west desk under the skyline and walks over to the keyboard when it is free.",
      why: "{short} is the lab's text model, sparse and long-context, the one the voice and video models are built around.",
      chips: ["Flagship", "Long context", "Agentic"],
      accent: VIOLET,
      scale: 1.02,
      home: "desk-1",
      haunts: ["keys", "sofa", "screens"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.55, pace: 0.95 },
      look: { outfit: "jacket", hair: "long" },
    },
    {
      id: "her",
      name: "MiniMax M2-her",
      role: "Keeps somebody company",
      tier: "Companion",
      doing: "Sits on the sofa and talks to whoever sits down beside it.",
      why: "{short} is tuned for conversation and character rather than tasks: a model for keeping someone company, named after a film about exactly that.",
      chips: ["Companion", "Role-play", "Conversation"],
      accent: AMBER,
      scale: 0.92,
      home: "sofa",
      haunts: ["keys", "booth", "rest"],
      traits: { pace: 1.0, focus: 0.5, sociability: 0.98, range: 1.2 },
      look: { outfit: "dress", hair: "bun", acc: ["scarf"] },
    },
    {
      id: "hailuo",
      name: "Hailuo",
      role: "Makes pictures move",
      tier: "Video",
      doing: "Cuts video at the east desk and checks it on the wall of screens.",
      why: "{short} is the lab's video model: a sentence or a still in, a few seconds of film out.",
      chips: ["Video", "Image to video", "Fast"],
      accent: CYAN,
      scale: 0.94,
      home: "desk-2",
      haunts: ["screens", "booth", "front"],
      traits: { pace: 1.15, focus: 0.6, sociability: 0.6, range: 1.3 },
      look: { outfit: "hoodie", hair: "crop", acc: ["headphones"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      skyline(ctx, ox + 0.8, oy, 4.8, FLOOR_Z + 1.3);
      musicStudio(ctx, ox + 11.6, oy + 1.2);
      vocalBooth(ctx, ox + 12.8, oy + 4.0, ctx.clock.hour > 13 && ctx.clock.hour < 18);
      // The video wall over the north door.
      const { p, time } = ctx;
      for (let i = 0; i < 4; i++) {
        const x = ox + 6.3 + (i % 2) * 1.75;
        const z = FLOOR_Z + 2.7 + Math.floor(i / 2) * 1.05;
        p.box(x - 0.05, oy + 0.58, z - 0.05, 1.7, 0.06, 1.0, MAT.black);
        const beat = Math.floor(Math.max(0, time) * 0.4 + i * 1.7);
        const tone = [MAT.seal, MAT.led, MAT.lamp, MAT.red][beat % 4];
        p.box(x, oy + 0.55, z, 1.6, 0.02, 0.9, mix(tone, MAT.paper, 0.25), { emissive: 0.85, glow: 0.25 });
      }
      sign(ctx, "HAILUO", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("keys", "the keyboard", 12.5, 2.2, FACE_N, { kind: "bench", pose: "type", tags: ["work", "social"] });
    L.stand("booth", "the vocal booth", 13.8, 5.4, FACE_N, { kind: "stage", pose: "present", tags: ["work"] });
    L.stand("screens", "under the screens", 8.0, 2.4, FACE_N, { kind: "window", pose: "watch", places: 2, spacing: 1.2, tags: ["rest"] });

    L.desk("desk-1", "the west desk", 3.4, 6.6, FACE_N, { screens: 2, seed: 281, chair: MAT.seal });
    L.desk("desk-2", "the east desk", 10.4, 7.6, FACE_N, { screens: 2, seed: 283 });

    L.sofa("sofa", "the sofa", 3.6, 10.8, FACE_N, 3, { tone: MAT.seal, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 8.0, oy + 12.0, 1.1);
      plant(ctx, ox + 13.2, oy + 12.1, 1.0);
    });

    L.base({ rest: [12.4, 10.4], front: [9.6, 11.8] });
    L.lamp(3.4, 5.6, { power: 0.9, radius: 6, tint: MAT.seal, style: "track" });
    L.lamp(12.4, 3.4, { power: 0.9, radius: 5, style: "track" });
    L.lamp(8.0, 9.4, { power: 0.8, radius: 5.5, tint: MAT.seal, style: "neon" });
  },
});
