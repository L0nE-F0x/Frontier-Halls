import { CYAN, RED } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { pawPrints, robotaxi, searchBar } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_W } from "../layout";

/**
 * ERNIE: the vision model the index lists, and the reasoning line by hand.
 * The country's search engine, and its robotaxi service, in one hall.
 */
export const baidu = defineHall({
  id: "baidu",
  name: "Baidu",
  plaque: "BAIDU",
  kind: "lab",
  city: "Beijing",
  region: "China",
  tagline: "Search, and the car that drives itself",
  ethos: "Find the answer, then build the thing that acts on it.",
  blurb:
    "A search box as long as the north wall with nothing typed in it, a white robotaxi in its bay with the lidar turning on its roof, and a line of paw prints across the floor from the west door.",
  reading:
    "Baidu was a search engine long before it was a lab, and the box on the wall is still the first thing in the room. The car is the other half of the company: a robotaxi, the sensor dome on its roof turning whether or not it is going anywhere. The paws are the bear on the company's mark.",
  facts: [
    { label: "House style", value: "Search, then act" },
    { label: "In the hall", value: "{roster}" },
    { label: "In the bay", value: "A robotaxi" },
  ],
  accent: RED,
  floor: { tone: { r: 170, g: 170, b: 168 }, pattern: "concrete", alt: { r: 146, g: 146, b: 146 } },
  people: [
    {
      id: "vl",
      name: "ERNIE 4.5 VL",
      role: "Reads pictures as readily as pages",
      tier: "Multimodal",
      doing: "Works the desk under the search box and looks at everything twice.",
      why: "{short} is the vision-and-language model of the family, large and sparse: it reads a photograph as readily as a paragraph.",
      chips: ["Vision", "Mixture of experts", "Open weights"],
      accent: CYAN,
      scale: 1.0,
      home: "desk-1",
      haunts: ["car", "table"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.45, pace: 0.95 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "x1",
      name: "ERNIE X1",
      role: "Thinks before it answers",
      tier: "Reasoning",
      doing: "Keeps the east desk, and spends its breaks standing by the car.",
      why: "{short} is the reasoning line, the one that works a problem through before it replies. It spends its breaks by the robotaxi, which is also a model of sorts.",
      chips: ["Reasoning", "Deep thinking", "Tool use"],
      accent: RED,
      scale: 0.96,
      home: "desk-2",
      haunts: ["car", "rest", "table", "front"],
      traits: { pace: 1.1, focus: 0.6, sociability: 0.55, range: 1.3 },
      look: { outfit: "vest", hair: "long", acc: ["glasses"] },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      robotaxi(ctx, ox + 3.4, oy + 5.2, FACE_N);
      searchBar(ctx, ox + 10.2, oy, 5.2, FLOOR_Z + 2.2, true);
      pawPrints(ctx, ox + 1.0, oy + 10.4, ox + 12.8, oy + 10.4, MAT.led);
      sign(ctx, "APOLLO", ox + 3.4, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("car", "beside the robotaxi", 5.6, 5.2, FACE_W, { kind: "window", pose: "watch", places: 2, spacing: 1.2, tags: ["rest"] });

    L.desk("desk-1", "the desk under the search box", 11.2, 6.4, FACE_N, { screens: 2, seed: 201 });
    L.desk("desk-2", "the east desk", 13.9, 6.4, FACE_N, { screens: 1, seed: 203 });

    L.round("table", "the round table", 12.2, 10.0, 0.55, 3, { tone: MAT.white, tags: ["social"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 1.2, oy + 1.2, 1.1);
      plant(ctx, ox + 5.2, oy + 12.0, 1.0);
    });

    L.base({ rest: [8.0, 8.6], front: [3.0, 12.1] });
    L.lamp(3.4, 5.2, { power: 1.1, radius: 6.5, style: "track" });
    L.lamp(12.4, 5.0, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(8.0, 10.2, { power: 0.8, radius: 5, style: "globe" });
  },
});
