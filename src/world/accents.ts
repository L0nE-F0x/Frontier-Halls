import { MAT } from "./materials";

/**
 * Shirt colours are the palette's own accents, held by reference, so a palette
 * swap re-inks the figures along with everything else. A colour that is not one
 * of the inks would be stippled into one anyway, and badly.
 */
export const AMBER = MAT.lamp;
export const CYAN = MAT.led;
export const VIOLET = MAT.seal;
export const SLATE = MAT.cloth;
