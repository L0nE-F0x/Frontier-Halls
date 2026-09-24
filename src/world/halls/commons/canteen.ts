import { AMBER } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { counter } from "../../props/furniture";
import { kitchenLine, menuBoard, pastryCase, servingLine, trayStation, trolley } from "../../props/commons";
import { coffeeMachine, fridge, vending, waterCooler } from "../../props/fixtures";
import { plant, sign, tray } from "../../props/objects";
import type { PersonSpec } from "../../person";
import { defineHall, FACE_N, FACE_S } from "../layout";

/** Tables, west to east, clear of both pairs of doors. */
const TABLES: [number, number][] = [[1.8, 3.8], [10.6, 4.6], [16.8, 4.6], [26.6, 3.6]];
const ROWS = [5.8, 8.8];

function cook(id: string, name: string, home: string, outfit: "apron", hair: "toque" | "cap", skin: number): PersonSpec {
  return {
    id,
    name,
    short: name,
    role: home === "bar" ? "Makes the coffee" : "Cooks",
    tier: "Staff",
    doing: home === "bar" ? "Pulls shots at the coffee bar and knows everyone's order." : "Works the line: stirs, plates, and keeps the pans full.",
    why: home === "bar"
      ? "Every lab in the building says its best ideas come out of a conversation, and most of those conversations start in the queue for coffee."
      : "Models do not eat. The building feeds them anyway, because lunch is when they sit at the same table as a lab from the other side of the world.",
    chips: home === "bar" ? ["Human", "Espresso", "Remembers names"] : ["Human", "The line", "Soup of the day"],
    accent: MAT.white,
    scale: 1,
    home,
    look: { outfit, hair, skin },
    hours: [6, 22],
    traits: { focus: 0.95, sociability: 0.6, appetite: 0 },
  };
}

/**
 * The canteen. Two rooms long, between the interpretability lab and the
 * court, with a kitchen along its north wall. At lunch the tables fill from
 * the nearest labs outward, and it is the one room where a figure from
 * Hangzhou ends up sitting across from one from the Bay.
 */
export const canteen = defineHall({
  id: "canteen",
  name: "Canteen",
  plaque: "CANTEEN",
  kind: "commons",
  span: { cols: 2, rows: 1 },
  tagline: "Where everyone eats",
  ethos: "Nobody gets a better idea at their desk than they get across a table from somebody else's lab.",
  blurb:
    "A kitchen along the north wall, a serving line with the day's menu over it, a coffee bar, and long tables with benches for sixty.",
  reading:
    "The figures come at lunch from all over the building, the nearest labs first, since each one works out whether it can get here before lunch is over. They queue at the line, take a seat wherever there is one, and talk to whoever they end up beside. The menu was written by somebody in the building with time on their hands.",
  facts: [
    { label: "Lunch", value: "Twelve to two" },
    { label: "Dinner", value: "Half seven to nine" },
    { label: "Seats", value: "About sixty" },
  ],
  accent: AMBER,
  floor: { tone: { r: 196, g: 192, b: 184 }, pattern: "check", alt: { r: 150, g: 146, b: 142 } },
  people: [],
  staff: [
    cook("cook-1", "Cook Rosa", "line", "apron", "toque", 2),
    cook("cook-2", "Cook Wei", "line", "apron", "toque", 1),
    cook("barista", "Barista Jo", "bar", "apron", "cap", 3),
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      kitchenLine(ctx, ox + 0.8, oy + 0.7, 4.6);
      kitchenLine(ctx, ox + 10.6, oy + 0.7, 10.8);
      kitchenLine(ctx, ox + 26.6, oy + 0.7, 4.6);
      servingLine(ctx, ox + 11.2, oy + 2.7, 9.6);
      trayStation(ctx, ox + 10.2, oy + 3.0);
      menuBoard(ctx, ox + 12.8, oy, FLOOR_Z + 3.3, 6.4, [
        "TODAY", "SOUP  GRADIENT", "WRAP  EMBEDDING", "SALAD  ATTENTION", "PIE  PRETRAINED",
      ]);
      sign(ctx, "KITCHEN", ox + 3.1, oy + 0.56, FLOOR_Z + 5.9, 0.05);
      sign(ctx, "COFFEE", ox + 28.9, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.places("line", "behind the line", "counter", [[12.6, 2.1, FACE_S], [16.0, 2.1, FACE_S], [19.4, 2.1, FACE_S]], {
      pose: "pour", tags: ["staff"],
    });
    const queue: [number, number, number][] = [];
    for (let x = 11.8; x <= 20.4; x += 1.1) queue.push([x, 4.35, FACE_N]);
    L.places("queue", "the queue", "counter", queue, { pose: "stand", tags: ["queue"] });

    // The coffee bar in the north-east corner.
    L.draw((ctx, ox, oy) => {
      counter(ctx, ox + 26.8, oy + 2.6, 3.6, 0.8, MAT.woodDark, MAT.stone);
      coffeeMachine(ctx, ox + 27.2, oy + 2.75, FLOOR_Z + 0.98, -1);
      pastryCase(ctx, ox + 28.6, oy + 2.75, FLOOR_Z + 0.98);
    });
    L.places("bar", "behind the bar", "counter", [[28.6, 2.0, FACE_S]], { pose: "pour", tags: ["staff"] });
    L.places("coffee", "the coffee bar", "counter", [[27.4, 3.95, FACE_N], [28.6, 3.95, FACE_N], [29.8, 3.95, FACE_N]], {
      pose: "stand", tags: ["coffee", "social"],
    });

    // The tables, with benches either side.
    TABLES.forEach(([x, w], ti) => {
      ROWS.forEach((y, ri) => {
        L.table(`table-${ti + 1}${"ab"[ri]}`, "a canteen table", x, y, w, 1.0, {
          chairs: "bench", pose: "eat", tags: ["meal"], tone: MAT.wood, chairTone: MAT.woodDark,
          top: (ctx, ox, oy) => {
            if (ctx.lod < 2) return;
            // A few trays left out, whoever is or is not sitting there.
            for (let i = 0; i < 2; i++) tray(ctx, ox + x + 0.8 + i * (w - 1.6), oy + y + 0.5, FLOOR_Z + 0.9, ti * 7 + ri * 3 + i);
          },
        });
      });
    });

    L.draw((ctx, ox, oy) => {
      trolley(ctx, ox + 0.9, oy + 3.1);
      waterCooler(ctx, ox + 5.5, oy + 3.4);
      fridge(ctx, ox + 0.7, oy + 4.0, 1);
      vending(ctx, ox + 30.3, oy + 5.4, MAT.red, 1);
      plant(ctx, ox + 2.2, oy + 12.3, 1.2);
      plant(ctx, ox + 29.8, oy + 12.3, 1.2);
      plant(ctx, ox + 16.0, oy + 12.2, 1.0);
    });

    L.stand("rest", "the south side", 13.0, 11.4, FACE_S, { kind: "rest", places: 3, tags: ["rest", "social"] });
    L.stand("door-w", "the west door", 0.9, 10.6, 0, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.6, Math.PI, { kind: "door", tags: ["rest"] });

    for (const x of [3.6, 13.0, 19.0, 28.4]) L.lamp(x, 7.3, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(16.0, 2.6, { power: 0.9, radius: 5, style: "track" });
  },
});
