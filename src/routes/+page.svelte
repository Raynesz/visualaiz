<script lang="ts">
  import { onMount } from "svelte";

  onMount(() => {
    document.title = "visualaiz";
  });
</script>

<p>
  A small personal project that provides a visual and interactive representation of various Computer Science, Math and
  Computational Geometry concepts.
</p>
<img src="giphy.webp" alt="bROkeN GiF" />

<style>
  p {
    font-weight: bold;
    font-size: 1.2em;
    color: #0a2540;
    max-width: 800px;
    padding: 10px;
    text-align: center;
    margin: auto;
  }

  img {
    display: block;
    margin: 100px auto;
    width: 50%;
    max-width: 800px;
  }
</style>
