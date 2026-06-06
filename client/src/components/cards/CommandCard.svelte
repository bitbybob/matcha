<script lang="ts">
  import type { PlanCommand } from "../../../../src/plan.ts"
  import StoryListSection from "./StoryListSection.svelte"

  export let command: PlanCommand
</script>

<article class="card">
  <h2 class="card-title">{command.title}</h2>
  {#if command.workingDirectory}
    <p class="card-summary">cwd: {command.workingDirectory}</p>
  {/if}
  <code class="code-block">{command.command}</code>
  <StoryListSection title="Expected Results" items={command.expectedResults} />
</article>
