import { AMBER, CYAN, VIOLET } from "../accents";
import { MAT } from "../materials";
import { FLOOR_Z, RD, RW } from "../metrics";
import { banner, whiteboard } from "../props/furniture";
import { crate, pallet } from "../props/fixtures";
import { floorTape, motes, plant, sign } from "../props/objects";
import { baseStations, computeWall, corners, serviceBay, sideRacks, workstation } from "./kit";
import { FACE_E, FACE_N, station, type HallSpec } from "./types";

/**
 * Muse Spark 1.3 is the closed frontier model.
 * Muse Glimmer 30B is the open-weight agent.
 * Llama 4 is the open-weight line (Maverick, Scout).
 */
export const meta: HallSpec = {
  id: "meta",
  key: "5",
  name: "Meta",
  plaque: "META",
  tagline: "The hall that held the door",
  ethos: "Keep a frontier model, and also put weights where other people can carry them.",
  blurb:
    "Spark works inside. Glimmer walks out. The frame this hall used to hold open is now three more halls of open weights.",
  reading:
    "Read this one as a hinge. The halls built before it keep their weights; the halls built after it hand them out. The bay by the door is loading, not storage: those crates leave.",
  facts: [
    { label: "House style", value: "Both at once" },
    { label: "In the hall", value: "{roster}" },
    { label: "Built after it", value: "Open weights" },
  ],
  accent: VIOLET,
  floor: { r: 176, g: 170, b: 186 },
  index: 4,
  lamps: [
    { x: 6.4, y: 6.6, power: 1.2, radius: 7.2 },
    { x: 13.2, y: 9.6, power: 0.85, radius: 5.2 },
  ],
  stations: [
    ...baseStations(),
    station("inside", "the inside bench", "bench", 6.2, 6.4, FACE_N),
    station("load", "the loading bay", "floor", 12.8, 8.0, FACE_E),
    station("threshold", "the east threshold", "door", 15.4, 10.4, FACE_E),
  ],
  people: [
    {
      id: "flagship",
      name: "Muse Spark 1.3",
      role: "Closed frontier",
      tier: "Flagship",
      doing: "Works the bench and stays inside the hall.",
      why: "{short} is Meta's closed frontier model. The bench is inside work: capable, and not walked out the door.",
      chips: ["Closed weights", "Frontier", "Inside only"],
      accent: AMBER,
      scale: 1.03,
      home: "inside",
      haunts: ["board", "racks"],
      traits: { focus: 0.95, sociability: 0.32, pace: 0.9, range: 0.2 },
    },
    {
      id: "small",
      name: "Muse Glimmer 30B",
      role: "Open-weight agent",
      tier: "Open agent",
      doing: "Walks from the bench to the door and back.",
      why: "{short} is a smaller open-weight agent. The door is a real exit, and it is sized to use it.",
      chips: ["Open weights", "30B", "Agentic"],
      accent: CYAN,
      scale: 0.84,
      home: "load",
      haunts: ["threshold", "door-e", "rest", "inside", "front"],
      traits: { pace: 1.45, focus: 0.18, sociability: 0.75, range: 2.2 },
      carries: "case",
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
      haunts: ["load", "rest"],
      traits: { focus: 0.75, sociability: 0.62, pace: 0.95, range: 0.6 },
    },
  ],
  dress(ctx, ox, oy) {
    computeWall(ctx, ox, oy, 5, "M", 4.9);
    sideRacks(ctx, ox + 0.9, oy, 3, "F", 4.2);
    workstation(ctx, ox + 5.2, oy + 5.6, FACE_N, 61, { screens: 2 });
    workstation(ctx, ox + 2.4, oy + 4.4, FACE_N, 62);
    serviceBay(ctx, ox + 11.4, oy + 6.6, 63);
    pallet(ctx, ox + 13.4, oy + 9.3);
    crate(ctx, ox + 13.5, oy + 9.4, 0.8, 2);
    floorTape(ctx, ox + 10.9, oy + 6.1, 4.6, 4.2, MAT.lamp, true);
    banner(ctx, ox + 8.4, oy + 0.66, FLOOR_Z + 2.4, 1.5, 2.6, VIOLET, "OPEN");
    whiteboard(ctx, ox + 3.4, oy + 0.62, FLOOR_Z + 2.9, 3.0, 1.8, 64, "WEIGHTS");
    sign(ctx, "TO THE EAST WING", ox + 12.6, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    plant(ctx, ox + 8.8, oy + 11.6, 1.15);
    corners(ctx, ox, oy, 19);
    motes(ctx, ox + 1, oy + 1, RW - 2, RD - 2, 22);
  },
};
