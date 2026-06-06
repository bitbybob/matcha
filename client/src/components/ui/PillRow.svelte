<script lang="ts">
  export let children: import("svelte").Snippet
</script>

<div class="pill-row">
  {@render children()}
</div>
