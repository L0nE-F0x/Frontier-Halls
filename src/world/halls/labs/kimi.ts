import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { moon, prism, starRug, telescope } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { rackWall } from "../kit";
import { defineHall, FACE_N } from "../layout";

/**
 * Moonshot's hall. The lab took its name from the moon and, the story goes,
 * from a record about its dark side; the hall has both hanging in it.
 */
export const kimi = defineHall({
  id: "kimi",
  name: "Kimi",
  plaque: "KIMI",
  kind: "lab",
  city: "Beijing",
  region: "China",
  tagline: "The long shift",
  ethos: "Stay on the job longer than a conversation lasts.",
  blurb:
    "A moon hanging over a rug of stars, a telescope pointed at the trusses, and a glass prism in the north-west corner splitting a beam of white light into colours.",
  reading:
    "Moonshot's line works the long bench under the moon: the flagship holds it, the line before it still walks the racks, and the coding model has a desk of its own by the east door. The moon goes through its phases in a day. The prism is a nod to an album cover, which is where the lab's name is said to come from.",
  facts: [
    { label: "House style", value: "Long jobs, open weights" },
    { label: "In the hall", value: "{roster}" },
    { label: "Overhead", value: "A moon, waxing" },
  ],
  accent: VIOLET,
  floor: { tone: { r: 150, g: 148, b: 158 }, pattern: "tile", alt: { r: 128, g: 126, b: 138 } },
  people: [
    {
      id: "flagship",
      name: "Kimi K3",
      role: "The flagship",
      tier: "Flagship",
      doing: "Holds the long bench under the moon and sends the others out.",
      why: "{short} is the top of the line, large enough that the hall keeps it at the bench instead of walking it round the block. The long jobs start here.",
      chips: ["Flagship", "Open weights", "Long context"],
      accent: AMBER,
      scale: 1.04,
      home: "bench",
      haunts: ["telescope", "prism", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.9, sociability: 0.4, pace: 0.86 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "previous",
      name: "Kimi K2.6",
      role: "The line that opened the hall",
      tier: "Open weights",
      doing: "Walks the racks. People still ask for it by name.",
      why: "{short} is the line that made a hall necessary. The newer flagship has the bench; this one still knows which rack is which, and it is the one that drifts.",
      chips: ["Mixture of experts", "Open weights", "Agentic"],
      accent: CYAN,
      scale: 0.96,
      home: "racks",
      haunts: ["table", "prism", "rest", "door-w"],
      traits: { pace: 1.2, focus: 0.32, sociability: 0.58, range: 1.4 },
      look: { outfit: "tee", hair: "crop" },
    },
    {
      id: "coder",
      name: "Kimi K2.7 Code",
      role: "Stays on the task",
      tier: "Coding",
      doing: "Works the desk by the east door and keeps going after everyone else has stopped.",
      why: "{short} is built to stay on a task after the conversation would have ended. It keeps the desk nearest the door, which is where the long jobs come in.",
      chips: ["Coding", "Long jobs", "Open weights"],
      accent: VIOLET,
      scale: 0.9,
      home: "code",
      haunts: ["bench", "rest", "door-e"],
      traits: { pace: 1.35, focus: 0.5, sociability: 0.5, range: 1.2 },
      carries: "case",
      look: { outfit: "hoodie", hair: "short", acc: ["headphones"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      prism(ctx, ox + 2.8, oy + 3.0);
      telescope(ctx, ox + 13.4, oy + 3.2);
      starRug(ctx, ox + 5.0, oy + 5.2, 6.0, 3.2);
      sign(ctx, "MOONSHOT", ox + 12.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    rackWall(L, "racks", 4.8, 4.6, 3, "K", { height: 4.6, places: 2 });
    L.stand("prism", "the prism", 2.8, 4.2, FACE_N, { kind: "frame", pose: "watch", tags: ["rest"] });
    L.stand("telescope", "the telescope", 13.4, 4.4, FACE_N, { kind: "window", pose: "watch", tags: ["rest"] });

    L.desk("bench", "the long bench", 8.0, 7.8, FACE_N, { screens: 2, seed: 111, lamp: true, chair: MAT.seal });
    L.desk("code", "the desk by the door", 12.6, 7.6, FACE_N, { screens: 2, seed: 113 });

    L.round("table", "the round table", 3.2, 9.8, 0.55, 3, { tone: MAT.woodDark, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      moon(ctx, ox + 10.4, oy + 4.2, FLOOR_Z + 4.3, 1.0);
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
      plant(ctx, ox + 1.2, oy + 6.2, 1.1);
    });

    L.base({ rest: [11.6, 10.6], front: [3.2, 12.1] });
    L.lamp(10.4, 4.2, { z: 3.9, power: 0.8, radius: 6, tint: MAT.paper, style: "none" });
    L.lamp(8.0, 8.4, { power: 1.0, radius: 6.5, style: "globe" });
    L.lamp(3.2, 9.8, { power: 0.7, radius: 4.5, style: "globe" });
  },
});
