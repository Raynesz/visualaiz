<script lang="ts">
  import "./app.css";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { base } from "$app/paths";

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  let selectedOption = $state(getSelectedProjectFromPath());

  // Navigate when selectedOption changes
  $effect(() => {
    if (getSelectedProjectFromPath() !== selectedOption) {
      goto(`${base}/${selectedOption}`);
    }
  });

  function getSelectedProjectFromPath() {
    const relativePath = $page.url.pathname.startsWith(base)
      ? $page.url.pathname.slice(base.length)
      : $page.url.pathname; // Get the project path
    return relativePath.slice(1); // Remove the leading slash
  }

  function resetDropdown() {
    selectedOption = "";
  }
</script>

<header>
  <a href="/{base.slice(1)}" onclick={resetDropdown}><h1 id="logo">visualaiz</h1></a>
  <!-- We add the slash but also slice it because locally the base path is "" and in production it is "/visualaiz" -->
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
      <option value="points2D">Points in 2D</option>
      <option value="convexHull">Convex Hull</option>
      <option value="astar">A* Path Finding</option>
      <option value="counter">Counter</option>
    </select>
  </span>
  {@render children?.()}
</main>
<footer><a href="https://raynesz.dev/" target="_blank" rel="noreferrer">[who made this?]</a></footer>

<style>
  :global {
    /* The main graphics display for each project */
    svg {
      padding: 10px;
      margin: auto;
      display: block;
      touch-action: none;
    }

    .widget-hint {
      width: fit-content;
      display: flex;
      color: grey;
      font-style: italic;
      margin: 0 auto;
    }

    .widget-button-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin: 10px auto;
    }

    .widget-button {
      border-radius: 8px;
      border: 1px solid transparent;
      padding: 0.6em 1.2em;
      font-size: 1em;
      font-weight: 500;
      font-family: inherit;
      color: #0a2540;
      background-color: #eceff2;
      cursor: pointer;
      transition: background-color 0.4s;
      border-color: #646cff;
      border-width: 1px;
      display: block;
    }
    .widget-button:hover {
      outline: 2px solid #646cff;
    }
    .widget-button:active {
      background-color: #646cff;
    }
    .widget-button-on {
      background-color: #8fff73;
    }
    .widget-button-off {
      background-color: #ff9090;
    }

    .topics {
      margin: 15px 10px;
    }

    .topics h3 {
      display: inline;
      align-items: center;
    }

    h2 {
      margin-left: 10px;
      margin-top: 0;
      margin-bottom: 0;
    }

    .project-text {
      font-size: 1.1em;
      margin: 5px 10px;
      text-align: justify;
    }

    /*
    .topics .arrow {
      cursor: pointer;
      user-select: none;
      display: inline-block;
      margin-right: 8px;
      transition: transform 0.3s ease;
    }*/
  }

  header {
    display: flex;
    justify-content: space-between;
    background-color: #eceff2;
    height: fit-content;
  }

  a {
    text-decoration: none;
    color: inherit;
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
    color: white;
    text-align: right;
    margin-top: 30px;
  }

  footer a {
    margin-right: 15px;
  }

  @media screen and (max-width: 768px) {
    main {
      min-width: fit-content;
    }
  }
</style>
