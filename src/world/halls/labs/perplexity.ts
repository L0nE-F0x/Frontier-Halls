import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { counter } from "../../props/furniture";
import { globe } from "../../props/commons";
import { cardCatalog, citationWall } from "../../props/heroes-west";
import { books, papers, plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

/** Sonar, in three modes, from the index. A reference library with a desk for questions. */
export const perplexity = defineHall({
  id: "perplexity",
  name: "Perplexity",
  plaque: "PERPLEXITY",
  kind: "lab",
  city: "San Francisco",
  region: "United States",
  tagline: "The reference desk",
  ethos: "An answer is only as good as the sources you can check it against.",
  blurb:
    "A card catalogue along the north wall, a reference desk with a sign that says ASK, and a wall of sources with numbered threads running from each one to the answer in the middle.",
  reading:
    "Built like the reference room of a library, because that is what the lab is trying to replace and to improve on at once. Every answer given at the desk comes with its footnotes, and the footnotes are pinned to the wall behind it. The one hall from the Bay on the north side of the building, beside Toronto and New York.",
  facts: [
    { label: "House style", value: "Answer with sources" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the wall", value: "Every footnote" },
  ],
  accent: CYAN,
  floor: { tone: { r: 166, g: 162, b: 150 }, pattern: "plank", alt: { r: 142, g: 138, b: 128 } },
  people: [
    {
      id: "search",
      name: "Sonar Pro Search",
      role: "Answers, with sources",
      tier: "Flagship",
      doing: "Stands behind the reference desk and answers whatever is asked, with the sources pinned up behind it.",
      why: "{short} is the lab's answer engine at its fullest: it searches as it goes and gives its sources with the answer. The wall of footnotes behind the desk is the point.",
      chips: ["Search", "Citations", "Answer engine"],
      accent: CYAN,
      scale: 1.02,
      home: "reference",
      haunts: ["catalogue", "wall", "desk"],
      interests: ["teach", "visit"],
      traits: { focus: 0.8, sociability: 0.6, pace: 1.0 },
      look: { outfit: "vest", hair: "short", acc: ["glasses", "lanyard"] },
    },
    {
      id: "research",
      name: "Sonar Deep Research",
      role: "Reads for hours",
      tier: "Research",
      doing: "Works the desk with the tallest stack of papers in the building.",
      why: "{short} is the slow, thorough mode: it reads a great many sources before it writes anything, and its desk shows it.",
      chips: ["Deep research", "Long reports", "Many sources"],
      accent: VIOLET,
      scale: 0.98,
      home: "desk",
      haunts: ["catalogue", "wall", "chairs"],
      traits: { focus: 0.95, sociability: 0.3, pace: 0.85 },
      carries: "papers",
      look: { outfit: "jacket", hair: "long", acc: ["glasses"] },
    },
    {
      id: "sonar",
      name: "Sonar",
      role: "The quick answer",
      tier: "Fast",
      doing: "Answers the short questions at the standing desk by the east door.",
      why: "{short} is the lighter model, for the questions that should not take long.",
      chips: ["Fast", "Search", "Cheap"],
      accent: AMBER,
      scale: 0.84,
      home: "standing",
      haunts: ["reference", "catalogue", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.6, focus: 0.2, sociability: 0.8, range: 1.6 },
      look: { outfit: "tee", hair: "cap" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      cardCatalog(ctx, ox + 0.8, oy + 0.7, 4.8);
      citationWall(ctx, ox + 10.4, oy, 4.8, 17);
      globe(ctx, ox + 1.2, oy + 3.4);
      sign(ctx, "REFERENCE", ox + 3.2, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("catalogue", "the card catalogue", 3.2, 1.95, FACE_N, { kind: "rack", pose: "read", places: 2, spacing: 1.6, tags: ["work"] });
    L.stand("wall", "the wall of sources", 12.8, 1.7, FACE_N, { kind: "board", pose: "read", places: 2, spacing: 1.6, tags: ["work"] });

    // The reference desk: answered from behind, asked from in front.
    L.draw((ctx, ox, oy) => {
      counter(ctx, ox + 10.4, oy + 4.3, 3.6, 0.8, MAT.wood, MAT.woodDark);
      sign(ctx, "ASK", ox + 12.2, oy + 4.28, FLOOR_Z + 1.6, 0.06, MAT.paper);
      books(ctx, ox + 10.8, oy + 4.5, 3, 9, FLOOR_Z + 0.98);
    });
    L.stand("reference", "behind the reference desk", 12.2, 3.55, FACE_S, { kind: "counter", pose: "pour", tags: ["work"] });
    L.stand("asking", "at the reference desk", 12.2, 5.7, FACE_N, { kind: "counter", pose: "stand", places: 2, spacing: 1.2, tags: ["rest"] });

    L.desk("desk", "the research desk", 3.6, 7.0, FACE_N, {
      screens: 2, seed: 161, lamp: true, tone: MAT.wood,
    });
    L.draw((ctx, ox, oy) => {
      for (let i = 0; i < 4; i++) papers(ctx, ox + 4.2 + (i % 2) * 0.3, oy + 5.95, 3 + i, 20 + i, FLOOR_Z + 0.88 + i * 0.05);
    });
    L.desk("standing", "the standing desk", 13.4, 7.6, FACE_N, { style: "standing", seed: 163 });

    L.sofa("chairs", "the reading chairs", 4.0, 10.6, FACE_N, 2, { tone: MAT.cloth, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 1.2, oy + 7.0, 1.1);
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
    });

    L.base({ rest: [11.6, 10.8], front: [2.6, 12.1] });
    L.lamp(3.6, 5.2, { power: 0.9, radius: 5.5, tint: MAT.green, style: "shade" });
    L.lamp(12.2, 5.2, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(8.0, 9.6, { power: 0.8, radius: 5, style: "globe" });
  },
});
