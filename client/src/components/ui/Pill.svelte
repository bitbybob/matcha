<script lang="ts">
  export let label: string
  export let variant: "default" | "status" = "default"
</script>

<span class="pill" class:pill-status={variant === "status"}>{label}</span>
