import { AMBER, CYAN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { cushion, table } from "../../props/furniture";
import { chabudai, docScanner, solarArray } from "../../props/heroes-east";
import { papers, plant, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/** Solar Pro 4 and Solar Mini 4, from the index. A Korean lab whose models are named for the sun and whose customers send it paper. */
export const upstage = defineHall({
  id: "upstage",
  name: "Upstage",
  plaque: "UPSTAGE",
  kind: "lab",
  city: "South Korea",
  region: "South Korea",
  tagline: "Sun and paper",
  ethos: "Make a model small enough to afford and good enough to read a company's paperwork.",
  blurb:
    "Rows of solar panels on raked frames along the north wall, document scanners with their light bars sweeping, a table stacked with forms, and a low table with cushions round it.",
  reading:
    "The models are called Solar, so the panels along the north wall are the obvious joke; the lamp over them is the only sun the building has. The scanners are the rest of the business: much of what the lab's customers want is the paperwork read, and read correctly.",
  facts: [
    { label: "House style", value: "Small, and exact" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the table", value: "Other people's forms" },
  ],
  accent: AMBER,
  floor: { tone: { r: 178, g: 170, b: 150 }, pattern: "plank", alt: { r: 154, g: 146, b: 128 } },
  people: [
    {
      id: "pro",
      name: "Solar Pro 4",
      role: "The flagship",
      tier: "Flagship",
      doing: "Works the west desk and goes over each form twice.",
      why: "{short} is the lab's largest model, built to fit on a single card and still do careful work: reading, reasoning, filling in the form correctly.",
      chips: ["Efficient", "Documents", "Korean and English"],
      accent: AMBER,
      scale: 1.0,
      home: "desk",
      haunts: ["forms", "panels", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.86, sociability: 0.5, pace: 0.95 },
      look: { outfit: "suit", hair: "short" },
    },
    {
      id: "mini",
      name: "Solar Mini 4",
      role: "Reads the paperwork",
      tier: "Small",
      doing: "Feeds the scanners and carries the pages to the table of forms.",
      why: "{short} is the small model of the line, cheap enough to put in front of every page a company scans.",
      chips: ["Small", "Fast", "Documents"],
      accent: CYAN,
      scale: 0.84,
      home: "scanners",
      haunts: ["forms", "rest", "front", "table"],
      interests: ["learn", "exam"],
      traits: { pace: 1.5, focus: 0.3, sociability: 0.72, range: 1.5 },
      carries: "papers",
      look: { outfit: "tee", hair: "bun" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      solarArray(ctx, ox + 0.8, oy + 1.0, 2);
      solarArray(ctx, ox + 10.6, oy + 1.0, 2);
      docScanner(ctx, ox + 11.2, oy + 5.0);
      docScanner(ctx, ox + 12.6, oy + 5.0);
      sign(ctx, "SOLAR", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.06);
    });
    L.stand("panels", "the panels", 2.6, 2.7, FACE_N, { kind: "window", pose: "watch", tags: ["rest"] });
    L.stand("scanners", "the scanners", 12.4, 6.45, FACE_N, { kind: "bench", pose: "pour", places: 2, spacing: 1.4, tags: ["work"] });

    L.desk("desk", "the west desk", 4.2, 7.2, FACE_N, { screens: 2, seed: 251 });
    L.draw((ctx, ox, oy) => {
      table(ctx, ox + 11.2, oy + 8.8, 3.2, 1.0, MAT.wood);
      for (let i = 0; i < 5; i++) papers(ctx, ox + 11.6 + i * 0.6, oy + 9.1, 2 + (i % 3), 30 + i, FLOOR_Z + 0.9);
    });
    L.stand("forms", "the table of forms", 12.8, 10.35, FACE_N, { kind: "table", pose: "read", places: 2, spacing: 1.2, tags: ["work"] });

    // A low table with cushions, for sitting on the floor.
    L.draw((ctx, ox, oy) => {
      chabudai(ctx, ox + 3.8, oy + 10.4, 0.6);
      for (const [x, y] of [[2.9, 10.4], [4.7, 10.4], [3.8, 11.3]] as const) cushion(ctx, ox + x, oy + y, MAT.seal);
      plant(ctx, ox + 5.3, oy + 12.1, 1.0);
      plant(ctx, ox + 14.8, oy + 11.8, 1.2);
    });
    L.places("table", "the low table", "lounge", [[2.9, 10.4, FACE_E], [4.7, 10.4, FACE_W], [3.8, 11.3, FACE_N]], {
      pose: "eat", seat: 0.14, tags: ["social"],
    });

    L.base({ rest: [11.2, 11.8], front: [8.0, 9.4], east: false });
    L.lamp(2.6, 3.0, { power: 1.2, radius: 5.5, tint: MAT.bulb, style: "globe" });
    L.lamp(12.6, 3.0, { power: 1.1, radius: 5.5, tint: MAT.bulb, style: "globe" });
    L.lamp(4.2, 8.6, { power: 0.8, radius: 5, style: "shade" });
  },
});
