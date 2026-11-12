import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { gazeAt, placementAt, type ActionClip } from './actions/catalog';
import './assets/building';
import './assets/vehicles';
import { buildBody } from './character/body';
import { reachPose, wristPosition } from './character/ik';
import { crouchPose, idlePose } from './character/motion';
import type { CharacterDef } from './character/types';
import { evaluateCamera } from './timeline/camera';
import type { Episode } from './timeline/episode';
import { applyStage, buildCast, cameraStage, compileEpisode } from './timeline/stage';
import { buildLocation } from './world/build';
import type { Location } from './world/types';

const ana: CharacterDef = { id: 'ana', name: 'Ana' };

// A room with a door to the south onto a yard with a box on the ground and a car facing east.
const location: Location = {
  id: 't', name: 't', ground: { color: '#fff', size: 80 },
  rooms: [
    { id: 'sala', name: 'Sala', origin: [0, 0], size: [6, 6], floorColor: '#fff', openings: [{ id: 'porta', wall: 's', type: 'door', at: 3, width: 1, leaf: {} }] },
    { id: 'saida', name: 'Saída', origin: [0, 6], size: [6, 6], floorColor: '#fff', outdoor: true, openings: [{ id: 'emergencia', wall: 'e', type: 'door', at: 3, width: 1, leaf: { opensFrom: 'inside' } }] },
    { id: 'patio', name: 'Pátio', origin: [6, 6], size: [20, 12], floorColor: '#fff', outdoor: true, props: [{ id: 'caixa', pickable: true, asset: 'item.box', pos: [4, 2] }] },
  ],
  props: [{ id: 'carro', asset: 'vehicle.car', pos: [14, 14], rot: -90 }],
};

function stage(actions: ActionClip[], at: [number, number] = [9.4, 8], yaw = 0) {
  const episode: Episode = { episode: 1, title: 't', location: 't', duration: 60, camera: [{ t: 0, mode: 'fpv', follow: 'ana' }], cast: [{ character: 'ana', at, yaw }], actions };
  const built = buildLocation(location);
  const cast = buildCast(episode, [ana]);
  const compiled = compileEpisode(episode, built, cast);
  const objects = new Map([...built.interactives, ...cast].map((o) => [o.id, o]));
  const world = (id: string) => objects.get(id)!.object.getWorldPosition(new THREE.Vector3());
  return { compiled, objects, world, at: (t: number) => applyStage(compiled, objects, t), camera: cameraStage(compiled, built, cast), episode };
}

describe('arm reach', () => {
  it('puts the wrist on a point within reach, from any pose', () => {
    const rig = buildBody(ana);
    for (const base of [idlePose(1), crouchPose(idlePose(1), 0.8)]) {
      for (const side of ['L', 'R'] as const) {
        const target = wristPosition(base, side).add(new THREE.Vector3(side === 'R' ? 0.1 : -0.1, 0.25, -0.3));
        rig.applyPose(reachPose(base, side, target));
        rig.object.updateMatrixWorld(true);
        const wrist = rig.joint(`hand${side}`)!.getWorldPosition(new THREE.Vector3());
        expect(wrist.distanceTo(target)).toBeLessThan(0.01);
      }
    }
  });

  it('stretches the arm toward a point that is too far', () => {
    const base = idlePose(0);
    const pose = reachPose(base, 'R', new THREE.Vector3(0.2, 1.3, -3));
    const wrist = wristPosition(pose, 'R');
    expect(wrist.z).toBeLessThan(-0.4);
    expect(wrist.z).toBeGreaterThan(-0.85);
  });
});

