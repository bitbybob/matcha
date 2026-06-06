<script lang="ts">
  import type { Workflow } from "../../../../src/plan.ts"
  import StoryListSection from "./StoryListSection.svelte"

  export let workflow: Workflow
</script>

<article class="card">
  <h2 class="card-title">{workflow.title}</h2>
  <p class="card-meta">{workflow.kind}</p>
  <ol class="step-list">
    {#each workflow.steps as rawStep, i}
      <li class="step-item">
        {#if typeof rawStep === "string"}
          <div class="step-title">{i + 1}. {rawStep}</div>
        {:else}
          <div class="step-title">{i + 1}. {rawStep.text}</div>
          {#if rawStep.command}
            <code class="code-block">{rawStep.command}</code>
          {/if}
        {/if}
      </li>
    {/each}
  </ol>
  {#each workflow.steps as step}
    {#if typeof step !== "string" && step.expectedResults && step.expectedResults.length > 0}
      <StoryListSection title="Expected Results" items={step.expectedResults} />
    {/if}
  {/each}
</article>
