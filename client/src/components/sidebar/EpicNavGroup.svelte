<script lang="ts">
  import type { Epic } from "../../../../src/plan.ts"
  import { epicDomId, storyDomId } from "../../lib/ids.ts"
  import { createEventDispatcher } from "svelte"
  import { expandGroup, toggleGroup } from "./navTree.ts"

  export let epic: Epic
  export let activeId: string

  const dispatch = createEventDispatcher<{ navigate: string }>()

  let group: HTMLElement

  function onLabelClick(): void {
    expandGroup(group)
    dispatch("navigate", epicDomId(epic.id))
  }

  function onToggle(): void {
    toggleGroup(group)
  }

  function onStoryClick(storyId: string): void {
    dispatch("navigate", storyDomId(storyId))
  }
</script>

<div bind:this={group} class="nav-tree-group nav-depth-1 nav-tree-epic nav-tree-collapsed">
  <div class="nav-tree-row">
    <button
      class="nav-disclosure"
      type="button"
      aria-expanded="false"
      aria-label="Expand {epic.id}: {epic.title}"
      on:click={onToggle}
    >
      <span class="disclosure-icon">+</span>
    </button>
    <button
      class="nav-button nav-tree-label"
      class:nav-button-active={activeId === epicDomId(epic.id)}
      type="button"
      on:click={onLabelClick}
    >{epic.id}: {epic.title}</button>
  </div>
  <div class="nav-tree-children">
    {#each epic.stories as story}
      <div class="nav-tree-item nav-depth-2">
        <span class="nav-tree-marker"></span>
        <button
          class="nav-button nav-depth-2"
          class:nav-button-active={activeId === storyDomId(story.id)}
          type="button"
          on:click={() => onStoryClick(story.id)}
        >{story.id}: {story.title}</button>
      </div>
    {/each}
  </div>
</div>
