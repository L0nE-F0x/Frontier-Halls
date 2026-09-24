import { AMBER, CYAN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { evTurntable, phoneTable, robotVacuum } from "../../props/heroes-east";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_W } from "../layout";

/** MiMo, in two sizes, from the index. A company that makes phones, cars and vacuum cleaners, and now this. */
export const xiaomi = defineHall({
  id: "xiaomi",
  name: "Xiaomi",
  plaque: "XIAOMI",
  kind: "lab",
  city: "Beijing",
  region: "China",
  tagline: "The showroom",
  ethos: "Put a capable model in everything a person owns, from the phone to the car.",
  blurb:
    "A car turning slowly on a turntable, a table of phones lit face up, and a robot vacuum doing the rounds of the south-east corner on its own.",
  reading:
    "The only lab in the building whose models go into a car. The hall is a showroom because the company is one: the same firm makes the phones on the table, the vacuum on the floor, and the saloon on the turntable, and MiMo is meant to run in all of them.",
  facts: [
    { label: "House style", value: "A model in everything" },
    { label: "In the hall", value: "{roster}" },
    { label: "On the turntable", value: "An electric saloon" },
  ],
  accent: AMBER,
  floor: { tone: { r: 184, g: 182, b: 178 }, pattern: "terrazzo", alt: { r: 158, g: 156, b: 152 } },
  people: [
    {
      id: "pro",
      name: "MiMo-V2.6-Pro",
      role: "The flagship",
      tier: "Flagship",
      doing: "Works the desk by the phones and walks over to watch the car turn.",
      why: "{short} is the top of the company's own line, the model the rest of its products are meant to grow into.",
      chips: ["Flagship", "Reasoning", "Agentic"],
      accent: AMBER,
      scale: 1.02,
      home: "desk-1",
      haunts: ["car", "phones", "sofa"],
      interests: ["teach", "visit"],
      traits: { focus: 0.85, sociability: 0.5, pace: 0.95 },
      look: { outfit: "jacket", hair: "short" },
    },
    {
      id: "flash",
      name: "MiMo-V2.6-Flash",
      role: "Fast enough for a phone",
      tier: "Fast",
      doing: "Checks each phone on the table in turn, then goes to see what the vacuum is doing.",
      why: "{short} is the quick, cheap end of the family, sized for the devices in people's pockets.",
      chips: ["Fast", "Cheap", "On-device"],
      accent: CYAN,
      scale: 0.84,
      home: "desk-2",
      haunts: ["phones", "car", "rest", "front"],
      interests: ["learn", "exam"],
      traits: { pace: 1.6, focus: 0.2, sociability: 0.75, range: 1.6 },
      carries: "slate",
      look: { outfit: "tee", hair: "cap" },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      evTurntable(ctx, ox + 4.0, oy + 5.0, MAT.lamp);
      phoneTable(ctx, ox + 10.6, oy + 1.9, 3.6);
      robotVacuum(ctx, ox + 10.4, oy + 8.8, 4.0, 2.4);
      sign(ctx, "MI", ox + 12.4, oy + 0.56, FLOOR_Z + 5.9, 0.07);
    });
    L.stand("car", "the turntable", 7.4, 5.0, FACE_W, { kind: "window", pose: "watch", places: 2, spacing: 1.2, tags: ["rest"] });
    L.stand("phones", "the phone table", 12.4, 3.35, FACE_N, { kind: "bench", pose: "read", places: 2, spacing: 1.4, tags: ["work"] });

    L.desk("desk-1", "the desk by the phones", 11.0, 6.4, FACE_N, { screens: 2, seed: 191, chair: MAT.white });
    L.desk("desk-2", "the east desk", 13.8, 6.4, FACE_N, { screens: 1, seed: 193, chair: MAT.white });

    L.sofa("sofa", "the sofa", 3.6, 10.6, FACE_N, 3, { tone: MAT.white, tags: ["social", "rest"] });
    L.draw((ctx, ox, oy) => {
      plant(ctx, ox + 1.2, oy + 1.2, 1.2);
      plant(ctx, ox + 14.8, oy + 1.2, 1.0);
    });

    L.base({ rest: [8.0, 9.4], front: [5.2, 12.2] });
    L.lamp(4.0, 5.0, { power: 1.1, radius: 6.5, style: "track" });
    L.lamp(12.4, 5.0, { power: 1.0, radius: 6, style: "globe" });
    L.lamp(8.0, 10.0, { power: 0.8, radius: 5, style: "globe" });
  },
});
