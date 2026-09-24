import { CYAN } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { cdu, coolantRun, lossScreen, pod, tokenTube } from "../../props/commons";
import { rackRow } from "../../props/fixtures";
import { sign } from "../../props/objects";
import { defineHall, FACE_N, FACE_S } from "../layout";
import { TUBE_Y, TUBE_Z } from "./library";

/** Runs of racks, broken wherever a doorway needs the floor. */
const SEGMENTS: [number, number][] = [[0.8, 3], [10.4, 7], [26.4, 7], [42.4, 3]];
const MIDDLE: [number, number][] = [[1.6, 3], [10.4, 6], [28.8, 6], [42.4, 3]];
const PITCH = 1.6;
const POD_X = 24;
const POD_Y = 6.3;

/**
 * The cluster, three rooms long. Every model in the building was pretrained
 * on racks like these; the one being trained today stands in the pod at the
 * middle, and the tube from the corpus drops into the top of it.
 */
export const pretraining = defineHall({
  id: "pretraining",
  name: "Pretraining",
  plaque: "PRETRAINING",
  kind: "commons",
  span: { cols: 3, rows: 1 },
  tagline: "The cluster",
  ethos: "Most of what a model knows, it learns here, from next-token prediction and a very large amount of reading.",
  blurb:
    "The biggest room in the building: four runs of racks with their hot aisles closed in, coolant overhead, and the pod in the middle where today's run is learning.",
  reading:
    "Pretraining starts at midnight. The run stands in the pod and grows as the tokens come down the tube from the corpus, and the loss on the screen above falls through the night. At noon the pod opens and the run walks east to be taught.",
  facts: [
    { label: "Pipeline", value: "Step two of six" },
    { label: "Racks", value: "Fifty-eight" },
    { label: "Hours", value: "Midnight to noon" },
  ],
  accent: CYAN,
  floor: { tone: { r: 158, g: 162, b: 168 }, pattern: "raised", alt: { r: 132, g: 136, b: 144 } },
  people: [],
  staff: [
    {
      id: "checkpoint",
      name: "Run 4412",
      short: "Run 4412",
      role: "Today's training run",
      tier: "In training",
      doing: "Grows in the pod through the night, then walks the length of the pipeline.",
      why: "Every day the building trains one model. It starts at midnight in the pod, small and grey, and grows as it reads the corpus. After lunch it is taught, then rated, examined and red-teamed, and at the review it is shown on the stage before it leaves by the open frame in the south-east corner. At midnight the next one starts.",
      chips: ["Unreleased", "One day old", "Unnamed"],
      accent: MAT.sheet,
      scale: 0.96,
      home: "pod",
      look: { outfit: "tee", hair: "crop", skin: 1 },
      traits: { pace: 0.95, focus: 1, sociability: 0 },
    },
    {
      id: "operator",
      name: "The operator",
      short: "Operator",
      role: "Watches the run",
      tier: "Staff",
      doing: "Keeps an eye on the loss and a hand near the switch that stops it.",
      why: "A run this size fails in a hundred small ways, and somebody has to be watching when it does. The operator is one of the few people in the building; everyone else here is a model.",
      chips: ["Human", "Night shift", "Has the pager"],
      accent: MAT.cloth,
      scale: 1,
      home: "console",
      haunts: ["gallery"],
      look: { outfit: "hoodie", hair: "short", acc: ["headphones", "lanyard"], skin: 2 },
      traits: { pace: 0.9, focus: 0.9, sociability: 0.3, appetite: 0.8 },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      for (const [x, n] of SEGMENTS) {
        rackRow(ctx, ox + x, oy + 0.7, n, PITCH, "s", 4.3, "P");
        rackRow(ctx, ox + x, oy + 2.9, n, PITCH, "n", 4.3, "Q");
        // The hot aisle between each pair of runs, closed in with a lid.
        if (ctx.lod > 0) {
          const w = (n - 1) * PITCH + 1.42;
          ctx.p.box(ox + x, oy + 1.62, FLOOR_Z + 4.3, w, 1.28, 0.05, MAT.glass, { alpha: 0.35, emissive: 0.3 });
          ctx.p.box(ox + x - 0.05, oy + 1.62, FLOOR_Z, 0.05, 1.28, 4.3, MAT.glass, { alpha: 0.35, emissive: 0.3 });
          ctx.p.box(ox + x + w, oy + 1.62, FLOOR_Z, 0.05, 1.28, 4.3, MAT.glass, { alpha: 0.35, emissive: 0.3 });
        }
      }
      for (const [x, n] of MIDDLE) rackRow(ctx, ox + x, oy + 5.3, n, PITCH, "s", 4.0, "R");
      coolantRun(ctx, ox + 0.4, oy + 8.2, L.w - 0.8);
    });
    L.stand("aisle", "the cold aisle", 16.0, 4.5, FACE_N, { kind: "rack", pose: "read", places: 3, spacing: 3.2, tags: ["visit"] });

    // The pod, and the tube dropping into it.
    L.draw((ctx, ox, oy) => {
      const hour = ctx.clock.hour;
      pod(ctx, ox + POD_X, oy + POD_Y, FACE_S, Math.min(1, hour / 12));
      tokenTube(ctx, [
        [ox, oy + TUBE_Y, TUBE_Z],
        [ox + POD_X, oy + TUBE_Y, TUBE_Z],
        [ox + POD_X, oy + POD_Y, TUBE_Z],
        [ox + POD_X, oy + POD_Y, FLOOR_Z + 3.0],
      ]);
      lossScreen(ctx, ox + 18, oy, FLOOR_Z + 4.55, 12, 1.55, hour, 4412 + (ctx.clock.day ?? 0));
    });
    L.station("pod", "the pod", "pod", [{ x: POD_X, y: POD_Y, face: FACE_S, ax: POD_X, ay: POD_Y + 2.0 }], {
      pose: "stand", tags: ["pod"],
    });

    // Where anyone who comes to watch stands, and a rail to keep them there.
    L.draw((ctx, ox, oy) => {
      for (const [a, b] of [[19.4, 23.1], [24.9, 28.6]]) {
        ctx.nav?.blockRect(ox + a, oy + 7.9, b - a, 0.14);
        if (ctx.lod === 0) continue;
        ctx.p.box(ox + a, oy + 7.95, FLOOR_Z + 0.95, b - a, 0.06, 0.06, MAT.chrome);
        for (let x = a; x <= b; x += 0.9) ctx.p.box(ox + x, oy + 7.95, FLOOR_Z, 0.05, 0.05, 0.95, MAT.chrome);
      }
    });
    L.places("gallery", "the gallery", "window", [
      [20.4, 8.6, FACE_N], [21.6, 8.6, FACE_N], [26.4, 8.6, FACE_N], [27.6, 8.6, FACE_N],
    ], { pose: "watch", tags: ["visit"] });

    L.desk("console", "the console", 31.0, 9.4, FACE_N, { screens: 2, lamp: true, tags: ["staff"], mug: MAT.cloth });

    // Coolant units along the south wall, clear of the doors.
    L.draw((ctx, ox, oy) => {
      for (const x of [1.8, 3.4, 11.4, 13.2, 18.2, 20.0, 27.6, 29.4, 34.0, 35.8, 43.4, 45.2]) cdu(ctx, ox + x, oy + 11.75);
      sign(ctx, "PRETRAINING", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
      sign(ctx, "COLD AISLE", ox + 40.0, oy + 0.56, FLOOR_Z + 5.9, 0.045);
    });

    L.stand("rest", "the corridor", 40.0, 10.0, FACE_S, { kind: "rest", places: 3, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, 0, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, Math.PI, { kind: "door", tags: ["rest"] });

    const cool = MAT.led;
    for (const x of [4, 12, 20, 28, 36, 44]) L.lamp(x, 3.8, { power: 0.9, radius: 7, tint: cool, style: "track" });
    L.lamp(POD_X, 9.6, { power: 1.0, radius: 6.5, style: "globe" });
    L.lamp(8, 10.0, { power: 0.7, radius: 5.5, tint: cool, style: "none" });
    L.lamp(40, 10.0, { power: 0.7, radius: 5.5, tint: cool, style: "none" });
  },
});
