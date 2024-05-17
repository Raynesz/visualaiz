<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";

  const colorPalette = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // yellow-green
    "#17becf", // teal
  ];

  const pastelColorPalette = [
    "#aec7e8", // pastel blue
    "#ffbb78", // pastel orange
    "#98df8a", // pastel green
    "#ff9896", // pastel red
    "#c5b0d5", // pastel purple
    "#c49c94", // pastel brown
    "#f7b6d2", // pastel pink
    "#c7c7c7", // pastel gray
    "#dbdb8d", // pastel yellow-green
    "#9edae5", // pastel teal
  ];

  let svg: SVGSVGElement | null;

  let width = 0;
  let height = 0;

  onMount(() => {
    // Determine the dimensions of the canvas according to screen size
    width = window.innerWidth > 500 ? 480 : window.innerWidth - 20;
    height = width;

    // Generate 10 random points within the canvas
    const numPoints = 10;
    const points: [number, number][] = d3.range(numPoints).map(() => [
      Math.random() * (width - 60) + 30, // Random x-coordinate within the range [30, width - 30]
      Math.random() * (height - 60) + 30, // Random y-coordinate within the range [30, height - 30]
    ]);

    // Create a Voronoi generator
    const voronoi = d3.Delaunay.from(points).voronoi([0, 0, width, height]);

    // Draw Voronoi cells
    d3.select(svg)
      .selectAll("path")
      .data(voronoi.cellPolygons())
      .enter()
      .append("path")
      .attr("d", (d: [number, number][]) => `M${d.join("L")}Z`)
      .attr("fill", (d, i) => pastelColorPalette[i % pastelColorPalette.length])
      .attr("stroke", "black");

    // Draw the points
    d3.select(svg)
      .selectAll("circle")
      .data(points)
      .enter()
      .append("circle")
      .attr("cx", (d: [number, number]) => d[0])
      .attr("cy", (d: [number, number]) => d[1])
      .attr("r", 3)
      .attr("fill", "black");
  });
</script>

<svg bind:this={svg} {width} {height}></svg>

<style>
  svg {
    padding: 10px;
    margin: auto;
    display: block;
  }
</style>
