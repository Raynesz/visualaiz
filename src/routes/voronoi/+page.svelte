<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point } from "$lib/types";
  import { pastelColorPalette } from "$lib/colors";

  let svg: SVGSVGElement | null = $state(null);
  let width: number = $state(0);
  let height: number = $state(0);
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
    drawVoronoi();
  }

  function drawVoronoi(): void {
    const voronoi = d3.Delaunay.from(points).voronoi([0, 0, width, height]);

    // Update Voronoi cells
    const cells = d3.select(svg).selectAll<SVGPathElement, Point[]>("path").data(voronoi.cellPolygons());

    cells
      .join("path")
      .attr("d", (d: Point[]) => `M${d.join("L")}Z`)
      .attr("fill", (d, i) => pastelColorPalette[i % pastelColorPalette.length])
      .attr("stroke", "black");

    // Update points' positions
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
      drawVoronoi();
      d3.select(currentCircle).attr("fill", "red"); // Highlight the circle
    })
    .on("end", (event) => {
      d3.select(currentCircle).attr("fill", "black"); // Reset circle color
      currentCircle = null;
    });

  onMount(() => {
    initializeCanvas();
    generateRandomPoints();
  });
</script>

<svg bind:this={svg} {width} {height}></svg>
<button onclick={generateRandomPoints}>Regenerate</button>

<style>
  svg {
    padding: 10px;
    margin: auto;
    display: block;
    touch-action: none;
  }
  button {
    display: block;
    margin: 10px auto;
  }
</style>
