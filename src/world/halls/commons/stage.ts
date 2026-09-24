import { AMBER } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { orient } from "../../props/furniture";
import { speaker, spotlight, stagePlatform, stageScreen } from "../../props/commons";
import { banner } from "../../props/furniture";
import { palm } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";

const STAGE = { x: 9.9, y: 0.8, w: 5.4, d: 3.8, h: 0.6 };
const PODIUM = { x: 12.6, y: 2.2 };
const WEST = [1.8, 2.7, 3.6, 4.5, 5.4];
const EAST = [10.4, 11.3, 12.2, 13.1, 14.0];
const ROWS = [6.8, 8.1, 9.4, 10.7];

/**
 * The stage, at the east end of the commons: where the day's run is shown,
 * at the review, to whoever in the building wants to see it. It is the one
 * appointment most of the figures keep.
 */
export const stage = defineHall({
  id: "stage",
  name: "The Stage",
  plaque: "THE STAGE",
  kind: "commons",
  tagline: "Where the day's model is shown",
  ethos: "A model is not finished until somebody has seen what it can do.",
  blurb:
    "A raised stage with a screen behind it, spotlights on the truss, speakers either side, and forty seats. Empty most of the day and full at half past six.",
  reading:
    "The last stop on the spine. At quarter past six the day's run comes up the steps and presents from the podium while the building watches, the seats filling from the gym and the canteen next door first. When it is done it goes down the steps, south through Upstage and Sakana, and out of the open frame in the corner.",
  facts: [
    { label: "Keynote", value: "Quarter past six" },
    { label: "Seats", value: "Forty, and standing room" },
    { label: "Afterwards", value: "Out by the open frame" },
  ],
  accent: AMBER,
  floor: { tone: { r: 150, g: 144, b: 140 }, pattern: "carpet", alt: { r: 132, g: 126, b: 124 } },
  people: [],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      const h = ctx.clock.hour;
      const live = h >= 18 && h < 19.6;
      stagePlatform(ctx, ox + STAGE.x, oy + STAGE.y, STAGE.w, STAGE.d, STAGE.h);
      stageScreen(ctx, ox + 10.2, oy, FLOOR_Z + 2.6, 4.8, 2.4, live ? `RUN ${4412 + (ctx.clock.day ?? 0)}` : "NEXT  18:15", live);
      // The podium, standing on the stage.
      orient(ctx, ox + PODIUM.x, oy + PODIUM.y + 0.55, FLOOR_Z + STAGE.h, 0.7, 0.5, 1.05, FACE_S, MAT.woodDark, { top: MAT.wood });
      speaker(ctx, ox + 9.2, oy + 2.3);
      speaker(ctx, ox + 9.2, oy + 3.6);
      spotlight(ctx, ox + 12.6, oy + 7.5, ox + PODIUM.x, oy + PODIUM.y, FLOOR_Z + STAGE.h, live ? 1 : 0.25);
      spotlight(ctx, ox + 8.6, oy + 6.5, ox + PODIUM.x - 1.2, oy + PODIUM.y + 0.3, FLOOR_Z + STAGE.h, live ? 0.7 : 0);
      banner(ctx, ox + 1.6, oy + 0.66, FLOOR_Z + 2.2, 1.6, 2.8, MAT.lamp, "LAUNCH");
      banner(ctx, ox + 3.6, oy + 0.66, FLOOR_Z + 2.2, 1.6, 2.8, MAT.led, "DEMO");
      palm(ctx, ox + 15.0, oy + 12.0, 1.0);
    });
    // Up the steps at the south-west corner of the stage, and on to the podium.
    L.station("podium", "the podium", "stage", [{ x: PODIUM.x, y: PODIUM.y, face: FACE_S, ax: 10.7, ay: 6.1 }], {
      pose: "present", lift: STAGE.h, tags: ["present", "pod"],
    });

    const seats: [number, number, number][] = [];
    for (const y of ROWS) for (const x of [...WEST, ...EAST]) seats.push([x, y, FACE_N]);
    L.chairs("seats", "a seat", seats, { tone: MAT.red, tags: ["audience"] });
    L.stand("standing", "standing room", 12.6, 12.05, FACE_N, { kind: "seat", pose: "watch", places: 4, spacing: 0.8, tags: ["audience"] });

    L.stand("rest", "the aisle", 8.0, 5.2, FACE_S, { kind: "rest", places: 2, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, 0, { kind: "door", tags: ["rest"] });

    L.lamp(4.0, 8.5, { power: 0.8, radius: 6, style: "shade" });
    L.lamp(12.0, 9.0, { power: 0.8, radius: 6, style: "shade" });
    L.lamp(12.6, 3.0, { power: 0.9, radius: 5, style: "none" });
  },
});
