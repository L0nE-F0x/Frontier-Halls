import { hex, luma, mix, scale } from "../engine/color";
import { PALETTES, type Palette } from "../engine/palettes";
import { RATE_STEPS, type WorldClock } from "../engine/clock";
import { unproject, unrotX, unrotY } from "../engine/project";
import type { Camera, RGB } from "../engine/types";
import { BLOCK_D, BLOCK_W, COL_LABELS, GRID, hallOrigin, halls, labs, ROW_LABELS, SLOTS } from "../world/building";
import { CHECKPOINT } from "../world/crowd";
import { GROUNDS_REACH } from "../world/grounds";
import type { HallSpec } from "../world/halls/types";
import { RD, RW } from "../world/metrics";
import type { Person } from "../world/person";
import { REGIONS, regionOf } from "../world/regions";
import type { Settings } from "./settings";

export type Selection =
  | { kind: "overview" }
  | { kind: "hall"; hallId: string }
  | { kind: "person"; hallId: string; personId: string };

export type UiHooks = {
  goOverview(): void;
  goHall(id: string): void;
  goPerson(hallId: string, personId: string): void;
  /** Frame a region of the building as a whole. */
  goRegion(id: string): void;
  stepPerson(delta: number): void;
  rotate(delta: number): void;
  zoom(factor: number): void;
  togglePause(): void;
  setMinutes(minutes: number): void;
  settingsChanged(key: keyof Settings): void;
  resetSettings(): void;
  screenshot(): void;
  layoutChanged(): void;
  /** Through the front door, to wherever was asked for — or wherever a link named. */
  arrive(target: Selection | null): void;
  /** A hall named on the cover sheet, to be lit on the plate. Null puts the lights back. */
  peekHall(hallId: string | null): void;
  /** The plate moved or changed size, so the block has to be framed into it again. */
  plateMoved(): void;
};

/** Which way the camera looks, by yaw. The sheet's caption and the toast both say it. */
export const LOOKING_FROM = ["south-east", "south-west", "north-west", "north-east"] as const;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const KEYS: [string, string][] = [
  ["Arrows", "Step to the next room"],
  ["0", "The whole block"],
  ["Click", "Read a figure, or enter a room"],
  ["Drag / scroll", "Look and zoom"],
  ["Q / E", "Turn the building"],
  [", / .", "Previous, next figure"],
  ["Space", "Hold the clock"],
  ["[ / ]", "Slow down, speed up"],
  ["T", "Jump to midday, night, first light"],
  ["Ctrl K, /", "Find anything"],
  ["S", "Settings"],
  ["F", "Save a picture"],
  ["\\", "Hide or show every panel"],
  ["Esc", "Back out one step"],
];

/** The readout's second line for a room: its cast, and who is in it now. */
function headCount(hall: HallSpec, here: number): string {
  if (hall.kind === "commons") return here === 1 ? "One figure here now" : `${here} figures here now`;
  return `${hall.people.length} in the hall · ${here} here now`;
}

const PANELS = ["hud", "dossier", "dock", "map", "tools"] as const;
type Panel = (typeof PANELS)[number];
const CHROME_KEY = "frontier-halls/chrome/1";

type FinderRow = {
  kind: string;
  label: string;
  meta: string;
  run: () => void;
};

export class Ui {
  private hooks: UiHooks;
  private settings: Settings;
  private clock: WorldClock;

  private dock = $("dock");
  private tooltip = $("tooltip");
  private toasts = $("toasts");
  private finder = $("finder");
  private finderInput = $<HTMLInputElement>("finder-input");
  private finderList = $("finder-list");
  private settingsPanel = $("settings-panel");
  private helpPanel = $("help-panel");
  private aboutPanel = $("about-panel");
  private gate = $("gate");
  private gateFrame = $("gate-frame");
  private gateClock = $("gate-clock");
  private gatePhase = $("gate-phase");
  private gateNote = $("gate-note");
  private gateView = $("gate-view");
  private entered = false;
  /** The hall lit on the plate, from the schedule or from the drawing itself. */
  private peeked: string | null = null;
  private arrivalHall: string | null = null;
  private lookingFrom: string = LOOKING_FROM[0];
  private folded = new Set<Panel>();
  private minimap = $<HTMLCanvasElement>("minimap");
  private mapCtx = this.minimap.getContext("2d")!;
  private mapNote = $("map-note");
  private timeline = $<HTMLInputElement>("timeline");
  private stats = $("stats");

  /** The page the chrome is currently inked to, and its opposite. */
  private inked = "";
  private dirty = true;
  private page: RGB = { r: 214, g: 210, b: 204 };
  private ink: RGB = { r: 32, g: 30, b: 36 };

  private dockRow: HTMLElement | null = null;
  private spoken = "";
  private rows: FinderRow[] = [];
  private filtered: FinderRow[] = [];
  private cursor = 0;
  private scrubbing = false;
  private people: Person[] = [];

  constructor(hooks: UiHooks, settings: Settings, clock: WorldClock) {
    this.hooks = hooks;
    this.settings = settings;
    this.clock = clock;
    this.buildDock();
    this.buildKeys();
    this.buildSettings();
    this.wireTools();
    this.wireFinder();
    this.wireTimeline();
    this.wireMinimap();
    this.wireChrome();
    this.wireGate();
    document.body.classList.add("at-gate");
    this.restoreFolds();
  }

  /**
   * True until the door is opened. That is the moment it flips, not the moment
   * the sheet finishes leaving: the camera takes the app's framing at once and
   * walks the block out of the plate while the sheet is still fading.
   */
  get atGate(): boolean {
    return !this.entered;
  }

  /** Where the camera frames the block while the cover sheet is up. */
  plateRect(): DOMRect {
    return this.gateFrame.getBoundingClientRect();
  }

  /** Which panels are currently on screen. The camera inset reads this. */
  chrome(): Record<Panel, boolean> {
    return {
      hud: !this.folded.has("hud"),
      dossier: !this.folded.has("dossier"),
      dock: !this.folded.has("dock"),
      map: !this.folded.has("map"),
      tools: !this.folded.has("tools"),
    };
  }

  enter(target: Selection | null = null): void {
    if (this.entered) return;
    this.entered = true;
    this.closeSheets();
    this.peeked = null;
    const body = document.body;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    body.classList.remove("at-gate");
    if (!still) body.classList.add("gate-leaving", "arriving");
    this.hooks.arrive(target);
    const shut = () => {
      this.gate.hidden = true;
      body.classList.remove("gate-leaving");
    };
    if (still) {
      shut();
      return;
    }
    // Timers rather than animationend: a backgrounded tab never finishes an
    // animation, and the gate must not be left standing over the app.
    setTimeout(shut, 480);
    setTimeout(() => body.classList.remove("arriving"), 1300);
  }

  /**
   * What the door opens onto, when a link asked for somewhere in particular.
   * Its hall stays lit on the sheet whenever nothing else is being pointed at.
   */
  setArrival(name: string | null, hallId: string | null): void {
    $("gate-enter-label").textContent = name ? `Enter at ${name}` : "Enter the halls";
    this.arrivalHall = hallId;
    this.markPeek();
  }

  /** Lights a hall in the schedule and names it under the plate. */
  peek(hallId: string | null): void {
    if (hallId === this.peeked) return;
    this.peeked = hallId;
    this.markPeek();
  }

