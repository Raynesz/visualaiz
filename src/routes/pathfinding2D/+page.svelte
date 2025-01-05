<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point, Edge } from "$lib";
  import { calculateDistance, removeDuplicateEdges, crossProduct, pastelColorPalette } from "$lib";

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

  let obstacle1Vertices: Point[];
  let obstacle2Vertices: Point[];
  let allObstacles: Point[][]; // Combine all obstacles
  let obstacleEdges: Edge[]; // Edges of all obstacles

  let nodes: Point[]; // Start, end, and all obstacle vertices
  let validEdges: Edge[]; // Edges that do not intersect with any obstacle edge
  let invalidEdges: Edge[]; // Edges that intersect with at least one obstacle edge

  // Reset everything to the initial state
  function resetEverything(): void {
    startPoint = [50, 50];
    endPoint = [svgWidth - 50, svgHeight - 50];

    // Scaling factors that map the original 500x500 space to the SVG dimensions
    const scaleX = svgWidth / 500;
    const scaleY = svgHeight / 500;

    // Scaled `obstacle1Vertices`
    obstacle1Vertices = [
      [296 * scaleX, 305 * scaleY], // Top-left
      [456 * scaleX, 305 * scaleY], // Top-right
      [456 * scaleX, 405 * scaleY], // Bottom-right
      [296 * scaleX, 405 * scaleY], // Bottom-left
      [243 * scaleX, 350 * scaleY], // Far Left
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

  function doEdgesIntersect(edge1: Edge, edge2: Edge): boolean {
    const [p1, p2] = edge1;
    const [q1, q2] = edge2;

    if (p1 === q1 || p1 === q2 || p2 === q1 || p2 === q2) {
      return false; // Shared vertices do not count as intersections
    }

    // Cross product helps determine the orientation of 3 points
    const o1 = crossProduct(p1, q1, q2); // Orientation of p1 relative to line q1-q2
    const o2 = crossProduct(p2, q1, q2); // Orientation of p2 relative to line q1-q2
    const o3 = crossProduct(p1, p2, q1); // Orientation of q1 relative to line p1-p2
    const o4 = crossProduct(p1, p2, q2); // Orientation of q2 relative to line p1-p2

    return o1 * o2 < 0 && o3 * o4 < 0;
  }

  function isEdgeValid(edge: Edge): boolean {
    const [from, to] = edge;

    for (const obstacle of allObstacles) {
      const fromIndex = obstacle.indexOf(from);
      const toIndex = obstacle.indexOf(to);

      if (fromIndex !== -1 && toIndex !== -1) {
        if (
          Math.abs(toIndex - fromIndex) === 1 || // Consecutive points
          (fromIndex === 0 && toIndex === obstacle.length - 1) // Closing edge of polygon
        ) {
          return true;
        }

        // Check non-consecutive points of a single obstacle for clear line of sight.
        // Ensure all intermediate points lie on the right side of the line
        // assuming the polygon is traversed in a clockwise direction
        const isVisible = obstacle.every((intermediate, i) => {
          if (i === fromIndex || i === toIndex) return true; // Skip endpoints

          const o = crossProduct(from, to, intermediate);
          return o >= 0; // Ensure points lie on the right or collinear
        });

        if (isVisible) {
          // Ensure no intersection with other edges of the same obstacle
          const doesNotIntersect = obstacle.every((_, i) => {
            const nextIndex = (i + 1) % obstacle.length;
            const edgeToCheck: Edge = [obstacle[i], obstacle[nextIndex]];

            if (edgeToCheck.includes(from) || edgeToCheck.includes(to)) {
              return true; // Skip edges involving endpoints
            }

            return !doEdgesIntersect(edge, edgeToCheck);
          });

          if (doesNotIntersect) return true;
        }

        return false; // Non-consecutive points that don't meet criteria
      }
    }

    // Check for intersection with any obstacle edge (global validation)
    return !obstacleEdges.some((obstacleEdge) => doEdgesIntersect(edge, obstacleEdge));
  }

  function buildVisibilityGraph(): void {
    validEdges.length = 0;
    invalidEdges.length = 0;

    nodes.forEach((from) => {
      // From each node...
      nodes.forEach((to) => {
        // ...to every other node
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

  // Dijkstra's algorithm for shortest path between start and end points
  function findShortestPath(): Edge[] {
    // Map that stores the shortest distances from the start point to each node
    const distances: Map<Point, number> = new Map();

    // Map that stores the previous node for each node, used for path reconstruction
    const previous: Map<Point, Point | null> = new Map();

    // Create a set of unvisited nodes (all nodes in the graph at the beginning)
    const unvisited: Set<Point> = new Set(nodes);

    // Initialize distances for all nodes to Infinity, except for the start point which is set to 0
    nodes.forEach((node) => distances.set(node, Infinity));
    distances.set(startPoint, 0);

    // Until there is no unvisited nodes left...
    while (unvisited.size > 0) {
      // Find the unvisited node with the smallest known distance (greedy selection)
      const current = Array.from(unvisited).reduce((minNode, node) =>
        distances.get(node)! < distances.get(minNode)! ? node : minNode
      );

      // Remove the current node from the unvisited set as it has been processed
      unvisited.delete(current);

      // If the current node is the end point, stop the algorithm (shortest path found)
      if (current === endPoint) break;

      // Loop through all the valid edges to check the neighbors of the current node
      validEdges.forEach(([a, b]) => {
        // Determine the neighbor of the current node on the edge
        const neighbor = a === current ? b : b === current ? a : null;

        // If a valid neighbor exists and it is still unvisited
        if (neighbor && unvisited.has(neighbor)) {
          // Calculate the new distance to this neighbor through the current node
          const newDist = distances.get(current)! + calculateDistance(current, neighbor);

          // If the new distance is shorter, update the shortest distance and set the previous node
          if (newDist < distances.get(neighbor)!) {
            distances.set(neighbor, newDist);
            previous.set(neighbor, current); // Set the previous node as the current node
          }
        }
      });
    }

    const path: Edge[] = [];

    // Start from the end point and work backward using the 'previous' map to reconstruct the path
    let currentNode: Point | null = endPoint;

    // Loop through the previous nodes and reconstruct the path in reverse order
    while (currentNode && previous.has(currentNode)) {
      const prevNode = previous.get(currentNode);
      if (!prevNode) break; // If there is no previous node, break the loop
      path.push([prevNode, currentNode]); // Add the edge to the path
      currentNode = prevNode; // Move to the previous node
    }

    // Reverse the path so it goes from start to end
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
      .attr("fill", (d) => (d === startPoint ? "red" : d === endPoint ? "blue" : "black"))
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

  const topicsText = "Pathfinding, Visibility graph, Shortest path, Dijkstra's algorithm";
  const topicsColors = ["navy", "green", "purple", "black"];
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
  The widget above demonstrates the <b style="color: purple">Shortest Path</b> between two points in 2D space by
  utilizing the <b style="color: green">Visibility Graph</b> and <b style="color: black">Dijkstra's Algorithm</b>. The
  Visibility Graph is a graph where each <b style="color: black">node</b> represents a point in the space, and each
  <b style="color: black">edge</b>
  represents a line of sight between two points. The shortest path between two points can be found by running a shortest
  path algorithm on this graph.
</p>
<p class="project-text">
  First, we need to construct the Visibility Graph. This is done by iterating through all nodes in the 2D space and
  drawing a line from each node to every other node. A line of sight exists if this line does not intersect any obstacle
  edges. The resulting graph connects all nodes that are directly visible to each other. Next, we apply Dijkstra's
  Algorithm to find the shortest path from the <b style="color: red">start</b> point to the
  <b style="color: blue">end</b> point. The algorithm works by assigning an initial distance of infinity to all nodes, except
  the start node, which is set to zero. It then iteratively selects the node with the smallest known distance, updates the
  distances to its neighbors based on edge lengths (distances), and finalizes the shortest path to each node. The process
  continues until the endpoint is reached, and the shortest path is reconstructed by backtracking from the endpoint to the
  start point using recorded predecessors.
</p>
