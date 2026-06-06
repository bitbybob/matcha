<script lang="ts">
  import type { Workflow } from "../../../../src/plan.ts"
  import WorkflowCard from "../cards/WorkflowCard.svelte"
  import EmptyState from "../ui/EmptyState.svelte"

  export let workflows: Workflow[] | undefined
</script>

<section class="document-section" id="workflows">
  <header class="section-header">
    <h1 class="section-title">Workflows</h1>
    <p class="page-subtitle">Ordered validation, migration, smoke-test, or rollout steps.</p>
  </header>

  {#if workflows && workflows.length > 0}
    {#each workflows as workflow}
      <WorkflowCard {workflow} />
    {/each}
  {:else}
    <EmptyState message="No workflows are defined." />
  {/if}
</section>
