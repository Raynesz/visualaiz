<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point, Edge } from "$lib";
  import { calculateDistance, orientation, pastelColorPalette } from "$lib";

  let svg: SVGSVGElement | null = null;
  let svgWidth: number = window.innerWidth > 500 ? 480 : window.innerWidth - 20;
  let svgHeight: number = svgWidth;

  const startPoint: Point = [50, 50];
  const endPoint: Point = [svgWidth - 50, svgHeight - 50];

  const svgCenterX = svgWidth / 2;
  const svgCenterY = svgHeight / 2;

  const offsetX = 30;

  const obstacleVertices: Point[] = [
    [svgCenterX + offsetX - 50, svgCenterY - 50], // Top-left
    [svgCenterX + offsetX + 50, svgCenterY - 50], // Top-right
    [svgCenterX + offsetX + 50, svgCenterY + 50], // Bottom-right
    [svgCenterX + offsetX - 50, svgCenterY + 50], // Bottom-left
    [svgCenterX + offsetX, svgCenterY], // Center point
  ];

  const nodes: Point[] = [startPoint, endPoint, ...obstacleVertices];
  let validEdges: Edge[] = [];
  let invalidEdges: Edge[] = [];

  function normalizeEdge(edge: Edge): Edge {
    const [a, b] = edge;
    return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? edge : [b, a];
  }

  function removeDuplicateEdges(edges: Edge[]): Edge[] {
    const uniqueEdges = new Set<string>();
    return edges.filter((edge) => {
      const normalizedEdge = normalizeEdge(edge);
      const key = `${normalizedEdge[0][0]},${normalizedEdge[0][1]}-${normalizedEdge[1][0]},${normalizedEdge[1][1]}`;
      if (uniqueEdges.has(key)) {
        return false;
      }
      uniqueEdges.add(key);
      return true;
    });
  }

  function doEdgesIntersect(edge1: Edge, edge2: Edge): boolean {
    const [p1, p2] = edge1;
    const [q1, q2] = edge2;

    if (p1 === q1 || p1 === q2 || p2 === q1 || p2 === q2) {
      return false; // Shared vertices do not count as intersections
    }

    function ccw(a: Point, b: Point, c: Point): boolean {
      return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    }

    return ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2);
  }

  function isEdgeValidForStartEnd(from: Point, to: Point): boolean {
    for (let i = 0; i < obstacleVertices.length; i++) {
      const v1 = obstacleVertices[i];
      const v2 = obstacleVertices[(i + 1) % obstacleVertices.length];
      if (doEdgesIntersect([from, to], [v1, v2])) {
        return false;
      }
    }
    return true;
  }

  function isEdgeValid(from: Point, to: Point): boolean {
    const fromIndex = obstacleVertices.indexOf(from);
    const toIndex = obstacleVertices.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) return isEdgeValidForStartEnd(from, to);

    if (Math.abs(toIndex - fromIndex) === 1 || (fromIndex === 0 && toIndex === obstacleVertices.length - 1)) {
      return true;
    }

    const intermediatePoints: Point[] = [];
    let i = (fromIndex + 1) % obstacleVertices.length;
    while (i !== toIndex) {
      intermediatePoints.push(obstacleVertices[i]);
      i = (i + 1) % obstacleVertices.length;

      if (intermediatePoints.length > obstacleVertices.length) return false;
    }

    return intermediatePoints.every((p) => orientation(from, to, p) > 0);
  }

  function buildVisibilityGraph(): void {
    validEdges.length = 0;
    invalidEdges.length = 0;

    obstacleVertices.forEach((v, i) => {
      const nextVertex = obstacleVertices[(i + 1) % obstacleVertices.length];
      validEdges.push([v, nextVertex]);
    });

    nodes.forEach((from) => {
      nodes.forEach((to) => {
        if (from === to) return;
        const edge: Edge = [from, to];
        if (isEdgeValid(from, to)) {
          validEdges.push(edge);
        } else {
          invalidEdges.push(edge);
        }
      });
    });

    // Remove duplicate edges
    validEdges = removeDuplicateEdges(validEdges);
    invalidEdges = removeDuplicateEdges(invalidEdges);

    console.log("Valid Edges:", validEdges);
    console.log("Invalid Edges:", invalidEdges);
  }

  function findShortestPath(): Edge[] {
    const distances: Map<Point, number> = new Map();
    const previous: Map<Point, Point | null> = new Map();
    const unvisited: Set<Point> = new Set(nodes);

    nodes.forEach((node) => distances.set(node, Infinity));
    distances.set(startPoint, 0);

    while (unvisited.size > 0) {
      const current = Array.from(unvisited).reduce((minNode, node) =>
        distances.get(node)! < distances.get(minNode)! ? node : minNode
      );

      unvisited.delete(current);

      if (current === endPoint) break;

      validEdges.forEach(([a, b]) => {
        const neighbor = a === current ? b : b === current ? a : null;
        if (neighbor && unvisited.has(neighbor)) {
          const newDist = distances.get(current)! + calculateDistance(current, neighbor);
          if (newDist < distances.get(neighbor)!) {
            distances.set(neighbor, newDist);
            previous.set(neighbor, current);
          }
        }
      });
    }

    const path: Edge[] = [];
    let currentNode: Point | null = endPoint;

    while (currentNode && previous.has(currentNode)) {
      const prevNode = previous.get(currentNode);
      if (!prevNode) break;
      path.push([prevNode, currentNode]);
      currentNode = prevNode;
    }

    return path.reverse();
  }

  // Drag behavior of points
  const dragPoints = d3.drag<SVGCircleElement, Point>().on("drag", (event, d) => {
    // Update the point's position
    d[0] = Math.max(0, Math.min(svgWidth, event.x)); // Clamp within canvas bounds
    d[1] = Math.max(0, Math.min(svgHeight, event.y));
    updateWidget();
  });

  // Drag behavior of obstacles
  const dragPolygon = d3.drag<SVGPolygonElement, any>().on("drag", function (event) {
    const dx = event.dx;
    const dy = event.dy;

    // Update obstacle coordinates based on drag movement
    obstacleVertices.forEach((v) => {
      v[0] += dx;
      v[1] += dy;
    });

    // Call updateWidget to re-render the updated SVG
    updateWidget();
  });

  function updateWidget() {
    buildVisibilityGraph();
    const shortestPath = findShortestPath();
    console.log("Shortest Path Edges:", shortestPath);

    const svgSelection = d3.select(svg);

    svgSelection.selectAll("*").remove(); // Clear the display

    svgSelection // Draw the border of the display
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .attr("stroke", "black")
      .attr("fill", "none")
      .attr("stroke-width", 3);

    svgSelection
      .append("polygon")
      .attr("points", obstacleVertices.map((v) => `${v[0]},${v[1]}`).join(" "))
      .attr("fill", pastelColorPalette[0])
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .call(dragPolygon);

    svgSelection
      .selectAll("line.shortest-path")
      .data(shortestPath)
      .enter()
      .append("line")
      .attr("x1", (d) => d[0][0])
      .attr("y1", (d) => d[0][1])
      .attr("x2", (d) => d[1][0])
      .attr("y2", (d) => d[1][1])
      .attr("stroke", "purple")
      .attr("stroke-width", 3);

    svgSelection
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1])
      .attr("r", 6)
      .attr("fill", (d) => (d === startPoint ? "green" : d === endPoint ? "blue" : "black"))
      .call(dragPoints);

    console.log(obstacleVertices);
  }

  onMount(() => {
    document.title = "visualaiz - Pathfinding 2D";
    updateWidget();
  });
</script>

<svg bind:this={svg} width={svgWidth} height={svgHeight}></svg>
