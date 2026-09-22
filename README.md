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
npm run roster   # check the halls against a live model index
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
| `T` | jump between midday, night and first light |
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
  that names two inks and a blend for every colour, with a blue-noise threshold
  deciding which of the two each pixel gets. Two earlier attempts are in the
  comments: an ordered Bayer matrix striped every floor in the building, and
  interleaved gradient noise replaced the stripes with a diagonal weave that a
  large smooth gradient made obvious. The tile in `bluenoise.ts` is
  void-and-cluster, generated offline, and has a low/high frequency power ratio
  of 0.015 against 1.21 for white noise.
- **`bluenoise.ts`** — that tile, 64x64, baked in as base64.
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
  seats and how the room is furnished. Who is currently in a seat lives in
  `roster.ts`, which is the only file a script is allowed to rewrite.

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
every station is inside its own hall and reachable on foot, that the copy the
dossier needs is actually there, that every seat has somebody in it and nobody
is seated who is not in a hall, and that no `{name}` token survives into what
the dossier shows.

## The roster

A hall is a set of **seats** — `flagship`, `coder`, `fast` — and a seat is a
role, not a model. The hall file in `src/world/halls/` owns the staging: where
the figure stands, how it moves, what the room is for, and every line of prose
about it. `src/world/roster.ts` owns which model is currently in the seat, and
nothing else.

That split is the whole point. A lineup moves on every few weeks; a room does
not. Copy can name its occupant with `{name}` or `{short}`, and a hall can list
its cast with `{roster}`, so a new model arriving does not leave stale prose
behind it:

```ts
why: "{short} is the fast, high-volume model. The short trips belong to it.",
```

### Keeping it current

```
npm run roster            what has changed, and what has nobody in it
npm run roster -- --write apply the seat moves
```

The script reads [OpenRouter's public model index][or] and does two things.
It refreshes the seats it has a rule for — *anthropic/opus is whatever
`anthropic/claude-opus-*` is newest* — and, more usefully, it reports anything
a lab has shipped that nobody in the building is standing in. That second check
is the one that matters: GPT-6 Astra landed on 2026-09-04 and was not in the
OpenAI hall until somebody happened to notice.

It never edits a hall file, and it will not invent copy. A new model needs a
seat and a sentence, and both are hand work.

Some seats have no rule and say so — `openai/balanced` against `openai/fast` is
a judgement the index cannot make, and Ai2 is not listed on OpenRouter at all.
Those carry `source: "hand"` and are only as current as the last person to look.

`.github/workflows/roster.yml` runs the check weekly and opens a pull request
when a seat has moved. It does not push to main.

[or]: https://openrouter.ai/api/v1/models