describe('picking things up by hand', () => {
  it('takes the item to the hand, carries it along and puts it down', () => {
    const s = stage([
      { t: 1, target: 'caixa', action: 'pickUp', params: { by: 'ana' } },
      { t: 3, target: 'ana', action: 'walkTo', params: { to: [12, 9] } },
      { t: 8, target: 'caixa', action: 'putDown', params: { at: [12.5, 0, 8.6] } },
    ], [9.6, 8.4]);
    s.at(0.5);
    expect(s.world('caixa').toArray()).toEqual([10, 0, 8]);
    // Half way through, the hand is on the box and the knees are bent.
    s.at(1.6);
    const hand = () => s.objects.get('ana')!.socket!('handR')!.getWorldPosition(new THREE.Vector3());
    expect(hand().distanceTo(s.world('caixa').setY(hand().y))).toBeLessThan(0.08);
    expect(hand().y).toBeLessThan(0.6);
    // Carried: the box hangs on the hand, wherever the character goes.
    for (const t of [2.5, 4, 7]) {
      s.at(t);
      expect(Math.hypot(hand().x - s.world('caixa').x, hand().z - s.world('caixa').z)).toBeLessThan(1e-6);
      expect(s.world('caixa').y).toBeGreaterThan(0.6);
    }
    s.at(7);
    expect(s.world('caixa').x).toBeGreaterThan(11);
    s.at(10);
    expect(s.world('caixa').toArray()).toEqual([12.5, 0, 8.6]);
    // Scrubbing back gives the same frame as playing up to it.
    s.at(0.5);
    expect(s.world('caixa').toArray()).toEqual([10, 0, 8]);
  });

  it('refuses what is out of reach or already in a hand', () => {
    expect(() => stage([{ t: 1, target: 'caixa', action: 'pickUp', params: { by: 'ana' } }], [8, 8])).toThrow(/"caixa" está a 2\.00 m de "ana", fora do alcance do braço \(0\.80 m\)/);
    const twice: ActionClip[] = [
      { t: 1, target: 'caixa', action: 'pickUp', params: { by: 'ana' } },
      { t: 3, target: 'caixa', action: 'pickUp', params: { by: 'ana' } },
    ];
    expect(() => stage(twice, [9.6, 8.4])).toThrow(/o item já está com "ana"/);
    expect(() => stage([{ t: 1, target: 'caixa', action: 'pickUp', params: {} }])).toThrow(/informe "by"/);
  });

  it('keeps the old way: without "by" the item goes to a point', () => {
    const s = stage([{ t: 1, target: 'caixa', action: 'pickUp', params: { to: [10, 1, 8] } }]);
    s.at(5);
    expect(s.world('caixa').y).toBe(1);
  });
});

describe('doors by hand', () => {
  it('walks up to the door, opens it from the side the character is on and goes through', () => {
    const s = stage([
      { t: 0, target: 'ana', action: 'walkTo', params: { door: 'porta' } },
      { t: 4, target: 'porta', action: 'open', params: { by: 'ana' } },
      { t: 6, target: 'ana', action: 'walkTo', params: { to: [3, 9] } },
    ], [3, 2], 0);
    const handle = s.objects.get('porta')!.traits.door!.handle;
    const stop = placementAt(s.compiled, 'ana', 3.9);
    expect(Math.hypot(stop.pos[0] - handle[0], stop.pos[2] - handle[2])).toBeLessThan(0.8);
    // Inside the room, facing the door to the south.
    expect(stop.pos[2]).toBeLessThan(6);
    expect(Math.abs((((stop.yaw % 360) + 360) % 360) - 180)).toBeLessThan(45);
    // The hand is on the handle before the leaf moves.
    s.at(4.4);
    const hand = s.objects.get('ana')!.socket!('handR')!.getWorldPosition(new THREE.Vector3());
    expect(hand.distanceTo(new THREE.Vector3(...handle))).toBeLessThan(0.15);
    expect(placementAt(s.compiled, 'ana', 20).pos[2]).toBe(9);
  });

  it('knows which side the character is on', () => {
    const open: ActionClip = { t: 1, target: 'emergencia', action: 'open', params: { by: 'ana' } };
    // The emergency door of the exit opens only from inside it; the yard is the outside.
    expect(() => stage([open], [5.4, 9.3])).not.toThrow();
    expect(() => stage([open], [6.6, 9.3])).toThrow(/só abre por dentro, e "ana" está do outro lado/);
    expect(() => stage([open], [3, 9])).toThrow(/a maçaneta de "emergencia" está a .* fora do alcance/);
  });
});

