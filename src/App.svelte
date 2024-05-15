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

<header>
  <h1 id="logo">visualaiz</h1>
  <nav>
    <button type="button">About</button>
    <a href="https://github.com/Raynesz/visualaiz" target="_blank" rel="noreferrer">
      <img src="src/assets/github-mark.svg" alt="GitHub" />
    </a>
  </nav>
</header>
<span id="project-select">
  Project Select:
  <select bind:value={selectedOption}>
    <option value="" disabled selected>Make a selection</option>
    <option value="voronoi">Voronoi Diagram</option>
    <option value="convexHull">Convex Hull</option>
    <option value="A*">A* Path Finding</option>
  </select>
</span>
<main>
  {#if selectedProject}
    <svelte:component this={selectedProject} />
  {/if}
</main>
<footer />

<style>
  header {
    display: flex;
    justify-content: space-between;
    background-color: #eceff2;
  }

  nav {
    display: flex;
    height: 50%;
    gap: 20px;
    margin: auto 10px;
  }

  nav img {
    width: 40px;
  }

  nav button {
    border: 2px black solid;
    border-radius: 7px;
    margin: auto 0;
    font-weight: bold;
    color: #0a2540;
    background: linear-gradient(to left, #eceff2 50%, #0a2540 50%) right;
    background-size: 210%;
    transition: 0.3s ease-out;
  }

  nav button:hover {
    background-position: left;
    color: #eceff2;
  }

  #logo {
    color: #0a2540;
    margin: 10px;
  }

  #project-select {
    width: fit-content;
    display: block;
    margin: 25px auto;
    font-weight: bold;
    color: #0a2540;
  }

  #project-select select {
    padding: 0.5em;
    border: 2px solid #0a2540;
    border-radius: 10px;
    background-color: #eceff2;
    font-weight: bold;
    font-size: 1em;
    color: #0a2540;
  }

  main {
    min-width: 700px;
  }

  footer {
    position: relative;
    background-color: #0a2540;
    height: 10px;
  }

  @media screen and (max-width: 768px) {
    main {
      min-width: fit-content;
    }
  }
</style>