  private markPeek(): void {
    const lit = this.peeked ?? this.arrivalHall;
    for (const button of $("gate-halls").querySelectorAll<HTMLButtonElement>("button[data-hall]")) {
      button.classList.toggle("peek", button.dataset.hall === lit);
    }
    this.writeCaption();
  }

  noteView(yaw: number): void {
    this.lookingFrom = LOOKING_FROM[yaw] ?? LOOKING_FROM[0];
    this.writeCaption();
    if (this.atGate) this.announce(`Looking from the ${this.lookingFrom}`);
  }

  private writeCaption(): void {
    const lit = this.peeked ?? this.arrivalHall;
    const hall = halls.find((h) => h.id === lit);
    if (!hall) {
      this.gateView.textContent = `The block, from the ${this.lookingFrom}`;
      return;
    }
    const name = document.createElement("b");
    name.textContent = hall.name;
    const tagline = hall.tagline.charAt(0).toLowerCase() + hall.tagline.slice(1);
    this.gateView.replaceChildren(name, `, ${tagline}`);
  }

  toggleAllChrome(): void {
    const anyOpen = PANELS.some((panel) => !this.folded.has(panel));
    this.folded = anyOpen ? new Set(PANELS) : new Set();
    this.writeFolds(true);
  }

  setPeople(people: Person[]): void {
    this.people = people;
    this.buildFinderRows();
  }

  /* ------------------------------------------------------------- chrome */

  applyPalette(palette: Palette): void {
    const root = document.documentElement.style;
    root.setProperty("--accent", hex(palette.accents[0]));
    root.setProperty("--accent-2", hex(palette.accents[1]));
    root.setProperty("--accent-3", hex(palette.accents[2]));
    $("set-palette-note").textContent = palette.note;
    this.applyPage(palette, palette.ramp[palette.pageTop]);
    this.buildDock();
    this.drawGateMark();
    this.buildGate(palette);
  }

  /**
   * Re-inks the interface to the page the drawing is currently on.
   *
   * backdrop() walks the page down the grey ramp as the day ends, so chrome
   * pinned to the palette's lightest ink turns into paper-coloured fog hanging
   * over a night scene — which is exactly what the two scrims used to do. The
   * page is the one source of truth for both the canvas and the CSS.
   *
   * Called every frame with the frame's own dt rather than handed to a CSS
   * transition, so the chrome and the drawing are eased by the same clock.
   * Holding the clock holds the page change with it, and there is no second
   * timing source to drift against.
   */
  applyPage(palette: Palette, page: RGB, dt = 0): void {
    const settled =
      Math.abs(this.page.r - page.r) < 0.6 &&
      Math.abs(this.page.g - page.g) < 0.6 &&
      Math.abs(this.page.b - page.b) < 0.6;
    if (settled && this.inked === palette.id) {
      if (!this.dirty) return;
    }
    if (settled) {
      this.page = { ...page };
    } else {
      const k = dt > 0 ? 1 - Math.pow(0.02, dt) : 1;
      this.page = {
        r: this.page.r + (page.r - this.page.r) * k,
        g: this.page.g + (page.g - this.page.g) * k,
        b: this.page.b + (page.b - this.page.b) * k,
      };
    }
    this.inked = palette.id;
    this.dirty = !settled;

    const root = document.documentElement.style;
    const ramp = palette.ramp;
    const here = this.page;
    const dark = luma(here) < 110;
    // The far end of the ramp from the page, so contrast survives it moving.
    const ink = dark ? ramp[ramp.length - 1] : ramp[0];
    this.ink = ink;
    root.setProperty("--paper", hex(here));
    root.setProperty("--paper-2", hex(mix(here, ink, 0.08)));
    root.setProperty("--ink", hex(ink));
    root.setProperty("--ink-soft", hex(mix(ink, here, dark ? 0.44 : 0.38)));
    root.setProperty("--panel", rgba(here, 0.94));
    root.setProperty("--panel-line", rgba(ink, dark ? 0.28 : 0.18));
    root.setProperty("--shadow", `0 1px 0 ${rgba(ink, 0.12)}`);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.dataset.page = dark ? "dark" : "light";
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute("content", hex(here));
  }

  /**
   * The gate's mark, drawn from the real plan rather than a stock cube: every
   * room stands up, the court stays a hole, and the mark grows a room
   * whenever the building does.
   */
  private drawGateMark(): void {
    const svg = document.querySelector<SVGSVGElement>(".gate-mark");
    if (!svg) return;
    const U = 6;
    const RISE = 9.5;
    const sx = (x: number, y: number) => (x - y) * U;
    const sy = (x: number, y: number, z: number) => (x + y) * U * 0.5 - z;
    const parts: string[] = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const note = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    const face = (pts: [number, number][], fill: string, stroke = false) => {
      for (const [x, y] of pts) note(x, y);
      const edge = stroke ? ' stroke="var(--paper)" stroke-width="0.7" stroke-linejoin="round"' : "";
      parts.push(
        `<polygon points="${pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ")}" fill="${fill}"${edge} />`,
      );
    };
    // Far slots first, so a nearer room covers the one behind it.
    const order = [...SLOTS].sort((a, b) => a.col + a.row - (b.col + b.row));
    for (const slot of order) {
      const c = slot.col;
      const rw = slot.row;
      // The commons stand a little lower than the labs, so the spine of
      // shared rooms reads as a street through the middle of the mark.
      const z = slot.room.open ? 0 : slot.room.kind === "commons" ? RISE * 0.62 : RISE;
      if (slot.room.open) {
        face([
          [sx(c, rw), sy(c, rw, 0)], [sx(c + 1, rw), sy(c + 1, rw, 0)],
          [sx(c + 1, rw + 1), sy(c + 1, rw + 1, 0)], [sx(c, rw + 1), sy(c, rw + 1, 0)],
        ], "color-mix(in srgb, var(--ink) 55%, var(--paper))");
        continue;
      }
      // South and east flanks, then the roof.
      face([
        [sx(c, rw + 1), sy(c, rw + 1, z)], [sx(c + 1, rw + 1), sy(c + 1, rw + 1, z)],
        [sx(c + 1, rw + 1), sy(c + 1, rw + 1, 0)], [sx(c, rw + 1), sy(c, rw + 1, 0)],
      ], "var(--ink-soft)");
      face([
        [sx(c + 1, rw), sy(c + 1, rw, z)], [sx(c + 1, rw + 1), sy(c + 1, rw + 1, z)],
        [sx(c + 1, rw + 1), sy(c + 1, rw + 1, 0)], [sx(c + 1, rw), sy(c + 1, rw, 0)],
      ], "color-mix(in srgb, var(--ink) 30%, var(--paper))");
      // Ruled, so the rooms can be counted instead of reading as one slab.
      face([
        [sx(c, rw), sy(c, rw, z)], [sx(c + 1, rw), sy(c + 1, rw, z)],
        [sx(c + 1, rw + 1), sy(c + 1, rw + 1, z)], [sx(c, rw + 1), sy(c, rw + 1, z)],
      ], "var(--ink)", true);
    }
    const pad = 2;
    svg.setAttribute(
      "viewBox",
      `${r2(minX - pad)} ${r2(minY - pad)} ${r2(maxX - minX + pad * 2)} ${r2(maxY - minY + pad * 2)}`,
    );
    svg.innerHTML = parts.join("");
  }

