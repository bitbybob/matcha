const sidebar = document.getElementById("sidebar")
const contentArea = document.getElementById("content-area")
const navButtons = []

sidebar.className = "sidebar"
contentArea.className = "content-area"

function createElement(tagName, className, text) {
  const element = document.createElement(tagName)

  if (className) {
    element.className = className
  }

  if (text !== undefined && text !== null) {
    element.textContent = text
  }

  return element
}

function clearContent() {
  while (contentArea.firstChild) {
    contentArea.removeChild(contentArea.firstChild)
  }
}

function setActiveButton(activeButton) {
  for (let i = 0; i < navButtons.length; i++) {
    const button = navButtons[i]
    button.className = button.dataset.baseClass
  }

  activeButton.className = activeButton.dataset.baseClass + " nav-button-active"
}

function addNavButton(label, onClick, depth) {
  const button = createElement("button", "", label)
  let depthClass = "nav-depth-0"

  if (depth === 1) {
    depthClass = "nav-depth-1"
  }

  if (depth === 2) {
    depthClass = "nav-depth-2"
  }

  button.dataset.baseClass = "nav-button " + depthClass
  button.className = button.dataset.baseClass
  button.addEventListener("click", function () {
    setActiveButton(button)
    onClick()
  })

  navButtons.push(button)
  sidebar.appendChild(button)

  return button
}

function addSidebarHeading(text) {
  const heading = createElement("div", "sidebar-heading", text)
  sidebar.appendChild(heading)
}

function addPageTitle(title, subtitle) {
  const header = createElement("header", "page-header")
  const titleElement = createElement("h1", "page-title", title)
  header.appendChild(titleElement)

  if (subtitle) {
    const subtitleElement = createElement("p", "page-subtitle", subtitle)
    header.appendChild(subtitleElement)
  }

  contentArea.appendChild(header)
}

function addPill(text, parent) {
  const pill = createElement("span", "pill", text)
  parent.appendChild(pill)
}

function addStringList(title, items) {
  if (!items || items.length === 0) {
    return
  }

  const section = createElement("section", "list-section")
  const heading = createElement("h3", "small-heading", title)
  const list = createElement("ul", "item-list")

  section.appendChild(heading)

  for (let i = 0; i < items.length; i++) {
    const item = createElement("li", "list-item", items[i])
    list.appendChild(item)
  }

  section.appendChild(list)
  contentArea.appendChild(section)
}

function addStoryStringList(title, items, parent) {
  if (!items || items.length === 0) {
    return
  }

  const wrapper = createElement("div", "story-list-section")
  const heading = createElement("h4", "small-heading", title)
  const list = createElement("ul", "story-list")

  wrapper.appendChild(heading)

  for (let i = 0; i < items.length; i++) {
    const item = createElement("li", "story-list-item", items[i])
    list.appendChild(item)
  }

  wrapper.appendChild(list)
  parent.appendChild(wrapper)
}

function appendMetadataGrid(metadata) {
  if (!metadata) {
    return
  }

  const keys = Object.keys(metadata)

  if (keys.length === 0) {
    return
  }

  const grid = createElement("dl", "metadata-grid")

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = metadata[key]
    const item = createElement("div", "metadata-card")
    const term = createElement("dt", "metadata-key", key)
    const description = createElement("dd", "metadata-value")

    if (Array.isArray(value)) {
      description.textContent = value.join(", ")
    } else if (value !== null && typeof value === "object") {
      description.textContent = JSON.stringify(value)
    } else if (value !== undefined && value !== null) {
      description.textContent = String(value)
    } else {
      description.textContent = ""
    }

    item.appendChild(term)
    item.appendChild(description)
    grid.appendChild(item)
  }

  contentArea.appendChild(grid)
}

function renderOverview() {
  clearContent()
  addPageTitle(plan.title, plan.project || plan.scope || "")

  const statusRow = createElement("div", "pill-row")
  addPill("schema v" + plan.schemaVersion, statusRow)

  if (plan.status) {
    addPill("status: " + plan.status, statusRow)
  }

  if (plan.generatedAt) {
    addPill("generated: " + plan.generatedAt, statusRow)
  }

  contentArea.appendChild(statusRow)

  if (plan.summary) {
    for (let i = 0; i < plan.summary.length; i++) {
      const paragraph = createElement("p", "summary-paragraph", plan.summary[i])
      contentArea.appendChild(paragraph)
    }
  }

  appendMetadataGrid(plan.metadata)

  if (plan.epics && plan.epics.length > 0) {
    const grid = createElement("section", "overview-grid")

    for (let i = 0; i < plan.epics.length; i++) {
      const epic = plan.epics[i]
      const card = createElement("article", "card")
      const title = createElement("h2", "card-title", epic.id + ": " + epic.title)
      const summary = createElement("p", "card-summary", epic.summary || "")
      const count = createElement("p", "card-meta", epic.stories.length + " stories")

      card.appendChild(title)
      card.appendChild(summary)
      card.appendChild(count)
      grid.appendChild(card)
    }

    contentArea.appendChild(grid)
  }
}

