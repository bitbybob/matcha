<script lang="ts">
  import type { PlanCommand } from "../../../../src/plan.ts"
  import CommandCard from "../cards/CommandCard.svelte"
  import EmptyState from "../ui/EmptyState.svelte"

  export let commands: PlanCommand[] | undefined
</script>

<section class="document-section" id="commands">
  <header class="section-header">
    <h1 class="section-title">Commands</h1>
    <p class="page-subtitle">Commands and expected results captured by the plan.</p>
  </header>

  {#if commands && commands.length > 0}
    {#each commands as command}
      <CommandCard {command} />
    {/each}
  {:else}
    <EmptyState message="No commands are defined." />
  {/if}
</section>
