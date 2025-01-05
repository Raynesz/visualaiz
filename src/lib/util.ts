import type { Point, Edge } from '$lib';

export function calculateDistance(a: Point, b: Point): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// Sets edges to a certain order so that [a, b] and [b, a] are considered the same edge
export function normalizeEdge(edge: Edge): Edge {
  const [a, b] = edge;
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? edge : [b, a];
}

export function removeDuplicateEdges(edges: Edge[]): Edge[] {
  const uniqueEdges = new Set<string>();
  return edges.filter((edge) => {
    const normalizedEdge = normalizeEdge(edge);
    const key = `${normalizedEdge[0][0]},${normalizedEdge[0][1]}-${normalizedEdge[1][0]},${normalizedEdge[1][1]}`;
    if (uniqueEdges.has(key)) return false;
    uniqueEdges.add(key);
    return true;
  });
}

export function crossProduct(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
