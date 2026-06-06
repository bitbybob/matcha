<script lang="ts">
  import StoryList from "./StoryList.svelte"

  export let title: string
  export let items: string[] | undefined
  export let linkMode: "story" | undefined = undefined
</script>

{#if items && items.length > 0}
  <div class="story-list-section">
    <h4 class="small-heading">{title}</h4>
    <StoryList {items} {linkMode} />
  </div>
{/if}