describe('sitting in a car', () => {
  const ride: ActionClip[] = [
    { t: 1, target: 'carro', action: 'open', params: { part: 'frontLeft', by: 'ana' } },
    { t: 3, target: 'ana', action: 'sit', params: { on: 'carro' } },
    { t: 5, duration: 4, target: 'carro', action: 'drive', ease: 'linear', params: { path: [[20, 14], [24, 14]] } },
    { t: 10, target: 'ana', action: 'standUp', params: { to: [24, 12.6] } },
  ];

  it('goes along with the car and gets out where asked', () => {
    const s = stage(ride, [13.6, 12.7], 180);
    // The driver sits on the left: north of a car that faces east.
    const seated = placementAt(s.compiled, 'ana', 4.5);
    expect(seated.pos[0]).toBeCloseTo(14.1);
    expect(seated.pos[2]).toBeCloseTo(13.6);
    expect(((seated.yaw % 360) + 360) % 360).toBeCloseTo(270);
    const moving = placementAt(s.compiled, 'ana', 9.5);
    expect(moving.pos[0]).toBeCloseTo(24.1);
    s.at(9.5);
    expect(s.world('ana').x).toBeCloseTo(24.1);
    expect(placementAt(s.compiled, 'ana', 12).pos).toEqual([24, 0, 12.6]);
    // The camera in the eyes goes along, lower while seated.
    const standing = evaluateCamera(s.episode.camera, 0, s.camera);
    const inside = evaluateCamera(s.episode.camera, 9.5, s.camera);
    expect(inside.pos[0]).toBeCloseTo(24.1);
    expect(inside.pos[1]).toBeLessThan(standing.pos[1] - 0.2);
    expect(inside.lookAt[0]).toBeGreaterThan(inside.pos[0]);
  });

  it('puts an item on a seat, and it rides along', () => {
    const s = stage([
      { t: 0, target: 'caixa', action: 'pickUp', params: { by: 'ana' } },
      { t: 2, target: 'ana', action: 'walkTo', params: { to: [13.1, 12.9] } },
      { t: 9, target: 'caixa', action: 'putDown', params: { on: 'carro', seat: 'rearLeft' } },
      { t: 11, duration: 4, target: 'carro', action: 'drive', ease: 'linear', params: { path: [[20, 14], [24, 14]] } },
    ], [9.6, 8.4]);
    s.at(10.5);
    expect(s.world('caixa').x).toBeCloseTo(13.2);
    expect(s.world('caixa').z).toBeCloseTo(13.6);
    s.at(16);
    expect(s.world('caixa').x).toBeCloseTo(23.2);
  });

  it('explains what cannot be done', () => {
    expect(() => stage([{ t: 1, target: 'ana', action: 'sit', params: { on: 'carro' } }], [9, 8])).toThrow(/"carro" está a .* m; leve o personagem até lá/);
    expect(() => stage([{ t: 1, target: 'ana', action: 'sit', params: { on: 'carro', seat: 'teto' } }], [13.6, 12.7])).toThrow(/não tem o assento "teto". Assentos: driver, passenger, rearLeft, rearRight/);
    expect(() => stage([{ t: 1, target: 'ana', action: 'standUp', params: { to: [9, 9] } }])).toThrow(/não está sentado/);
    expect(() => stage([ride[1], { t: 5, target: 'ana', action: 'walkTo', params: { to: [9, 9] } }], [13.6, 12.7])).toThrow(/use standUp antes/);
  });
});

describe('looking at things', () => {
  it('turns the head to a point, within what a neck can do, and back', () => {
    // Facing north at [9.4, 8]; the point is to the west (left), a little above the eyes.
    const s = stage([
      { t: 1, duration: 1, target: 'ana', action: 'lookAt', params: { point: [7.4, 2.6, 8] } },
      { t: 4, target: 'ana', action: 'lookAt', params: { point: [9.4, 1.6, 12] } },
      { t: 6, duration: 1, target: 'ana', action: 'lookAt' },
    ]);
    expect(gazeAt(s.compiled, 'ana', 0.5)).toEqual({ yaw: 0, pitch: 0 });
    const half = gazeAt(s.compiled, 'ana', 1.5);
    expect(half.yaw).toBeCloseTo(37.5);
    const left = gazeAt(s.compiled, 'ana', 3);
    expect(left.yaw).toBe(75);
    expect(left.pitch).toBeGreaterThan(20);
    // Straight behind: as far as the neck goes.
    expect(Math.abs(gazeAt(s.compiled, 'ana', 5).yaw)).toBe(75);
    expect(gazeAt(s.compiled, 'ana', 8)).toEqual({ yaw: 0, pitch: 0 });
    // The head really turns: the face points west.
    s.at(3);
    const head = s.objects.get('ana')!.socket!('head')!;
    const facing = new THREE.Vector3(0, 0, -1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
    expect(facing.x).toBeLessThan(-0.8);
  });

  it('keeps following something that moves, and the camera in the eyes goes with the head', () => {
    const s = stage([
      { t: 0, duration: 0, target: 'ana', action: 'lookAt', params: { object: 'carro' } },
      { t: 1, duration: 4, target: 'carro', action: 'drive', ease: 'linear', params: { path: [[20, 14], [24, 14]] } },
    ], [18, 10], 180);
    // Facing south; the car goes from her right (west) to her left (east).
    expect(gazeAt(s.compiled, 'ana', 0.5).yaw).toBeLessThan(-20);
    expect(gazeAt(s.compiled, 'ana', 6).yaw).toBeGreaterThan(20);
    expect(gazeAt(s.compiled, 'ana', 6).pitch).toBeLessThan(0);
    const view = evaluateCamera(s.episode.camera, 6, s.camera);
    expect(view.lookAt[0]).toBeGreaterThan(view.pos[0] + 0.3);
    expect(view.lookAt[1]).toBeLessThan(view.pos[1]);
  });

  it('refuses a target that does not exist', () => {
    expect(() => stage([{ t: 0, target: 'ana', action: 'lookAt', params: { object: 'bia' } }])).toThrow(/objeto "bia" não encontrado/);
    expect(() => stage([{ t: 0, target: 'ana', action: 'lookAt', params: { object: 'ana' } }])).toThrow(/não pode olhar para si mesmo/);
  });
});
