<script lang="ts">
  import { Palette, RotateCcw, ZoomIn, ZoomOut } from "@lucide/svelte"
  import { onMount, tick } from "svelte"
  import type { UmlDiagram, UmlElement, UmlRelationship } from "../../src/uml.ts"
  import {
    applyTheme,
    defaultTheme,
    isThemeId,
    mapThemeStorageKey,
    readStoredTheme,
    themes,
    writeStoredTheme,
  } from "./lib/theme"

  type Point = { x: number; y: number }
  type ViewNode = UmlElement & { x: number; y: number; width: number; height: number }
  type ViewLink = UmlRelationship & { source: Point; target: Point; path: string; labelPoint: Point }
  type DiagramLayout = {
    width: number
    height: number
    nodes: ViewNode[]
    links: ViewLink[]
  }

  const nodeWidth = 300
  const margin = 72
  const rankGap = 240
  const rowGap = 54

  export let diagram: UmlDiagram | null = null

  let viewport: HTMLDivElement
  let zoom = 1
  let pan = { x: 0, y: 0 }
  let isPanning = false
  let activePointerId: number | null = null
  let lastPointer = { x: 0, y: 0 }
  let hoveredNodeId: string | null = null
  let pinnedNodeId: string | null = null
  let ignoreNextCanvasDoubleClick = false
  let theme = defaultTheme

  $: layout = buildLayout(diagram)
  $: highlightedNodeId = activeHighlightNodeId(layout.nodes, pinnedNodeId, hoveredNodeId)
  $: highlightedLinkIds = highlightedLinks(layout.links, highlightedNodeId)
  $: highlightedNodeIds = highlightedNodes(layout.links, highlightedNodeId, highlightedLinkIds)
  $: hasHighlight = highlightedNodeId !== null

  onMount(async () => {
    theme = readStoredTheme(mapThemeStorageKey)
    applyTheme(theme)
    await tick()
    resetView()
  })

  function setTheme(next: string): void {
    if (!isThemeId(next)) {
      return
    }

    theme = next
    writeStoredTheme(mapThemeStorageKey, next)
    applyTheme(next)
  }

  function buildLayout(source: UmlDiagram | null): DiagramLayout {
    if (!source) {
      return { width: 960, height: 640, nodes: [], links: [] }
    }

    const groupedIds = new Set((source.groups ?? []).flatMap((group) => group.elements ?? []))
    const ungrouped = source.elements.filter((element) => !groupedIds.has(element.id))
    const groups = [
      ...(source.groups ?? []),
      ...(ungrouped.length > 0
        ? [{ id: "ungrouped", title: "Ungrouped", kind: "layer" as const, elements: ungrouped.map((e) => e.id) }]
        : []),
    ]

    const groupByElement = new Map<string, string>()
    for (const group of groups) {
      for (const elementId of group.elements ?? []) {
        groupByElement.set(elementId, group.id)
      }
    }

    const groupOrder = new Map(groups.map((group, index) => [group.id, index]))
    const nodes = runLayeredLayout(source.elements, source.relationships, groupByElement, groupOrder)
    normalizeNodes(nodes)
    const bounds = graphBounds(nodes)
    const currentNodeById = new Map(nodes.map((node) => [node.id, node]))
    const relationshipPorts = relationshipPortOffsets(source.relationships, currentNodeById)
    const relationshipOffsets = relationshipCurveOffsets(source.relationships)
    const links = source.relationships
      .map((relationship, index) => {
        const from = currentNodeById.get(relationship.from)
        const to = currentNodeById.get(relationship.to)

        if (!from || !to) {
          return null
        }

        const ports = relationshipPorts.get(index) ?? { source: 0, target: 0 }
        const sourcePoint = edgePoint(from, to, ports.source)
        const targetPoint = edgePoint(to, from, ports.target)
        const curveOffset = relationshipOffsets[index] ?? 0

        return {
          ...relationship,
          source: sourcePoint,
          target: targetPoint,
          path: curvedPath(sourcePoint, targetPoint, relationship.id, curveOffset),
          labelPoint: curveLabel(sourcePoint, targetPoint, relationship.id, curveOffset),
        }
      })
      .filter((link): link is ViewLink => Boolean(link))

    return { width: bounds.width, height: bounds.height, nodes, links }
  }

  function runLayeredLayout(
    elements: UmlElement[],
    relationships: UmlRelationship[],
    groupByElement: Map<string, string>,
    groupOrder: Map<string, number>,
  ): ViewNode[] {
    const ranks = computeRanks(elements, relationships)
    const columns = new Map<number, UmlElement[]>()
    for (const element of elements) {
      const rank = ranks.get(element.id) ?? 0
      columns.set(rank, [...(columns.get(rank) ?? []), element])
    }

    const rankValues = [...columns.keys()].sort((a, b) => a - b)
    const columnHeights = rankValues.map((rank) =>
      (columns.get(rank) ?? []).reduce((sum, element) => sum + getNodeHeight(element) + rowGap, -rowGap)
    )
    const targetHeight = Math.max(720, Math.max(...columnHeights, 0))
    const nodes: ViewNode[] = []

    for (const rank of rankValues) {
      const column = [...(columns.get(rank) ?? [])].sort((a, b) => {
        const groupDelta = (groupOrder.get(groupByElement.get(a.id) ?? "") ?? 999) -
          (groupOrder.get(groupByElement.get(b.id) ?? "") ?? 999)
        if (groupDelta !== 0) return groupDelta
        return weightedNeighborRank(a.id, relationships, ranks) - weightedNeighborRank(b.id, relationships, ranks) ||
          a.name.localeCompare(b.name)
      })
      const columnHeight = column.reduce((sum, element) => sum + getNodeHeight(element) + rowGap, -rowGap)
      let y = margin + Math.max(0, (targetHeight - columnHeight) / 2)

      for (const element of column) {
        const height = getNodeHeight(element)
        nodes.push({
          ...element,
          x: margin + rank * (nodeWidth + rankGap),
          y,
          width: nodeWidth,
          height,
        })
        y += height + rowGap
      }
    }

    resolveColumnCollisions(nodes, ranks)
    return nodes
  }

  function computeRanks(elements: UmlElement[], relationships: UmlRelationship[]): Map<string, number> {
    const elementIds = new Set(elements.map((element) => element.id))
    const incoming = new Map<string, number>()
    const outgoing = new Map<string, string[]>()
    const ranks = new Map(elements.map((element) => [element.id, 0]))

    for (const relationship of relationships) {
      if (!elementIds.has(relationship.from) || !elementIds.has(relationship.to)) continue
      outgoing.set(relationship.from, [...(outgoing.get(relationship.from) ?? []), relationship.to])
      incoming.set(relationship.to, (incoming.get(relationship.to) ?? 0) + 1)
      incoming.set(relationship.from, incoming.get(relationship.from) ?? 0)
    }

    const queue = elements
      .filter((element) => (incoming.get(element.id) ?? 0) === 0)
      .map((element) => element.id)

    if (queue.length === 0 && elements[0]) {
      queue.push(elements[0].id)
    }

    while (queue.length > 0) {
      const id = queue.shift()!
      const rank = ranks.get(id) ?? 0

      for (const target of outgoing.get(id) ?? []) {
        ranks.set(target, Math.max(ranks.get(target) ?? 0, rank + 1))
        incoming.set(target, (incoming.get(target) ?? 1) - 1)
        if ((incoming.get(target) ?? 0) === 0) {
          queue.push(target)
        }
      }
    }

    for (let pass = 0; pass < elements.length; pass += 1) {
      for (const relationship of relationships) {
        if (!elementIds.has(relationship.from) || !elementIds.has(relationship.to)) continue
        const sourceRank = ranks.get(relationship.from) ?? 0
        const targetRank = ranks.get(relationship.to) ?? 0
        if (targetRank <= sourceRank && sourceRank < elements.length - 1) {
          ranks.set(relationship.to, sourceRank + 1)
        }
      }
    }

    const maxRank = Math.max(0, ...ranks.values())
    const compressed = new Map<number, number>()
    ;[...new Set(ranks.values())].sort((a, b) => a - b).forEach((rank, index) => compressed.set(rank, index))
    for (const [id, rank] of ranks.entries()) {
      ranks.set(id, compressed.get(Math.min(rank, maxRank)) ?? 0)
    }

    return ranks
  }

  function weightedNeighborRank(
    elementId: string,
    relationships: UmlRelationship[],
    ranks: Map<string, number>,
  ): number {
    const neighbors = relationships.flatMap((relationship) => {
      if (relationship.from === elementId) return [ranks.get(relationship.to) ?? 0]
      if (relationship.to === elementId) return [ranks.get(relationship.from) ?? 0]
      return []
    })

    if (neighbors.length === 0) {
      return 0
    }

    return neighbors.reduce((sum, rank) => sum + rank, 0) / neighbors.length
  }

  function resolveColumnCollisions(nodes: ViewNode[], ranks: Map<string, number>): void {
    const byRank = new Map<number, ViewNode[]>()
    for (const node of nodes) {
      const rank = ranks.get(node.id) ?? 0
      byRank.set(rank, [...(byRank.get(rank) ?? []), node])
    }

    for (const column of byRank.values()) {
      column.sort((a, b) => a.y - b.y)
      for (let pass = 0; pass < 3; pass += 1) {
        for (let index = 1; index < column.length; index += 1) {
          const previous = column[index - 1]
          const current = column[index]
          const minY = previous.y + previous.height + rowGap
          if (current.y < minY) {
            current.y = minY
          }
        }
      }
    }
  }

  function normalizeNodes(nodes: ViewNode[]): void {
    if (nodes.length === 0) return

    const bounds = rawBounds(nodes)
    const shiftX = margin - bounds.minX
    const shiftY = margin - bounds.minY

    for (const node of nodes) {
      node.x += shiftX
      node.y += shiftY
    }
  }

  function graphBounds(nodes: ViewNode[]): { width: number; height: number } {
    if (nodes.length === 0) {
      return { width: 960, height: 640 }
    }

    const bounds = rawBounds(nodes)
    return {
      width: Math.max(960, bounds.maxX + margin),
      height: Math.max(640, bounds.maxY + margin),
    }
  }

  function rawBounds(nodes: ViewNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
    return nodes.reduce(
      (bounds, node) => ({
        minX: Math.min(bounds.minX, node.x),
        minY: Math.min(bounds.minY, node.y),
        maxX: Math.max(bounds.maxX, node.x + node.width),
        maxY: Math.max(bounds.maxY, node.y + node.height),
      }),
      { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 },
    )
  }

  function nodeCenter(node: ViewNode): Point {
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
  }

  function deterministicOffset(input: string, spread: number): number {
    let hash = 0
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 31 + input.charCodeAt(index)) >>> 0
    }

    return (hash % (spread * 2 + 1)) - spread
  }

  function relationshipCurveOffsets(relationships: UmlRelationship[]): Map<number, number> {
    const grouped = new Map<string, number[]>()

    relationships.forEach((relationship, index) => {
      const key = [relationship.from, relationship.to].sort().join("::")
      grouped.set(key, [...(grouped.get(key) ?? []), index])
    })

    const offsets = new Map<number, number>()
    for (const indexes of grouped.values()) {
      for (const [position, relationshipIndex] of indexes.entries()) {
        const relationship = relationships[relationshipIndex]
        const direction = relationship.from <= relationship.to ? 1 : -1
        const baseOffset = (position - (indexes.length - 1) / 2) * 116
        const fanOffset = deterministicOffset(`${relationship.from}:${relationship.to}`, 52)
        offsets.set(relationshipIndex, baseOffset + direction * fanOffset)
      }
    }

    return offsets
  }

  function relationshipPortOffsets(
    relationships: UmlRelationship[],
    nodeById: Map<string, ViewNode>,
  ): Map<number, { source: number; target: number }> {
    const buckets = new Map<string, Array<{ index: number; endpoint: "source" | "target" }>>()

    relationships.forEach((relationship, index) => {
      const from = nodeById.get(relationship.from)
      const to = nodeById.get(relationship.to)
      if (!from || !to) return

      const sourceSide = connectionSide(from, to)
      const targetSide = connectionSide(to, from)
      const sourceKey = `${relationship.from}:${sourceSide}`
      const targetKey = `${relationship.to}:${targetSide}`

      buckets.set(sourceKey, [...(buckets.get(sourceKey) ?? []), { index, endpoint: "source" }])
      buckets.set(targetKey, [...(buckets.get(targetKey) ?? []), { index, endpoint: "target" }])
    })

    const result = new Map<number, { source: number; target: number }>()
    for (const [key, entries] of buckets.entries()) {
      entries.sort((a, b) => {
        const aRel = relationships[a.index]
        const bRel = relationships[b.index]
        return `${aRel.from}:${aRel.to}:${aRel.id}`.localeCompare(`${bRel.from}:${bRel.to}:${bRel.id}`)
      })
      const side = key.split(":").at(-1) ?? "right"
      const spacing = side === "left" || side === "right" ? 30 : 42

      for (const [position, entry] of entries.entries()) {
        const offset = (position - (entries.length - 1) / 2) * spacing
        const current = result.get(entry.index) ?? { source: 0, target: 0 }
        current[entry.endpoint] = offset
        result.set(entry.index, current)
      }
    }

    return result
  }

  function connectionSide(from: ViewNode, to: ViewNode): "left" | "right" | "top" | "bottom" {
    const fromCenter = nodeCenter(from)
    const toCenter = nodeCenter(to)
    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? "right" : "left"
    }

    return dy >= 0 ? "bottom" : "top"
  }

  function curvedPath(source: Point, target: Point, id: string, curveOffset: number): string {
    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.max(120, Math.hypot(dx, dy))
    const bend = deterministicOffset(id, 54) + curveOffset
    const normal = normalize({ x: -dy, y: dx })
    const curve = Math.min(280, distance * 0.42)
    const c1 = {
      x: source.x + dx * 0.35 + normal.x * bend,
      y: source.y + dy * 0.08 + normal.y * bend,
    }
    const c2 = {
      x: target.x - dx * 0.35 + normal.x * bend,
      y: target.y - dy * 0.08 + normal.y * bend,
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      c1.x = source.x + Math.sign(dx || 1) * curve
      c2.x = target.x - Math.sign(dx || 1) * curve
    } else {
      c1.y = source.y + Math.sign(dy || 1) * curve
      c2.y = target.y - Math.sign(dy || 1) * curve
    }

    return `M ${source.x} ${source.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${target.x} ${target.y}`
  }

  function curveLabel(source: Point, target: Point, id: string, curveOffset: number): Point {
    const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }
    const normal = normalize({ x: source.y - target.y, y: target.x - source.x })
    const offset = 30 + curveOffset * 0.72 + deterministicOffset(id, 18)
    return { x: midpoint.x + normal.x * offset, y: midpoint.y + normal.y * offset }
  }

  function normalize(point: Point): Point {
    const length = Math.hypot(point.x, point.y)
    return length === 0 ? { x: 0, y: 1 } : { x: point.x / length, y: point.y / length }
  }

  function getNodeHeight(element: UmlElement): number {
    const attributeRows = Math.min(element.attributes?.length ?? 0, 5)
    const operationRows = Math.min(element.operations?.length ?? 0, 4)
    const literalRows = Math.min(element.literals?.length ?? 0, 5)
    const responsibilityRows = Math.min(element.responsibilities?.length ?? 0, 3)
    const summaryRows = element.summary ? 2 : 0
    return Math.max(
      112,
      58 + summaryRows * 18 + responsibilityRows * 18 + attributeRows * 20 + operationRows * 20 +
        literalRows * 20,
    )
  }

  function edgePoint(from: ViewNode, to: ViewNode, portOffset = 0): Point {
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y
    const halfWidth = from.width / 2
    const halfHeight = from.height / 2

    if (Math.abs(dx) / halfWidth > Math.abs(dy) / halfHeight) {
      const maxOffset = Math.max(0, halfHeight - 24)
      return {
        x: fromCenter.x + Math.sign(dx || 1) * halfWidth,
        y: fromCenter.y + clamp(dy * (halfWidth / Math.max(Math.abs(dx), 1)) + portOffset, -maxOffset, maxOffset),
      }
    }

    const maxOffset = Math.max(0, halfWidth - 24)
    return {
      x: fromCenter.x + clamp(dx * (halfHeight / Math.max(Math.abs(dy), 1)) + portOffset, -maxOffset, maxOffset),
      y: fromCenter.y + Math.sign(dy || 1) * halfHeight,
    }
  }

  function markerId(kind: string): string {
    if (kind === "inheritance" || kind === "realization") return "marker-triangle"
    if (kind === "aggregation") return "marker-diamond"
    if (kind === "composition") return "marker-diamond-filled"
    return "marker-arrow"
  }

  function lineDash(kind: string): string | undefined {
    return kind === "dependency" || kind === "realization" ? "8 6" : undefined
  }

  function nodeTone(element: UmlElement): string {
    if (element.kind === "interface" || element.kind === "type" || element.kind === "enum") return "contract"
    if (element.kind === "note" || element.id.includes(".json") || element.id.includes(".html")) return "artifact"
    if (element.kind === "module" || element.id.endsWith(".js")) return "module"
    return "component"
  }

  function shortMember(member: { name: string; type?: string; returns?: string }): string {
    if ("returns" in member && member.returns) return `${member.name}(): ${member.returns}`
    return member.type ? `${member.name}: ${member.type}` : member.name
  }

  function visibleMembers<T>(items: T[] | undefined, count: number): T[] {
    return (items ?? []).slice(0, count)
  }

  function zoomAtCenter(factor: number): void {
    const rect = viewport.getBoundingClientRect()
    const center = { x: rect.width / 2, y: rect.height / 2 }
    pan = {
      x: center.x - (center.x - pan.x) * factor,
      y: center.y - (center.y - pan.y) * factor,
    }
    zoom = clamp(zoom * factor, 0.25, 2.5)
  }

  function resetView(): void {
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    const nextZoom = Math.min(
      1.25,
      Math.max(0.25, Math.min((rect.width - 48) / layout.width, (rect.height - 48) / layout.height)),
    )
    zoom = nextZoom
    pan = {
      x: (rect.width - layout.width * nextZoom) / 2,
      y: (rect.height - layout.height * nextZoom) / 2,
    }
  }

  function startPan(event: PointerEvent): void {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(".toolbar, .legend, .title-panel")) {
      return
    }

    isPanning = true
    activePointerId = event.pointerId
    lastPointer = { x: event.clientX, y: event.clientY }
    viewport.setPointerCapture(event.pointerId)
  }

  function movePan(event: PointerEvent): void {
    if (!isPanning) return

    pan = {
      x: pan.x + event.clientX - lastPointer.x,
      y: pan.y + event.clientY - lastPointer.y,
    }
    lastPointer = { x: event.clientX, y: event.clientY }
  }

  function endPan(event: PointerEvent): void {
    isPanning = false
    releasePanPointer(event.pointerId)
  }

  function releasePanPointer(pointerId = activePointerId): void {
    if (pointerId !== null && viewport?.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId)
    }
    activePointerId = null
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault()
    const rect = viewport.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const factor = event.deltaY > 0 ? 0.92 : 1.08
    const nextZoom = clamp(zoom * factor, 0.25, 2.5)
    const realFactor = nextZoom / zoom
    pan = {
      x: point.x - (point.x - pan.x) * realFactor,
      y: point.y - (point.y - pan.y) * realFactor,
    }
    zoom = nextZoom
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function relationshipLabel(link: ViewLink): string {
    return link.label ?? link.kind
  }

  function activeHighlightNodeId(
    nodes: ViewNode[],
    pinnedId: string | null,
    hoveredId: string | null,
  ): string | null {
    const nodeIds = new Set(nodes.map((node) => node.id))
    if (pinnedId && nodeIds.has(pinnedId)) return pinnedId
    if (hoveredId && nodeIds.has(hoveredId)) return hoveredId
    return null
  }

  function pinHighlight(event: MouseEvent, nodeId: string): void {
    event.stopPropagation()
    ignoreNextCanvasDoubleClick = false
    pinnedNodeId = nodeId
  }

  function pinHighlightOnSecondPress(event: MouseEvent | PointerEvent, nodeId: string): void {
    if (event.detail < 2) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    ignoreNextCanvasDoubleClick = true
    pinnedNodeId = nodeId
    isPanning = false
    releasePanPointer()
  }

  function pinHighlightFromKeyboard(event: KeyboardEvent, nodeId: string): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    pinnedNodeId = nodeId
  }

  function clearPinnedHighlight(event: MouseEvent): void {
    if (ignoreNextCanvasDoubleClick) {
      ignoreNextCanvasDoubleClick = false
      return
    }

    const target = event.target instanceof Element ? event.target : null
    if (target?.closest(".diagram-node, .toolbar, .legend, .title-panel")) {
      return
    }

    pinnedNodeId = null
  }

  function highlightedLinks(links: ViewLink[], nodeId: string | null): Set<string> {
    const highlighted = new Set<string>()

    if (!nodeId) {
      return highlighted
    }

    for (const link of links) {
      if (link.from === nodeId) {
        highlighted.add(link.id)
      }
    }

    const visitIncoming = (targetId: string, visited: Set<string>): void => {
      if (visited.has(targetId)) return
      visited.add(targetId)

      for (const link of links) {
        if (link.to !== targetId) continue
        highlighted.add(link.id)
        visitIncoming(link.from, visited)
      }
    }

    visitIncoming(nodeId, new Set())
    return highlighted
  }

  function highlightedNodes(links: ViewLink[], nodeId: string | null, linkIds: Set<string>): Set<string> {
    const nodes = new Set<string>()
    if (!nodeId) return nodes

    nodes.add(nodeId)
    for (const link of links) {
      if (!linkIds.has(link.id)) continue
      nodes.add(link.from)
      nodes.add(link.to)
    }

    return nodes
  }
