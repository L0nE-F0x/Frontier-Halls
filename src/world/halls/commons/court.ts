import { CYAN } from "../../accents";
import { MAT } from "../../materials";
import { courtTree, fountain } from "../../props/commons";
import { roundTable, seatBench, BENCH_SEAT } from "../../props/furniture";
import { planter } from "../../props/objects";
import { chair } from "../../props/furniture";
import { defineHall, FACE_E, FACE_N, FACE_S, FACE_W } from "../layout";
import type { Spot } from "../types";

/** The clock stands at the court's middle; the building puts it there. */
const CX = 16;
const CY = 6.5;
const CAFE: [number, number][] = [[10.9, 3.3], [21.1, 3.3], [10.9, 9.7], [21.1, 9.7]];

/**
 * The court. The only room with no roof, at the exact middle of the plan,
 * with the clock the whole building keeps time by standing in the middle of
 * it. It is the canteen's overflow at lunch and where anyone goes to sit
 * down who does not want to be at a desk.
 */
export const court = defineHall({
  id: "court",
  name: "The Court",
  plaque: "THE COURT",
  kind: "commons",
  span: { cols: 2, rows: 1 },
  open: true,
  tagline: "Open to the sky",
  ethos: "One clock for the whole building. Everything else keeps time by it.",
  blurb:
    "Paving, four trees, two fountains, café tables, and the clock every wall clock in the building is reading, standing in the middle.",
  reading:
    "The middle of the plan and the one room open to the sky. Every clock in every hall reads the one standing here. At lunch the café tables take the canteen's overflow, and in the evening the benches round the clock fill with figures who have nowhere in particular to be.",
  facts: [
    { label: "Roof", value: "None" },
    { label: "The clock", value: "The one the rest read" },
    { label: "Stands at", value: "The middle of the plan" },
  ],
  accent: CYAN,
  floor: { tone: { r: 168, g: 166, b: 160 }, pattern: "paving" },
  people: [],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      for (const [x, y] of [[4.2, 3.2], [27.8, 3.2], [4.2, 9.8], [27.8, 9.8]] as const) courtTree(ctx, ox + x, oy + y, 1);
      fountain(ctx, ox + 4.2, oy + 6.5, 1.1);
      fountain(ctx, ox + 27.8, oy + 6.5, 1.1);
      for (const [x, w] of [[1.6, 3.8], [10.6, 10.8], [26.6, 3.8]] as const) {
        planter(ctx, ox + x, oy + 0.7, w, 0.7, MAT.stone);
        planter(ctx, ox + x, oy + 11.6, w, 0.7, MAT.stone);
      }
    });

    // Benches facing the clock on all four sides.
    const benches: { id: string; x: number; y: number; face: number; horizontal: boolean }[] = [
      { id: "bench-n", x: CX, y: CY - 3.2, face: FACE_S, horizontal: true },
      { id: "bench-s", x: CX, y: CY + 3.2, face: FACE_N, horizontal: true },
      { id: "bench-w", x: CX - 4.0, y: CY, face: FACE_E, horizontal: false },
      { id: "bench-e", x: CX + 4.0, y: CY, face: FACE_W, horizontal: false },
    ];
    for (const b of benches) {
      L.draw((ctx, ox, oy) => seatBench(ctx, ox + b.x, oy + b.y, 2.4, b.face, MAT.wood));
      const spots: Spot[] = [-0.55, 0.55].map((u) => {
        const sx = b.horizontal ? b.x + u : b.x;
        const sy = b.horizontal ? b.y : b.y + u;
        const ax = sx - Math.cos(b.face) * 0.7;
        const ay = sy - Math.sin(b.face) * 0.7;
        return { x: sx, y: sy, face: b.face, ax, ay };
      });
      L.station(b.id, "a bench by the clock", "lounge", spots, { pose: "sit", seat: BENCH_SEAT, tags: ["social", "rest"] });
    }

    // Café tables: the canteen's overflow at lunch.
    CAFE.forEach(([x, y], i) => {
      const spots: Spot[] = [];
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 6 + (k / 3) * Math.PI * 2;
        const sx = x + Math.cos(a) * 1.0;
        const sy = y + Math.sin(a) * 1.0;
        const face = a + Math.PI;
        spots.push({ x: sx, y: sy, face, ax: x + Math.cos(a) * 1.6, ay: y + Math.sin(a) * 1.6 });
      }
      L.draw((ctx, ox, oy) => {
        roundTable(ctx, ox + x, oy + y, 0.5, MAT.white, 0.74);
        for (const s of spots) chair(ctx, ox + s.x, oy + s.y, s.face, MAT.metal);
      });
      L.station(`cafe-${i + 1}`, "a café table", "table", spots, { pose: "eat", seat: 0.54, tags: ["meal", "social"] });
    });

    L.stand("rest", "the paving", 16, 11.0, FACE_S, { kind: "rest", places: 3, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.4, FACE_E, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, FACE_W, { kind: "door", tags: ["rest"] });

    L.lamp(8.0, 6.5, { power: 0.6, radius: 6, style: "none" });
    L.lamp(24.0, 6.5, { power: 0.6, radius: 6, style: "none" });
  },
});
