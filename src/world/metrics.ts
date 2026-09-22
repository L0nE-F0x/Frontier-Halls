/**
 * The block is one building, a grid of rooms. Halls are divided by
 * partitions rather than full walls, because in this projection a full-height
 * wall between two rooms hides the back corner of the room behind it. The
 * partitions are solid to chest height, glazed above that, and open to the
 * trusses. You can see the whole block at once and it still reads as rooms.
 */
export const RW = 16;
export const RD = 13;
export const WALL_T = 0.5;
export const WALL_H = 7;
export const FLOOR_Z = 0.18;

/** Outer walls that face the camera are cut to this, so they never occlude. */
export const KNEE_H = 1.2;

/** Partitions between halls. */
export const PART_T = 0.36;
export const PART_SOLID = 2.7;
export const PART_GLASS = 5.1;
export const COLUMN_W = 0.62;

/** The shared doorway through a partition. */
export const DOOR_GAP = 3.6;
export const DOOR_H = 4.4;

/** Clerestory band along the top of whichever long wall is currently tall. */
export const WINDOW_Z = WALL_H - 2.05;
export const WINDOW_H = 1.25;

/** Roof structure. */
export const TRUSS_Z = WALL_H - 0.5;
