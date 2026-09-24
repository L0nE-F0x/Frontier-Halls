import { mix } from "../../../engine/color";
import { AMBER, CYAN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { filing } from "../../props/furniture";
import { rack } from "../../props/fixtures";
import { canoe, floorWord, vault } from "../../props/heroes-west";
import { papers, plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

/**
 * Command A+ from the index; North Mini Code and Rerank by hand. The lab
 * sells to companies that want their models inside their own walls, and the
 * hall is built round a vault.
 */
export const cohere = defineHall({
  id: "cohere",
  name: "Cohere",
  plaque: "COHERE",
  kind: "lab",
  city: "Toronto",
  region: "Canada",
  tagline: "Behind the vault door",
  ethos: "Build for the companies that cannot send their data anywhere, and run where they are.",
  blurb:
    "A vault door in a wall of its own with a rack behind it, filing cabinets down the east side, a compass rose on the floor pointing north, and a red canoe on the north wall.",
  reading:
    "Most of the building trains models for everyone; this hall trains them to be installed inside somebody else's building. The rack behind the vault is a private deployment, and the models work outside it. The compass rose is for North, the lab's platform for the office. The canoe is Canadian and nobody has explained it further.",
  facts: [
    { label: "House style", value: "Private by default" },
    { label: "In the hall", value: "{roster}" },
    { label: "Behind the door", value: "Somebody else's rack" },
  ],
  accent: RED,
  floor: { tone: { r: 158, g: 156, b: 152 }, pattern: "carpet", alt: { r: 136, g: 134, b: 132 } },
  people: [
    {
      id: "flagship",
      name: "Command A+",
      role: "Built for the enterprise",
      tier: "Flagship",
      doing: "Keeps the desk by the vault, where the private deployments are.",
      why: "{short} is Cohere's flagship, built to run inside a company's own walls rather than out on the open internet. It stays by the vault.",
      chips: ["Enterprise", "Private deployment", "Retrieval"],
      accent: RED,
      scale: 1.02,
      home: "desk-1",
      haunts: ["vault", "sorting", "sofa"],
      interests: ["teach", "visit"],
      traits: { focus: 0.88, sociability: 0.42, pace: 0.92 },
      look: { outfit: "suit", hair: "short" },
    },
    {
      id: "north",
      name: "North Mini Code",
      role: "Small, for code",
      tier: "Coding",
      doing: "Works the east desk and carries fixes to the vault and back.",
      why: "{short} is a small coding model from the lab's workplace platform, North, the compass on the floor is named for.",
      chips: ["Coding", "Small", "Runs in-house"],
      accent: CYAN,
      scale: 0.86,
      home: "desk-2",
      haunts: ["vault", "filing", "rest", "door-e"],
      interests: ["learn", "exam"],
      traits: { pace: 1.4, focus: 0.3, sociability: 0.6, range: 1.4 },
      carries: "slate",
      look: { outfit: "hoodie", hair: "crop" },
    },
    {
      id: "rerank",
      name: "Rerank",
      role: "Puts the results in order",
      tier: "Search",
      doing: "Stands at the sorting table putting piles of paper in order, best first.",
      why: "{short} takes a pile of search results and puts the right one first. Most of what this hall answers passes over its table before anyone reads it.",
      chips: ["Retrieval", "Ranking", "Enterprise search"],
      accent: AMBER,
      scale: 0.9,
      home: "sorting",
      haunts: ["filing", "desk-1", "front"],
      traits: { pace: 1.1, focus: 0.7, sociability: 0.5 },
      carries: "papers",
      look: { outfit: "vest", hair: "bun", acc: ["glasses"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      rack(ctx, ox + 1.4, oy + 0.7, "s", 3.6, "PRIVATE");
      rack(ctx, ox + 3.0, oy + 0.7, "s", 3.6, null);
      vault(ctx, ox + 0.8, oy + 2.2, 4.2);
      canoe(ctx, ox + 10.8, oy, FLOOR_Z + 3.6, 4.0);
      sign(ctx, "COHERE", ox + 3.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
      // The compass rose.
      if (ctx.lod > 0) {
        ctx.p.disc(ox + 8.0, oy + 6.4, FLOOR_Z + 0.006, 1.3, 1.3, mix(MAT.cloth, MAT.paper, 0.5), { emissive: 0.3, bias: 0.012 }, 20);
        ctx.p.line(ox + 8.0, oy + 7.5, FLOOR_Z + 0.02, ox + 8.0, oy + 5.3, FLOOR_Z + 0.02, MAT.red, 3, { emissive: 0.8, bias: 0.03 });
        ctx.p.line(ox + 6.9, oy + 6.4, FLOOR_Z + 0.02, ox + 9.1, oy + 6.4, FLOOR_Z + 0.02, MAT.ink, 2, { emissive: 0.6, bias: 0.03 });
        floorWord(ctx, "N", ox + 8.0, oy + 4.9, 0.08, MAT.red);
      }
    });
    L.stand("vault", "the vault door", 2.9, 3.6, FACE_N, { kind: "frame", pose: "read", tags: ["work"] });

    L.desk("desk-1", "the desk by the vault", 3.6, 7.2, FACE_N, { screens: 2, seed: 141 });
    L.desk("desk-2", "the east desk", 12.2, 7.2, FACE_N, { screens: 2, seed: 143 });

    L.table("sorting", "the sorting table", 10.6, 2.8, 3.0, 1.0, {
      sides: "south", per: 2, pose: "read", seat: 0, tags: ["work"], chairs: "none",
      top: (ctx, ox, oy) => {
        for (let i = 0; i < 4; i++) papers(ctx, ox + 11.0 + i * 0.7, oy + 3.2, 2 + (i % 3), 5 + i, FLOOR_Z + 0.9);
      },
    });

    L.draw((ctx, ox, oy) => {
      for (let i = 0; i < 4; i++) filing(ctx, ox + 14.6, oy + 4.0 + i * 0.7, MAT.metal);
    });
    L.stand("filing", "the filing cabinets", 13.9, 5.4, 0, { kind: "rack", pose: "read", tags: ["work"] });

    L.sofa("sofa", "the sofa", 2.8, 9.8, FACE_S, 3, { tone: MAT.cloth, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 5.0, oy + 12.0, 1.1);
      plant(ctx, ox + 12.0, oy + 12.0, 1.0);
    });

    L.base({ rest: [12.0, 10.4], front: [3.2, 12.1], west: false });
    L.lamp(3.6, 5.6, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(12.0, 5.6, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(8.0, 9.8, { power: 0.8, radius: 5, style: "globe" });
  },
});
