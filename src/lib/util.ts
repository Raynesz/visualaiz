import type { Point } from '$lib';

export function calculateDistance(a: Point, b: Point): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  }

export function orientation(a: Point, b: Point, c: Point): number {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }
