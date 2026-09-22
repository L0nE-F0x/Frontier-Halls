# Frontier Halls

One building. Ten halls laid out around a court, with a clock standing in the
middle of it and a sidewalk of trees and lamps around the outside. Every wall
clock in the building is reading that one clock, and the figures inside decide
where to go from it and from their own habits.

It is drawn with a software rasteriser into a small offscreen buffer, reduced to
a handful of inks, and blown back up with the pixels left square.

```
npm install
npm run dev      # http://127.0.0.1:5177
npm run check    # typecheck + tests
npm run build
```

## Reading the building

The block is a grid, as square as the hall count allows: ten halls make a
four by three, and the slots left over join into the court at the centre
rather than a gap at the edge. Halls fill the grid in the order they are listed
in `src/world/building.ts`, starting at the far corner. Ai2 and Kimi, the last
two, are the first rooms of an open-source quarter and an Asian quarter.

The square plan is not only architectural. In this projection a building's
bounding box depends on width plus depth, so a long thin block and a square one
of the same total footprint fill the same box — but the long one is a narrow
diagonal ribbon inside it, wasting most of the frame. A square plan fills the
diamond.

Halls are divided by partitions that are solid to chest height and glazed
above, not by full walls: a full-height wall between two rooms would hide the
back corner of the room behind it, and you would lose half of every hall. Outer
walls follow the camera — the two facing away from you are drawn full height
with their clerestory, the two facing you are cut to a knee so they never
occlude. Turning the view with `Q` and `E` swaps which is which.

## Keys

| | |
|---|---|
| `1`–`9`, `A` | enter a hall (`A` is Ai2) |
| `0` | the whole block |
| click | read a figure; click a floor for its hall |
| drag, scroll | look and zoom |
| `Q` `E` | turn the building a quarter turn |
| `,` `.` | previous, next figure |
| `space` | hold the clock |
| `[` `]` | slow down, speed up |
| `T` | jump between noon, night and first light |
| `Ctrl`+`K`, `/` | find a model, a hall or a command |
| `S` | settings — ink, pixel size, dither, bloom, detail |
| `F` | save a picture |
| `\` | hide or show every panel |
| `Esc` | back out one step |

## How it is put together

```
src/engine/    the drawing machinery, which knows nothing about AI labs
src/world/     the building, its props and the figures in it
src/app/       camera, settings and the interface around the canvas
test/          vitest, run headless
```

### engine

- **`raster.ts`** — a software rasteriser with colour, depth, id and glow
  buffers. Triangles are flat or Gouraud, with a top-left fill rule so a pixel
  on a shared diagonal is covered exactly once; without it every shadow and
  pool of lamplight gets a seam down the middle. Thin lines are stamped along
  their own length rather than filled as triangles, because a one-pixel
  diagonal drawn as two triangles makes the rasteriser scan a bounding box
  hundreds of times larger than the line.
- **`project.ts`** — 2:1 dimetric projection. Points differing along `(1,1,1)`
  land on the same pixel, so `-(x+y+z)` *is* the distance along the view axis.
  That one fact is why there is a depth buffer here and no sorted draw list.
- **`light.ts`** — sky and lamps, evaluated per vertex. Hue stays in the
  material and the light only moves level and warmth, which is what keeps a
  grey wall stippling as paper and carbon instead of sliding into the amber ink.
- **`ink.ts`** — reduces the frame to the palette through a 32k lookup table
  that names two inks and a blend for every colour, with interleaved gradient
  noise deciding which of the two each pixel gets. An ordered Bayer matrix was
  tried first and its alternating row averages striped every floor in the
  building.
- **`painter.ts`** — the one drawing surface the world talks to. Projects,
  lights and rasterises in a single step, defers translucency to a sorted pass,
  flat-shades anything too small to show a gradient, and splits long thin quads
  along their length before they reach the rasteriser.
- **`palettes.ts`**, **`clock.ts`**, **`text.ts`**, **`shapes.ts`**, **`rng.ts`**.

### world

- **`building.ts`** — holds the hall list and works out the plan from it. The
  grid re-squares itself around whatever the hall count is, so adding a hall
  means appending it and nothing else; navigation, the dock, the keyboard
  shortcuts, the finder and the minimap all read that array.
- **`grounds.ts`** — the sidewalk, trees and street lamps outside the walls.
  The overview camera frames this ring as well as the block.
- **`nav.ts`** — an occupancy grid with A* over it. Props register their own
  footprint during a measuring pass that runs the whole build against a
  one-pixel raster, so what the figures can walk through never drifts from what
  is actually drawn.
- **`crowd.ts`** — the director. It animates nothing; it decides where each
  figure should be, every few seconds, from the clock and that figure's traits.
  Everything that looks like intent comes from here.
- **`person.ts`** — the figures, posed from a handful of angles.
- **`halls/`** — one file per lab: its copy, its colour, its stations, its
  models and how the room is furnished. This is the part to edit when a lineup
  changes.

## Adding a hall

1. Copy a file in `src/world/halls/`, give it the next `index` and a free `key`.
2. List its `stations` (where a figure can stand and what it faces),
   its `lamps`, its `people`, and a `dress` function built from `halls/kit.ts`
   and `props/`.
3. Append it to `halls` in `src/world/building.ts`. Set `quarter` when the hall
   belongs to one — open source, Asia, and whatever comes after.

The plan takes care of itself. Spare slots become the court, picked from the
middle outward, and a full row grows the grid. Halls are written in their own
local coordinates and never need to know where they sit. The sidewalk is drawn
from the block's outer size, so it follows the growth without a second plan.

`npm test` checks that the block stays square and that every hall gets exactly
one slot, that every figure's `home` and `haunts` name stations that exist, that
every station is inside its own hall and reachable on foot, and that the copy
the dossier needs is actually there.

## A note on the roster

The models in each hall are content, not code — plain data in
`src/world/halls/*.ts`. The Anthropic lineup is current; the other halls carry
the names this map was first drawn with, and a lineup that has moved on is a
one-file edit.
