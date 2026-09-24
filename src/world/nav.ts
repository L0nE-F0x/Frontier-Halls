const CELL = 0.5;

export type Rect = { x: number; y: number; w: number; d: number };

/**
 * A coarse occupancy grid over the whole block, plus A* on it. Props register
 * their footprint once at layout time; after that the figures can walk from any
 * hall to any other without anyone hand-authoring a path.
 *
 * Every footprint is also kept as the rectangle it really is, without the
 * padding and without being rounded out to whole cells. The grid is what the
 * figures route over; the rectangles are what a test can hold a path against,
 * which is how "walks through its own desk" became something the suite checks.
 */
export class NavGrid {
  readonly w: number;
  readonly h: number;
  readonly originX: number;
  readonly originY: number;
  readonly blocked: Uint8Array;
  /** Soft cost, so figures prefer aisles and give furniture a wide berth. */
  readonly cost: Float32Array;
  /** Everything registered as solid, unpadded, in world units. */
  readonly solids: Rect[] = [];

  private heap: number[] = [];
  private keys: number[] = [];
  private gScore: Float32Array;
  private fScore: Float32Array;
  private came: Int32Array;
  private state: Uint8Array;
  private stamp = 0;
  private visited: Int32Array;

  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    this.originX = minX;
    this.originY = minY;
    this.w = Math.ceil((maxX - minX) / CELL);
    this.h = Math.ceil((maxY - minY) / CELL);
    const n = this.w * this.h;
    this.blocked = new Uint8Array(n);
    this.cost = new Float32Array(n);
    this.gScore = new Float32Array(n);
    this.fScore = new Float32Array(n);
    this.came = new Int32Array(n);
    this.state = new Uint8Array(n);
    this.visited = new Int32Array(n);
  }

  cx(x: number): number {
    return Math.floor((x - this.originX) / CELL);
  }

  cy(y: number): number {
    return Math.floor((y - this.originY) / CELL);
  }

  worldX(cx: number): number {
    return this.originX + (cx + 0.5) * CELL;
  }

  worldY(cy: number): number {
    return this.originY + (cy + 0.5) * CELL;
  }

  index(cx: number, cy: number): number {
    return cy * this.w + cx;
  }

  inside(cx: number, cy: number): boolean {
    return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h;
  }

  clear(): void {
    this.blocked.fill(1);
    this.cost.fill(0);
    this.solids.length = 0;
  }

  /** Marks a rectangle walkable. Rooms call this for their floor. */
  openRect(x: number, y: number, w: number, d: number): void {
    this.forEach(x, y, w, d, (i) => {
      this.blocked[i] = 0;
    });
  }

  blockRect(x: number, y: number, w: number, d: number, pad = 0): void {
    this.solids.push({ x, y, w, d });
    this.forEach(x - pad, y - pad, w + pad * 2, d + pad * 2, (i) => {
      this.blocked[i] = 1;
    });
  }

  /**
   * Blocks every cell a registered footprint overlaps, whatever was opened
   * after it. A doorway is opened across the partition it passes through, and
   * the cell at each end of the gap overlaps the jamb: a figure walking that
   * cell's centre line had its shoulder in the wall.
   */
  seal(): void {
    for (const r of this.solids) {
      this.forEach(r.x, r.y, r.w, r.d, (i) => {
        this.blocked[i] = 1;
      });
    }
  }

  /** Adds a preference cost without blocking. Chairs, rugs, the trench. */
  costRect(x: number, y: number, w: number, d: number, amount: number): void {
    this.forEach(x, y, w, d, (i) => {
      this.cost[i] += amount;
    });
  }

  private forEach(x: number, y: number, w: number, d: number, fn: (i: number) => void): void {
    const x0 = Math.max(0, this.cx(x));
    const y0 = Math.max(0, this.cy(y));
    const x1 = Math.min(this.w - 1, this.cx(x + w - 0.0001));
    const y1 = Math.min(this.h - 1, this.cy(y + d - 0.0001));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) fn(cy * this.w + cx);
    }
  }

  walkable(cx: number, cy: number): boolean {
    return this.inside(cx, cy) && this.blocked[cy * this.w + cx] === 0;
  }

  /** True when the world point lies in a walkable cell. */
  open(x: number, y: number): boolean {
    return this.walkable(this.cx(x), this.cy(y));
  }

  /** True when the point is inside a registered footprint, unpadded. */
  solidAt(x: number, y: number, inflate = 0): boolean {
    for (const r of this.solids) {
      if (x > r.x - inflate && x < r.x + r.w + inflate && y > r.y - inflate && y < r.y + r.d + inflate) return true;
    }
    return false;
  }

  /**
   * Whether a straight walk between two points stays clear of every solid
   * footprint, widened by the figure's own half-width. The last `spare` units
   * are not checked: that is the step into a chair or up to a counter, and it
   * is supposed to end against the furniture.
   */
  segmentClear(ax: number, ay: number, bx: number, by: number, radius = 0.16, spare = 0): boolean {
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len / 0.1));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (len * (1 - t) < spare) break;
      if (this.solidAt(ax + (bx - ax) * t, ay + (by - ay) * t, radius)) return false;
    }
    return true;
  }

  /**
   * Nearest walkable cell to a world point. Rings are searched outward and
   * the closest cell in the first ring that has any wins.
   *
   * It used to take the first walkable cell in scan order, which starts at the
   * north side of every ring. A figure standing just south of a desk would be
   * snapped to the far side of it, and then walk back through the desk to get
   * where it was going.
   */
  snap(x: number, y: number): { cx: number; cy: number } | null {
    const bx = this.cx(x);
    const by = this.cy(y);
    if (this.walkable(bx, by)) return { cx: bx, cy: by };
    for (let r = 1; r < 16; r++) {
      let best: { cx: number; cy: number } | null = null;
      let bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (!this.walkable(bx + dx, by + dy)) continue;
          const d = Math.hypot(this.worldX(bx + dx) - x, this.worldY(by + dy) - y);
          if (d < bestD) {
            bestD = d;
            best = { cx: bx + dx, cy: by + dy };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /**
   * A* with an 8-way neighbourhood and a binary heap. Returns world-space
   * waypoints, thinned so a straight run across a hall is two points rather
   * than forty.
   *
   * The open list was a flat array scanned for its best entry, which was fine
   * across three rooms and quadratic across forty: a walk to the canteen from
   * the far corner expands tens of thousands of cells.
   */
  path(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] | null {
    const start = this.snap(fromX, fromY);
    const goal = this.snap(toX, toY);
    if (!start || !goal) return null;
    const si = this.index(start.cx, start.cy);
    const gi = this.index(goal.cx, goal.cy);
    if (si === gi) return [{ x: toX, y: toY }];

    this.stamp++;
    const { w, h, blocked, cost, gScore, fScore, came, state, visited, stamp } = this;
    const heap = this.heap;
    heap.length = 0;
    const touch = (i: number) => {
      if (visited[i] !== stamp) {
        visited[i] = stamp;
        gScore[i] = Infinity;
        fScore[i] = Infinity;
        came[i] = -1;
        state[i] = 0;
      }
    };
    const heur = (i: number) => {
      const cx = i % w;
      const cy = (i / w) | 0;
      const dx = Math.abs(cx - goal.cx);
      const dy = Math.abs(cy - goal.cy);
      return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    // Each entry keeps the score it was pushed with. A cell whose score
    // improves is pushed again rather than moved, and the stale entry is
    // skipped when it surfaces; keying on the live score instead would let an
    // improvement break the heap under an entry already in it.
    const keys = this.keys;
    keys.length = 0;
    const push = (i: number) => {
      const f = fScore[i];
      heap.push(i);
      keys.push(f);
      let at = heap.length - 1;
      while (at > 0) {
        const up = (at - 1) >> 1;
        if (keys[up] <= f) break;
        heap[at] = heap[up];
        keys[at] = keys[up];
        at = up;
      }
      heap[at] = i;
      keys[at] = f;
    };
    const pop = (): number => {
      const top = heap[0];
      const last = heap.pop()!;
      const lastKey = keys.pop()!;
      if (heap.length) {
        let at = 0;
        const n = heap.length;
        for (;;) {
          const l = at * 2 + 1;
          if (l >= n) break;
          const r = l + 1;
          const c = r < n && keys[r] < keys[l] ? r : l;
          if (keys[c] >= lastKey) break;
          heap[at] = heap[c];
          keys[at] = keys[c];
          at = c;
        }
        heap[at] = last;
        keys[at] = lastKey;
      }
      return top;
    };

    touch(si);
    gScore[si] = 0;
    fScore[si] = heur(si);
    push(si);
    state[si] = 1;

    let guard = 0;
    while (heap.length && guard++ < 200000) {
      const current = pop();
      // A cell can be in the heap more than once, with a stale score; only
      // its best entry is expanded.
      if (state[current] === 2) continue;
      if (current === gi) return this.rebuild(came, current, toX, toY);
      state[current] = 2;
      const cx = current % w;
      const cy = (current / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (blocked[ni]) continue;
          if (dx !== 0 && dy !== 0) {
            // No cutting corners through a blocked cell.
            if (blocked[cy * w + nx] || blocked[ny * w + cx]) continue;
          }
          touch(ni);
          if (state[ni] === 2) continue;
          const step = (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1) + cost[ni];
          const tentative = gScore[current] + step;
          if (tentative >= gScore[ni]) continue;
          came[ni] = current;
          gScore[ni] = tentative;
          fScore[ni] = tentative + heur(ni);
          state[ni] = 1;
          push(ni);
        }
      }
    }
    return null;
  }

  private rebuild(came: Int32Array, end: number, toX: number, toY: number): { x: number; y: number }[] {
    const cells: number[] = [];
    let at = end;
    while (at !== -1) {
      cells.push(at);
      at = came[at];
    }
    cells.reverse();
    const points = cells.map((i) => ({
      x: this.worldX(i % this.w),
      y: this.worldY((i / this.w) | 0),
    }));
    points[points.length - 1] = { x: toX, y: toY };
    return thin(points);
  }
}

/** Drops waypoints that lie on the line between their neighbours. */
function thin(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(cross) > 0.0001) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function makeNav(width: number, depth: number): NavGrid {
  return new NavGrid(-2, -2, width + 2, depth + 2);
}
