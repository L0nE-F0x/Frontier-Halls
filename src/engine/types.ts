export type RGB = { r: number; g: number; b: number };

export type Vec3 = { x: number; y: number; z: number };

/** Quarter turns around +z. 0 puts the camera at the world +x/+y corner. */
export type Yaw = 0 | 1 | 2 | 3;

export type Camera = {
  /** Centre of the view, in view space (post-yaw), so panning stays screen-aligned. */
  x: number;
  y: number;
  /** Height the view is centred on. */
  z: number;
  /** Pixels per world unit. */
  s: number;
  /** Backbuffer size in pixels. */
  w: number;
  h: number;
  yaw: Yaw;
};

export type Lamp = {
  x: number;
  y: number;
  z: number;
  color: RGB;
  /** Multiplier at the source. */
  power: number;
  /** World units at which the lamp contributes nothing. */
  radius: number;
};

/** The daylight half of the lighting model, driven by the world clock. */
export type Sky = {
  /** Hemispheric term, applied to every face. */
  ambient: RGB;
  /** Directional term. */
  sun: RGB;
  sunDir: Vec3;
  /** Bounce from the floor, applied to downward faces so undersides never go flat black. */
  bounce: RGB;
  /** 0 at solar midnight, 1 at noon. Drives blinds, lamps and the HUD. */
  daylight: number;
};

export type Screen = { sx: number; sy: number; d: number };
