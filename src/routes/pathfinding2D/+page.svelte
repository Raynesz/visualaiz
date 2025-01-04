<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point, Edge } from "$lib";
  import { calculateDistance, pastelColorPalette } from "$lib";

  let svg: SVGSVGElement | null = null;
  let svgWidth: number = window.innerWidth > 500 ? 480 : window.innerWidth - 20;
  let svgHeight: number = svgWidth;

  const startPoint: Point = [50, 50];
  const endPoint: Point = [svgWidth - 50, svgHeight - 50];

  const svgCenterX = svgWidth / 2;
  const svgCenterY = svgHeight / 2;

  // Place 1st obstacle at the center of the display and offset it 30 pixels
  const offsetX = 30;

  const obstacle1Vertices: Point[] = [
    [svgCenterX + offsetX - 50, svgCenterY - 50], // Top-left
    [svgCenterX + offsetX + 50, svgCenterY - 50], // Top-right
    [svgCenterX + offsetX + 50, svgCenterY + 50], // Bottom-right
    [svgCenterX + offsetX - 50, svgCenterY + 50], // Bottom-left
    [svgCenterX + offsetX, svgCenterY], // Center point
  ];

  // Just a square obstacle
  const obstacle2Vertices: Point[] = [
    [100, 100],
    [150, 100],
    [150, 150],
    [100, 150],
  ];

  // Combine all obstacles
  const allObstacles: Point[][] = [obstacle1Vertices, obstacle2Vertices];

  // Define the SVG border as a polygon
  const svgBorder: Point[] = [
    [0, 0], // Top-left
    [svgWidth, 0], // Top-right
    [svgWidth, svgHeight], // Bottom-right
    [0, svgHeight], // Bottom-left
  ];

  // Compute all obstacle edges, including the SVG border edges
  const obstacleEdges: Edge[] = [
    ...allObstacles.flatMap((obstacle) => obstacle.map((v, i) => [v, obstacle[(i + 1) % obstacle.length]] as Edge)),
    ...svgBorder.map((v, i) => [v, svgBorder[(i + 1) % svgBorder.length]] as Edge),
  ];

  const nodes: Point[] = [startPoint, endPoint, ...obstacle1Vertices, ...obstacle2Vertices];
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
      if (uniqueEdges.has(key)) return false;
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

  function isEdgeValid(edge: Edge): boolean {
    const [from, to] = edge;

    // Allow edges between consecutive points of the same obstacle
    for (const obstacle of allObstacles) {
      const fromIndex = obstacle.indexOf(from);
      const toIndex = obstacle.indexOf(to);

      if (fromIndex !== -1 && toIndex !== -1) {
        if (Math.abs(toIndex - fromIndex) === 1 || (fromIndex === 0 && toIndex === obstacle.length - 1)) {
          return true;
        }
        return false; // Non-consecutive points within the same obstacle
      }
    }

    // Check for intersection with any obstacle edge
    return !obstacleEdges.some((obstacleEdge) => doEdgesIntersect(edge, obstacleEdge));
  }

  function buildVisibilityGraph(): void {
    validEdges.length = 0;
    invalidEdges.length = 0;

    nodes.forEach((from) => {
      nodes.forEach((to) => {
        if (from === to) return;
        const edge: Edge = [from, to];
        if (isEdgeValid(edge)) {
          validEdges.push(edge);
        } else {
          invalidEdges.push(edge);
        }
      });
    });

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

  function updateWidget() {
    buildVisibilityGraph();
    const shortestPath = findShortestPath();

    const svgSelection = d3.select(svg);
    svgSelection.selectAll("*").remove();

    allObstacles.forEach((obstacle, index) => {
      svgSelection
        .append("polygon")
        .attr("points", obstacle.map((v) => `${v[0]},${v[1]}`).join(" "))
        .attr("fill", pastelColorPalette[index % pastelColorPalette.length])
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .datum(obstacle) // Attach the obstacle vertices to this polygon
        .call(
          d3.drag<SVGPolygonElement, Point[]>().on("drag", function (event, vertices) {
            const dx = event.dx;
            const dy = event.dy;

            // Update the associated obstacle's coordinates
            vertices.forEach((v) => {
              v[0] += dx;
              v[1] += dy;
            });

            // Call updateWidget to re-render the updated SVG
            updateWidget();
          })
        );
    });

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

    svgSelection
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .attr("stroke", "black")
      .attr("fill", "none")
      .attr("stroke-width", 3);

    // Draw valid edges
    svgSelection
      .selectAll("line.valid-edge")
      .data(validEdges)
      .enter()
      .append("line")
      .attr("x1", (d) => d[0][0])
      .attr("y1", (d) => d[0][1])
      .attr("x2", (d) => d[1][0])
      .attr("y2", (d) => d[1][1])
      .attr("stroke", "green")
      .attr("stroke-width", 2)
      .attr("class", "valid-edge");

    // Draw invalid edges
    svgSelection
      .selectAll("line.invalid-edge")
      .data(invalidEdges)
      .enter()
      .append("line")
      .attr("x1", (d) => d[0][0])
      .attr("y1", (d) => d[0][1])
      .attr("x2", (d) => d[1][0])
      .attr("y2", (d) => d[1][1])
      .attr("stroke", "red")
      .attr("stroke-width", 1)
      .attr("class", "invalid-edge");
  }

  onMount(() => {
    document.title = "visualaiz - Pathfinding 2D";
    updateWidget();
  });
</script>

<svg bind:this={svg} width={svgWidth} height={svgHeight}></svg>
