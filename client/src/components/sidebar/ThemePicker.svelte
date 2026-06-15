<script lang="ts">
  import { onMount } from "svelte"
  import { Palette } from "@lucide/svelte"
  import {
    applyTheme,
    defaultTheme,
    isThemeId,
    planThemeStorageKey,
    readStoredTheme,
    themes,
    writeStoredTheme,
  } from "../../lib/theme"

  let theme = defaultTheme

  onMount(() => {
    theme = readStoredTheme(planThemeStorageKey)
    applyTheme(theme)
  })

  function setTheme(next: string): void {
    if (!isThemeId(next)) {
      return
    }

    theme = next
    writeStoredTheme(planThemeStorageKey, next)
    applyTheme(next)
  }
</script>

<div class="theme-picker" aria-label="Theme">
  <Palette size={18} strokeWidth={2.2} aria-hidden="true" class="theme-icon" />
  <select aria-label="Choose theme" bind:value={theme} on:change={(e) => setTheme(e.currentTarget.value)}>
    {#each themes as t}
      <option value={t.id}>{t.label}</option>
    {/each}
  </select>
</div>

<style>
  .theme-picker {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    width: 100%;
    max-width: 100%;
  }

  .theme-picker :global(.theme-icon) {
    flex: none;
    color: var(--subtle);
    pointer-events: none;
  }

  select {
    width: 100%;
    padding: 0.45rem 1.75rem 0.45rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 0.375rem;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  select:hover,
  select:focus {
    border-color: var(--primary);
    outline: none;
  }

  .theme-picker::after {
    content: "";
    position: absolute;
    right: 1.6rem;
    top: 50%;
    width: 0;
    height: 0;
    margin-top: 6px;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid var(--subtle);
    pointer-events: none;
  }
</style>
