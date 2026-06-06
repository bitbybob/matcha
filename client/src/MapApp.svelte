<script lang="ts">
  import type { UmlDiagram } from "../../src/uml.ts"

  export let diagram: UmlDiagram | null = null
</script>

<main class="map-shell">
  <section class="map-placeholder" aria-label="UML diagram placeholder">
    <p class="eyebrow">bob map</p>
    <h1>{diagram?.title ?? "UML Diagram Placeholder"}</h1>
    <p class="summary">
      The JointJS renderer will mount here once the UML JSON format is wired in.
    </p>

    {#if diagram}
      <dl class="metadata-grid">
        <div>
          <dt>Elements</dt>
          <dd>{diagram.elements.length}</dd>
        </div>
        <div>
          <dt>Relationships</dt>
          <dd>{diagram.relationships.length}</dd>
        </div>
      </dl>
    {/if}
  </section>
</main>

<style>
  :global(html),
  :global(body) {
    width: 100%;
    height: 100%;
    margin: 0;
  }

  :global(body) {
    overflow: hidden;
    background: #0b1220;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .map-shell {
    width: 100vw;
    height: 100vh;
    display: grid;
    place-items: center;
    background-image:
      radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.18) 1px, transparent 0);
    background-size: 24px 24px;
  }

  .map-placeholder {
    width: min(520px, calc(100vw - 40px));
    border: 1px solid #334155;
    border-radius: 8px;
    background: rgba(17, 24, 39, 0.92);
    padding: 28px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  }

  .eyebrow {
    margin: 0 0 10px;
    color: #38bdf8;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.15;
  }

  .summary {
    margin: 12px 0 0;
    color: #94a3b8;
    font-size: 15px;
    line-height: 1.5;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 20px 0 0;
  }

  .metadata-grid div {
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 12px;
    background: rgba(15, 23, 42, 0.72);
  }

  dt {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  dd {
    margin: 4px 0 0;
    color: #e2e8f0;
    font-size: 22px;
    font-weight: 700;
  }
</style>
