import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { stool, whiteboard } from "../../props/furniture";
import { teaTable, whale } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { rackSide } from "../kit";
import { defineHall, FACE_E, FACE_N, FACE_W } from "../layout";

/** The hall that publishes its method. Reasoning traces are the output here, not a by-product. */
export const deepseek = defineHall({
  id: "deepseek",
  name: "DeepSeek",
  plaque: "DEEPSEEK",
  kind: "lab",
  city: "Hangzhou",
  region: "China",
  tagline: "The long working",
  ethos: "Show the working, and show what it cost to get it.",
  blurb:
    "Two boards covered edge to edge in working, racks down the east wall, a tea table by the west door, and a whale swimming slowly through the air over the middle of the room.",
  reading:
    "The boards are the point of the room. Everywhere else in the building the working is thrown away and the answer kept; here the working is the thing on the wall. The whale is the lab's own mark, hung from the trusses. The tea on the table is from the hills above the lake, a few kilometres from the real office.",
  facts: [
    { label: "House style", value: "Publish the method" },
    { label: "In the hall", value: "{roster}" },
    { label: "Open weights", value: "Yes, with the paper" },
  ],
  accent: CYAN,
  floor: { tone: { r: 162, g: 168, b: 174 }, pattern: "tile", alt: { r: 138, g: 144, b: 152 } },
  people: [
    {
      id: "pro",
      name: "DeepSeek V4 Pro",
      role: "Reasoning, shown",
      tier: "Reasoning",
      doing: "Works the boards and adds to them without rubbing anything out.",
      why: "{short} is the reasoning end of the line: it thinks in the open, at length, and the trace is part of what you get.",
      chips: ["Chain of thought", "Open weights", "Slow on purpose"],
      accent: VIOLET,
      scale: 1.0,
      home: "boards",
      haunts: ["desk-1", "racks", "tea"],
      interests: ["teach", "visit"],
      traits: { focus: 0.93, sociability: 0.38, pace: 0.82 },
      carries: "papers",
      look: { outfit: "tee", hair: "short", acc: ["glasses"] },
    },
    {
      id: "flash",
      name: "DeepSeek V4.1 Flash",
      role: "General work, cheaply",
      tier: "Workhorse",
      doing: "Keeps the ledger desk and takes whatever comes through the door.",
      why: "{short} is the general model the hall runs on, priced so that running it a great many times is the normal thing to do.",
      chips: ["General use", "Very cheap", "Open weights"],
      accent: AMBER,
      scale: 0.96,
      home: "desk-1",
      haunts: ["racks", "rest", "front", "tea"],
      traits: { pace: 1.2, focus: 0.4, sociability: 0.6, range: 1.3 },
      carries: "slate",
      look: { outfit: "hoodie", hair: "crop" },
    },
    {
      id: "distill",
      name: "DeepSeek V3.2",
      role: "The line still in service",
      tier: "Small",
      doing: "Runs the same errand the big model would, in a fraction of the time.",
      why: "{short} is the older line, still carrying ordinary traffic. It goes where the flagship cannot afford to.",
      chips: ["Distilled", "Runs local", "Several sizes"],
      accent: CYAN,
      scale: 0.77,
      home: "racks",
      haunts: ["door-w", "door-e", "desk-1", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.7, focus: 0.12, sociability: 0.78, range: 1.9 },
      look: { outfit: "vest", hair: "cap" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      whiteboard(ctx, ox + 0.8, oy + 0.62, FLOOR_Z + 1.2, 4.8, 2.8, 84, "SHOW THE WORKING");
      whiteboard(ctx, ox + 10.4, oy + 0.62, FLOOR_Z + 1.2, 4.8, 2.8, 85, "AND WHAT IT COST");
      whale(ctx, ox + 8.0, oy + 6.0, FLOOR_Z + 4.4);
      sign(ctx, "THE WORKING", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("boards", "the boards of working", 3.2, 1.55, FACE_N, { kind: "board", pose: "write", places: 2, spacing: 1.6, tags: ["work"] });
    rackSide(L, "racks", 14.2, 3.4, 4.6, 3, "w", "V", { height: 4.4, places: 2 });

    L.desk("desk-1", "the ledger desk", 4.2, 7.0, FACE_N, { screens: 2, seed: 81, chair: MAT.darkMetal });
    L.desk("desk-2", "the second desk", 10.4, 7.0, FACE_N, { screens: 1, seed: 83, chair: MAT.darkMetal });

    L.draw((ctx, ox, oy) => {
      teaTable(ctx, ox + 3.4, oy + 10.6);
      stool(ctx, ox + 2.3, oy + 10.6, MAT.woodDark, 0.44);
      stool(ctx, ox + 4.5, oy + 10.6, MAT.woodDark, 0.44);
      plant(ctx, ox + 5.3, oy + 12.0, 1.1);
      plant(ctx, ox + 13.4, oy + 12.1, 1.0);
    });
    L.places("tea", "the tea table", "table", [[2.3, 10.6, FACE_E], [4.5, 10.6, FACE_W]], { pose: "eat", seat: 0.44, tags: ["social"] });

    L.base({ rest: [11.8, 10.6], front: [11.6, 12.1] });
    L.lamp(7.2, 6.2, { power: 1.25, radius: 7.2, style: "shade" });
    L.lamp(3.4, 9.6, { power: 0.7, radius: 4.4, style: "lantern", tint: MAT.lamp });
  },
});
