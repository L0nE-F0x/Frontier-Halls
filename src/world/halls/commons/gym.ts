import { GREEN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { at, lockers } from "../../props/furniture";
import {
  climbingWall, dumbbells, exerciseBike, punchingBag, rower, squatRack, treadmill, yogaMat,
} from "../../props/commons";
import { waterCooler } from "../../props/fixtures";
import { plant, sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";
import type { Spot } from "../types";

const TREADMILLS = [1.6, 2.8, 4.0, 5.2, 10.8, 12.0, 13.2, 14.4];
const BIKES = [1.8, 3.2, 4.6, 10.8, 12.2, 13.6];
const ROWERS = [17.4, 18.8, 20.2];
const RACKS = [17.4, 20.3];
const BAGS = [27.4, 29.2];
const MATS = [26.9, 28.4, 29.9];

/**
 * The gym, two rooms long, between the court and the stage. Models do not
 * need it. They come at first light and after dinner anyway, and nobody in
 * the building has asked them why.
 */
export const gym = defineHall({
  id: "gym",
  name: "Gym",
  plaque: "GYM",
  kind: "commons",
  span: { cols: 2, rows: 1 },
  tagline: "Training, the other kind",
  ethos: "A long run and a heavy lift both come down to doing the same thing again, a little better each time.",
  blurb:
    "Eight treadmills, six bikes, three rowers, two racks, two bags, a climbing wall and a row of mats. Busy at first light and after dinner.",
  reading:
    "The pun is the point: a gym in a building where everything is being trained. Figures come before work and in the evening, the keen ones more often, and the treadmills are never all free at seven in the morning. The climbing wall on the north side has not yet been topped by anything smaller than a flagship.",
  facts: [
    { label: "Busiest", value: "Six to half eight, and after dinner" },
    { label: "Machines", value: "Nineteen" },
    { label: "Climbing wall", value: "Five metres" },
  ],
  accent: GREEN,
  floor: { tone: { r: 120, g: 122, b: 128 }, pattern: "rubber", alt: { r: 104, g: 106, b: 112 } },
  people: [],
  layout(L) {
    const back = (x: number, y: number, face: number, v: number): Spot => {
      const a = at(x, y, face, 0, v);
      return { x, y, face, ax: a.x, ay: a.y };
    };
    const side = (x: number, y: number, face: number, u: number): Spot => {
      const a = at(x, y, face, u, 0);
      return { x, y, face, ax: a.x, ay: a.y };
    };

    L.draw((ctx, ox, oy) => {
      for (const x of TREADMILLS) treadmill(ctx, ox + x, oy + 3.3, FACE_N);
      for (const x of BIKES) exerciseBike(ctx, ox + x, oy + 6.7, FACE_N);
      for (const x of ROWERS) rower(ctx, ox + x, oy + 8.3, FACE_N);
      for (const x of RACKS) squatRack(ctx, ox + x, oy + 3.0, FACE_S);
      for (const x of BAGS) punchingBag(ctx, ox + x, oy + 5.2);
      MATS.forEach((x, i) => yogaMat(ctx, ox + x, oy + 8.2, FACE_N, [MAT.seal, MAT.led, MAT.lamp][i]));
      dumbbells(ctx, ox + 15.8, oy + 0.75, 5.6, "x");
      climbingWall(ctx, ox + 26.6, oy, 4.8, 21);
      // A mirror behind the east treadmills.
      if (ctx.lod > 0) ctx.p.box(ox + 10.2, oy + 0.6, FLOOR_Z + 0.3, 4.8, 0.05, 2.3, MAT.glass, { emissive: 0.55, glow: 0.12 });
      lockers(ctx, ox + 1.6, oy + 12.0, 8, "x", MAT.metal);
      lockers(ctx, ox + 26.2, oy + 12.0, 8, "x", MAT.metal);
      waterCooler(ctx, ox + 15.4, oy + 12.0);
      plant(ctx, ox + 16.8, oy + 12.1, 1.0);
      sign(ctx, "GYM", ox + 3.4, oy + 0.56, FLOOR_Z + 5.9, 0.07);
      sign(ctx, "NO CHALK", ox + 24.0, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });

    L.station("treadmills", "a treadmill", "gym", TREADMILLS.map((x) => back(x, 3.3, FACE_N, -1.25)), { pose: "run", tags: ["exercise"] });
    L.station("bikes", "a bike", "gym", BIKES.map((x) => side(x, 6.7, FACE_N, 0.65)), { pose: "bike", seat: 0.74, tags: ["exercise"] });
    L.station("rowers", "a rower", "gym", ROWERS.map((x) => side(x, 8.3, FACE_N, 0.62)), { pose: "row", seat: 0.24, tags: ["exercise"] });
    L.station("racks", "a squat rack", "gym", RACKS.map((x) => back(x, 3.0, FACE_S, 0.95)), { pose: "lift", tags: ["exercise"] });
    L.station("bags", "the heavy bag", "gym", BAGS.map((x) => back(x, 6.0, FACE_N, 0)), { pose: "punch", tags: ["exercise"] });
    L.station("mats", "a mat", "gym", MATS.map((x) => back(x, 8.2, FACE_N, 0)), { pose: "stretch", tags: ["exercise"] });
    L.stand("lockers", "the lockers", 3.6, 11.3, FACE_S, { kind: "rest", places: 2, tags: ["rest"] });

    L.stand("rest", "by the water", 13.6, 11.0, FACE_S, { kind: "rest", places: 2, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, 0, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, Math.PI, { kind: "door", tags: ["rest"] });

    const bright = MAT.bulb;
    for (const x of [3.4, 12.6, 19.0, 28.2]) L.lamp(x, 5.8, { power: 1.1, radius: 6.5, tint: bright, style: "track" });
  },
});
