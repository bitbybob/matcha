<script lang="ts">
  import { storyDomId } from "../../lib/ids.ts"

  export let items: string[]
  export let linkMode: "story" | undefined = undefined
</script>

<ul class="story-list">
  {#each items as item}
    <li class="story-list-item">
      <span class="tree-marker"></span>
      <span class="tree-text">
        {#if linkMode === "story"}
          <a class="story-link" href={"#" + storyDomId(item)}>{item}</a>
        {:else}
          {item}
        {/if}
      </span>
    </li>
  {/each}
</ul>
