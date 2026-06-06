<script lang="ts">
  import type { Plan } from "../../../../src/plan.ts"
  import { formatJsonValue } from "../../lib/ids.ts"
  import Pill from "../ui/Pill.svelte"
  import PillRow from "../ui/PillRow.svelte"
  import EpicOverviewCard from "../cards/EpicOverviewCard.svelte"

  export let plan: Plan
</script>

<section class="document-section" id="overview">
  <header class="page-header">
    <h1 class="page-title">{plan.title}</h1>
    {#if plan.project || plan.scope}
      <p class="page-subtitle">{plan.project || plan.scope}</p>
    {/if}
  </header>

  <PillRow>
    <Pill label={`schema v${plan.schemaVersion}`} />
    {#if plan.status}
      <Pill label={`status: ${plan.status}`} variant="status" />
    {/if}
    {#if plan.generatedAt}
      <Pill label={`generated: ${plan.generatedAt}`} />
    {/if}
  </PillRow>

  {#each plan.summary ?? [] as paragraph}
    <p class="summary-paragraph">{paragraph}</p>
  {/each}

  {#if plan.metadata}
    <dl class="metadata-grid">
      {#each Object.entries(plan.metadata) as [key, value]}
        <div class="metadata-card">
          <dt class="metadata-key">{key}</dt>
          <dd class="metadata-value">{formatJsonValue(value)}</dd>
        </div>
      {/each}
    </dl>
  {/if}

  {#if plan.epics && plan.epics.length > 0}
    <section class="overview-grid">
      {#each plan.epics as epic}
        <EpicOverviewCard {epic} />
      {/each}
    </section>
  {/if}
</section>
