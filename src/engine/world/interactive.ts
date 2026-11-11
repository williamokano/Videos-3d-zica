import type * as THREE from 'three';

export interface Pose {
  x: number;
  y: number;
  z: number;
  /** Rotation around Y in degrees. */
  rot: number;
}

/** A value an action can animate, e.g. how far a door is open. */
export interface Channel {
  initial: number;
  set(value: number): void;
}

/**
 * Something actions can act on: a door, or a prop with an id.
 * Assets expose their own channels and anchors through `userData.channels` and
 * `userData.anchors` (see vehicle.car), so new kinds of object need no engine changes.
 */
export interface Interactive {
  id: string;
  kind: 'door' | 'prop';
  object: THREE.Object3D;
  channels: Record<string, Channel>;
  /** Named points other things can be attached to: a car seat, a trunk, later a character's hand. */
  anchors: Record<string, THREE.Object3D>;
  opensFrom?: 'inside' | 'outside' | 'both';
  /** Props only: where the object starts. */
  pose?: Pose;
}

/** What the action compiler needs to know about a target, without any scene objects. */
export interface TargetInfo {
  id: string;
  kind: 'door' | 'prop';
  channels: Record<string, number>;
  anchors: string[];
  opensFrom?: 'inside' | 'outside' | 'both';
  pose?: Pose;
}

export function describeTarget(i: Interactive): TargetInfo {
  return {
    id: i.id,
    kind: i.kind,
    channels: Object.fromEntries(Object.entries(i.channels).map(([name, c]) => [name, c.initial])),
    anchors: Object.keys(i.anchors),
    opensFrom: i.opensFrom,
    pose: i.pose,
  };
}
