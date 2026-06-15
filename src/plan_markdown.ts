import type {
  Blocker,
  Epic,
  JsonValue,
  Plan,
  PlanCommand,
  PlanSection,
  RecommendedOrderItem,
  Story,
  Workflow,
  WorkflowStep,
} from "./plan.ts"

export function renderPlanMarkdown(plan: Plan): string {
  const lines: string[] = []

  lines.push(`# ${plan.title}`)
  lines.push("")
  lines.push(`- **Plan ID:** ${plan.id}`)

  if (plan.project) {
    lines.push(`- **Project:** ${plan.project}`)
  }

  if (plan.status) {
    lines.push(`- **Status:** ${plan.status}`)
  }

  if (plan.generatedAt) {
    lines.push(`- **Generated At:** ${plan.generatedAt}`)
  }

  lines.push(`- **Schema Version:** ${plan.schemaVersion}`)

  if (plan.scope) {
    lines.push("")
    lines.push("## Scope")
    lines.push("")
    lines.push(plan.scope)
  }

  if (plan.summary && plan.summary.length > 0) {
    lines.push("")
    lines.push("## Summary")
    lines.push("")
    for (const paragraph of plan.summary) {
      lines.push(paragraph)
      lines.push("")
    }
  }

  if (plan.metadata && Object.keys(plan.metadata).length > 0) {
    lines.push("## Metadata")
    lines.push("")
    for (const key of Object.keys(plan.metadata).sort()) {
      lines.push(`- **${key}:** ${formatJsonValue(plan.metadata[key])}`)
    }
    lines.push("")
  }

  if (plan.epics && plan.epics.length > 0) {
    lines.push("## Epics")
    lines.push("")

    for (const epic of plan.epics) {
      renderEpic(lines, epic)
    }
  }

  if (plan.sections && plan.sections.length > 0) {
    lines.push("## Sections")
    lines.push("")

    for (const section of plan.sections) {
      renderSection(lines, section)
    }
  }

  if (plan.workflows && plan.workflows.length > 0) {
    lines.push("## Workflows")
    lines.push("")

    for (const workflow of plan.workflows) {
      renderWorkflow(lines, workflow)
    }
  }

  if (plan.commands && plan.commands.length > 0) {
    lines.push("## Commands")
    lines.push("")

    for (const command of plan.commands) {
      renderCommand(lines, command)
    }
  }

  if (plan.blockers && plan.blockers.length > 0) {
    lines.push("## Blockers")
    lines.push("")

    for (const blocker of plan.blockers) {
      renderBlocker(lines, blocker)
    }
  }

  if (plan.recommendedOrder && plan.recommendedOrder.length > 0) {
    lines.push("## Recommended Order")
    lines.push("")

    for (const item of plan.recommendedOrder) {
      renderRecommendedOrderItem(lines, item)
    }
  }

  if (plan.exitCriteria && plan.exitCriteria.length > 0) {
    lines.push("## Exit Criteria")
    lines.push("")

    for (const criterion of plan.exitCriteria) {
      lines.push(`- ${criterion}`)
    }

    lines.push("")
  }

  return normalizeBlankLines(lines.join("\n"))
}

function renderEpic(lines: string[], epic: Epic): void {
  lines.push(`### ${epic.id}: ${epic.title}`)

  if (epic.summary) {
    lines.push("")
    lines.push(epic.summary)
  }

  if (epic.status) {
    lines.push("")
    lines.push(`- **Status:** ${epic.status}`)
  }

  if (epic.tags && epic.tags.length > 0) {
    lines.push(`- **Tags:** ${epic.tags.join(", ")}`)
  }

  if (epic.testFocus) {
    lines.push(`- **Test Focus:** ${epic.testFocus}`)
  }

  if (epic.dependencies && epic.dependencies.length > 0) {
    lines.push(`- **Dependencies:** ${epic.dependencies.join(", ")}`)
  }

  if (epic.stories.length > 0) {
    lines.push("")
    lines.push("#### Stories")
    lines.push("")

    for (const story of epic.stories) {
      renderStory(lines, story)
    }
  }

  lines.push("")
}