function renderEpic(epicIndex) {
  clearContent()

  const epic = plan.epics[epicIndex]
  addPageTitle(epic.id + ": " + epic.title, epic.summary || "")

  const meta = createElement("div", "pill-row")

  if (epic.status) {
    addPill("status: " + epic.status, meta)
  }

  if (epic.testFocus) {
    addPill("test focus: " + epic.testFocus, meta)
  }

  if (epic.tags) {
    for (let i = 0; i < epic.tags.length; i++) {
      addPill(epic.tags[i], meta)
    }
  }

  contentArea.appendChild(meta)

  for (let i = 0; i < epic.stories.length; i++) {
    renderStoryCard(epic.stories[i])
  }
}

function renderStoryCard(story) {
  const card = createElement("article", "story-card")
  const header = createElement("div", "story-header")
  const title = createElement("h2", "story-title", story.id + ": " + story.title)

  header.appendChild(title)

  if (story.status || story.risk || story.priority) {
    const meta = createElement("div", "pill-row")

    if (story.status) {
      addPill(story.status, meta)
    }

    if (story.risk) {
      addPill("risk: " + story.risk, meta)
    }

    if (story.priority) {
      addPill("priority: " + story.priority, meta)
    }

    header.appendChild(meta)
  }

  card.appendChild(header)

  addStoryStringList("Details", story.details, card)
  addStoryStringList("Acceptance Criteria", story.acceptanceCriteria, card)
  addStoryStringList("Tests", story.unitTests, card)
  addStoryStringList("Dependencies", story.dependencies, card)
  addStoryStringList("Files Likely Touched", story.filesLikelyTouched, card)
  addStoryStringList("Commands To Run", story.commandsToRun, card)
  addStoryStringList("Artifacts", story.artifacts, card)
  addStoryStringList("Notes", story.notes, card)

  contentArea.appendChild(card)
}

function renderSections() {
  clearContent()
  addPageTitle(
    "Sections",
    "Architecture, rules, data models, requirements, and other plan context.",
  )

  if (!plan.sections || plan.sections.length === 0) {
    addEmptyState("No sections are defined.")
    return
  }

  for (let i = 0; i < plan.sections.length; i++) {
    renderSection(plan.sections[i])
  }
}

function renderSection(section) {
  const card = createElement("article", "card section-card")
  const title = createElement("h2", "card-title", section.title)
  const kind = createElement("p", "card-meta", section.kind)

  card.appendChild(title)
  card.appendChild(kind)

  if (section.summary) {
    for (let i = 0; i < section.summary.length; i++) {
      const paragraph = createElement("p", "card-summary", section.summary[i])
      card.appendChild(paragraph)
    }
  }

  if (section.items) {
    const list = createElement("div", "section-item-list")

    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i]
      const itemCard = createElement("div", "nested-card")

      if (item.title) {
        const itemTitle = createElement("h3", "nested-title", item.title)
        itemCard.appendChild(itemTitle)
      }

      const itemText = createElement("p", "nested-text", item.text)
      itemCard.appendChild(itemText)
      list.appendChild(itemCard)
    }

    card.appendChild(list)
  }

  if (section.rows) {
    card.appendChild(createRowsTable(section.columns, section.rows))
  }

  contentArea.appendChild(card)
}

function createRowsTable(columns, rows) {
  const wrapper = createElement("div", "table-wrapper")
  const table = createElement("table", "data-table")
  const thead = createElement("thead")
  const tbody = createElement("tbody")
  let tableColumns = columns

  if (!tableColumns || tableColumns.length === 0) {
    tableColumns = []

    if (rows.length > 0) {
      const keys = Object.keys(rows[0])

      for (let i = 0; i < keys.length; i++) {
        tableColumns.push(keys[i])
      }
    }
  }

  const headRow = createElement("tr")

  for (let i = 0; i < tableColumns.length; i++) {
    const th = createElement("th", "", tableColumns[i])
    headRow.appendChild(th)
  }

  thead.appendChild(headRow)

  for (let i = 0; i < rows.length; i++) {
    const bodyRow = createElement("tr")

    for (let columnIndex = 0; columnIndex < tableColumns.length; columnIndex++) {
      const column = tableColumns[columnIndex]
      const value = rows[i][column]
      const td = createElement("td")

      if (value !== undefined && value !== null) {
        if (typeof value === "object") {
          td.textContent = JSON.stringify(value)
        } else {
          td.textContent = String(value)
        }
      }

      bodyRow.appendChild(td)
    }

    tbody.appendChild(bodyRow)
  }

  table.appendChild(thead)
  table.appendChild(tbody)
  wrapper.appendChild(table)

  return wrapper
}

