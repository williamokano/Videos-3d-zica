/**
 * World data format. Units are meters; +x is east, +z is south, +y is up.
 * A location is a persistent map that grows by patching this data, like a game level.
 * Maps are series data (series/<series>/world); the engine only interprets them.
 */

/** Compass direction: n = -z, s = +z, e = +x, w = -x. */
export type Dir = 'n' | 's' | 'e' | 'w';

export interface DoorLeaf {
  /**
   * How the leaf moves (default "swing"):
   * - swing: hinged at the start of the opening.
   * - sliding: runs along the wall, on the side of the room that declares it.
   * - rollup: shop shutter that rolls up into a box above the opening and comes down to close.
   */
  kind?: 'swing' | 'sliding' | 'rollup';
  color?: string;
  /** Which side the door can be opened from; "inside" is the room that declares the opening. */
  opensFrom?: 'inside' | 'outside' | 'both';
  /** How open the door starts, from 0 (closed) to 1 (fully open). Actions animate this as the `open` channel. */
  open?: number;
  /** swing only: angle in degrees when fully open (default 90). */
  angle?: number;
  /** sliding only: which end of the opening the leaf slides toward (default "start", the west or north end). */
  slide?: 'start' | 'end';
}

/**
 * A real window in an opening: a frame with glass or slats, which can open (channel `open`, 0 to 1).
 * Kinds: "fixed", "sliding" (leaves that run along the wall), "tilt" (basculante: rows of panes that tilt out,
 * the window of Brazilian public schools), "casement" (two leaves hinged at the sides), "louver" (veneziana:
 * slats that turn, no glass) and "blinds" (glass with a blind inside that rolls up).
 */
export interface WindowFrame {
  kind: 'fixed' | 'sliding' | 'tilt' | 'casement' | 'louver' | 'blinds';
  /** Color of the frame (each kind has its own default). */
  color?: string;
  /** How open it starts, from 0 (closed) to 1. */
  open?: number;
  /** sliding: how many leaves (2 or 4; default by the width). */
  leaves?: number;
  /** tilt: how many columns of panes (default: one about every 55 cm). */
  columns?: number;
  /** blinds: color of the blind. */
  blind?: string;
}

export interface Opening {
  /** Name used by episode actions to target the door. Unique in the location. Defaults to "<room>.<wall><index>". */
  id?: string;
  wall: Dir;
  type: 'door' | 'window';
  /** Center of the opening, measured along the wall from its west (n/s walls) or north (e/w walls) end. */
  at: number;
  width: number;
  /** Door leaf. Without it the doorway is an open passage. */
  leaf?: DoorLeaf;
  /**
   * Windows: the frame. Without it, the location's `windows` is used; with neither, the window is a plain pane
   * of glass. `false` keeps this one plain whatever the location says.
   */
  frame?: WindowFrame | false;
}

export interface Prop {
  /**
   * Makes the prop an interactive object that episode actions can target. Unique in the location.
   * Its channels are x, y, z (location coordinates), yaw (degrees) and whatever the asset adds.
   */
  id?: string;
  /** Can be picked up and put down by actions. Needs an `id`. */
  pickable?: boolean;
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

/**
 * A hill (positive height) or a hollow (negative) of the terrain. Its height falls smoothly from the flat top
 * to nothing at the edge; overlapping hills add up.
 */
export interface Hill {
  /** Center [x, z]. */
  at: [number, number];
  /** Radius in meters, or [along x, along z] for an elongated hill (before `rot`). */
  radius: number | [number, number];
  /** Height at the top in meters; negative digs a hollow. */
  height: number;
  /** Part of the radius that is a flat top, 0 to 0.95 (default 0, a round top). A camp needs a flat top. */
  top?: number;
  /** Turns an elongated hill, degrees. */
  rot?: number;
}

/** Relief of the ground. Everything at location level (ground props, cast, walking) stands on it. */
export interface Terrain {
  hills: Hill[];
  /** Ground color up high, down in the hollows, and on steep slopes (bare earth); default the ground color. */
  highColor?: string;
  lowColor?: string;
  slopeColor?: string;
  /** Size of a cell of the ground mesh, meters (default 1). */
  resolution?: number;
  /** Height of the small bumps on hillsides, meters (default 0.15). */
  roughness?: number;
  /**
   * Where people walk outside the rooms, as areas with `origin` (north-west corner) and `size`: the walking map
   * covers them. Keep them to where the episodes need it; a large map is slow to build.
   */
  walkable?: { origin: [number, number]; size: [number, number] }[];
}

export interface Location {
  id: string;
  name: string;
  ground: { color: string; size: number };
  /** Hills and hollows. Without it the ground is flat at 0. Rooms keep their own `elevation`. */
  terrain?: Terrain;
  /** Where a visitor starts in walk mode: [x, z], floor height and heading (0 = north, 90 = west). */
  spawn?: { pos: [number, number]; elevation?: number; yaw?: number };
  rooms: Room[];
  stairs?: Stairs[];
  props?: Prop[];
  /** The frame of every window that does not say its own, e.g. `{ "kind": "tilt" }` for a school. */
  windows?: WindowFrame;
}