</script>

<svelte:window on:resize={resetView} />

<main
  class:dragging={isPanning}
  class="map-viewport"
  bind:this={viewport}
  on:pointerdown={startPan}
  on:pointermove={movePan}
  on:pointerup={endPan}
  on:pointercancel={endPan}
  on:dblclick={clearPinnedHighlight}
  on:wheel={handleWheel}
>
  {#if diagram}
    <div class="toolbar" aria-label="Diagram controls">
      <div class="theme-control" aria-label="Theme">
        <Palette size={18} strokeWidth={2.4} aria-hidden="true" class="theme-icon" />
        <select aria-label="Choose theme" title="Choose theme" bind:value={theme} on:change={(e) => setTheme(e.currentTarget.value)}>
          {#each themes as t}
            <option value={t.id}>{t.label}</option>
          {/each}
        </select>
      </div>
      <button type="button" aria-label="Zoom in" title="Zoom in" on:click={() => zoomAtCenter(1.18)}>
        <ZoomIn size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Zoom out" title="Zoom out" on:click={() => zoomAtCenter(0.82)}>
        <ZoomOut size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Reset view" title="Reset view" on:click={resetView}>
        <RotateCcw size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>

    <aside class="legend" aria-label="Diagram legend">
      <h2>Legend</h2>
      {#each diagram.legend ?? [] as item}
        <div class="legend-item">
          <span class="legend-swatch" style={`background: ${item.color ?? "#8c8fa1"}`}></span>
          <span>{item.label}</span>
        </div>
      {/each}
      <div class="legend-meta">{layout.nodes.length} elements · {layout.links.length} links</div>
    </aside>

    <section class="title-panel" aria-label="Diagram title">
      <p>{diagram.diagramKind}</p>
      <h1>{diagram.title}</h1>
    </section>

    <div
      class="diagram-world"
      style={`width: ${layout.width}px; height: ${layout.height}px; transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom});`}
    >
      <svg class="links-layer" width={layout.width} height={layout.height} aria-hidden="true">
        <defs>
          <marker id="marker-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8c8fa1"></path>
          </marker>
          <marker id="marker-arrow-highlight" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f05a28"></path>
          </marker>
          <marker id="marker-triangle" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
            <path d="M 1 1 L 11 6 L 1 11 z" fill="#eff1f5" stroke="#8c8fa1" stroke-width="1.6"></path>
          </marker>
          <marker
            id="marker-triangle-highlight"
            markerWidth="12"
            markerHeight="12"
            refX="11"
            refY="6"
            orient="auto"
          >
            <path d="M 1 1 L 11 6 L 1 11 z" fill="#eff1f5" stroke="#f05a28" stroke-width="1.8"></path>
          </marker>
          <marker id="marker-diamond" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto">
            <path d="M 1 7 L 7 1 L 13 7 L 7 13 z" fill="#eff1f5" stroke="#8c8fa1" stroke-width="1.6"></path>
          </marker>
          <marker id="marker-diamond-highlight" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto">
            <path d="M 1 7 L 7 1 L 13 7 L 7 13 z" fill="#eff1f5" stroke="#f05a28" stroke-width="1.8"
            ></path>
          </marker>
          <marker id="marker-diamond-filled" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto">
            <path d="M 1 7 L 7 1 L 13 7 L 7 13 z" fill="#8c8fa1" stroke="#8c8fa1" stroke-width="1.6"></path>
          </marker>
          <marker
            id="marker-diamond-filled-highlight"
            markerWidth="14"
            markerHeight="14"
            refX="13"
            refY="7"
            orient="auto"
          >
            <path d="M 1 7 L 7 1 L 13 7 L 7 13 z" fill="#f05a28" stroke="#f05a28" stroke-width="1.8"></path>
          </marker>
        </defs>

        {#each layout.links as link}
          <g
            class:link-highlighted={highlightedLinkIds.has(link.id)}
            class:link-muted={hasHighlight && !highlightedLinkIds.has(link.id)}
            class="diagram-link"
          >
            <path
              d={link.path}
              stroke-dasharray={lineDash(link.kind)}
              marker-end={`url(#${markerId(link.kind)}${highlightedLinkIds.has(link.id) ? "-highlight" : ""})`}
            ></path>
            <text
              x={link.labelPoint.x}
              y={link.labelPoint.y}
            >
              {relationshipLabel(link)}
            </text>
          </g>
        {/each}
      </svg>

      {#each layout.nodes as node}
        <div
          class={`diagram-node node-${nodeTone(node)}`}
          class:node-highlighted={highlightedNodeIds.has(node.id)}
          class:node-pinned-highlight={pinnedNodeId === node.id}
          class:node-muted={hasHighlight && !highlightedNodeIds.has(node.id)}
          role="button"
          tabindex="0"
          aria-label={`Pin highlight for ${node.name}`}
          style={`left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; min-height: ${node.height}px;`}
          on:pointerenter={() => hoveredNodeId = node.id}
          on:pointerleave={() => hoveredNodeId = hoveredNodeId === node.id ? null : hoveredNodeId}
          on:pointerdown={(event) => pinHighlightOnSecondPress(event, node.id)}
          on:mousedown={(event) => pinHighlightOnSecondPress(event, node.id)}
          on:dblclick={(event) => pinHighlight(event, node.id)}
          on:keydown={(event) => pinHighlightFromKeyboard(event, node.id)}
        >
          <header>
            <p>{node.stereotype ? `«${node.stereotype}»` : node.kind}</p>
            <h3>{node.name}</h3>
          </header>

          {#if node.summary}
            <p class="node-summary">{node.summary}</p>
          {/if}

          {#if node.responsibilities?.length}
            <ul>
              {#each visibleMembers(node.responsibilities, 3) as item}
                <li>{item}</li>
              {/each}
            </ul>
          {/if}

          {#if node.attributes?.length}
            <div class="compartment">
              {#each visibleMembers(node.attributes, 5) as attribute}
                <div>{shortMember(attribute)}</div>
              {/each}
            </div>
          {/if}

          {#if node.operations?.length}
            <div class="compartment">
              {#each visibleMembers(node.operations, 4) as operation}
                <div>{shortMember(operation)}</div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <section class="empty-state">
      <h1>Map data was not found</h1>
      <p>Embed UML JSON in <code>#map-data</code> or set <code>window.MAP_DATA</code>.</p>
    </section>
  {/if}
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
    background: var(--bob-panel-bg);
    color: var(--bob-text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  button {
    font: inherit;
  }

  .map-viewport {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    cursor: grab;
    background-color: var(--bob-panel-bg);
    background-image:
      radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--bob-overlay1) 34%, transparent) 1px, transparent 0);
    background-size: 24px 24px;
    user-select: none;
  }

  .map-viewport.dragging {
    cursor: grabbing;
  }

  .diagram-world {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }

  .links-layer {
    position: absolute;
    inset: 0;
    overflow: visible;
  }

  .diagram-link path {
    fill: none;
    stroke: var(--bob-overlay1);
    stroke-width: 1.8;
    transition:
      opacity 140ms ease,
      stroke 140ms ease,
      stroke-width 140ms ease;
  }

  .diagram-link text {
    paint-order: stroke;
    stroke: var(--bob-panel-bg);
    stroke-width: 5px;
    fill: var(--bob-subtext0);
    font-size: 12px;
    font-weight: 650;
    text-anchor: middle;
    transition:
      opacity 140ms ease,
      fill 140ms ease;
  }

  .diagram-link.link-highlighted path {
    stroke: var(--bob-peach);
    stroke-width: 4;
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--bob-peach) 72%, transparent));
  }

  .diagram-link.link-highlighted text {
    fill: var(--bob-peach);
    font-weight: 800;
  }

  .diagram-link.link-muted {
    opacity: 0.16;
  }

  .diagram-node {
    position: absolute;
    border: 2px solid var(--bob-overlay1);
    border-radius: 8px;
    background: color-mix(in srgb, var(--bob-panel-bg) 96%, var(--bob-text));
    box-shadow: 0 16px 38px color-mix(in srgb, var(--bob-text) 16%);
    cursor: grab;
    overflow: hidden;
    transition:
      opacity 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      transform 140ms ease;
  }

  .map-viewport.dragging .diagram-node {
    cursor: grabbing;
  }

  .diagram-node.node-highlighted {
    border-color: var(--bob-peach);
    box-shadow:
      0 18px 46px color-mix(in srgb, var(--bob-text) 18%),
      0 0 0 3px color-mix(in srgb, var(--bob-peach) 28%),
      0 0 26px color-mix(in srgb, var(--bob-peach) 32%);
  }

  .diagram-node.node-pinned-highlight {
    border-color: color-mix(in srgb, var(--bob-green) 58%, var(--bob-yellow));
    box-shadow:
      0 18px 46px color-mix(in srgb, var(--bob-text) 18%),
      0 0 0 3px color-mix(in srgb, var(--bob-green) 22%, var(--bob-yellow) 18%),
      0 0 28px color-mix(in srgb, var(--bob-green) 28%, var(--bob-yellow) 18%);
  }

  .diagram-node.node-muted {
    opacity: 0.34;
  }

  .diagram-node header {
    padding: 12px 14px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--bob-overlay1) 55%, transparent);
  }

  .diagram-node header p {
    margin: 0 0 4px;
    color: var(--bob-subtext0);
    font-size: 11px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .diagram-node h3 {
    margin: 0;
    color: var(--bob-text);
    font-size: 16px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .node-summary {
    margin: 0;
    padding: 10px 14px;
    color: var(--bob-subtext0);
    font-size: 12px;
    line-height: 1.4;
  }

  .diagram-node ul {
    margin: 0;
    padding: 2px 14px 10px 30px;
    color: var(--bob-subtext0);
    font-size: 12px;
    line-height: 1.35;
  }

  .compartment {
    border-top: 1px solid color-mix(in srgb, var(--bob-overlay1) 55%, transparent);
    padding: 8px 14px;
    color: var(--bob-accent);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }

  .node-component {
    border-color: var(--bob-blue);
  }

  .node-contract {
    border-color: var(--bob-green);
  }

  .node-module {
    border-color: var(--bob-mauve);
  }

  .node-artifact {
    border-color: var(--bob-yellow);
  }

  .toolbar {
    position: fixed;
    z-index: 20;
    top: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar button {
    display: grid;
    place-items: center;
    width: 38px;
    min-width: 38px;
    height: 34px;
    border: 1px solid var(--bob-overlay1);
    border-radius: 6px;
    background: color-mix(in srgb, var(--bob-surface-dim) 94%, var(--bob-text));
    color: var(--bob-text);
    font-size: 14px;
    font-weight: 750;
    cursor: pointer;
  }

  .toolbar button:hover {
    background: var(--bob-surface0);
  }

  .theme-control {
    position: relative;
    display: flex;
    align-items: center;
    height: 34px;
    padding: 0 8px 0 10px;
    border: 1px solid var(--bob-overlay1);
    border-radius: 6px;
    background: color-mix(in srgb, var(--bob-surface-dim) 94%, var(--bob-text));
    color: var(--bob-text);
    cursor: pointer;
  }

  .theme-control:hover {
    background: var(--bob-surface0);
  }

  .theme-control :global(.theme-icon) {
    flex: none;
    margin-right: 6px;
    color: var(--bob-subtext0);
    pointer-events: none;
  }

  .theme-control select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    width: auto;
    min-width: 80px;
    max-width: 160px;
    padding-right: 18px;
    border: 0;
    background: transparent;
    color: var(--bob-text);
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    outline: none;
    text-overflow: ellipsis;
  }

  .theme-control::after {
    content: "";
    position: absolute;
    right: 9px;
    top: 50%;
    width: 0;
    height: 0;
    margin-top: -2px;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid var(--bob-subtext0);
    pointer-events: none;
  }

  .legend,
  .title-panel {
    position: fixed;
    z-index: 20;
    border: 1px solid var(--bob-overlay1);
    border-radius: 8px;
    background: color-mix(in srgb, var(--bob-surface-dim) 94%, var(--bob-text));
    box-shadow: 0 12px 34px color-mix(in srgb, var(--bob-text) 16%);
  }

  .legend {
    left: 14px;
    bottom: 14px;
    min-width: 190px;
    padding: 12px 14px;
  }

  .legend h2 {
    margin: 0 0 8px;
    color: var(--bob-text);
    font-size: 13px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--bob-subtext0);
    font-size: 12px;
    line-height: 1.8;
  }

  .legend-swatch {
    width: 11px;
    height: 11px;
    border-radius: 3px;
  }

  .legend-meta {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--bob-overlay1);
    color: var(--bob-subtext0);
    font-size: 12px;
  }

  .title-panel {
    top: 14px;
    left: 14px;
    max-width: min(520px, calc(100vw - 190px));
    padding: 12px 14px;
  }

  .title-panel p {
    margin: 0 0 3px;
    color: var(--bob-accent);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .title-panel h1 {
    margin: 0;
    color: var(--bob-text);
    font-size: 18px;
    line-height: 1.2;
  }

  .empty-state {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    gap: 10px;
    text-align: center;
  }

  .empty-state h1,
  .empty-state p {
    margin: 0;
  }

  .empty-state p {
    color: var(--bob-subtext0);
  }

  @media (max-width: 720px) {
    .title-panel {
      right: 118px;
      max-width: none;
    }

    .legend {
      right: 14px;
      width: auto;
    }
  }
</style>
