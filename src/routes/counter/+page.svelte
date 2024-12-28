<script lang="ts">
  import { onMount } from "svelte";

  let count: number = $state(0);
  const increment = () => {
    count += 1;
  };

  onMount(() => {
    document.title = "visualaiz - Counter";
  });
</script>

<button class="widget-button" onclick={increment}>
  count is {count}
</button>
