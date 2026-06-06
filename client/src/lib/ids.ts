import type { JsonValue, PlanSection } from "../../../src/plan.ts"

export function sectionDomId(id: string): string {
  return "section-" + id
}

export function epicDomId(epicId: string): string {
  return "epic-" + epicId
}

export function storyDomId(storyId: string): string {
  return "story-" + storyId.replaceAll(".", "-")
}

export function formatJsonValue(value: JsonValue): string {
  if (Array.isArray(value)) {
    return value.join(", ")
  }

  if (value !== null && typeof value === "object") {
    return JSON.stringify(value)
  }

  if (value !== undefined && value !== null) {
    return String(value)
  }

  return ""
}

export function tableColumns(section: PlanSection): string[] {
  if (section.columns && section.columns.length > 0) {
    return section.columns
  }

  if (section.rows && section.rows.length > 0) {
    return Object.keys(section.rows[0])
  }

  return []
}

export function scrollToId(id: string): void {
  const target = document.getElementById(id)

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}
