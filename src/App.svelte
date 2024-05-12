<script lang="ts">
  import Voronoi from "./lib/Voronoi.svelte";
  import AStar from "./lib/AStar.svelte";
  import ConvexHull from "./lib/ConvexHull.svelte";

  let selectedOption: string = "";
  let selectedProject: typeof Voronoi | typeof ConvexHull | typeof AStar;

  $: {
    switch (selectedOption) {
      case "voronoi":
        selectedProject = Voronoi;
        break;
      case "convexHull":
        selectedProject = ConvexHull;
        break;
      case "A*":
        selectedProject = AStar;
        break;
      default:
        selectedProject = Voronoi;
        break;
    }
  }
</script>

<h1 id="logo">visualaiz</h1>
<select id="project-select" bind:value={selectedOption}>
  <option value="" disabled selected>Make a selection</option>
  <option value="voronoi">Voronoi Diagram</option>
  <option value="convexHull">Convex Hull</option>
  <option value="A*">A* Path Finding</option>
</select>
<main>
  {#if selectedProject}
    <svelte:component this={selectedProject} />
  {/if}
</main>

<style>
  #logo {
    color: #0a2540;
    margin: 10px;
  }

  #project-select {
    display: block;
    padding: 0.5em;
    border: 2px solid #0a2540;;
    border-radius: 10px;
    font-size: 1em;
    font-weight: bold;
    margin: 25px auto;
    color: #0a2540;
    background-color: #f6f9fc;;
  }
</style>