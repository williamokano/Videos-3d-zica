import * as THREE from 'three';
import { resolveCollisions, type Rect } from '../engine/world/build';

const EYE_HEIGHT = 1.6;
const RADIUS = 0.3;
const WALK_SPEED = 3.2;
const RUN_SPEED = 6.5;
const TURN_SPEED = 1.8;

/** First-person exploration: WASD to move, mouse (pointer lock) or arrow keys to look, Shift to run. */
export class WalkControls {
  enabled = false;
  private yaw = 0;
  private pitch = 0;
  private readonly keys = new Set<string>();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLElement,
    private readonly colliders: Rect[],
  ) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('click', () => {
      if (this.enabled && document.pointerLockElement !== dom) void dom.requestPointerLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.4, 1.4);
    });
  }

  /** Stand at (x, z) looking along `yawDeg` (0 = north, 90 = west). */
  placeAt(x: number, z: number, yawDeg = 0): void {
    this.camera.position.set(x, EYE_HEIGHT, z);
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = 0;
    this.applyRotation();
  }

  exit(): void {
    this.enabled = false;
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  update(dt: number): void {
    if (!this.enabled) return;
    const k = this.keys;
    const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
    this.yaw += turn * TURN_SPEED * dt;
    const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    if (forward || strafe) {
      const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED) * dt;
      const len = Math.hypot(forward, strafe);
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const p = this.camera.position;
      const x = p.x + ((-sin * forward + cos * strafe) / len) * speed;
      const z = p.z + ((-cos * forward - sin * strafe) / len) * speed;
      [p.x, p.z] = resolveCollisions(x, z, RADIUS, this.colliders);
    }
    this.applyRotation();
  }

  private applyRotation(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
