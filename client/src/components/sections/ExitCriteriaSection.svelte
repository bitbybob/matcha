<script lang="ts">
  import EmptyState from "../ui/EmptyState.svelte"

  export let criteria: string[] | undefined
</script>

<section class="document-section" id="exit-criteria">
  <header class="section-header">
    <h1 class="section-title">Exit Criteria</h1>
    <p class="page-subtitle">The proof that the whole plan is complete.</p>
  </header>

  {#if criteria && criteria.length > 0}
    <section class="list-section">
      <h3 class="small-heading">Criteria</h3>
      <ul class="item-list">
        {#each criteria as criterion}
          <li class="list-item">{criterion}</li>
        {/each}
      </ul>
    </section>
  {:else}
    <EmptyState message="No exit criteria are defined." />
  {/if}
</section>
