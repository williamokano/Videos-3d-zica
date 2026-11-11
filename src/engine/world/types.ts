/**
 * World data format. Units are meters; +x is east, +z is south, +y is up.
 * A location is a persistent map that grows by patching this data, like a game level.
 * Maps are series data (series/<series>/world); the engine only interprets them.
 */

/** Compass direction: n = -z, s = +z, e = +x, w = -x. */
export type Dir = 'n' | 's' | 'e' | 'w';

export interface DoorLeaf {
  color?: string;
  /** Which side the door can be opened from; "inside" is the room that declares the opening. */
  opensFrom?: 'inside' | 'outside' | 'both';
  /** How far the leaf stands open, in degrees (0 = closed). */
  open?: number;
}

export interface Opening {
  wall: Dir;
  type: 'door' | 'window';
  /** Center of the opening, measured along the wall from its west (n/s walls) or north (e/w walls) end. */
  at: number;
  width: number;
  /** Door leaf. Without it the doorway is an open passage. */
  leaf?: DoorLeaf;
}

export interface Prop {
  /** Asset id in the registry, e.g. "school.desk". */
  asset: string;
  /** [x, z] relative to the room origin (or absolute for location-level props). */
  pos: [number, number];
  /** Height above the room floor. */
  y?: number;
  /** Rotation around Y in degrees. */
  rot?: number;
  params?: Record<string, number | string>;
  /** Lay out a grid of copies: count [nx, nz] with spacing [dx, dz]. */
  repeat?: { count: [number, number]; spacing: [number, number] };
}

export interface Room {
  id: string;
  name: string;
  /** North-west corner [x, z]. */
  origin: [number, number];
  /** [width along x, depth along z]. */
  size: [number, number];
  /** Floor height. 0 is ground level; a basement is negative, an upper storey positive. */
  elevation?: number;
  /** Clear height from floor to ceiling. */
  height?: number;
  /** Outdoor areas have a floor but no walls or ceiling. */
  outdoor?: boolean;
  floorColor: string;
  wallColor?: string;
  openings?: Opening[];
  props?: Prop[];
}

/** A run of steps going down in `flight` direction by `drop` meters. */
export interface StairFlight {
  flight: Dir;
  drop: number;
}

/**
 * A flat platform between flights.
 * - straight: continues ahead.
 * - uturn: wide platform; the next flight comes back beside the previous one, on `side`.
 * - corner: square platform; the next flight leaves toward `side`.
 */
export interface StairLanding {
  landing: 'straight' | 'uturn' | 'corner';
  /** Length along the direction of travel. Defaults to the stair width. */
  depth?: number;
  side?: Dir;
  /** uturn only: space between the two flights. */
  gap?: number;
}

/** Stairs are described from the top going down. */
export interface Stairs {
  id: string;
  /** Center of the top edge of the first flight, [x, z]. */
  top: [number, number];
  /** Floor height at the top. */
  elevation: number;
  width: number;
  /** Target step height (default 0.18) and step depth (default 0.28). */
  riser?: number;
  tread?: number;
  color?: string;
  path: (StairFlight | StairLanding)[];
}

export interface Location {
  id: string;
  name: string;
  ground: { color: string; size: number };
  /** Where a visitor starts in walk mode: [x, z], floor height and heading (0 = north, 90 = west). */
  spawn?: { pos: [number, number]; elevation?: number; yaw?: number };
  rooms: Room[];
  stairs?: Stairs[];
  props?: Prop[];
}
