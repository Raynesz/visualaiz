<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point, Edge } from "$lib";
  import { calculateDistance, pastelColorPalette } from "$lib";

  let svg: SVGSVGElement | null = null;
  let svgWidth: number = window.innerWidth > 500 ? 480 : window.innerWidth - 20;
  let svgHeight: number = svgWidth;

  let showVGraph: boolean = $state(false);
  let showShortestPath: boolean = $state(true);

  function toggleVGraph() {
    showVGraph = !showVGraph;
    updateWidget();
  }

  function toggleShortestPath() {
    showShortestPath = !showShortestPath;
    updateWidget();
  }

  // Define the SVG border as a polygon
  const svgBorder: Point[] = [
    [0, 0], // Top-left
    [svgWidth, 0], // Top-right
    [svgWidth, svgHeight], // Bottom-right
    [0, svgHeight], // Bottom-left
  ];

  let startPoint: Point;
  let endPoint: Point;

  let svgCenterX: number;
  let svgCenterY: number;

  let obstacle1Vertices: Point[];
  let obstacle2Vertices: Point[];
  let allObstacles: Point[][];
  let obstacleEdges: Edge[];

  let nodes: Point[];
  let validEdges: Edge[];
  let invalidEdges: Edge[];

  function resetEverything(): void {
    // Reset display properties
    svgCenterX = svgWidth / 2;
    svgCenterY = svgHeight / 2;

    startPoint = [50, 50];
    endPoint = [svgWidth - 50, svgHeight - 50];

    // Scaling factors
    const scaleX = svgWidth / 500;
    const scaleY = svgHeight / 500;

    // Scaled `obstacle1Vertices`
    obstacle1Vertices = [
      [296 * scaleX, 305 * scaleY], // Top-left
      [456 * scaleX, 305 * scaleY], // Top-right
      [456 * scaleX, 405 * scaleY], // Bottom-right
      [296 * scaleX, 405 * scaleY], // Bottom-left
      [243 * scaleX, 350 * scaleY], // Center
    ];

    // Scaled `obstacle2Vertices`
    obstacle2Vertices = [
      [74 * scaleX, 131 * scaleY], // Top-left
      [174 * scaleX, 131 * scaleY], // Top-right
      [174 * scaleX, 231 * scaleY], // Bottom-right
      [74 * scaleX, 231 * scaleY], // Bottom-left
    ];

    // Combine all obstacles
    allObstacles = [obstacle1Vertices, obstacle2Vertices];

    obstacleEdges = [
      ...allObstacles.flatMap((obstacle) => obstacle.map((v, i) => [v, obstacle[(i + 1) % obstacle.length]] as Edge)),
      ...svgBorder.map((v, i) => [v, svgBorder[(i + 1) % svgBorder.length]] as Edge),
    ];

    // Initialize nodes and edges
    nodes = [startPoint, endPoint, ...obstacle1Vertices, ...obstacle2Vertices];
    validEdges = [];
    invalidEdges = [];

    // Redraw the SVG
    updateWidget();
  }

  // Sets edges to a certain order so that [a, b] and [b, a] are considered the same edge
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

    // Draw valid edges
    if (showVGraph)
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

    if (showShortestPath)
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

    console.log(obstacle1Vertices);
    console.log(obstacle2Vertices);
  }

  onMount(() => {
    document.title = "visualaiz - Pathfinding 2D";
    resetEverything();
  });

  const buttons = [
    { label: "Reset", onclick: resetEverything, active: null },
    { label: "Visibility graph", onclick: toggleVGraph, active: () => showVGraph },
    { label: "Shortest path", onclick: toggleShortestPath, active: () => showShortestPath },
  ];

  const topicsText = "Pathfinding, Visibility graph, Shortest path";
  const topicsColors = ["navy", "green", "purple"];
</script>

<svg bind:this={svg} width={svgWidth} height={svgHeight}></svg>
<div class="widget-hint">You can drag and drop all obstacles and vertices.</div>
<div class="widget-button-container">
  {#each buttons as { label, onclick, active }}
    <button
      class="widget-button"
      class:widget-button-on={active && active()}
      class:widget-button-off={active && !active()}
      {onclick}
    >
      {label}
    </button>
  {/each}
</div>
<div class="topics">
  <h3>Topics:</h3>
  <span
    >{#each topicsText.split(", ") as segment, index}
      <span style="color: {topicsColors[index % topicsColors.length]}; font-weight: bold">{segment}</span>{index <
      topicsText.split(", ").length - 1
        ? ", "
        : ""}
    {/each}</span
  >
</div>
<h2>In short:</h2>
<p class="project-text">
  The widget above demonstrates the <b style="color: purple">Shortest path</b> between 2 points in 2D space by utilizing
  the Visibility Graph. The Visibility Graph is a graph where each vertex represents a point in the space, and each edge
  represents a line of sight between 2 points. The shortest path between 2 points can be found by running a shortest path
  algorithm on this graph. The widget allows you to drag and drop the start and end points, as well as the obstacles, and
  visualize the Visibility Graph and the shortest path.
</p>
