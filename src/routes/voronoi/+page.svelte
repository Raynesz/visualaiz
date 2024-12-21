<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { Point, Circle } from "$lib/types";
  import { pastelColorPalette } from "$lib/colors";

  let svg: SVGSVGElement | null = $state(null);
  let width: number = $state(0);
  let height: number = $state(0);
  let showCells: boolean = $state(true);
  let showCircles: boolean = $state(false);
  let showTriangles: boolean = $state(true);
  let showHull: boolean = $state(false); // Show Convex Hull
  let showBEC: boolean = $state(false); // Show Biggest Empty Circle

  let points: Point[] = [];
  let currentCircle: SVGCircleElement | null = null; // Reference to the circle currently being dragged

  // Initialize canvas size and points
  function initializeCanvas() {
    width = window.innerWidth > 500 ? 480 : window.innerWidth - 20;
    height = width;
  }

  // Generate random points
  function generateRandomPoints() {
    const numPoints = 8;
    points = d3.range(numPoints).map(() => [Math.random() * (width - 60) + 30, Math.random() * (height - 60) + 30]);
    draw();
  }

  function toggleTriangles() {
    showTriangles = !showTriangles;
    draw();
  }

  function toggleCircles() {
    showCircles = !showCircles;
    draw();
  }

  function toggleCells() {
    showCells = !showCells;
    draw();
  }

  function toggleHull() {
    showHull = !showHull;
    draw();
  }

  function toggleBEC() {
    showBEC = !showBEC;
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

    // Iterate through polygons and extract the edges
    const voronoiEdges: [Point, Point][] = [];
    for (const polygon of voronoi.cellPolygons()) {
      for (let i = 0; i < polygon.length; i++) {
        const start = polygon[i];
        const end = polygon[(i + 1) % polygon.length]; // Wrap to the first vertex
        voronoiEdges.push([start, end]);
      }
    }

    // Calculate Delaunay triangles
    const triangleEdges: [Point, Point][] = [];

    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      const t1 = delaunay.triangles[i];
      const t2 = delaunay.triangles[i + 1];
      const t3 = delaunay.triangles[i + 2];

      // Extract edges from each triangle
      triangleEdges.push([points[t1], points[t2]], [points[t2], points[t3]], [points[t3], points[t1]]);
    }

    // Calculate Circumcircles
    const circumcircles: Circle[] = [];

    const circumcenters = extractPoints(voronoi.circumcenters);

    for (const [i, cc] of circumcenters.entries()) {
      let minDistance = Infinity;
      for (const site of points) {
        const dx = cc[0] - site[0];
        const dy = cc[1] - site[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }
      const circumcircle: Circle = { center: [cc[0], cc[1]], radius: minDistance };
      circumcircles.push(circumcircle);
    }

    // Calculate Convex Hull
    const hullEdges = [];
    const intersections = [];
    const hull = d3.polygonHull(points);

    let biggestEmptyCircle: Circle | null = null;

    if (hull) {
      // Ensure the convex hull is a valid polygon
      for (let i = 0; i < hull.length; i++) {
        const p1 = hull[i];
        const p2 = hull[(i + 1) % hull.length]; // Wrap around to the first point
        hullEdges.push([p1, p2]);
      }
      for (let i = 0; i < hull.length; i++) {
        const A = hull[i];
        const B = hull[(i + 1) % hull.length];
        for (const edge of voronoiEdges) {
          const C = edge[0];
          const D = edge[1];
          const intersection: Point | null = getIntersection(A, B, C, D);
          if (intersection) {
            intersections.push(intersection);

            // Calculate the Biggest Empty Circle for each intersection
            let minDistance = Infinity;
            for (const site of points) {
              const dx = intersection[0] - site[0];
              const dy = intersection[1] - site[1];
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < minDistance) {
                minDistance = distance;
              }
            }

            // Looking for the Biggest Empty Circle of all intersections
            const emptyCircle: Circle = { center: intersection, radius: minDistance };
            if (!biggestEmptyCircle || emptyCircle.radius > biggestEmptyCircle.radius) {
              biggestEmptyCircle = emptyCircle;
            }
          }
        }
      }
    }

    // Find the Biggest Empty Circle within the Convex Hull
    if (biggestEmptyCircle && hull) {
      for (const circumcircle of circumcircles) {
        if (circumcircle.radius > biggestEmptyCircle.radius && isPointInPolygon(circumcircle.center, hull)) {
          biggestEmptyCircle = circumcircle;
        }
      }
    }

    // Draw Voronoi cells
    if (showCells) {
      d3.select(svg)
        .selectAll<SVGPathElement, Point[]>("path")
        .data(voronoi.cellPolygons())
        .join("path")
        .attr("d", (d: Point[]) => `M${d.join("L")}Z`)
        .attr("fill", (d, i) => pastelColorPalette[i % pastelColorPalette.length])
        .attr("stroke", "black");
    }

    // Draw circumcircles
    if (showCircles) {
      d3.select(svg)
        .selectAll(".circumcircle")
        .data(circumcircles)
        .join("circle")
        .attr("class", "circumcircle")
        .attr("cx", (d) => d.center[0])
        .attr("cy", (d) => d.center[1])
        .attr("r", (d) => d.radius)
        .attr("fill", "none")
        .attr("stroke", "blue");

      d3.select(svg)
        .selectAll(".circumcenter")
        .data(circumcenters)
        .join("circle")
        .attr("class", "circumcenter")
        .attr("cx", (d) => d[0])
        .attr("cy", (d) => d[1])
        .attr("r", 4)
        .attr("fill", "blue");
    }

    // Draw triangles
    if (showTriangles) {
      d3.select(svg)
        .selectAll<SVGLineElement, [Point, Point]>("line")
        .data(triangleEdges)
        .join("line")
        .attr("x1", (d) => d[0][0])
        .attr("y1", (d) => d[0][1])
        .attr("x2", (d) => d[1][0])
        .attr("y2", (d) => d[1][1])
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .style("pointer-events", "none"); // Click through the lines
    }

    // Draw Convex Hull
    if (showHull && hull) {
      d3.select(svg)
        .selectAll<SVGLineElement, [Point, Point]>(".convex-hull-line")
        .data(hullEdges)
        .join("line")
        .attr("class", "convex-hull-line")
        .attr("x1", (d) => d[0][0])
        .attr("y1", (d) => d[0][1])
        .attr("x2", (d) => d[1][0])
        .attr("y2", (d) => d[1][1])
        .attr("stroke", "purple")
        .attr("stroke-width", 2)
        .style("pointer-events", "none"); // Allow clicking through the lines

      /* Draw the intersections
      d3.select(svg)
        .selectAll<SVGCircleElement, Point>(".inter")
        .data(intersections)
        .join("circle")
        .attr("class", "inter")
        .attr("cx", (d) => d[0])
        .attr("cy", (d) => d[1])
        .attr("r", 6)
        .attr("fill", "yellow");
        */
    }

    // Draw the Biggest Empty Circle
    if (showBEC && biggestEmptyCircle) {
      d3.select(svg)
        .selectAll(".bec")
        .data([biggestEmptyCircle])
        .join("circle")
        .attr("class", "bec")
        .attr("cx", (d) => d.center[0])
        .attr("cy", (d) => d.center[1])
        .attr("r", (d) => d.radius)
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke", "green");

      d3.select(svg)
        .selectAll(".bec-center")
        .data([biggestEmptyCircle.center])
        .join("circle")
        .attr("class", "bec-center")
        .attr("cx", (d) => d[0])
        .attr("cy", (d) => d[1])
        .attr("r", 4)
        .attr("fill", "green");
    }

    // Draw sites
    d3.select(svg)
      .selectAll<SVGCircleElement, Point>(".site")
      .data(points)
      .join("circle")
      .attr("class", "site")
      .attr("cx", (d) => d[0])
      .attr("cy", (d) => d[1])
      .attr("r", 6)
      .attr("fill", "black")
      .call(drag); // Enables drag behavior
  }

  // Calculates whether a point is inside a polygon by counting how many times a ray intersects the polygon edges when it is fired from the polygon.
  // Initially, the point is outside the polygon. Therefore, if the ray intersects an odd number of edges, the point is inside the polygon. Otherwise, it is outside.
  function isPointInPolygon(point: Point, polygon: [number, number][]): boolean {
    const [px, py] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  // Checks if two linear segments intersect and returns the intersection point if it exists
  function getIntersection(A: Point, B: Point, C: Point, D: Point): Point | null {
    const denominator = (A[0] - B[0]) * (C[1] - D[1]) - (A[1] - B[1]) * (C[0] - D[0]);

    // Parallel or collinear lines
    if (Math.abs(denominator) < 1e-10) return null;

    const t = ((A[0] - C[0]) * (C[1] - D[1]) - (A[1] - C[1]) * (C[0] - D[0])) / denominator;
    const u = ((A[0] - C[0]) * (A[1] - B[1]) - (A[1] - C[1]) * (A[0] - B[0])) / denominator;

    // Check if intersection is within the segment bounds
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const Px = A[0] + t * (B[0] - A[0]);
      const Py = A[1] + t * (B[1] - A[1]);
      return [Px, Py];
    }

    return null; // No intersection within the line segments
  }

  // In: [x1,y1,x2,y2,x3,y3,...] -> Out: [[x1,y1],[x2,y2],[x3,y3],...]
  function extractPoints(flatPoints: ArrayLike<number>): Point[] {
    const extractedPoints: Point[] = [];
    for (let i = 0; i < flatPoints.length; i += 2) {
      extractedPoints.push([flatPoints[i], flatPoints[i + 1]]);
    }
    return extractedPoints;
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
    class:graphics-button-on={showCells}
    class:graphics-button-off={!showCells}
    onclick={toggleCells}>Cells</button
  >
  <button
    class="graphics-button"
    class:graphics-button-on={showTriangles}
    class:graphics-button-off={!showTriangles}
    onclick={toggleTriangles}>Triangles</button
  >
  <button
    class="graphics-button"
    class:graphics-button-on={showCircles}
    class:graphics-button-off={!showCircles}
    onclick={toggleCircles}>Circumcircles</button
  >
  <button
    class="graphics-button"
    class:graphics-button-on={showHull}
    class:graphics-button-off={!showHull}
    onclick={toggleHull}>C. Hull</button
  >
  <button
    class="graphics-button"
    class:graphics-button-on={showBEC}
    class:graphics-button-off={!showBEC}
    onclick={toggleBEC}>Biggest Empty Circle</button
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
