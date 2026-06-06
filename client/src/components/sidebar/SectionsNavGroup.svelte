<script lang="ts">
  import { sectionDomId } from "../../lib/ids.ts"
  import { createEventDispatcher } from "svelte"
  import { toggleGroup } from "./navTree.ts"

  export let sections: { id: string; title: string }[]
  export let activeId: string

  const dispatch = createEventDispatcher<{ navigate: string }>()

  let group: HTMLElement
</script>

<div bind:this={group} class="nav-tree-group nav-depth-0 nav-tree-section">
  <div class="nav-tree-row">
    <button
      class="nav-disclosure"
      type="button"
      aria-expanded="true"
      aria-label="Collapse Sections"
      on:click={() => toggleGroup(group)}
    >
      <span class="disclosure-icon">-</span>
    </button>
    <button
      class="sidebar-heading sidebar-heading-button nav-tree-label"
      type="button"
      on:click={() => toggleGroup(group)}
    >Sections</button>
  </div>
  <div class="nav-tree-children">
    {#each sections as section}
      <div class="nav-tree-item nav-depth-1">
        <span class="nav-tree-marker"></span>
        <button
          class="nav-button nav-depth-1"
          class:nav-button-active={activeId === sectionDomId(section.id)}
          type="button"
          on:click={() => dispatch("navigate", sectionDomId(section.id))}
        >{section.title}</button>
      </div>
    {/each}
  </div>
</div>
