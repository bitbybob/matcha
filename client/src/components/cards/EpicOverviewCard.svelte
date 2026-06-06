<script lang="ts">
  import type { Epic } from "../../../../src/plan.ts"

  export let epic: Epic
</script>

<article class="card">
  <h2 class="card-title">{epic.id}: {epic.title}</h2>
  <p class="card-summary">{epic.summary || ""}</p>
  <p class="card-meta">{epic.stories.length} stories</p>
</article>
