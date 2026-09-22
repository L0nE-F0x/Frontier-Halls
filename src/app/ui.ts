import { hex, mix, scale } from "../engine/color";
import { PALETTES, type Palette } from "../engine/palettes";
import { RATE_STEPS, type WorldClock } from "../engine/clock";
import { unproject } from "../engine/project";
import type { Camera } from "../engine/types";
import { BLOCK_D, BLOCK_W, GRID, halls, SLOTS } from "../world/building";
import { GROUNDS_REACH } from "../world/grounds";
import { RD, RW } from "../world/metrics";
import type { Person } from "../world/person";
import type { Settings } from "./settings";

export type Selection =
  | { kind: "overview" }
  | { kind: "hall"; hallId: string }
  | { kind: "person"; hallId: string; personId: string };

export type UiHooks = {
  goOverview(): void;
  goHall(id: string): void;
  goPerson(hallId: string, personId: string): void;
  stepPerson(delta: number): void;
  rotate(delta: number): void;
  zoom(factor: number): void;
  togglePause(): void;
  setMinutes(minutes: number): void;
  settingsChanged(key: keyof Settings): void;
  resetSettings(): void;
  screenshot(): void;
  layoutChanged(): void;
};

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const KEYS: [string, string][] = [
  ["1 – 9, A", "Enter a hall"],
  ["0", "The whole block"],
  ["Click", "Read a figure"],
  ["Drag / scroll", "Look and zoom"],
  ["Q / E", "Turn the building"],
  [", / .", "Previous, next figure"],
  ["Space", "Hold the clock"],
  ["[ / ]", "Slow down, speed up"],
  ["T", "Jump to noon, then midnight"],
  ["Ctrl K, /", "Find anything"],
  ["S", "Settings"],
  ["F", "Save a picture"],
  ["\\", "Hide or show every panel"],
  ["Esc", "Back out one step"],
];

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
  private folded = new Set<Panel>();
  private minimap = $<HTMLCanvasElement>("minimap");
  private mapCtx = this.minimap.getContext("2d")!;
  private mapNote = $("map-note");
  private timeline = $<HTMLInputElement>("timeline");
  private stats = $("stats");

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

  get atGate(): boolean {
    return !this.gate.hidden;
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

  enter(): void {
    if (this.gate.hidden) return;
    this.closeSheets();
    this.gate.hidden = true;
    document.body.classList.remove("at-gate");
    this.hooks.layoutChanged();
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
    const paper = palette.roles.paper;
    const ink = palette.roles.ink;
    const dark = isDark(palette);
    root.setProperty("--paper", hex(paper));
    root.setProperty("--paper-2", hex(mix(paper, ink, 0.08)));
    root.setProperty("--ink", hex(ink));
    root.setProperty("--ink-soft", hex(mix(ink, paper, dark ? 0.42 : 0.38)));
    root.setProperty("--accent", hex(palette.accents[0]));
    root.setProperty("--accent-2", hex(palette.accents[1]));
    root.setProperty("--accent-3", hex(palette.accents[2]));
    root.setProperty("--panel", rgba(paper, 0.94));
    root.setProperty("--panel-line", rgba(ink, 0.18));
    root.setProperty("--shadow", `0 1px 0 ${rgba(ink, 0.12)}`);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    $("set-palette-note").textContent = palette.note;
    this.buildDock();
  }

  private buildDock(): void {
    this.dock.replaceChildren();
    const hide = document.createElement("button");
    hide.type = "button";
    hide.className = "fold";
    hide.dataset.fold = "dock";
    hide.title = "Hide the halls";
    hide.textContent = "Hide";
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "fold-tab";
    tab.dataset.fold = "dock";
    tab.title = "Show the halls";
    tab.textContent = "Halls";
    const row = document.createElement("div");
    row.className = "dock-halls";
    for (const hall of halls) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.hall = hall.id;
      const swatch = document.createElement("i");
      swatch.className = "swatch";
      swatch.style.background = hex(hall.accent);
      const key = document.createElement("span");
      key.className = "k";
      key.textContent = hall.key.toUpperCase();
      const name = document.createElement("span");
      name.textContent = hall.name;
      button.append(swatch, key, name);
      button.addEventListener("click", () => this.hooks.goHall(hall.id));
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
    all.addEventListener("click", () => this.hooks.goOverview());
    this.dock.append(hide, tab, row, all);
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
      kicker.textContent = `${hall.name} · ${person.tier}`;
      title.textContent = person.name;
      sub.textContent = person.role;
      for (const chip of person.chips) {
        const li = document.createElement("li");
        li.textContent = chip;
        chips.append(li);
      }
      doing.textContent = person.doing;
      why.textContent = person.why;
      addFact(facts, "Right now", describe(person));
      addFact(facts, "Hall", hall.name);
      ethos.textContent = hall.ethos;
      count.textContent = total ? `${index + 1} / ${total}` : "";
      $("d-prev").hidden = total < 2;
      $("d-next").hidden = total < 2;
      return;
    }

    if (hall) {
      const keyLabel = hall.key.toUpperCase();
      kicker.textContent = hall.quarter
        ? `${hall.quarter} · Hall ${keyLabel} · ${hall.tagline}`
        : `Hall ${keyLabel} · ${hall.tagline}`;
      title.textContent = hall.name;
      sub.textContent = `${hall.people.length} in the hall`;
      doing.textContent = hall.blurb;
      why.textContent = hall.reading;
      for (const fact of hall.facts) addFact(facts, fact.label, fact.value);
      ethos.textContent = hall.ethos;
      count.textContent = "";
      $("d-prev").hidden = false;
      $("d-next").hidden = false;
      return;
    }

    kicker.textContent = "One building";
    title.textContent = `${halls.length} halls, one clock`;
    sub.textContent = "September 2026";
    doing.textContent =
      "The halls are laid out around a court, and the clock standing in the middle of it is the one every wall clock in the building is reading. A sidewalk runs around the outside.";
    why.textContent =
      "Click a figure to read who it is and why it moves the way it does. Click a floor to enter the hall. The figures are not on rails: they decide where to go from the clock and from their own habits.";
    addFact(facts, "Plan", `${GRID.cols} × ${GRID.rows}, ${halls.length} halls around a court`);
    addFact(facts, "Figures", String(this.people.length));
    const active = PALETTES.find((p) => p.id === this.settings.palette) ?? PALETTES[0];
    addFact(facts, "Inks", String(active.ramp.length + active.accents.length));
    ethos.textContent = "Drag to look. Scroll to zoom. Q and E turn the building. Press ? for the rest.";
    count.textContent = "";
    $("d-prev").hidden = true;
    $("d-next").hidden = true;
  }

  markDock(hallId: string | null): void {
    for (const button of this.dock.querySelectorAll<HTMLButtonElement>("button")) {
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
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.classList.add("on");
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
        kind: "Hall",
        label: hall.name,
        meta: hall.quarter ? `${hall.quarter} · ${hall.tagline}` : hall.tagline,
        run: () => this.hooks.goHall(hall.id),
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
      { kind: "View", label: "The whole block", meta: `Frame all ${halls.length} halls`, run: () => this.hooks.goOverview() },
      { kind: "View", label: "Turn right", meta: "E", run: () => this.hooks.rotate(1) },
      { kind: "View", label: "Turn left", meta: "Q", run: () => this.hooks.rotate(-1) },
      { kind: "Clock", label: "Hold the clock", meta: "Space", run: () => this.hooks.togglePause() },
      { kind: "Clock", label: "Go to first light", meta: "06:20", run: () => this.hooks.setMinutes(380) },
      { kind: "Clock", label: "Go to midday", meta: "12:40", run: () => this.hooks.setMinutes(760) },
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
      const layout = mapLayout(this.minimap.width, this.minimap.height);
      const wx = (((event.clientX - rect.left) / rect.width) * this.minimap.width - layout.offX) / layout.s - GROUNDS_REACH;
      const wy = (((event.clientY - rect.top) / rect.height) * this.minimap.height - layout.offY) / layout.s - GROUNDS_REACH;
      const slot = SLOTS.find(
        (item) => wx >= item.x && wx < item.x + RW && wy >= item.y && wy < item.y + RD,
      );
      if (slot?.hall) this.hooks.goHall(slot.hall.id);
      else this.hooks.goOverview();
    });
  }

  drawMinimap(cam: Camera, palette: Palette, selectedHall: string | null, hovered: string | null): void {
    const ctx = this.mapCtx;
    const w = this.minimap.width;
    const h = this.minimap.height;
    const { s, px, py } = mapLayout(w, h);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = hex(palette.roles.paper);
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = hex(mix(palette.roles.paper, palette.roles.ink, 0.07));
    ctx.fillRect(
      px(-GROUNDS_REACH), py(-GROUNDS_REACH),
      (BLOCK_W + GROUNDS_REACH * 2) * s, (BLOCK_D + GROUNDS_REACH * 2) * s,
    );

    for (const slot of SLOTS) {
      const active = slot.hall?.id === selectedHall;
      if (!slot.hall) {
        // The court, drawn open.
        ctx.strokeStyle = hex(mix(palette.roles.ink, palette.roles.paper, 0.7));
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.strokeRect(px(slot.x) + 1.5, py(slot.y) + 1.5, RW * s - 3, RD * s - 3);
        ctx.setLineDash([]);
        continue;
      }
      ctx.fillStyle = hex(
        active
          ? mix(slot.hall.accent, palette.roles.paper, 0.4)
          : mix(palette.roles.paper, palette.roles.ink, 0.1),
      );
      ctx.fillRect(px(slot.x) + 1, py(slot.y) + 1, RW * s - 2, RD * s - 2);
      ctx.fillStyle = hex(slot.hall.accent);
      ctx.fillRect(px(slot.x) + 1, py(slot.y + RD) - 3, RW * s - 2, 2);
      ctx.strokeStyle = hex(mix(palette.roles.ink, palette.roles.paper, 0.55));
      ctx.lineWidth = 1;
      ctx.strokeRect(px(slot.x) + 0.5, py(slot.y) + 0.5, RW * s - 1, RD * s - 1);
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
    ctx.strokeStyle = hex(palette.accents[0]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = rgba(palette.accents[0], 0.1);
    ctx.fill();
    ctx.restore();

    for (const person of this.people) {
      const isHover = person.id === hovered;
      ctx.fillStyle = hex(isHover ? palette.accents[0] : scale(person.accent, 0.95));
      const r = isHover ? 3 : 2;
      ctx.fillRect(px(person.x) - r / 2, py(person.y) - r / 2, r, r);
    }

    const hall = halls.find((x) => x.id === selectedHall);
    this.mapNote.textContent = hall
      ? `${hall.name} · ${hall.tagline}`
      : `The block · ${halls.length} halls`;
  }
}

function mapLayout(w: number, h: number): {
  s: number;
  offX: number;
  offY: number;
  px: (x: number) => number;
  py: (y: number) => number;
} {
  const pad = 6;
  const worldW = BLOCK_W + GROUNDS_REACH * 2;
  const worldH = BLOCK_D + GROUNDS_REACH * 2;
  const s = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldH);
  const offX = pad + ((w - pad * 2) - worldW * s) / 2;
  const offY = pad + ((h - pad * 2) - worldH * s) / 2;
  return {
    s,
    offX,
    offY,
    px: (x) => offX + (x + GROUNDS_REACH) * s,
    py: (y) => offY + (y + GROUNDS_REACH) * s,
  };
}

function addFact(list: HTMLElement, label: string, value: string): void {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  list.append(dt, dd);
}

function describe(person: Person): string {
  switch (person.activity) {
    case "walk": return "Crossing the floor";
    case "talk": return "Talking to someone";
    case "rest": return "Standing in the corridor";
    case "read": return "Reading";
    case "watch": return "Watching";
    default: return "At a station";
  }
}

function isDark(palette: Palette): boolean {
  const paper = palette.roles.paper;
  return paper.r * 0.299 + paper.g * 0.587 + paper.b * 0.114 < 110;
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
