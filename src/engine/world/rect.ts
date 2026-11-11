/** Axis-aligned rectangle on the ground plane. */
export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function contains(r: Rect, x: number, z: number): boolean {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
}

export function union(rects: Rect[]): Rect {
  return {
    minX: Math.min(...rects.map((r) => r.minX)),
    maxX: Math.max(...rects.map((r) => r.maxX)),
    minZ: Math.min(...rects.map((r) => r.minZ)),
    maxZ: Math.max(...rects.map((r) => r.maxZ)),
  };
}

/** `base` minus every hole, as non-overlapping rectangles. */
export function subtractRects(base: Rect, holes: Rect[]): Rect[] {
  let rects = [base];
  for (const h of holes) {
    const next: Rect[] = [];
    for (const r of rects) {
      if (h.minX >= r.maxX || h.maxX <= r.minX || h.minZ >= r.maxZ || h.maxZ <= r.minZ) {
        next.push(r);
        continue;
      }
      const x0 = Math.max(r.minX, h.minX);
      const x1 = Math.min(r.maxX, h.maxX);
      next.push(
        { minX: r.minX, maxX: x0, minZ: r.minZ, maxZ: r.maxZ },
        { minX: x1, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ },
        { minX: x0, maxX: x1, minZ: r.minZ, maxZ: Math.max(r.minZ, h.minZ) },
        { minX: x0, maxX: x1, minZ: Math.min(r.maxZ, h.maxZ), maxZ: r.maxZ },
      );
    }
    rects = next.filter((r) => r.maxX - r.minX > 1e-6 && r.maxZ - r.minZ > 1e-6);
  }
  return rects;
}
