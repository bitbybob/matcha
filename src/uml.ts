import type { JsonValue, PlanStatus, Slug } from "./plan.ts"

export type UmlDiagramKind =
  | "class"
  | "component"
  | "package"
  | "deployment"
  | "use-case"
  | "sequence"
  | "mixed"

export type UmlElementKind =
  | "class"
  | "abstract-class"
  | "interface"
  | "enum"
  | "type"
  | "component"
  | "module"
  | "package"
  | "actor"
  | "use-case"
  | "service"
  | "database"
  | "external-system"
  | "note"

export type UmlRelationshipKind =
  | "inheritance"
  | "realization"
  | "association"
  | "dependency"
  | "aggregation"
  | "composition"
  | "contains"
  | "uses"
  | "creates"
  | "calls"
  | "emits"
  | "subscribes"
  | "reads"
  | "writes"

export type UmlVisibility = "public" | "private" | "protected" | "package"
export type UmlNavigability = "none" | "source" | "target" | "both"
export type UmlLayoutEngine = "auto" | "layered" | "grid" | "tree" | "manual"
export type UmlLayoutDirection = "TB" | "BT" | "LR" | "RL"
export type UmlGroupKind =
  | "package"
  | "layer"
  | "bounded-context"
  | "namespace"
  | "folder"
  | "feature"

export interface UmlDiagram {
  schemaVersion: number
  id: Slug
  title: string
  diagramKind: UmlDiagramKind
  project?: string
  generatedAt?: string
  scope?: string
  status?: PlanStatus
  summary?: string[]
  metadata?: Record<string, JsonValue>
  groups?: UmlGroup[]
  elements: UmlElement[]
  relationships: UmlRelationship[]
  views?: UmlView[]
  legend?: UmlLegendItem[]
  constraints?: string[]
}

export interface UmlElement {
  id: Slug
  name: string
  kind: UmlElementKind
  stereotype?: string
  namespace?: string
  summary?: string
  responsibilities?: string[]
  attributes?: UmlMember[]
  operations?: UmlOperation[]
  literals?: string[]
  tags?: string[]
  group?: Slug
  metadata?: Record<string, JsonValue>
}

export interface UmlMember {
  name: string
  visibility?: UmlVisibility
  type?: string
  default?: string
  required?: boolean
  static?: boolean
  abstract?: boolean
  readonly?: boolean
  derived?: boolean
  summary?: string
}

export interface UmlOperation {
  name: string
  visibility?: UmlVisibility
  parameters?: UmlParameter[]
  returns?: string
  static?: boolean
  abstract?: boolean
  async?: boolean
  summary?: string
}

export interface UmlParameter {
  name: string
  type?: string
  required?: boolean
  default?: string
}

export interface UmlRelationship {
  id: Slug
  from: Slug
  to: Slug
  kind: UmlRelationshipKind
  label?: string
  fromLabel?: string
  toLabel?: string
  fromMultiplicity?: string
  toMultiplicity?: string
  navigability?: UmlNavigability
  summary?: string
  tags?: string[]
  metadata?: Record<string, JsonValue>
}

export interface UmlGroup {
  id: Slug
  title: string
  kind: UmlGroupKind
  elements?: Slug[]
  summary?: string
}

export interface UmlView {
  id: Slug
  title: string
  layout?: UmlLayout
  include?: Slug[]
  exclude?: Slug[]
  focus?: Slug[]
  summary?: string
}

export interface UmlLayout {
  engine?: UmlLayoutEngine
  direction?: UmlLayoutDirection
  rankBy?: string
  groupBy?: string
}

export interface UmlLegendItem {
  id: Slug
  label: string
  color?: string
  description?: string
}