function renderWorkflows() {
  clearContent()
  addPageTitle("Workflows", "Ordered validation, migration, smoke-test, or rollout steps.")

  if (!plan.workflows || plan.workflows.length === 0) {
    addEmptyState("No workflows are defined.")
    return
  }

  for (let i = 0; i < plan.workflows.length; i++) {
    const workflow = plan.workflows[i]
    const card = createElement("article", "card")
    const title = createElement("h2", "card-title", workflow.title)
    const kind = createElement("p", "card-meta", workflow.kind)
    const list = createElement("ol", "step-list")

    card.appendChild(title)
    card.appendChild(kind)

    for (let stepIndex = 0; stepIndex < workflow.steps.length; stepIndex++) {
      const rawStep = workflow.steps[stepIndex]
      const item = createElement("li", "step-item")
      const stepTitle = createElement("div", "step-title")

      if (typeof rawStep === "string") {
        stepTitle.textContent = String(stepIndex + 1) + ". " + rawStep
      } else {
        stepTitle.textContent = String(stepIndex + 1) + ". " + rawStep.text

        if (rawStep.command) {
          const code = createElement("code", "code-block", rawStep.command)
          item.appendChild(code)
        }
      }

      item.insertBefore(stepTitle, item.firstChild)
      list.appendChild(item)
    }

    card.appendChild(list)
    contentArea.appendChild(card)
  }
}

function renderCommands() {
  clearContent()
  addPageTitle("Commands", "Commands and expected results captured by the plan.")

  if (!plan.commands || plan.commands.length === 0) {
    addEmptyState("No commands are defined.")
    return
  }

  for (let i = 0; i < plan.commands.length; i++) {
    const command = plan.commands[i]
    const card = createElement("article", "card")
    const title = createElement("h2", "card-title", command.title)
    const code = createElement("code", "code-block", command.command)

    card.appendChild(title)

    if (command.workingDirectory) {
      const cwd = createElement("p", "card-summary", "cwd: " + command.workingDirectory)
      card.appendChild(cwd)
    }

    card.appendChild(code)

    if (command.expectedResults) {
      addStoryStringList("Expected Results", command.expectedResults, card)
    }

    contentArea.appendChild(card)
  }
}

function renderRecommendedOrder() {
  clearContent()
  addPageTitle("Recommended Order", "Suggested implementation sequence and rationale.")

  if (!plan.recommendedOrder || plan.recommendedOrder.length === 0) {
    addEmptyState("No recommended order is defined.")
    return
  }

  const list = createElement("ol", "step-list")

  for (let i = 0; i < plan.recommendedOrder.length; i++) {
    const item = plan.recommendedOrder[i]
    const row = createElement("li", "step-item")
    const ref = createElement("div", "step-title", String(i + 1) + ". " + item.ref)
    const reason = createElement("p", "step-text", item.reason || "")

    row.appendChild(ref)
    row.appendChild(reason)
    list.appendChild(row)
  }

  contentArea.appendChild(list)
}

function renderExitCriteria() {
  clearContent()
  addPageTitle("Exit Criteria", "The proof that the whole plan is complete.")
  addStringList("Criteria", plan.exitCriteria)

  if (!plan.exitCriteria || plan.exitCriteria.length === 0) {
    addEmptyState("No exit criteria are defined.")
  }
}

function addEmptyState(text) {
  const empty = createElement("div", "empty-state", text)
  contentArea.appendChild(empty)
}

function buildSidebar() {
  const title = createElement("div", "sidebar-title")
  const appName = createElement("div", "sidebar-app-name", "Plan Browser")
  const planName = createElement("div", "sidebar-plan-name", plan.title)

  title.appendChild(appName)
  title.appendChild(planName)
  sidebar.appendChild(title)

  const overviewButton = addNavButton("Overview", renderOverview, 0)

  addSidebarHeading("Epics")

  if (plan.epics) {
    for (let i = 0; i < plan.epics.length; i++) {
      const epic = plan.epics[i]

      addNavButton(epic.id + ": " + epic.title, function () {
        renderEpic(i)
      }, 1)
    }
  }

  addSidebarHeading("Plan")
  addNavButton("Sections", renderSections, 0)
  addNavButton("Workflows", renderWorkflows, 0)
  addNavButton("Commands", renderCommands, 0)
  addNavButton("Recommended Order", renderRecommendedOrder, 0)
  addNavButton("Exit Criteria", renderExitCriteria, 0)

  setActiveButton(overviewButton)
}

buildSidebar()
renderOverview()
