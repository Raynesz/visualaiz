<script lang="ts">
  import "./app.css";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { base } from '$app/paths';

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  console.log("basepath:"+base);

  let relativePath = $page.url.pathname.startsWith(base)
    ? $page.url.pathname.slice(base.length)
    : $page.url.pathname;

  let selectedOption = $state(relativePath.slice(1));

  // Navigate when selectedOption changes
  $effect(() => {
    relativePath = $page.url.pathname.startsWith(base)
    ? $page.url.pathname.slice(base.length)
    : $page.url.pathname;

    if (relativePath.slice(1) !== selectedOption) {
      console.log("Navigating to: "+`${base}/${selectedOption}`);
      console.log("basepath:"+base);
      console.log("relative:"+relativePath);
      goto(`${base}/${selectedOption}`);
    }
  });

  function resetDropdown() {
    selectedOption = "";
  }
</script>

<header>
  <a href="/{base.slice(1)}" onclick={resetDropdown}><h1 id="logo">visualaiz</h1></a>
  <nav>
    <a href="https://github.com/Raynesz/visualaiz" target="_blank" rel="noreferrer">
      <img src="github-mark.svg" alt="GitHub" />
    </a>
  </nav>
</header>
<main>
  <span id="project-select">
    Project:
    <select bind:value={selectedOption}>
      <option value="" disabled>Select a project</option>
      <option value="voronoi">Points in 2D</option>
      <option value="convexHull">Convex Hull</option>
      <option value="astar">A* Path Finding</option>
      <option value="counter">Counter</option>
    </select>
  </span>
  {@render children?.()}
</main>
<footer></footer>

<style>
  header {
    display: flex;
    justify-content: space-between;
    background-color: #eceff2;
    height: fit-content;
  }

  header a {
    text-decoration: inherit;
  }

  #logo {
    font-size: 3.2em;
    line-height: 1.1;
    color: #0a2540;
    margin: 10px;
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

  main {
    flex-grow: 1;
    min-width: 700px;
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
