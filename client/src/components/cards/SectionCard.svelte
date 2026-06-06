<script lang="ts">
  import type { PlanSection } from "../../../../src/plan.ts"
  import { formatJsonValue, sectionDomId, tableColumns } from "../../lib/ids.ts"

  export let section: PlanSection
</script>

<article class="card section-card" id={sectionDomId(section.id)}>
  <h2 class="card-title">{section.title}</h2>
  <p class="card-meta">{section.kind}</p>

  {#each section.summary ?? [] as paragraph}
    <p class="card-summary">{paragraph}</p>
  {/each}

  {#if section.items}
    <div class="section-item-list">
      {#each section.items as item}
        <div class="nested-card">
          {#if item.title}
            <h3 class="nested-title">{item.title}</h3>
          {/if}
          <p class="nested-text">{item.text}</p>
        </div>
      {/each}
    </div>
  {/if}

  {#if section.rows}
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            {#each tableColumns(section) as column}
              <th>{column}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each section.rows as row}
            <tr>
              {#each tableColumns(section) as column}
                <td>{formatJsonValue(row[column])}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</article>
