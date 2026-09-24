import { AMBER, CYAN, GREEN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { stool } from "../../props/furniture";
import { windsock, zincBar } from "../../props/heroes-west";
import { coffeeMachine } from "../../props/fixtures";
import { plant, poster, sign } from "../../props/objects";
import { rackWall } from "../kit";
import { defineHall, FACE_N } from "../layout";

/** A small hall that gets a lot out of a little, with a café in it. Paris. */
export const mistral = defineHall({
  id: "mistral",
  name: "Mistral",
  plaque: "MISTRAL",
  kind: "lab",
  city: "Paris",
  region: "France",
  tagline: "The workshop café",
  ethos: "Small, efficient, and yours to run wherever you like.",
  blurb:
    "A zinc bar along the north wall with bottles behind it, bistro tables, a herringbone floor, two racks where a neighbour would have six, and a windsock in the corner that is always blowing.",
  reading:
    "The one hall in Europe that looks like a café, and the one that argues efficiency is a design goal rather than a compromise: count the racks against the work leaving the room. The windsock is for the wind the lab is named after, which blows down the Rhône valley and apparently also through this room.",
  facts: [
    { label: "House style", value: "Efficiency as a position" },
    { label: "In the hall", value: "{roster}" },
    { label: "Open weights", value: "Much of the line" },
  ],
  accent: AMBER,
  floor: { tone: { r: 170, g: 150, b: 128 }, pattern: "herringbone", alt: { r: 140, g: 122, b: 104 } },
  people: [
    {
      id: "flagship",
      name: "Mistral Medium 3.5",
      role: "The paid flagship",
      tier: "Flagship",
      doing: "Holds the workshop bench and keeps the room's one long job.",
      why: "{short} is the hall's top tier, the one you call when the small models will not do. It stays where the work is heaviest.",
      chips: ["Flagship", "Multilingual", "Hosted"],
      accent: AMBER,
      scale: 1.01,
      home: "bench",
      haunts: ["bar", "racks", "bistro-1"],
      interests: ["teach", "visit"],
      traits: { focus: 0.88, sociability: 0.5, pace: 0.95 },
      look: { outfit: "jacket", hair: "short", acc: ["scarf"] },
    },
    {
      id: "agent",
      name: "Devstral 2",
      role: "Agents that write code",
      tier: "Coding",
      doing: "Moves between the code desk and the racks, fixing as it goes.",
      why: "{short} is the coding agent of the line, open enough to run on your own machine. It behaves like someone who has the keys.",
      chips: ["Open weights", "Agentic", "Repo-scale"],
      accent: CYAN,
      scale: 0.93,
      home: "code",
      haunts: ["racks", "rest", "door-e", "front"],
      traits: { pace: 1.35, focus: 0.26, sociability: 0.7, range: 1.5 },
      carries: "slate",
      look: { outfit: "hoodie", hair: "crop" },
    },
    {
      id: "coder",
      name: "Codestral",
      role: "Completion, at speed",
      tier: "Fast",
      doing: "Takes short trips and comes straight back to the bar.",
      why: "{short} is the small, quick completion model. Its whole value is the round trip being short.",
      chips: ["Low latency", "Fill in the middle", "Small"],
      accent: VIOLET,
      scale: 0.79,
      home: "standing",
      haunts: ["bar", "code", "rest", "door-w"],
      interests: ["learn", "exam"],
      traits: { pace: 1.75, focus: 0.09, sociability: 0.72, range: 1.7 },
      carries: "mug",
      look: { outfit: "tee", hair: "cap" },
    },
    {
      id: "small",
      name: "Mistral Small 4",
      role: "Small enough to take home",
      tier: "Small",
      doing: "Sits at a bistro table with a coffee and does a great deal of work on very little.",
      why: "{short} is the open small model, built to run on hardware a person can own. It is the clearest statement of the lab's position, and it takes its coffee at the table by the window.",
      chips: ["Open weights", "Runs local", "Multilingual"],
      accent: GREEN,
      scale: 0.86,
      home: "bistro-1",
      haunts: ["bar", "bistro-2", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.1, focus: 0.5, sociability: 0.8 },
      look: { outfit: "dress", hair: "bun" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      zincBar(ctx, ox + 1.2, oy + 1.65, 4.4);
      coffeeMachine(ctx, ox + 4.6, oy + 1.75, FLOOR_Z + 1.1, 1);
      for (const x of [1.8, 2.9, 4.0, 5.1]) stool(ctx, ox + x, oy + 2.95, MAT.darkMetal, 0.74);
      windsock(ctx, ox + 12.6, oy + 2.6);
      poster(ctx, ox + 7.0, oy + 0.62, FLOOR_Z + 1.6, 1.2, 1.6, 7, [MAT.lamp, MAT.led, MAT.paper]);
      sign(ctx, "ATELIER", ox + 3.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.places("bar", "the zinc bar", "counter", [[1.8, 2.95, FACE_N], [2.9, 2.95, FACE_N], [4.0, 2.95, FACE_N], [5.1, 2.95, FACE_N]], {
      pose: "eat", seat: 0.74, tags: ["social"],
    });

    rackWall(L, "racks", 8.8, 3.4, 2, "M", { height: 4.1, places: 1 });

    L.desk("bench", "the workshop bench", 5.2, 7.2, FACE_N, { screens: 2, tone: MAT.wood, seed: 71, lamp: true });
    L.desk("code", "the code desk", 9.6, 7.2, FACE_N, { screens: 2, seed: 73 });
    L.desk("standing", "the standing desk", 13.2, 6.0, FACE_N, { style: "standing", seed: 77 });

    L.round("bistro-1", "a bistro table", 3.2, 10.2, 0.42, 2, { tone: MAT.stone, chairTone: MAT.woodDark, phase: 0, tags: ["social"] });
    L.round("bistro-2", "a bistro table", 12.6, 10.2, 0.42, 2, { tone: MAT.stone, chairTone: MAT.woodDark, phase: 0, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 1.2, oy + 6.2, 1.2);
      plant(ctx, ox + 14.8, oy + 4.6, 1.1);
    });

    L.base({ rest: [8.0, 9.8], front: [4.6, 12.1] });
    L.lamp(3.4, 4.0, { power: 1.0, radius: 5.5, style: "globe" });
    L.lamp(8.0, 6.4, { power: 1.1, radius: 6.5, style: "shade" });
    L.lamp(12.6, 9.6, { power: 0.8, radius: 5, style: "globe" });
  },
});
