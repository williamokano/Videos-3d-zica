/**
 * World data format. Units are meters; +x is east, +z is south, +y is up.
 * A location is a persistent map that grows by patching this data, like a game level.
 */

export type WallSide = 'n' | 's' | 'e' | 'w';

export interface Opening {
  wall: WallSide;
  type: 'door' | 'window';
  /** Center of the opening, measured along the wall from its west (n/s walls) or north (e/w walls) end. */
  at: number;
  width: number;
}

export interface Prop {
  /** Asset id in the registry, e.g. "school.desk". */
  asset: string;
  /** [x, z] relative to the room origin (or absolute for location-level props). */
  pos: [number, number];
  /** Height above the floor. */
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
  height?: number;
  /** Outdoor areas have a floor but no walls or ceiling. */
  outdoor?: boolean;
  floorColor: string;
  wallColor?: string;
  openings?: Opening[];
  props?: Prop[];
}

export interface Location {
  id: string;
  name: string;
  ground: { color: string; size: number };
  rooms: Room[];
  props?: Prop[];
}