function renderStory(lines: string[], story: Story): void {
  lines.push(`##### ${story.id}: ${story.title}`)

  if (story.status) {
    lines.push("")
    lines.push(`- **Status:** ${story.status}`)
  }

  if (story.priority) {
    lines.push(`- **Priority:** ${story.priority}`)
  }

  if (story.risk) {
    lines.push(`- **Risk:** ${story.risk}`)
  }

  if (story.owner) {
    lines.push(`- **Owner:** ${story.owner}`)
  }

  if (story.estimate !== undefined && story.estimate !== null) {
    lines.push(`- **Estimate:** ${String(story.estimate)}`)
  }

  if (story.tags && story.tags.length > 0) {
    lines.push(`- **Tags:** ${story.tags.join(", ")}`)
  }

  if (story.dependencies && story.dependencies.length > 0) {
    lines.push(`- **Dependencies:** ${story.dependencies.join(", ")}`)
  }

  if (story.details && story.details.length > 0) {
    lines.push("")
    lines.push("**Details:**")
    lines.push("")

    for (const detail of story.details) {
      lines.push(`- ${detail}`)
    }
  }

  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    lines.push("")
    lines.push("**Acceptance Criteria:**")
    lines.push("")

    for (const criterion of story.acceptanceCriteria) {
      lines.push(`- ${criterion}`)
    }
  }

  if (story.unitTests && story.unitTests.length > 0) {
    lines.push("")
    lines.push("**Unit Tests:**")
    lines.push("")

    for (const test of story.unitTests) {
      lines.push(`- ${test}`)
    }
  }

  if (story.filesLikelyTouched && story.filesLikelyTouched.length > 0) {
    lines.push("")
    lines.push("**Files Likely Touched:**")
    lines.push("")

    for (const file of story.filesLikelyTouched) {
      lines.push(`- ${inlineCode(file)}`)
    }
  }

  if (story.commandsToRun && story.commandsToRun.length > 0) {
    lines.push("")
    lines.push("**Commands to Run:**")
    lines.push("")

    for (const command of story.commandsToRun) {
      lines.push("```sh")
      lines.push(command)
      lines.push("```")
    }
  }

  if (story.artifacts && story.artifacts.length > 0) {
    lines.push("")
    lines.push("**Artifacts:**")
    lines.push("")

    for (const artifact of story.artifacts) {
      lines.push(`- ${artifact}`)
    }
  }

  if (story.notes && story.notes.length > 0) {
    lines.push("")
    lines.push("**Notes:**")
    lines.push("")

    for (const note of story.notes) {
      lines.push(`- ${note}`)
    }
  }

  lines.push("")
}

function renderSection(lines: string[], section: PlanSection): void {
  lines.push(`### ${section.id}: ${section.title}`)
  lines.push("")
  lines.push(`- **Kind:** ${section.kind}`)

  if (section.summary && section.summary.length > 0) {
    lines.push("")

    for (const paragraph of section.summary) {
      lines.push(paragraph)
      lines.push("")
    }
  }

  if (section.items && section.items.length > 0) {
    for (const item of section.items) {
      let text = "- "

      if (item.title) {
        text += `**${item.title}:** `
      }

      text += item.text

      if (item.status) {
        text += ` (${item.status})`
      }

      if (item.priority) {
        text += ` [priority ${item.priority}]`
      }

      if (item.tags && item.tags.length > 0) {
        text += ` [${item.tags.join(", ")}]`
      }

      if (item.ref) {
        text += ` (ref: ${item.ref})`
      }

      lines.push(text)
    }

    lines.push("")
  }

  if (section.rows && section.rows.length > 0) {
    const columns = section.columns && section.columns.length > 0
      ? section.columns
      : sortedUniqueKeys(section.rows)

    if (columns.length > 0) {
      lines.push("| " + columns.join(" | ") + " |")
      lines.push("| " + columns.map(() => "---").join(" | ") + " |")

      for (const row of section.rows) {
        const cells = columns.map((column) => escapeTableCell(formatJsonValue(row[column])))
        lines.push("| " + cells.join(" | ") + " |")
      }

      lines.push("")
    }
  }

  lines.push("")
}