  /**
   * The dock is a menu bar of the building's regions. Ten halls fitted in a
   * row; forty-one rooms do not, and a row that has to be scrolled hides most
   * of the building from anyone who does not think to scroll it. A region
   * opens into a list of its rooms, and the list's heading frames the whole
   * region.
   */
  private buildDock(): void {
    this.dock.replaceChildren();
    const hide = document.createElement("button");
    hide.type = "button";
    hide.className = "fold";
    hide.dataset.fold = "dock";
    hide.title = "Hide the rooms";
    hide.textContent = "Hide";
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "fold-tab";
    tab.dataset.fold = "dock";
    tab.title = "Show the rooms";
    tab.textContent = "Rooms";
    const row = document.createElement("div");
    row.className = "dock-halls";
    for (const region of REGIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.region = region.id;
      button.setAttribute("aria-expanded", "false");
      const swatches = document.createElement("span");
      swatches.className = "swatches";
      for (const id of region.rooms.slice(0, 5)) {
        const room = halls.find((h) => h.id === id);
        if (!room) continue;
        const sw = document.createElement("i");
        sw.style.background = hex(room.accent);
        swatches.append(sw);
      }
      const name = document.createElement("span");
      name.textContent = region.short;
      const count = document.createElement("span");
      count.className = "k";
      count.textContent = String(region.rooms.length);
      button.append(swatches, name, count);
      button.addEventListener("click", () => this.toggleDockMenu(region.id));
      row.append(button);
    }
    const all = document.createElement("button");
    all.type = "button";
    all.dataset.hall = "";
    const key = document.createElement("span");
    key.className = "k";
    key.textContent = "0";
    const name = document.createElement("span");
    name.textContent = "Whole block";
    all.append(key, name);
    all.addEventListener("click", () => {
      this.closeDockMenu();
      this.hooks.goOverview();
    });
    const menu = document.createElement("div");
    menu.className = "dock-menu";
    menu.hidden = true;
    this.dock.append(hide, tab, row, all, menu);
    this.dockRow = row;
    this.dockMenu = menu;
    row.addEventListener("scroll", () => this.markDockScroll(), { passive: true });
    requestAnimationFrame(() => this.markDockScroll());
  }

  private dockMenu: HTMLElement | null = null;
  private openRegion: string | null = null;

  private toggleDockMenu(regionId: string): void {
    if (this.openRegion === regionId) {
      this.closeDockMenu();
      return;
    }
    const region = REGIONS.find((r) => r.id === regionId);
    const menu = this.dockMenu;
    if (!region || !menu) return;
    this.openRegion = regionId;
    menu.replaceChildren();
    const head = document.createElement("button");
    head.type = "button";
    head.className = "dock-menu-head";
    const title = document.createElement("span");
    title.textContent = region.name;
    const act = document.createElement("span");
    act.className = "k";
    act.textContent = "Frame all";
    head.append(title, act);
    head.addEventListener("click", () => {
      this.closeDockMenu();
      this.hooks.goRegion(region.id);
    });
    const list = document.createElement("ul");
    list.className = "dock-menu-list";
    if (region.rooms.length > 6) list.classList.add("two");
    for (const id of region.rooms) {
      const room = halls.find((h) => h.id === id);
      if (!room) continue;
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.hall = room.id;
      const swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = hex(room.accent);
      const name = document.createElement("span");
      name.className = "n";
      name.textContent = room.name;
      const where = document.createElement("span");
      where.className = "where";
      where.textContent = room.city ?? room.tagline;
      const ref = document.createElement("span");
      ref.className = "k";
      ref.textContent = room.ref;
      button.append(swatch, name, where, ref);
      button.addEventListener("click", () => {
        this.closeDockMenu();
        this.hooks.goHall(room.id);
      });
      li.append(button);
      list.append(li);
    }
    menu.append(head, list);
    menu.hidden = false;
    for (const b of this.dock.querySelectorAll<HTMLButtonElement>("button[data-region]")) {
      b.setAttribute("aria-expanded", b.dataset.region === regionId ? "true" : "false");
    }
  }

  closeDockMenu(): boolean {
    const was = this.openRegion !== null;
    this.openRegion = null;
    if (this.dockMenu) this.dockMenu.hidden = true;
    for (const b of this.dock.querySelectorAll<HTMLButtonElement>("button[data-region]")) {
      b.setAttribute("aria-expanded", "false");
    }
    return was;
  }

  /**
   * Fades the end of the row when there are halls past the edge of it. Ten
   * halls need about 1070px, and below that they simply disappeared: the row
   * scrolls with its scrollbar hidden and nothing said so.
   */
  markDockScroll(): void {
    const row = this.dockRow;
    if (!row) return;
    const over = row.scrollWidth - row.clientWidth;
    row.classList.toggle("scrolls", over > 4);
    row.classList.toggle("at-end", over > 4 && row.scrollLeft >= over - 2);
  }

  private buildKeys(): void {
    const list = $("keys-list");
    list.replaceChildren();
    for (const [key, what] of KEYS) {
      const dt = document.createElement("dt");
      dt.textContent = key;
      const dd = document.createElement("dd");
      dd.textContent = what;
      list.append(dt, dd);
    }
  }

