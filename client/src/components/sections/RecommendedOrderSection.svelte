<script lang="ts">
  import type { RecommendedOrderItem } from "../../../../src/plan.ts"
  import EmptyState from "../ui/EmptyState.svelte"

  export let items: RecommendedOrderItem[] | undefined
</script>

<section class="document-section" id="recommended-order">
  <header class="section-header">
    <h1 class="section-title">Recommended Order</h1>
    <p class="page-subtitle">Suggested implementation sequence and rationale.</p>
  </header>

  {#if items && items.length > 0}
    <ol class="step-list">
      {#each items as item, i}
        <li class="step-item">
          <div class="step-title">{i + 1}. {item.ref}</div>
          <p class="step-text">{item.reason || ""}</p>
        </li>
      {/each}
    </ol>
  {:else}
    <EmptyState message="No recommended order is defined." />
  {/if}
</section>
