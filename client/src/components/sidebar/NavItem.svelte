<script lang="ts">
  import { createEventDispatcher } from "svelte"

  export let targetId: string
  export let label: string
  export let active: boolean = false
  export let depth: 0 | 1 | 2 = 0

  const dispatch = createEventDispatcher<{ navigate: string }>()

  function onClick(): void {
    dispatch("navigate", targetId)
  }
</script>

<div class="nav-tree-item nav-depth-{depth}">
  <span class="nav-tree-marker"></span>
  <button
    class="nav-button nav-depth-{depth}"
    class:nav-button-active={active}
    type="button"
    on:click={onClick}
  >{label}</button>
</div>