  private wireTools(): void {
    $("tools").addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest("button");
      if (!button) return;
      switch (button.dataset.act) {
        case "rotate-ccw": this.hooks.rotate(-1); break;
        case "rotate-cw": this.hooks.rotate(1); break;
        case "zoom-in": this.hooks.zoom(1.35); break;
        case "zoom-out": this.hooks.zoom(1 / 1.35); break;
        case "pause": this.hooks.togglePause(); break;
        case "search": this.openFinder(); break;
        case "settings": this.toggleSheet(this.settingsPanel); break;
        case "help": this.toggleSheet(this.helpPanel); break;
        case "fold": this.toggleAllChrome(); break;
      }
    });
    $("d-prev").addEventListener("click", () => this.hooks.stepPerson(-1));
    $("d-next").addEventListener("click", () => this.hooks.stepPerson(1));
    for (const sheet of [this.finder, this.settingsPanel, this.helpPanel, this.aboutPanel]) {
      sheet.addEventListener("pointerdown", (event) => {
        if (event.target === sheet) sheet.hidden = true;
      });
    }
  }

  /* ------------------------------------------------------------ dossier */

  renderDossier(selection: Selection, person: Person | undefined, index: number, total: number): void {
    const hall = halls.find((h) => h.id === (selection.kind === "overview" ? "" : selection.hallId));
    const kicker = $("d-kicker");
    const title = $("d-title");
    const sub = $("d-sub");
    const chips = $("d-chips");
    const doing = $("d-doing");
    const why = $("d-why");
    const facts = $("d-facts");
    const ethos = $("d-ethos");
    const count = $("d-count");

    chips.replaceChildren();
    facts.replaceChildren();

    if (person && hall) {
      this.announce(`${person.name}. ${person.role}. ${hall.name}.`);
      kicker.textContent = person.staff
        ? `${hall.name} · ${person.tier}`
        : `${hall.name}${hall.city ? ` · ${hall.city}` : ""} · ${person.tier}`;
      title.textContent = person.name;
      sub.textContent = person.role;
      for (const chip of person.chips) {
        const li = document.createElement("li");
        li.textContent = chip;
        chips.append(li);
      }
      doing.textContent = person.doing;
      why.textContent = person.why;
      addFact(facts, "Right now", describe(person, this.people));
      addFact(facts, person.staff ? "Works in" : "Hall", person.staff ? hall.name : `${hall.name}, ${hall.ref}`);
      ethos.textContent = hall.ethos;
      count.textContent = total ? `${index + 1} / ${total}` : "";
      $("d-prev").hidden = total < 2;
      $("d-next").hidden = total < 2;
      $("d-nav").hidden = total < 2;
      return;
    }

    if (hall) {
      const here = this.hereNow(hall);
      const cast = hall.people.length + hall.staff.length;
      this.announce(`${hall.name}. ${hall.tagline}. ${here} here now.`);
      kicker.textContent = hall.kind === "commons"
        ? `The commons · ${hall.ref} · ${hall.tagline}`
        : `${hall.city ?? hall.region ?? "Lab"} · ${hall.ref} · ${hall.tagline}`;
      title.textContent = hall.name;
      sub.textContent = headCount(hall, here);
      doing.textContent = hall.blurb;
      why.textContent = hall.reading;
      for (const fact of hall.facts) addFact(facts, fact.label, fact.value);
      ethos.textContent = hall.ethos;
      count.textContent = "";
      $("d-prev").hidden = false;
      $("d-next").hidden = false;
      $("d-nav").hidden = cast < 1;
      return;
    }

    this.announce(`The whole block. ${labs.length} labs and the commons.`);
    kicker.textContent = "One building";
    title.textContent = `${inWords(labs.length, true)} labs, one clock`;
    sub.textContent = "September 2026";
    doing.textContent =
      "The labs are laid out as a map of the world, the Americas to the west and Asia to the east. Through the middle runs the commons: the corpus, the cluster, the classroom and the studio every model passes through, and the canteen, the gym and the court they all share.";
    why.textContent =
      "Every day one model is trained here. It grows in the pod overnight, is taught and rated and examined through the afternoon, is shown on the stage at the review, and leaves by the open frame in the south-east corner. Click anything to read it.";
    addFact(facts, "Plan", `${GRID.cols} × ${GRID.rows}, a map of the world`);
    addFact(facts, "Labs", String(labs.length));
    addFact(facts, "Shared rooms", String(halls.length - labs.length));
    addFact(facts, "Figures", String(this.people.length));
    const active = PALETTES.find((p) => p.id === this.settings.palette) ?? PALETTES[0];
    addFact(facts, "Inks", String(active.ramp.length + active.accents.length));
    ethos.textContent = "Drag to look. Scroll to zoom. Q and E turn the building; the arrows walk room to room. Press ? for the rest.";
    count.textContent = "";
    $("d-prev").hidden = true;
    $("d-next").hidden = true;
    // Nothing to page through, so the rule that separates it goes too.
    $("d-nav").hidden = true;
  }

  /**
   * Says what is being read, once, when it changes.
   *
   * The card itself carried aria-live, and it is rewritten every 0.45s while a
   * figure is selected, so a screen reader read the whole dossier twice a
   * second for as long as you stood still.
   */
  private hereNow(hall: HallSpec): number {
    return this.people.filter((p) => p.presence > 0.5 && roomIdAt(p.x, p.y) === hall.id).length;
  }

  /**
   * Keeps a room's head count current while the room is open. Rooms fill and
   * empty through the day now, and the line was written once, on the way in:
   * the canteen said three at the height of lunch. Only the line changes, and
   * nothing is announced again.
   */
  refreshHeadCount(hallId: string): void {
    const hall = halls.find((h) => h.id === hallId);
    if (hall) $("d-sub").textContent = headCount(hall, this.hereNow(hall));
  }

  private announce(text: string): void {
    if (text === this.spoken) return;
    this.spoken = text;
    $("d-live").textContent = text;
  }

  markDock(hallId: string | null): void {
    const region = hallId ? regionOf(hallId)?.id : null;
    for (const button of this.dock.querySelectorAll<HTMLButtonElement>("button")) {
      if ("region" in button.dataset) {
        button.setAttribute("aria-current", button.dataset.region === region ? "true" : "false");
        continue;
      }
      if (!("hall" in button.dataset)) continue;
      const id = button.dataset.hall ?? "";
      button.setAttribute("aria-current", id === (hallId ?? "") ? "true" : "false");
    }
  }

  /* -------------------------------------------------------------- clock */

  renderClock(paused: boolean): void {
    $("clock").textContent = this.clock.hhmm();
    const phase = this.clock.phase();
    $("phase").textContent = paused ? "Held" : phase.name;
    $("phase-note").textContent = phase.note;
    if (!this.scrubbing) this.timeline.value = String(Math.floor(this.clock.minutes));
    const pause = document.querySelector<HTMLButtonElement>('[data-act="pause"]');
    if (pause) {
      pause.textContent = paused ? "Run" : "Pause";
      pause.setAttribute("aria-pressed", paused ? "true" : "false");
    }
    if (this.atGate) {
      // The cover keeps the building's time too. Written only on change, since
      // this runs every frame and the header is centred on it.
      write(this.gateClock, this.clock.hhmm());
      write(this.gatePhase, paused ? "Held" : phase.name);
      write(this.gateNote, phase.note);
    }
  }

  private wireTimeline(): void {
    const start = () => { this.scrubbing = true; };
    const end = () => { this.scrubbing = false; };
    this.timeline.addEventListener("pointerdown", start);
    this.timeline.addEventListener("pointerup", end);
    this.timeline.addEventListener("pointercancel", end);
    this.timeline.addEventListener("blur", end);
    this.timeline.addEventListener("input", () => {
      this.scrubbing = true;
      this.hooks.setMinutes(Number(this.timeline.value));
    });
    this.timeline.addEventListener("change", end);
  }

  /* ------------------------------------------------------------ tooltip */

  showTooltip(text: string, role: string, x: number, y: number): void {
    this.tooltip.replaceChildren();
    this.tooltip.append(document.createTextNode(text));
    if (role) {
      const span = document.createElement("span");
      span.className = "role";
      span.textContent = role;
      this.tooltip.append(span);
    }
    // Placed above and centred on the cursor, so near an edge it would hang
    // off the page and be clipped by the body's overflow.
    this.tooltip.classList.add("on");
    const box = this.tooltip.getBoundingClientRect();
    const margin = 8;
    const half = box.width / 2;
    const left = Math.min(Math.max(x, half + margin), window.innerWidth - half - margin);
    const above = y - box.height * 0.4;
    const top = above < box.height + margin ? y + box.height * 1.7 : y;
    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(top)}px`;
  }

  hideTooltip(): void {
    this.tooltip.classList.remove("on");
  }

  toast(message: string): void {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    this.toasts.append(el);
    setTimeout(() => el.remove(), 2800);
  }

  /* ------------------------------------------------------------- finder */

  private buildFinderRows(): void {
    const rows: FinderRow[] = [];
    for (const hall of halls) {
      rows.push({
        kind: hall.kind === "commons" ? "Commons" : "Lab",
        label: hall.name,
        // The grid reference is searchable, so "E5" finds whatever stands there.
        meta: `${hall.ref} · ${hall.city ? `${hall.city} · ` : ""}${hall.tagline}`,
        run: () => this.hooks.goHall(hall.id),
      });
    }
    for (const region of REGIONS) {
      rows.push({
        kind: "Region",
        label: region.name,
        meta: `Frame ${region.rooms.length} rooms`,
        run: () => this.hooks.goRegion(region.id),
      });
    }
    for (const person of this.people) {
      const hall = halls.find((h) => h.id === person.hallId);
      rows.push({
        kind: hall?.name ?? "Model",
        label: person.name,
        meta: `${person.role} · ${person.chips.join(", ")}`,
        run: () => this.hooks.goPerson(person.hallId, person.id),
      });
    }
    rows.push(
      { kind: "View", label: "The whole block", meta: `Frame all ${halls.length} rooms`, run: () => this.hooks.goOverview() },
      { kind: "View", label: "Turn right", meta: "E", run: () => this.hooks.rotate(1) },
      { kind: "View", label: "Turn left", meta: "Q", run: () => this.hooks.rotate(-1) },
      { kind: "Clock", label: "Hold the clock", meta: "Space", run: () => this.hooks.togglePause() },
      { kind: "Clock", label: "Go to first light", meta: "06:20", run: () => this.hooks.setMinutes(380) },
      { kind: "Clock", label: "Go to lunch", meta: "12:40", run: () => this.hooks.setMinutes(760) },
      { kind: "Clock", label: "Go to the keynote", meta: "18:30", run: () => this.hooks.setMinutes(1110) },
      { kind: "Clock", label: "Go to night watch", meta: "02:30", run: () => this.hooks.setMinutes(150) },
      { kind: "Page", label: "What is this?", meta: "The building, explained", run: () => this.toggleSheet(this.aboutPanel) },
      { kind: "Page", label: "Settings", meta: "S", run: () => this.toggleSheet(this.settingsPanel) },
      { kind: "Page", label: "Keys", meta: "?", run: () => this.toggleSheet(this.helpPanel) },
      { kind: "View", label: "Fold the panels", meta: "\\", run: () => { this.closeSheets(); this.toggleAllChrome(); } },
      { kind: "Page", label: "Save a picture", meta: "F", run: () => this.hooks.screenshot() },
    );
    for (const palette of PALETTES) {
      rows.push({
        kind: "Ink",
        label: palette.name,
        meta: palette.note,
        run: () => {
          this.settings.palette = palette.id;
          this.hooks.settingsChanged("palette");
          this.syncSettings();
        },
      });
    }
    this.rows = rows;
  }

  private wireFinder(): void {
    this.finderInput.addEventListener("input", () => this.runFinder());
    this.finderInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.cursor = Math.min(this.filtered.length - 1, this.cursor + 1);
        this.paintFinder();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.cursor = Math.max(0, this.cursor - 1);
        this.paintFinder();
      } else if (event.key === "Enter") {
        event.preventDefault();
        this.filtered[this.cursor]?.run();
        this.finder.hidden = true;
      } else if (event.key === "Escape") {
        this.finder.hidden = true;
      }
    });
    this.finderList.addEventListener("click", (event) => {
      const li = (event.target as HTMLElement).closest("li");
      if (!li) return;
      this.filtered[Number(li.dataset.at)]?.run();
      this.finder.hidden = true;
    });
  }

  openFinder(): void {
    this.closeSheets();
    this.finder.hidden = false;
    this.finderInput.value = "";
    this.runFinder();
    this.finderInput.focus();
  }

  private runFinder(): void {
    const query = this.finderInput.value.trim().toLowerCase();
    this.filtered = query
      ? this.rows
          .map((row) => ({ row, score: fuzzy(query, `${row.label} ${row.kind} ${row.meta}`.toLowerCase()) }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 40)
          .map((r) => r.row)
      : this.rows.slice(0, 24);
    this.cursor = 0;
    this.paintFinder();
  }

  private paintFinder(): void {
    this.finderList.replaceChildren();
    if (!this.filtered.length) {
      const note = document.createElement("li");
      note.className = "finder-empty";
      note.textContent = this.finderInput.value.trim()
        ? `Nothing in the building answers to that.`
        : "Type to find a model, a hall or a command.";
      this.finderList.append(note);
      return;
    }
    this.filtered.forEach((row, at) => {
      const li = document.createElement("li");
      li.dataset.at = String(at);
      li.setAttribute("aria-selected", at === this.cursor ? "true" : "false");
      const kind = document.createElement("span");
      kind.className = "kind";
      kind.textContent = row.kind;
      const hit = document.createElement("span");
      hit.className = "hit";
      hit.textContent = row.label;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = row.meta;
      li.append(kind, hit, meta);
      this.finderList.append(li);
    });
    this.finderList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }

  /* ----------------------------------------------------------- settings */

  private buildSettings(): void {
    const palette = $<HTMLSelectElement>("set-palette");
    palette.replaceChildren();
    for (const p of PALETTES) {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.name;
      palette.append(option);
    }
    const rate = $<HTMLSelectElement>("set-rate");
    rate.replaceChildren();
    for (const step of RATE_STEPS) {
      const option = document.createElement("option");
      option.value = String(step);
      option.textContent = step === 0 ? "Held" : step < 1 ? `${step}× real time` : `${step} min / second`;
      rate.append(option);
    }

    const bind = <K extends keyof Settings>(id: string, key: K, parse: (v: string) => Settings[K], out?: string, fmt?: (v: Settings[K]) => string) => {
      const el = $<HTMLInputElement | HTMLSelectElement>(id);
      el.addEventListener("input", () => {
        const value = el instanceof HTMLInputElement && el.type === "checkbox" ? (el.checked as Settings[K]) : parse(el.value);
        this.settings[key] = value;
        if (out) $(out).textContent = fmt ? fmt(value) : String(value);
        this.hooks.settingsChanged(key);
      });
    };

    bind("set-palette", "palette", (v) => v);
    bind("set-pixel", "pixel", Number, "set-pixel-out", (v) => `${v}×`);
    bind("set-dither", "dither", Number, "set-dither-out", (v) => pct(Number(v)));
    bind("set-grain", "grain", Number, "set-grain-out", (v) => pct(Number(v) / 0.6));
    bind("set-bloom", "bloom", Number, "set-bloom-out", (v) => pct(Number(v) / 1.4));
    bind("set-vignette", "vignette", Number, "set-vignette-out", (v) => pct(Number(v) / 0.8));
    bind("set-rate", "rate", Number);
    bind("set-quality", "quality", (v) => Number(v) as Settings["quality"]);
    bind("set-motion", "motion", (v) => v === "true");
    bind("set-labels", "labels", (v) => v === "true");
    bind("set-stats", "stats", (v) => v === "true");

    $("set-shot").addEventListener("click", () => this.hooks.screenshot());
    $("set-reset").addEventListener("click", () => this.hooks.resetSettings());
    this.syncSettings();
  }

  syncSettings(): void {
    const s = this.settings;
    $<HTMLSelectElement>("set-palette").value = s.palette;
    $<HTMLInputElement>("set-pixel").value = String(s.pixel);
    $("set-pixel-out").textContent = `${s.pixel}×`;
    $<HTMLInputElement>("set-dither").value = String(s.dither);
    $("set-dither-out").textContent = pct(s.dither);
    $<HTMLInputElement>("set-grain").value = String(s.grain);
    $("set-grain-out").textContent = pct(s.grain / 0.6);
    $<HTMLInputElement>("set-bloom").value = String(s.bloom);
    $("set-bloom-out").textContent = pct(s.bloom / 1.4);
    $<HTMLInputElement>("set-vignette").value = String(s.vignette);
    $("set-vignette-out").textContent = pct(s.vignette / 0.8);
    $<HTMLSelectElement>("set-rate").value = String(s.rate);
    $<HTMLSelectElement>("set-quality").value = String(s.quality);
    $<HTMLInputElement>("set-motion").checked = s.motion;
    $<HTMLInputElement>("set-labels").checked = s.labels;
    $<HTMLInputElement>("set-stats").checked = s.stats;
    this.stats.hidden = !s.stats;
  }

  setStats(text: string): void {
    if (this.settings.stats) this.stats.textContent = text;
  }

  toggleSheet(sheet: HTMLElement): void {
    const open = sheet.hidden;
    this.closeSheets();
    sheet.hidden = !open;
  }

  closeSheets(): boolean {
    const any = this.sheets().some((sheet) => !sheet.hidden);
    for (const sheet of this.sheets()) sheet.hidden = true;
    return any;
  }

  private sheets(): HTMLElement[] {
    return [this.finder, this.settingsPanel, this.helpPanel, this.aboutPanel];
  }

  get sheetOpen(): boolean {
    return this.sheets().some((sheet) => !sheet.hidden);
  }

  get settingsSheet(): HTMLElement {
    return this.settingsPanel;
  }

  get helpSheet(): HTMLElement {
    return this.helpPanel;
  }

  get aboutSheet(): HTMLElement {
    return this.aboutPanel;
  }

  private wireChrome(): void {
    document.body.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-fold]");
      if (!button?.dataset.fold) return;
      const panel = button.dataset.fold;
      if (!PANELS.includes(panel as Panel)) return;
      this.toggleFold(panel as Panel);
    });
  }

  private wireGate(): void {
    $("gate-enter").addEventListener("click", () => this.enter());
    $("gate-settings").addEventListener("click", () => this.toggleSheet(this.settingsPanel));
    $("gate-about").addEventListener("click", () => this.toggleSheet(this.aboutPanel));
    $("gate-inks").addEventListener("click", () => this.nextInk());
    for (const button of this.gate.querySelectorAll<HTMLButtonElement>("[data-turn]")) {
      button.addEventListener("click", () => this.hooks.rotate(Number(button.dataset.turn)));
    }

    // The schedule doubles as a row of doors. Pointing at one lights its hall
    // on the plate; the gaps between rows are ignored rather than read as
    // leaving, so running down the list does not flicker the whole block.
    const list = $("gate-halls");
    const rowOf = (event: Event) =>
      (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-hall]")?.dataset.hall;
    list.addEventListener("click", (event) => {
      const hallId = rowOf(event);
      if (hallId) this.enter({ kind: "hall", hallId });
    });
    list.addEventListener("pointerover", (event) => {
      const hallId = rowOf(event);
      if (hallId) this.hooks.peekHall(hallId);
    });
    list.addEventListener("focusin", (event) => this.hooks.peekHall(rowOf(event) ?? null));
    list.addEventListener("pointerleave", () => this.hooks.peekHall(null));
    list.addEventListener("focusout", () => this.hooks.peekHall(null));

    // The camera frames the block into the plate, so wherever the plate goes
    // the framing follows: a resize, the type arriving, the sheet scrolling on
    // a short screen.
    this.gate.addEventListener("scroll", () => this.hooks.plateMoved(), { passive: true });
    new ResizeObserver(() => this.hooks.plateMoved()).observe(this.gateFrame);

    // Letter the sheet in once its faces are here. Waiting on them means the
    // title never jumps from a fallback face to its own under the reader; the
    // timeout means a slow or blocked font never holds the door shut.
    const faces = [
      '400 100px "Instrument Serif"',
      'italic 400 100px "Instrument Serif"',
      '400 16px "Newsreader Variable"',
      'italic 400 16px "Newsreader Variable"',
    ];
    const loaded = "fonts" in document
      ? Promise.all(faces.map((face) => document.fonts.load(face)))
      : Promise.resolve();
    const patience = new Promise((resolve) => setTimeout(resolve, 1400));
    Promise.race([loaded, patience])
      .catch(() => undefined)
      .then(() =>
        requestAnimationFrame(() => {
          this.hooks.plateMoved();
          document.body.classList.add("gate-ready");
        }),
      );
  }

  private nextInk(): void {
    const at = PALETTES.findIndex((p) => p.id === this.settings.palette);
    this.settings.palette = PALETTES[(at + 1) % PALETTES.length].id;
    this.hooks.settingsChanged("palette");
    this.syncSettings();
  }

  /**
   * The cover sheet's schedule, key and title block. Built from the same hall
   * list as everything else, and rebuilt when the ink changes, because the
   * swatches are the palette's own accents.
   */
  private buildGate(palette: Palette): void {
    const list = $("gate-halls");
    list.replaceChildren();
    // Grouped the way the dock groups them, and the way the plan lays them
    // out: a region at a time, each room with the grid square it stands in.
    for (const region of REGIONS) {
      const head = document.createElement("li");
      head.className = "gate-region";
      head.textContent = region.short;
      list.append(head);
      for (const id of region.rooms) {
        const hall = halls.find((h) => h.id === id);
        if (!hall) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.hall = hall.id;
        button.title = `Enter at ${hall.name}, ${hall.ref}`;
        if (hall.id === (this.peeked ?? this.arrivalHall)) button.classList.add("peek");
        const swatch = document.createElement("i");
        swatch.className = "swatch";
        swatch.style.background = hex(hall.accent);
        button.append(span("k", hall.ref), swatch, span("n", hall.name), span("leader", ""), span("t", hall.city ?? hall.tagline));
        const li = document.createElement("li");
        li.append(button);
        list.append(li);
      }
    }

    $("gate-ink-name").textContent = palette.name;
    $("gate-ink-note").textContent = palette.note;
    $("gate-inks").setAttribute("aria-label", `Ink: ${palette.name}. Change to the next ink.`);
    const chips = $("gate-ink-chips");
    chips.replaceChildren();
    [...palette.ramp, ...palette.accents].forEach((ink, i) => {
      const chip = document.createElement("i");
      chip.style.background = hex(ink);
      if (i === palette.ramp.length) chip.className = "first-accent";
      chips.append(chip);
    });

    const facts = $("gate-facts");
    facts.replaceChildren();
    const fact = (label: string, value: string) => {
      const cell = document.createElement("div");
      addFact(cell, label, value);
      facts.append(cell);
    };
    fact("Plan", `${GRID.cols} × ${GRID.rows}, a map of the world`);
    fact("Labs", String(labs.length));
    fact("Shared", String(halls.length - labs.length));
    fact("Figures", String(this.people.length));
    fact("Inks", String(palette.ramp.length + palette.accents.length));

    for (const el of document.querySelectorAll<HTMLElement>('[data-fill="halls-word"]')) {
      el.textContent = inWords(labs.length, true);
    }
  }

  private toggleFold(panel: Panel): void {
    if (this.folded.has(panel)) this.folded.delete(panel);
    else this.folded.add(panel);
    this.writeFolds(true);
  }

  private restoreFolds(): void {
    try {
      const raw = localStorage.getItem(CHROME_KEY);
      const saved = raw ? JSON.parse(raw) as unknown : [];
      const names = Array.isArray(saved)
        ? saved.filter((id): id is Panel => typeof id === "string" && (PANELS as readonly string[]).includes(id))
        : [];
      this.folded = new Set(names);
    } catch {
      this.folded = new Set();
    }
    this.writeFolds(false);
  }

  private writeFolds(refit: boolean): void {
    for (const panel of PANELS) {
      document.body.classList.toggle(`fold-${panel}`, this.folded.has(panel));
    }
    try {
      localStorage.setItem(CHROME_KEY, JSON.stringify([...this.folded]));
    } catch {
      /* private mode. The choice lasts for this visit. */
    }
    if (refit) this.hooks.layoutChanged();
  }

  /* ------------------------------------------------------------ minimap */

  private wireMinimap(): void {
    this.minimap.addEventListener("click", (event) => {
      const rect = this.minimap.getBoundingClientRect();
      const layout = mapLayout(rect.width, rect.height);
      const wx = (event.clientX - rect.left - layout.offX) / layout.s - GROUNDS_REACH;
      const wy = (event.clientY - rect.top - layout.offY) / layout.s - GROUNDS_REACH;
      const slot = SLOTS.find(
        (item) => wx >= item.x && wx < item.x + RW && wy >= item.y && wy < item.y + RD,
      );
      if (slot) this.hooks.goHall(slot.room.id);
      else this.hooks.goOverview();
    });
  }

  /**
   * Matches the backing store to the box the browser gives the canvas, so the
   * plan is drawn at device resolution instead of being resampled. Returns the
   * size to lay out in, in CSS pixels.
   */
  private sizeMap(): { w: number; h: number } {
    const rect = this.minimap.getBoundingClientRect();
    const w = Math.max(80, Math.round(rect.width));
    const h = Math.max(40, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (this.minimap.width !== bw || this.minimap.height !== bh) {
      this.minimap.width = bw;
      this.minimap.height = bh;
    }
    this.mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  /**
   * The plan, and the title block that fills the rest of the sheet.
   *
   * The plan is about three to two; the canvas used to be nearly four to one,
   * so most of it was flat paper with a small plan floating in the middle. The
   * space to the right of the plan now carries what a drawing of this kind
   * carries: which way is north, how big a metre is, and what sheet this is.
   */
  drawMinimap(cam: Camera, selectedHall: string | null, hovered: string | null, cssPerUnit: number): void {
    const ctx = this.mapCtx;
    const { w, h } = this.sizeMap();
    const layout = mapLayout(w, h);
    const { s, px, py } = layout;
    const page = this.page;
    const ink = this.ink;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = hex(page);
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = hex(mix(page, ink, 0.07));
    ctx.fillRect(
      px(-GROUNDS_REACH), py(-GROUNDS_REACH),
      (BLOCK_W + GROUNDS_REACH * 2) * s, (BLOCK_D + GROUNDS_REACH * 2) * s,
    );

    for (const room of halls) {
      const o = hallOrigin(room);
      const active = room.id === selectedHall;
      const rw = room.w * s;
      const rd = room.d * s;
      if (room.open) {
        // The court, drawn open.
        ctx.strokeStyle = hex(mix(ink, page, 0.7));
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.strokeRect(px(o.x) + 1.5, py(o.y) + 1.5, rw - 3, rd - 3);
        ctx.setLineDash([]);
        continue;
      }
      // The commons are drawn a shade lighter than the labs, so the spine of
      // shared rooms reads as a street through the plan.
      const base = room.kind === "commons" ? mix(page, ink, 0.04) : mix(page, ink, 0.1);
      ctx.fillStyle = hex(active ? mix(room.accent, page, 0.4) : base);
      ctx.fillRect(px(o.x) + 1, py(o.y) + 1, rw - 2, rd - 2);
      if (room.kind === "lab") {
        ctx.fillStyle = hex(room.accent);
        ctx.fillRect(px(o.x) + 1, py(o.y + room.d) - 3, rw - 2, 2);
      }
      ctx.strokeStyle = hex(mix(ink, page, 0.55));
      ctx.lineWidth = 1;
      ctx.strokeRect(px(o.x) + 0.5, py(o.y) + 0.5, rw - 1, rd - 1);
    }
    // Grid bubbles along the top and the left, the way a drawing is keyed.
    if (s * RW >= 14) {
      ctx.font = MAP_FONT;
      ctx.fillStyle = hex(mix(ink, page, 0.45));
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      for (let c = 0; c < GRID.cols; c++) ctx.fillText(COL_LABELS[c], px(c * RW + RW / 2), py(-GROUNDS_REACH) + 7);
      ctx.textAlign = "left";
      for (let r = 0; r < GRID.rows; r++) ctx.fillText(ROW_LABELS[r], px(-GROUNDS_REACH) + 1, py(r * RD + RD / 2) + 3);
    }

    // Camera footprint on the floor plane, clipped to the plan including the sidewalk.
    ctx.save();
    ctx.beginPath();
    ctx.rect(px(-GROUNDS_REACH), py(-GROUNDS_REACH), (BLOCK_W + GROUNDS_REACH * 2) * s, (BLOCK_D + GROUNDS_REACH * 2) * s);
    ctx.clip();
    const corners = [
      unproject(cam, 0, 0, 0),
      unproject(cam, cam.w, 0, 0),
      unproject(cam, cam.w, cam.h, 0),
      unproject(cam, 0, cam.h, 0),
    ];
    ctx.beginPath();
    corners.forEach((c, i) => (i === 0 ? ctx.moveTo(px(c.x), py(c.y)) : ctx.lineTo(px(c.x), py(c.y))));
    ctx.closePath();
    ctx.strokeStyle = hex(this.accent);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = rgba(this.accent, 0.1);
    ctx.fill();
    ctx.restore();

    for (const person of this.people) {
      const isHover = person.id === hovered;
      ctx.fillStyle = hex(isHover ? this.accent : scale(person.accent, 0.95));
      const r = isHover ? 3 : 2;
      ctx.fillRect(px(person.x) - r / 2, py(person.y) - r / 2, r, r);
    }

    this.drawTitleBlock(ctx, layout, w, h, cam, cssPerUnit);

    const hall = halls.find((x) => x.id === selectedHall);
    this.mapNote.textContent = hall
      ? `${hall.ref} · ${hall.name}`
      : `The block · ${labs.length} labs`;
  }

  /** North, scale and the sheet's own particulars, to the right of the plan. */
  private drawTitleBlock(
    ctx: CanvasRenderingContext2D,
    layout: MapLayout,
    w: number, h: number,
    cam: Camera,
    cssPerUnit: number,
  ): void {
    const ink = this.ink;
    const soft = hex(mix(ink, this.page, 0.42));
    const x0 = layout.offX + layout.planW + MAP_GAP;
    const top = MAP_PAD;
    const bottom = h - MAP_PAD;

    ctx.strokeStyle = hex(mix(ink, this.page, 0.72));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 - MAP_GAP / 2 + 0.5, top);
    ctx.lineTo(x0 - MAP_GAP / 2 + 0.5, bottom);
    ctx.stroke();

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = MAP_FONT;
    if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = "0.08em";
    ctx.fillStyle = soft;
    ctx.fillText("BLOCK PLAN", x0, top + 9);

    // North. The building's -y edge is north, and it swings with the view, so
    // the rose keeps its own column clear of the fields beside it.
    const nx = unrotX(cam.yaw, 0, -1);
    const ny = unrotY(cam.yaw, 0, -1);
    const dx = nx - ny;
    const dy = (nx + ny) * 0.5;
    const len = Math.hypot(dx, dy) || 1;
    const ax = dx / len;
    const ay = dy / len;
    const cx = x0 + 17;
    const cy = top + 44;
    const r = 13;
    const waist = 3.8;
    ctx.strokeStyle = hex(mix(ink, this.page, 0.66));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // A filled half and an open half, the way a compass needle is drawn.
    const tipX = cx + ax * r;
    const tipY = cy + ay * r;
    const tailX = cx - ax * r * 0.62;
    const tailY = cy - ay * r * 0.62;
    ctx.fillStyle = hex(ink);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(cx - ay * waist, cy + ax * waist);
    ctx.lineTo(tailX, tailY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hex(ink);
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(cx + ay * waist, cy - ax * waist);
    ctx.lineTo(tailX, tailY);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = hex(ink);
    ctx.textAlign = "center";
    ctx.fillText("N", cx + ax * (r + 7), cy + ay * (r + 7) + 3);

    // Fields, in their own column clear of the rose's swing.
    ctx.textAlign = "left";
    ctx.fillStyle = soft;
    const fx = x0 + 2 * r + 14;
    ctx.fillText(`${labs.length} LABS`, fx, top + 40);
    ctx.fillText(`${GRID.cols} x ${GRID.rows} GRID`, fx, top + 52);

    // Scale bar, reading the camera: a round number of metres, drawn the
    // length it actually measures on the drawing.
    const room = w - x0 - MAP_PAD;
    const want = Math.min(96, room);
    let metres = 1;
    for (let decade = 0; decade <= 3; decade++) {
      for (const step of [1, 2, 5]) {
        const candidate = step * Math.pow(10, decade);
        if (candidate * cssPerUnit <= want) metres = candidate;
      }
    }
    const barLen = Math.max(14, Math.min(room, metres * cssPerUnit));
    const by = bottom - 12;
    ctx.fillStyle = hex(ink);
    ctx.fillRect(x0, by, barLen, 3);
    // Alternating cells, so the bar reads as a rule rather than a block.
    ctx.fillStyle = hex(this.page);
    for (let i = 1; i < 4; i += 2) ctx.fillRect(x0 + (barLen * i) / 4, by, barLen / 4, 3);
    ctx.strokeStyle = hex(ink);
    ctx.strokeRect(x0 + 0.5, by + 0.5, barLen - 1, 2);
    ctx.fillStyle = soft;
    ctx.textAlign = "left";
    ctx.fillText("0", x0, by - 5);
    ctx.textAlign = "right";
    ctx.fillText(`${metres} M`, x0 + barLen, by - 5);
    ctx.textAlign = "left";
    if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = "0px";
  }

  private get accent(): RGB {
    const active = PALETTES.find((p) => p.id === this.settings.palette) ?? PALETTES[0];
    return active.accents[0];
  }
}

const MAP_PAD = 8;
const MAP_GAP = 10;
const MAP_TITLE_W = 116;
const MAP_FONT = '9px ui-monospace, "SF Mono", Menlo, Consolas, monospace';

type MapLayout = {
  s: number;
  offX: number;
  offY: number;
  planW: number;
  planH: number;
  px: (x: number) => number;
  py: (y: number) => number;
};

function mapLayout(w: number, h: number): MapLayout {
  const worldW = BLOCK_W + GROUNDS_REACH * 2;
  const worldH = BLOCK_D + GROUNDS_REACH * 2;
  const planW = Math.max(40, w - MAP_PAD * 2 - MAP_GAP - MAP_TITLE_W);
  const planH = Math.max(30, h - MAP_PAD * 2);
  const s = Math.min(planW / worldW, planH / worldH);
  const offX = MAP_PAD + (planW - worldW * s) / 2;
  const offY = MAP_PAD + (planH - worldH * s) / 2;
  return {
    s,
    offX,
    offY,
    planW,
    planH,
    px: (x) => offX + (x + GROUNDS_REACH) * s,
    py: (y) => offY + (y + GROUNDS_REACH) * s,
  };
}

/** Two decimals, for SVG point lists. */
function r2(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function addFact(list: HTMLElement, label: string, value: string): void {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  list.append(dt, dd);
}

function span(className: string, text: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

/** Sets text only when it differs, for things rewritten every frame. */
function write(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

const WORDS = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/** A count as it is written in prose, which reaches as far as the building has had to. */
function inWords(n: number, capital = false): string {
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty"];
  const word = WORDS[n] ?? (n < 70 ? `${tens[Math.floor(n / 10)]}${n % 10 ? `-${WORDS[n % 10]}` : ""}` : String(n));
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** What a figure is doing and where, in a line. */
function describe(person: Person, people: Person[]): string {
  const here = roomIdAt(person.x, person.y);
  const room = halls.find((h) => h.id === here);
  const home = person.hallId === here;
  const inRoom = room && !home ? ` in ${roomPhrase(room)}` : "";
  if (person.presence < 0.5) return "Has left the building";
  if (person.activity === "walk") {
    const to = halls.find((h) => h.id === person.goalHall);
    if (person.goalStation === "exit") return "Leaving by the open frame";
    return to && to.id !== person.hallId ? `On the way to ${roomPhrase(to)}` : "Crossing the floor";
  }
  if (person.activity === "talk") {
    const other = people.find((p) => `${p.hallId}/${p.id}` === person.talkingTo);
    return other ? `Talking to ${other.short ?? other.name}${inRoom}` : `Talking${inRoom}`;
  }
  switch (person.pose) {
    case "type": return person.seat > 0 ? `At a desk${inRoom}` : `At a bench${inRoom}`;
    case "eat": return `Eating${inRoom}`;
    case "run": return `On a treadmill${inRoom}`;
    case "bike": return `On a bike${inRoom}`;
    case "row": return `Rowing${inRoom}`;
    case "lift": return `Lifting${inRoom}`;
    case "stretch": return `Stretching${inRoom}`;
    case "punch": return `At the bag${inRoom}`;
    case "write": return `Writing on a board${inRoom}`;
    case "present": return `On the stage${inRoom}`;
    case "watch": return `Watching${inRoom}`;
    case "read": return `Reading${inRoom}`;
    case "pour": return `Working the counter${inRoom}`;
    case "sit": return person.id === CHECKPOINT ? `Sitting a lesson${inRoom}` : `Sitting${inRoom}`;
    default: return person.id === CHECKPOINT && here === "pretraining" ? "Pretraining in the pod" : `Standing${inRoom}`;
  }
}

/** "the Canteen", "Anthropic's hall": how a sentence names a room. */
function roomPhrase(room: HallSpec): string {
  return room.kind === "commons" ? `the ${room.name.replace(/^The /, "")}` : `${room.name}'s hall`;
}

function roomIdAt(x: number, y: number): string | null {
  const col = Math.floor(x / RW);
  const row = Math.floor(y / RD);
  return SLOTS.find((s) => s.col === col && s.row === row)?.room.id ?? null;
}

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${a})`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Subsequence match with a bonus for hits at word starts. */
function fuzzy(query: string, target: string): number {
  let score = 0;
  let at = 0;
  for (const ch of query) {
    const found = target.indexOf(ch, at);
    if (found < 0) return 0;
    score += found === 0 || target[found - 1] === " " ? 3 : 1;
    score -= Math.min(2, (found - at) * 0.04);
    at = found + 1;
  }
  if (target.startsWith(query)) score += 12;
  return score;
}
