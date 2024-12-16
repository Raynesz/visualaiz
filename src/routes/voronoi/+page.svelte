<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point } from "$lib/types";
  import { pastelColorPalette } from "$lib/colors";

  let svg: SVGSVGElement | null = $state(null);
  let width: number = $state(0);
  let height: number = $state(0);
  let showCells: boolean = $state(true);
  let showTriangles: boolean = $state(true);

  let points: Point[] = [];
  let currentCircle: SVGCircleElement | null = null; // Reference to the circle currently being dragged

  // Initialize canvas size and points
  function initializeCanvas() {
    width = window.innerWidth > 500 ? 480 : window.innerWidth - 20;
    height = width;
  }

  // Generate random points
  function generateRandomPoints() {
    const numPoints = 10;
    points = d3.range(numPoints).map(() => [Math.random() * (width - 60) + 30, Math.random() * (height - 60) + 30]);
    draw();
  }

  function toggleTriangles() {
    showTriangles = !showTriangles;
    draw();
  }

  function toggleCells() {
    showCells = !showCells;
    draw();
  }

  function draw(): void {
    d3.select(svg).selectAll("*").remove(); // Clear the display

    d3.select(svg) // Draw the border of the display
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("stroke", "black")
      .attr("fill", "none")
      .attr("stroke-width", 3);

    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    if (showCells) {
      // Draw Voronoi cells
      const cells = d3.select(svg).selectAll<SVGPathElement, Point[]>("path").data(voronoi.cellPolygons());

      cells
        .join("path")
        .attr("d", (d: Point[]) => `M${d.join("L")}Z`)
        .attr("fill", (d, i) => pastelColorPalette[i % pastelColorPalette.length])
        .attr("stroke", "black");
    }

    if (showTriangles) {
      // Draw Delaunay triangles
      const triangleEdges: [Point, Point][] = [];
      const triangles = delaunay.triangles; // Uint32Array of indices

      for (let i = 0; i < triangles.length; i += 3) {
        const t1 = triangles[i];
        const t2 = triangles[i + 1];
        const t3 = triangles[i + 2];

        // Extract edges from each triangle
        triangleEdges.push([points[t1], points[t2]], [points[t2], points[t3]], [points[t3], points[t1]]);
      }

      const delaunayLines = d3.select(svg).selectAll<SVGLineElement, [Point, Point]>("line").data(triangleEdges);

      delaunayLines
        .join("line")
        .attr("x1", (d) => d[0][0])
        .attr("y1", (d) => d[0][1])
        .attr("x2", (d) => d[1][0])
        .attr("y2", (d) => d[1][1])
        .attr("stroke", "blue")
        .attr("stroke-width", 1)
        .style("pointer-events", "none"); // Click through the lines
    }

    // Draw points
    d3.select(svg)
      .selectAll<SVGCircleElement, Point>("circle")
      .data(points)
      .join("circle")
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1])
      .attr("r", 6)
      .attr("fill", "black")
      .call(drag); // Enables drag behavior
  }

  // Drag behavior of points
  const drag = d3
    .drag<SVGCircleElement, Point>()
    .on("start", (event, d) => {
      currentCircle = event.sourceEvent.target as SVGCircleElement;
    })
    .on("drag", (event, d) => {
      // Update the point's position
      d[0] = Math.max(0, Math.min(width, event.x)); // Clamp within canvas bounds
      d[1] = Math.max(0, Math.min(height, event.y));
      draw();
      d3.select(currentCircle).attr("fill", "red"); // Highlight the circle
    })
    .on("end", (event) => {
      d3.select(currentCircle).attr("fill", "black"); // Reset circle color
      currentCircle = null;
    });

  onMount(() => {
    document.title = "visualaiz - Voronoi Diagram";
    initializeCanvas();
    generateRandomPoints();
  });
</script>

<svg bind:this={svg} {width} {height} />
<div class="graphics-button-container">
  <button class="graphics-button" onclick={generateRandomPoints}>Regenerate</button>
  <button
    class="graphics-button"
    class:graphics-button-on={showTriangles}
    class:graphics-button-off={!showTriangles}
    onclick={toggleTriangles}>Triangles</button
  >
  <button
    class="graphics-button"
    class:graphics-button-on={showCells}
    class:graphics-button-off={!showCells}
    onclick={toggleCells}>Cells</button
  >
</div>
<h2>In short:</h2>
<p class="project-text">
  The widget above demonstrates the Voronoi diagram of a set of points, usually called <b>sites</b> (black dots), along
  with its dual, the Delaunay triangulation of the same points in 2D space. In short, pixels that share the same color
  form what's called a <b>cell</b> and what they have in common is that the nearest site is the one that exists in their
  cell. That means that the points that lie on the edges of the cells (black lines) are equidistant from the sites of the
  adjacent cells.
</p>
<p class="project-text">
  As mentioned, the Voronoi diagram is dual to the Delaunay triangulation of its sites. In most cases, the <b
    >vertices</b
  >
  (points where 3 cells meet) of the Voronoi diagram are the circumcenters of the respective Delaunay triangles. In other
  words, each vertex is the center of a circle, on whose perimeter the 3 neighbouring sites lie upon.
</p>
