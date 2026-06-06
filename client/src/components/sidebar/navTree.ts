export function expandGroup(group: Element): void {
  group.classList.remove("nav-tree-collapsed")
  updateDisclosure(group, false)
}

export function collapseGroup(group: Element): void {
  group.classList.add("nav-tree-collapsed")
  updateDisclosure(group, true)
}

export function toggleGroup(group: Element): void {
  if (group.classList.contains("nav-tree-collapsed")) {
    expandGroup(group)
  } else {
    collapseGroup(group)
  }
}

export function updateDisclosure(group: Element, collapsed: boolean): void {
  const disclosureButton = group.querySelector(".nav-disclosure")
  const disclosureIcon = group.querySelector(".disclosure-icon")
  const labelButton = group.querySelector(".nav-tree-label")
  const label = labelButton?.textContent || "group"

  disclosureButton?.setAttribute("aria-expanded", String(!collapsed))
  disclosureButton?.setAttribute("aria-label", (collapsed ? "Expand " : "Collapse ") + label)

  if (disclosureIcon) {
    disclosureIcon.textContent = collapsed ? "+" : "-"
  }
}
