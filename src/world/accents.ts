import { MAT } from "./materials";

/**
 * Shirt colours are the palette's own accents, held by reference, so a palette
 * swap re-inks the figures along with everything else. A colour that is not one
 * of the inks would be stippled into one anyway, and badly.
 *
 * RED and GREEN are real inks only where the palette has them. In a palette
 * built on a strict handful — two drums, one tube — they fall back onto the
 * nearest accent it does have, so a hall's colour is never an ink that is not
 * on the sheet.
 */
export const AMBER = MAT.lamp;
export const CYAN = MAT.led;
export const VIOLET = MAT.seal;
export const RED = MAT.red;
export const GREEN = MAT.green;
export const SLATE = MAT.cloth;
