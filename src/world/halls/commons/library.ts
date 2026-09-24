import { CYAN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { shelf, shelfY } from "../../props/furniture";
import { dedupe, ladder, sourceCrate, tapeLibrary, tokenizer, tokenTube } from "../../props/commons";
import { motes, plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S, FACE_W } from "../layout";

/**
 * The corpus. Where everything the day's run will read is kept, sorted and
 * cut into tokens. It is the first room of the pipeline, at the west end of
 * the spine, and the tube that leaves it runs east over the partition into
 * the cluster.
 */
export const TUBE_Y = 3.25;
export const TUBE_Z = FLOOR_Z + 5.45;

export const library = defineHall({
  id: "library",
  name: "The Corpus",
  plaque: "THE CORPUS",
  kind: "commons",
  tagline: "Where the reading is kept",
  ethos: "A model is what it has read. Keep the reading, and keep it clean.",
  blurb:
    "Stacks to the ceiling, a tape robot running along its rail, and a tokenizer that takes in books at the top and sends tokens up a glass tube to the cluster.",
  reading:
    "Three crawlers keep this room: one fetches, one shelves, one feeds the tokenizer. The crates by the north wall are the day's sources — the web, code, books, mathematics — and the sieve in the middle is where the duplicates fall out. Follow the tube east and it drops into the pod.",
  facts: [
    { label: "Pipeline", value: "Step one of six" },
    { label: "Feeds", value: "The pod in Pretraining, by tube" },
    { label: "Kept by", value: "Three crawlers" },
  ],
  accent: CYAN,
  floor: { tone: { r: 170, g: 162, b: 150 }, pattern: "plank", alt: { r: 148, g: 140, b: 128 } },
  people: [],
  staff: [
    {
      id: "fetch",
      name: "Crawler F",
      short: "Crawler F",
      role: "Fetches the web",
      tier: "Crawler",
      doing: "Brings crates in from the north wall and sets them by the sieve.",
      why: "The corpus grows every day. Most of what comes in is the web, and most of the web is read once, sieved and set aside.",
      chips: ["Robot", "Tireless", "Polite to robots.txt"],
      accent: CYAN,
      scale: 0.9,
      home: "crates",
      haunts: ["sieve", "shelves-1", "hopper"],
      look: { body: "bot" },
      traits: { pace: 1.1, focus: 0.1, sociability: 0 },
      carries: "papers",
    },
    {
      id: "shelve",
      name: "Crawler S",
      short: "Crawler S",
      role: "Keeps the stacks",
      tier: "Crawler",
      doing: "Runs the aisles between the stacks, putting back what was taken out.",
      why: "Books are the part of the corpus that was written to be read all the way through, which is why the stacks are kept whole.",
      chips: ["Robot", "Books", "Knows every shelf"],
      accent: CYAN,
      scale: 0.9,
      home: "shelves-1",
      haunts: ["shelves-2", "shelves-3", "tapes"],
      look: { body: "bot" },
      traits: { pace: 1.0, focus: 0.1, sociability: 0 },
    },
    {
      id: "feed",
      name: "Crawler T",
      short: "Crawler T",
      role: "Feeds the tokenizer",
      tier: "Crawler",
      doing: "Carries what the sieve lets through to the hopper, and watches it go in.",
      why: "Everything the run will ever read goes past this one, cut into tokens, and up the tube.",
      chips: ["Robot", "Tokenizer", "Last to touch it"],
      accent: CYAN,
      scale: 0.9,
      home: "hopper",
      haunts: ["sieve", "crates"],
      look: { body: "bot" },
      traits: { pace: 1.2, focus: 0.1, sociability: 0 },
      carries: "papers",
    },
  ],
  layout(L) {
    // Stacks: one tall run down the west wall, three double runs across.
    L.draw((ctx, ox, oy) => {
      shelfY(ctx, ox + 0.65, oy + 0.9, 7.0, 6, 3, 0.5);
      shelf(ctx, ox + 2.0, oy + 2.3, 3.6, 5, 11, 0.62);
      shelf(ctx, ox + 2.0, oy + 4.6, 3.6, 5, 17, 0.62);
      shelf(ctx, ox + 2.0, oy + 6.9, 3.6, 5, 23, 0.62);
      ladder(ctx, ox + 5.0, oy + 2.95, 3.2);
    });
    L.stand("shelves-1", "the first aisle", 3.8, 3.7, FACE_N, { kind: "rack", pose: "read", tags: ["staff"] });
    L.stand("shelves-2", "the second aisle", 3.2, 6.0, FACE_N, { kind: "rack", pose: "read", tags: ["staff"] });
    L.stand("shelves-3", "the west stacks", 1.7, 8.4, FACE_W, { kind: "rack", pose: "read", tags: ["staff"] });

    // The day's sources along the north wall, east of the door.
    L.draw((ctx, ox, oy) => {
      sourceCrate(ctx, ox + 10.6, oy + 0.75, "CODE", MAT.bench);
      sourceCrate(ctx, ox + 11.8, oy + 0.75, "WEB", MAT.benchDark);
      sourceCrate(ctx, ox + 13.0, oy + 0.75, "BOOKS", MAT.bench);
      sourceCrate(ctx, ox + 14.2, oy + 0.75, "MATH", MAT.benchDark);
    });
    L.stand("crates", "the source crates", 12.4, 2.25, FACE_N, { kind: "floor", pose: "read", tags: ["staff"] });

    // The sieve, then the tokenizer, then up the tube and east.
    L.draw((ctx, ox, oy) => dedupe(ctx, ox + 7.9, oy + 3.4));
    L.stand("sieve", "the sieve", 8.55, 5.5, FACE_N, { kind: "floor", pose: "read", tags: ["staff"] });
    L.draw((ctx, ox, oy) => tokenizer(ctx, ox + 10.4, oy + 2.6));
    L.stand("hopper", "the tokenizer", 11.3, 4.75, FACE_N, { kind: "bench", pose: "read", tags: ["staff"] });
    L.draw((ctx, ox, oy) =>
      tokenTube(ctx, [
        [ox + 11.3, oy + TUBE_Y, FLOOR_Z + 2.0],
        [ox + 11.3, oy + TUBE_Y, TUBE_Z],
        [ox + L.w, oy + TUBE_Y, TUBE_Z],
      ]),
    );

    L.draw((ctx, ox, oy) => tapeLibrary(ctx, ox + 12.5, oy + 5.6, 3.0));
    L.stand("tapes", "the tape library", 14.0, 7.5, FACE_N, { kind: "rack", pose: "read", tags: ["staff"] });

    // Reading tables and carrels, for any model that comes to see what it read.
    L.table("reading", "the reading table", 6.3, 8.2, 3.4, 1.2, {
      per: 3, pose: "read", tags: ["visit"], tone: MAT.wood,
    });
    L.desk("carrel-1", "a carrel", 2.4, 10.8, FACE_N, { style: "carrel", pose: "read", tags: ["visit"], tone: MAT.wood });
    L.desk("carrel-2", "a carrel", 4.3, 10.8, FACE_N, { style: "carrel", pose: "read", tags: ["visit"], tone: MAT.wood });

    L.stand("rest", "the corridor", 12.8, 11.0, FACE_S, { kind: "rest", places: 3, tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, FACE_W, { kind: "door", tags: ["rest"] });

    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 1.2, oy + 12.2, 1.2);
      plant(ctx, ox + 14.2, oy + 12.2, 1.0);
      sign(ctx, "THE CORPUS", ox + 3.6, oy + 0.56, FLOOR_Z + 5.9, 0.055);
      motes(ctx, ox + 1, oy + 1, L.w - 2, 11, 28);
    });

    L.lamp(3.8, 4.6, { power: 1.1, radius: 6.5, style: "globe" });
    L.lamp(11.0, 4.0, { power: 1.0, radius: 6.0, style: "shade" });
    L.lamp(8.0, 9.4, { power: 0.9, radius: 5.5, style: "globe" });
  },
});
