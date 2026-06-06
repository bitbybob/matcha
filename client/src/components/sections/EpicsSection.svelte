<script lang="ts">
  import type { Epic } from "../../../../src/plan.ts"
  import EpicSection from "./EpicSection.svelte"

  export let epics: Epic[] | undefined
</script>

{#each epics ?? [] as epic}
  <EpicSection {epic} />
{/each}