function renderWorkflow(lines: string[], workflow: Workflow): void {
  lines.push(`### ${workflow.id}: ${workflow.title}`)
  lines.push("")
  lines.push(`- **Kind:** ${workflow.kind}`)
  lines.push("")

  if (workflow.steps.length > 0) {
    lines.push("**Steps:**")
    lines.push("")

    let stepNumber = 1

    for (const step of workflow.steps) {
      if (typeof step === "string") {
        lines.push(`${stepNumber}. ${step}`)
      } else {
        renderWorkflowStep(lines, step, stepNumber)
      }

      stepNumber++
    }

    lines.push("")
  }

  lines.push("")
}

function renderWorkflowStep(lines: string[], step: WorkflowStep, stepNumber: number): void {
  let text = `${stepNumber}. ${step.text}`

  if (step.id) {
    text += ` (${step.id})`
  }

  if (step.status) {
    text += ` (${step.status})`
  }

  lines.push(text)

  if (step.command) {
    lines.push("   ```sh")
    lines.push(`   ${step.command}`)
    lines.push("   ```")
  }

  if (step.expectedResults && step.expectedResults.length > 0) {
    for (const result of step.expectedResults) {
      lines.push(`   - Expected: ${result}`)
    }
  }

  if (step.refs && step.refs.length > 0) {
    lines.push(`   - Refs: ${step.refs.join(", ")}`)
  }
}

function renderCommand(lines: string[], command: PlanCommand): void {
  lines.push(`### ${command.title}`)
  lines.push("")

  if (command.workingDirectory) {
    lines.push(`- **Working Directory:** ${inlineCode(command.workingDirectory)}`)
  }

  if (command.environment && Object.keys(command.environment).length > 0) {
    lines.push("- **Environment:**")

    for (const key of Object.keys(command.environment).sort()) {
      lines.push(`  - ${key}=${command.environment[key]}`)
    }
  }

  lines.push("")
  lines.push("```sh")
  lines.push(command.command)
  lines.push("```")

  if (command.expectedResults && command.expectedResults.length > 0) {
    lines.push("")
    lines.push("**Expected Results:**")
    lines.push("")

    for (const result of command.expectedResults) {
      lines.push(`- ${result}`)
    }
  }

  if (command.refs && command.refs.length > 0) {
    lines.push("")
    lines.push(`**Refs:** ${command.refs.join(", ")}`)
  }

  lines.push("")
}

function renderBlocker(lines: string[], blocker: Blocker): void {
  lines.push(`### Blocker: ${blocker.area}`)
  lines.push("")
  lines.push(`- **Priority:** ${blocker.priority}`)
  lines.push(`- **Required Fix:** ${blocker.requiredFix}`)

  if (blocker.status) {
    lines.push(`- **Status:** ${blocker.status}`)
  }

  if (blocker.refs && blocker.refs.length > 0) {
    lines.push(`- **Refs:** ${blocker.refs.join(", ")}`)
  }

  lines.push("")
}

function renderRecommendedOrderItem(lines: string[], item: RecommendedOrderItem): void {
  let text = `1. **${item.ref}**`

  if (item.reason) {
    text += `: ${item.reason}`
  }

  lines.push(text)
}

function formatJsonValue(value: JsonValue | undefined): string {
  if (value === undefined) {
    return ""
  }

  if (value === null) {
    return "null"
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(formatJsonValue).join(", ")
  }

  const entries = Object.keys(value).sort().map((key) => `${key}: ${formatJsonValue(value[key])}`)

  return entries.join(", ")
}

function sortedUniqueKeys(rows: Array<Record<string, JsonValue>>): string[] {
  const keys = new Set<string>()

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key)
    }
  }

  return Array.from(keys).sort()
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

function inlineCode(text: string): string {
  return "`" + text.replace(/`/g, "\\`") + "`"
}

function normalizeBlankLines(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n*$/g, "\n")
}
