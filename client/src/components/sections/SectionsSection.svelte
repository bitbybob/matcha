<script lang="ts">
  import type { PlanSection } from "../../../../src/plan.ts"
  import SectionCard from "../cards/SectionCard.svelte"
  import EmptyState from "../ui/EmptyState.svelte"

  export let sections: PlanSection[] | undefined
</script>

<section class="document-section" id="sections">
  <header class="section-header">
    <h1 class="section-title">Sections</h1>
    <p class="page-subtitle">Architecture, rules, data models, requirements, and other plan context.</p>
  </header>

  {#if sections && sections.length > 0}
    {#each sections as section}
      <SectionCard {section} />
    {/each}
  {:else}
    <EmptyState message="No sections are defined." />
  {/if}
</section>
