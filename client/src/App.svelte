<script lang="ts">
  import type { Plan } from "../../src/plan.ts"
  import Sidebar from "./components/sidebar/Sidebar.svelte"
  import PlanPage from "./components/sections/PlanPage.svelte"

  export let plan: Plan
  export let sidebarTarget: HTMLElement | null = null
</script>

<div>
    <Sidebar {plan} target={sidebarTarget} />

    <PlanPage {plan} />
</div>
