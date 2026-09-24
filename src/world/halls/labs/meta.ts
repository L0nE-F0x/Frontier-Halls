import { AMBER, CYAN, VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { banner } from "../../props/furniture";
import { crate, pallet } from "../../props/fixtures";
import { floorWord, headsetStand } from "../../props/heroes-west";
import { floorTape, plant, sign } from "../../props/objects";
import { rackWall } from "../kit";
import { defineHall, FACE_E, FACE_N } from "../layout";

/** HACK is painted a shade lighter than the floor it is on. */
const HACK_TONE = { r: 196, g: 192, b: 204 };

/**
 * Muse Spark 1.3 is the closed frontier model; Muse Glimmer 30B the
 * open-weight agent; Llama 4 the open-weight line (Maverick, Scout).
 */
export const meta = defineHall({
  id: "meta",
  name: "Meta",
  plaque: "META",
  kind: "lab",
  city: "Menlo Park",
  region: "United States",
  tagline: "The hall that held the door",
  ethos: "Keep a frontier model, and also put weights where other people can carry them.",
  blurb:
    "HACK in letters two metres high on the floor, a stand of headsets with one missing, a row of racks, and a loading bay by the east door where the crates leave.",
  reading:
    "Read this one as a hinge. Spark works inside; Glimmer and Llama walk out. The bay by the east door is loading, not storage: those crates leave, and a good many of the other halls in the building have been built on what was in them. The word on the floor is painted in the courtyard of the real campus.",
  facts: [
    { label: "House style", value: "Both at once" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the floor", value: "HACK" },
  ],
  accent: VIOLET,
  floor: { tone: { r: 170, g: 166, b: 180 }, pattern: "concrete", alt: { r: 148, g: 144, b: 158 } },
  people: [
    {
      id: "flagship",
      name: "Muse Spark 1.3",
      role: "Closed frontier",
      tier: "Flagship",
      doing: "Works the inside desk and stays inside the hall.",
      why: "{short} is Meta's closed frontier model. The desk is inside work: capable, and not walked out of the door.",
      chips: ["Closed weights", "Frontier", "Inside only"],
      accent: AMBER,
      scale: 1.03,
      home: "inside",
      haunts: ["racks", "headsets"],
      interests: ["teach"],
      traits: { focus: 0.95, sociability: 0.32, pace: 0.9, range: 0.2 },
      look: { outfit: "hoodie", hair: "short" },
    },
    {
      id: "small",
      name: "Muse Glimmer 30B",
      role: "Open-weight agent",
      tier: "Open agent",
      doing: "Walks from the bay to the door and back.",
      why: "{short} is a smaller open-weight agent. The door is a real exit, and it is sized to use it.",
      chips: ["Open weights", "30B", "Agentic"],
      accent: CYAN,
      scale: 0.84,
      home: "load",
      haunts: ["threshold", "door-e", "rest", "inside", "front"],
      traits: { pace: 1.45, focus: 0.18, sociability: 0.75, range: 2.2 },
      carries: "case",
      look: { outfit: "tee", hair: "cap" },
    },
    {
      id: "open",
      name: "Llama 4 Maverick",
      role: "Open weights",
      tier: "Open line",
      doing: "Stands in the gateway and does not block it.",
      why: "{short} is the open-weight line, Scout beside it. The figure holds the threshold so the way out stays open.",
      chips: ["Maverick", "Scout", "Downloadable"],
      accent: VIOLET,
      scale: 1.01,
      home: "threshold",
      haunts: ["load", "rest", "sofa"],
      traits: { focus: 0.75, sociability: 0.62, pace: 0.95, range: 0.6 },
      look: { outfit: "vest", hair: "curly" },
    },
  ],
  layout(L) {
    rackWall(L, "racks", 10.4, 4.8, 3, "M", { height: 4.9, places: 2 });
    L.draw((ctx, ox, oy) => {
      banner(ctx, ox + 1.2, oy + 0.66, FLOOR_Z + 2.4, 1.5, 2.6, MAT.seal, "OPEN");
      headsetStand(ctx, ox + 2.2, oy + 4.2);
      floorWord(ctx, "HACK", ox + 7.0, oy + 8.8, 0.26, HACK_TONE);
      sign(ctx, "TO THE EAST WING", ox + 12.6, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.stand("headsets", "the headsets", 2.2, 5.2, FACE_N, { kind: "rack", pose: "read", tags: ["rest"] });

    L.desk("inside", "the inside desk", 5.2, 6.6, FACE_N, { screens: 2, seed: 61 });

    // The bay, where the crates go out.
    L.draw((ctx, ox, oy) => {
      floorTape(ctx, ox + 10.8, oy + 4.6, 3.8, 3.0, MAT.lamp, true);
      pallet(ctx, ox + 11.2, oy + 5.0);
      crate(ctx, ox + 11.3, oy + 5.1, 0.8, 2, MAT.bench);
      crate(ctx, ox + 13.0, oy + 5.2, 0.7, 1, MAT.bench);
    });
    L.stand("load", "the loading bay", 12.4, 7.2, FACE_N, { kind: "floor", pose: "read", tags: ["work"] });
    L.stand("threshold", "the east threshold", 13.8, 10.4, FACE_E, { kind: "door", pose: "stand", tags: ["work"] });

    L.sofa("sofa", "the sofa", 3.4, 11.2, FACE_N, 3, { tone: MAT.seal, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 8.6, oy + 12.0, 1.1);
      plant(ctx, ox + 15.1, oy + 5.4, 1.0);
    });

    L.base({ rest: [9.6, 11.0], front: [11.4, 11.8] });
    L.lamp(5.2, 5.8, { power: 1.2, radius: 7, style: "shade" });
    L.lamp(12.4, 6.4, { power: 0.9, radius: 5.2, style: "track" });
    L.lamp(5.0, 10.4, { power: 0.7, radius: 4.5, style: "globe" });
  },
});
