import { assertSpyCalls, spy } from "jsr:@std/testing@1.0.19/mock"
import { assertThrows } from "jsr:@std/assert@1.0.19/throws"
import { planRead, runCli } from "./mod.ts"
import { renderPlanMarkdown } from "./plan_markdown.ts"
import type { Plan } from "./plan.ts"
import type { UmlDiagram } from "./uml.ts"
import samplePlan from "../sample_plan.json" with { type: "json" }
import sampleMap from "../sample_map.json" with { type: "json" }

Deno.test("prints version", () => {
  using logSpy = spy(console, "log")

  runCli(["version"])

  assertSpyCalls(logSpy, 1)
})

Deno.test("prints LLM usage guide", () => {
  using logSpy = spy(console, "log")

  runCli(["usage"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string") {
    throw new Error("Expected usage output to be a string")
  }

  for (
    const expected of [
      "matcha usage for LLMs",
      "matcha plan --input path/to/plan.json --output path/to/plan.html",
      "matcha map --input path/to/map.json --output path/to/map.html",
      "matcha plan read path/to/plan.json",
      "matcha plan read path/to/plan.html",
      "Plan input format:",
      "Map input format:",
      "The JSON object must follow this compact plan format:",
      "The JSON object must follow this compact UML diagram format:",
      "To read an existing plan as Markdown",
      "No --output option exists for plan read",
      "Reading plans as Markdown:",
    ]
  ) {
    if (!output.includes(expected)) {
      throw new Error(`Expected usage output to include: ${expected}`)
    }
  }
})

Deno.test("prints help with plan read subcommand", () => {
  using logSpy = spy(console, "log")

  runCli(["help"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string") {
    throw new Error("Expected help output to be a string")
  }

  for (
    const expected of [
      "plan read <path>",
      "Print a matcha plan as Markdown to stdout",
      "matcha plan --help",
      "matcha map --help",
      "help, --help, -h",
    ]
  ) {
    if (!output.includes(expected)) {
      throw new Error(`Expected help output to include: ${expected}`)
    }
  }
})

Deno.test("root --help prints help", () => {
  using logSpy = spy(console, "log")

  runCli(["--help"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string" || !output.includes("matcha plan --help")) {
    throw new Error("Expected root --help output to reference subcommand help")
  }
})

Deno.test("root -h prints help", () => {
  using logSpy = spy(console, "log")

  runCli(["-h"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string" || !output.includes("matcha map --help")) {
    throw new Error("Expected root -h output to reference subcommand help")
  }
})

Deno.test("plan --help prints plan help", () => {
  using logSpy = spy(console, "log")

  runCli(["plan", "--help"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string") {
    throw new Error("Expected plan help output to be a string")
  }

  for (
    const expected of [
      "matcha plan",
      "Render a plan JSON file",
      "Plan input format:",
      "The JSON object must follow this compact plan format:",
      "matcha plan read <path>",
      "-i, --input <path>",
      "-o, --output <path>",
    ]
  ) {
    if (!output.includes(expected)) {
      throw new Error(`Expected plan help output to include: ${expected}`)
    }
  }
})

Deno.test("plan -h prints plan help", () => {
  using logSpy = spy(console, "log")

  runCli(["plan", "-h"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string" || !output.includes("Plan input format:")) {
    throw new Error("Expected plan -h output to include plan format guide")
  }
})

Deno.test("map --help prints map help", () => {
  using logSpy = spy(console, "log")

  runCli(["map", "--help"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string") {
    throw new Error("Expected map help output to be a string")
  }

  for (
    const expected of [
      "matcha map",
      "Render a UML-style map",
      "Map input format:",
      "The JSON object must follow this compact UML diagram format:",
      "-i, --input <path>",
      "-o, --output <path>",
    ]
  ) {
    if (!output.includes(expected)) {
      throw new Error(`Expected map help output to include: ${expected}`)
    }
  }
})

Deno.test("map -h prints map help", () => {
  using logSpy = spy(console, "log")

  runCli(["map", "-h"])

  assertSpyCalls(logSpy, 1)

  const output = logSpy.calls[0].args[0]

  if (typeof output !== "string" || !output.includes("Map input format:")) {
    throw new Error("Expected map -h output to include map format guide")
  }
})

Deno.test("sample plan matches Plan type", () => {
  const sample = samplePlan as Plan

  if (sample.epics?.length !== 10) {
    throw new Error("Expected sample plan to contain 10 epics")
  }
})

Deno.test("sample map matches UML diagram type", () => {
  const sample = sampleMap as UmlDiagram

  if (sample.elements.length === 0) {
    throw new Error("Expected sample map to contain elements")
  }

  if (sample.relationships.length === 0) {
    throw new Error("Expected sample map to contain relationships")
  }
})

Deno.test({
  name: "plan command writes the requested input to the requested output",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/custom-plan.json`
      const output = `${tempDir}/nested/plan.html`
      const plan = {
        ...(samplePlan as Plan),
        title: "Custom Plan Fixture",
      }

      Deno.writeTextFileSync(input, JSON.stringify(plan))
      runCli(["plan", "--input", input, "--output", output])

      const html = Deno.readTextFileSync(output)

      if (!html.includes("Custom Plan Fixture")) {
        throw new Error("Expected generated plan HTML to include the custom plan title")
      }

      if (!html.includes("window.PLAN_DATA")) {
        throw new Error("Expected generated plan HTML to include plan data")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan html escapes script-like substrings in embedded json",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/custom-plan.json`
      const output = `${tempDir}/plan.html`
      const plan = {
        ...(samplePlan as Plan),
        title: "</script><script>alert(1)</script>",
      }

      Deno.writeTextFileSync(input, JSON.stringify(plan))
      runCli(["plan", "--input", input, "--output", output])

      const html = Deno.readTextFileSync(output)
      const scriptMatch = html.match(
        /<script[^>]*?id=["']plan-data["'][^>]*?>([\s\S]*?)<\/script>/i,
      )

      if (!scriptMatch) {
        throw new Error("Expected plan-data script in generated HTML")
      }

      const embeddedJson = scriptMatch[1].trim()

      if (embeddedJson.includes("</script><script>alert(1)</script>")) {
        throw new Error("Expected raw script-like title to be escaped in embedded JSON")
      }

      if (
        !embeddedJson.includes(
          "\\u003c/script\u003e\\u003cscript\u003ealert(1)\\u003c/script\u003e",
        )
      ) {
        throw new Error("Expected escaped script-like title in embedded JSON")
      }

      using logSpy = spy(console, "log")
      runCli(["plan", "read", output])

      assertSpyCalls(logSpy, 1)

      const markdown = logSpy.calls[0].args[0]

      if (typeof markdown !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!markdown.includes("</script><script>alert(1)</script>")) {
        throw new Error("Expected escaped title to round-trip back to original text in Markdown")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "map command writes the requested input to the requested output",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/custom-map.json`
      const output = `${tempDir}/nested/map.html`
      const diagram = {
        ...(sampleMap as UmlDiagram),
        title: "Custom Map Fixture",
      }

      Deno.writeTextFileSync(input, JSON.stringify(diagram))
      runCli(["map", `--input=${input}`, `--output=${output}`])

      const html = Deno.readTextFileSync(output)

      if (!html.includes("Custom Map Fixture")) {
        throw new Error("Expected generated map HTML to include the custom map title")
      }

      if (!html.includes("window.MAP_DATA")) {
        throw new Error("Expected generated map HTML to include map data")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "output path expands a quoted tilde",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()
    const originalHome = Deno.env.get("HOME")

    try {
      const input = `${tempDir}/custom-plan.json`
      const expectedOutput = `${tempDir}/clankers/file.html`
      const plan = {
        ...(samplePlan as Plan),
        title: "Tilde Output Fixture",
      }

      Deno.env.set("HOME", tempDir)
      Deno.writeTextFileSync(input, JSON.stringify(plan))
      runCli(["plan", "--input", input, "--output", "~/clankers/file.html"])

      const html = Deno.readTextFileSync(expectedOutput)

      if (!html.includes("Tilde Output Fixture")) {
        throw new Error("Expected generated HTML to be written under the expanded home directory")
      }
    } finally {
      if (originalHome === undefined) {
        Deno.env.delete("HOME")
      } else {
        Deno.env.set("HOME", originalHome)
      }

      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read prints Markdown for JSON input to stdout",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const plan = {
        ...(samplePlan as Plan),
        title: "Read Markdown Fixture",
      }

      Deno.writeTextFileSync(input, JSON.stringify(plan))

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!output.startsWith("# Read Markdown Fixture")) {
        throw new Error("Expected Markdown to start with the plan title")
      }

      if (!output.includes("## Epics")) {
        throw new Error("Expected Markdown to include epics section")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read is stdout only and does not create files",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const plan = {
        ...(samplePlan as Plan),
        title: "Stdout Only Fixture",
      }

      Deno.writeTextFileSync(input, JSON.stringify(plan))

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (output.includes("Wrote ")) {
        throw new Error("Expected no write confirmation in stdout output")
      }

      const entries = Array.from(Deno.readDirSync(tempDir))

      if (entries.length !== 1) {
        throw new Error(
          `Expected no extra files created by plan read, found ${entries.length} entries`,
        )
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read extracts plan from generated HTML",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const output = `${tempDir}/plan.html`
      const plan = {
        ...(samplePlan as Plan),
        title: "HTML Read Fixture",
      }

      Deno.writeTextFileSync(input, JSON.stringify(plan))
      runCli(["plan", "--input", input, "--output", output])

      using logSpy = spy(console, "log")
      runCli(["plan", "read", output])

      assertSpyCalls(logSpy, 1)

      const markdown = logSpy.calls[0].args[0]

      if (typeof markdown !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!markdown.includes("# HTML Read Fixture")) {
        throw new Error("Expected Markdown to include the plan title from HTML")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read end-to-end with a small fixture plan",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const plan = {
        schemaVersion: 1,
        id: "e2e-fixture",
        title: "End-to-End Fixture",
        epics: [
          {
            id: "E1",
            title: "Fixture Epic",
            stories: [
              {
                id: "E1.S1",
                title: "Fixture Story",
              },
            ],
          },
        ],
      } as Plan

      Deno.writeTextFileSync(input, JSON.stringify(plan))

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      for (
        const expected of [
          "# End-to-End Fixture",
          "## Epics",
          "### E1: Fixture Epic",
          "#### Stories",
          "##### E1.S1: Fixture Story",
        ]
      ) {
        if (!output.includes(expected)) {
          throw new Error(`Expected Markdown to include: ${expected}`)
        }
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read end-to-end from generated HTML with a small fixture",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const output = `${tempDir}/plan.html`
      const plan = {
        schemaVersion: 1,
        id: "html-fixture",
        title: "HTML End-to-End Fixture",
        epics: [
          {
            id: "E1",
            title: "HTML Epic",
            stories: [
              {
                id: "E1.S1",
                title: "HTML Story",
              },
            ],
          },
        ],
      } as Plan

      Deno.writeTextFileSync(input, JSON.stringify(plan))
      runCli(["plan", "--input", input, "--output", output])

      using logSpy = spy(console, "log")
      runCli(["plan", "read", output])

      assertSpyCalls(logSpy, 1)

      const markdown = logSpy.calls[0].args[0]

      if (typeof markdown !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      for (
        const expected of [
          "# HTML End-to-End Fixture",
          "### E1: HTML Epic",
          "##### E1.S1: HTML Story",
        ]
      ) {
        if (!markdown.includes(expected)) {
          throw new Error(`Expected Markdown to include: ${expected}`)
        }
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read rejects HTML without embedded plan data",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/page.html`
      Deno.writeTextFileSync(
        input,
        `<!DOCTYPE html>
        <html>
          <body>
            <p>no plan here</p>
          </body>
        </html>
        `,
      )

      assertThrows(
        () => planRead([input]),
        Error,
        `Unsupported input: ${input}`,
      )
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read tolerates whitespace inside embedded plan-data script",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.html`
      const plan = {
        ...(samplePlan as Plan),
        title: "Whitespace Script Fixture",
      }
      const json = JSON.stringify(plan, null, 2)

      Deno.writeTextFileSync(
        input,
        `<!DOCTYPE html>
        <html>
          <head><title>Plan</title></head>
          <body>
            <script type="application/json" id="plan-data">
${json}
            </script>
          </body>
        </html>
        `,
      )

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!output.startsWith("# Whitespace Script Fixture")) {
        throw new Error("Expected Markdown to start with the plan title")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read missing path throws usage error",
  fn() {
    assertThrows(
      () => planRead([]),
      Error,
      "Usage: matcha plan read",
    )
  },
})

Deno.test({
  name: "plan read rejects extra arguments",
  fn() {
    assertThrows(
      () => planRead(["a.json", "b.json"]),
      Error,
      "Usage: matcha plan read",
    )
  },
})

Deno.test({
  name: "plan read rejects flags because it is stdout-only",
  fn() {
    assertThrows(
      () => planRead(["--output", "out.md"]),
      Error,
      "Usage: matcha plan read",
    )
  },
})

Deno.test({
  name: "plan read reports invalid json with the input path",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/bad.json`
      Deno.writeTextFileSync(input, "{not valid json")

      assertThrows(
        () => planRead([input]),
        Error,
        `Invalid JSON in ${input}`,
      )
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read reports missing file with the input path",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()
    const input = `${tempDir}/does-not-exist.json`

    try {
      assertThrows(
        () => planRead([input]),
        Error,
        `Cannot read ${input}`,
      )
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read keeps stdout empty on failure",
  permissions: { read: true, write: true },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/bad.json`
      Deno.writeTextFileSync(input, "{not valid json")

      using logSpy = spy(console, "log")

      assertThrows(
        () => planRead([input]),
        Error,
        `Invalid JSON in ${input}`,
      )

      assertSpyCalls(logSpy, 0)
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read detects json with leading whitespace",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const plan = {
        ...(samplePlan as Plan),
        title: "Whitespace JSON Fixture",
      }

      Deno.writeTextFileSync(input, `\n\n${JSON.stringify(plan)}`)

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!output.startsWith("# Whitespace JSON Fixture")) {
        throw new Error("Expected Markdown to start with the plan title")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read expands a quoted tilde input path",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()
    const originalHome = Deno.env.get("HOME")

    try {
      const plan = {
        ...(samplePlan as Plan),
        title: "Tilde Read Fixture",
      }

      Deno.env.set("HOME", tempDir)
      Deno.mkdirSync(`${tempDir}/clankers`, { recursive: true })
      Deno.writeTextFileSync(
        `${tempDir}/clankers/plan.json`,
        JSON.stringify(plan),
      )

      using logSpy = spy(console, "log")
      runCli(["plan", "read", "~/clankers/plan.json"])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!output.startsWith("# Tilde Read Fixture")) {
        throw new Error("Expected Markdown to start with the plan title")
      }
    } finally {
      if (originalHome === undefined) {
        Deno.env.delete("HOME")
      } else {
        Deno.env.set("HOME", originalHome)
      }

      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test("renderPlanMarkdown is pure and starts with title", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "minimal",
    title: "Minimal Plan",
  } as Plan)

  if (!markdown.startsWith("# Minimal Plan")) {
    throw new Error("Expected Markdown to start with the plan title")
  }

  if (markdown.includes("\n\n\n")) {
    throw new Error("Expected no excessive repeated blank lines")
  }
})

Deno.test("renderPlanMarkdown normalizes final newline", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "newline",
    title: "Newline Plan",
  } as Plan)

  if (!markdown.endsWith("\n")) {
    throw new Error("Expected Markdown to end with a newline")
  }

  if (markdown.endsWith("\n\n")) {
    throw new Error("Expected exactly one trailing newline")
  }
})

Deno.test("renderPlanMarkdown produces deterministic output", () => {
  const plan = {
    schemaVersion: 1,
    id: "deterministic",
    title: "Deterministic Plan",
    metadata: {
      z: 1,
      a: 2,
      m: 3,
    },
  } as Plan

  const first = renderPlanMarkdown(plan)
  const second = renderPlanMarkdown(plan)

  if (first !== second) {
    throw new Error("Expected repeated renderer calls to produce identical output")
  }

  if (!first.includes("- **a:** 2\n- **m:** 3\n- **z:** 1")) {
    throw new Error("Expected metadata keys to render in sorted order")
  }
})

Deno.test({
  name: "plan read produces identical markdown across repeated runs",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const plan = {
        ...(samplePlan as Plan),
        title: "Stable Output Fixture",
      }

      Deno.writeTextFileSync(input, JSON.stringify(plan))

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 2)

      const first = logSpy.calls[0].args[0]
      const second = logSpy.calls[1].args[0]

      if (typeof first !== "string" || typeof second !== "string") {
        throw new Error("Expected both outputs to be strings")
      }

      if (first !== second) {
        throw new Error("Expected repeated plan read runs to produce identical Markdown")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test({
  name: "plan read emits exactly one trailing newline in logged markdown",
  permissions: { read: true, write: true, env: ["HOME", "USERPROFILE"] },
  fn() {
    const tempDir = Deno.makeTempDirSync()

    try {
      const input = `${tempDir}/plan.json`
      const plan = {
        schemaVersion: 1,
        id: "cli-newline",
        title: "CLI Newline Plan",
      } as Plan

      Deno.writeTextFileSync(input, JSON.stringify(plan))

      using logSpy = spy(console, "log")
      runCli(["plan", "read", input])

      assertSpyCalls(logSpy, 1)

      const output = logSpy.calls[0].args[0]

      if (typeof output !== "string") {
        throw new Error("Expected plan read output to be a string")
      }

      if (!output.endsWith("\n")) {
        throw new Error("Expected logged Markdown to end with a newline")
      }

      if (output.endsWith("\n\n")) {
        throw new Error("Expected exactly one trailing newline in logged Markdown")
      }
    } finally {
      Deno.removeSync(tempDir, { recursive: true })
    }
  },
})

Deno.test("renderPlanMarkdown omits optional overview fields when absent", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "bare",
    title: "Bare Plan",
  } as Plan)

  for (const section of ["## Scope", "## Summary", "## Metadata", "## Epics"]) {
    if (markdown.includes(section)) {
      throw new Error(`Expected Markdown to omit ${section}`)
    }
  }
})

Deno.test("renderPlanMarkdown renders overview fields", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "overview",
    project: "matcha",
    title: "Overview Plan",
    status: "planned",
    generatedAt: "2026-06-15T12:00:00Z",
    scope: "Test the overview renderer.",
    summary: ["First paragraph.", "Second paragraph."],
  } as Plan)

  for (
    const expected of [
      "# Overview Plan",
      "- **Plan ID:** overview",
      "- **Project:** matcha",
      "- **Status:** planned",
      "- **Generated At:** 2026-06-15T12:00:00Z",
      "- **Schema Version:** 1",
      "## Scope",
      "Test the overview renderer.",
      "## Summary",
      "First paragraph.",
      "Second paragraph.",
    ]
  ) {
    if (!markdown.includes(expected)) {
      throw new Error(`Expected Markdown to include: ${expected}`)
    }
  }
})

Deno.test("renderPlanMarkdown renders metadata without object object", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "metadata",
    title: "Metadata Plan",
    metadata: {
      simple: "value",
      count: 42,
      list: ["a", "b"],
      nested: { key: "val" },
    },
  } as Plan)

  for (
    const expected of [
      "## Metadata",
      "- **count:** 42",
      "- **list:** a, b",
      "- **nested:** key: val",
      "- **simple:** value",
    ]
  ) {
    if (!markdown.includes(expected)) {
      throw new Error(`Expected Markdown to include: ${expected}`)
    }
  }

  if (markdown.includes("[object Object]")) {
    throw new Error("Expected no [object Object] in metadata output")
  }
})

Deno.test("renderPlanMarkdown renders epics and stories with all fields", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "epics",
    title: "Epic Story Plan",
    epics: [
      {
        id: "E1",
        title: "Epic One",
        summary: "Epic summary.",
        status: "in-progress",
        tags: ["cli"],
        testFocus: "Argument parsing",
        dependencies: ["E2"],
        stories: [
          {
            id: "E1.S1",
            title: "Story One",
            status: "planned",
            priority: 1,
            risk: "low",
            owner: "agent",
            estimate: "2h",
            tags: ["parser"],
            dependencies: ["E1.S2"],
            details: ["Detail one."],
            acceptanceCriteria: ["Criterion one."],
            unitTests: ["Test one."],
            filesLikelyTouched: ["src/mod.ts"],
            commandsToRun: ["task test"],
            artifacts: ["dist/matcha"],
            notes: ["Note one."],
          },
        ],
      },
    ],
  } as Plan)

  for (
    const expected of [
      "## Epics",
      "### E1: Epic One",
      "Epic summary.",
      "- **Status:** in-progress",
      "- **Tags:** cli",
      "- **Test Focus:** Argument parsing",
      "- **Dependencies:** E2",
      "#### Stories",
      "##### E1.S1: Story One",
      "- **Status:** planned",
      "- **Priority:** 1",
      "- **Risk:** low",
      "- **Owner:** agent",
      "- **Estimate:** 2h",
      "- **Tags:** parser",
      "- **Dependencies:** E1.S2",
      "**Details:**",
      "Detail one.",
      "**Acceptance Criteria:**",
      "Criterion one.",
      "**Unit Tests:**",
      "Test one.",
      "**Files Likely Touched:**",
      "`src/mod.ts`",
      "**Commands to Run:**",
      "```sh",
      "task test",
      "```",
      "**Artifacts:**",
      "dist/matcha",
      "**Notes:**",
      "Note one.",
    ]
  ) {
    if (!markdown.includes(expected)) {
      throw new Error(`Expected Markdown to include: ${expected}`)
    }
  }
})

Deno.test("renderPlanMarkdown omits empty story optional fields", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "minimal-story",
    title: "Minimal Story Plan",
    epics: [
      {
        id: "E1",
        title: "Epic One",
        stories: [
          {
            id: "E1.S1",
            title: "Story One",
          },
        ],
      },
    ],
  } as Plan)

  for (
    const omitted of [
      "- **Status:**",
      "- **Priority:**",
      "**Details:**",
      "**Acceptance Criteria:**",
      "**Unit Tests:**",
      "**Commands to Run:**",
    ]
  ) {
    if (markdown.includes(omitted)) {
      throw new Error(`Expected Markdown to omit ${omitted}`)
    }
  }

  if (!markdown.includes("##### E1.S1: Story One")) {
    throw new Error("Expected minimal story to still render")
  }
})

Deno.test("renderPlanMarkdown renders section items and tables", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "sections",
    title: "Section Plan",
    sections: [
      {
        id: "rules",
        title: "Rules",
        kind: "rules",
        summary: ["Rule summary."],
        items: [
          {
            title: "One",
            text: "First rule.",
            status: "draft",
            priority: 1,
            tags: ["cli"],
            ref: "E1.S1",
          },
        ],
      },
      {
        id: "arch",
        title: "Architecture",
        kind: "architecture",
        columns: ["component", "responsibility"],
        rows: [
          { component: "Engine", responsibility: "Logic" },
          { component: "UI", responsibility: "Display" },
        ],
      },
    ],
  } as Plan)

  for (
    const expected of [
      "## Sections",
      "### rules: Rules",
      "- **Kind:** rules",
      "Rule summary.",
      "- **One:** First rule. (draft) [priority 1] [cli] (ref: E1.S1)",
      "### arch: Architecture",
      "- **Kind:** architecture",
      "| component | responsibility |",
      "| --- | --- |",
      "| Engine | Logic |",
      "| UI | Display |",
    ]
  ) {
    if (!markdown.includes(expected)) {
      throw new Error(`Expected Markdown to include: ${expected}`)
    }
  }
})

Deno.test("renderPlanMarkdown infers table columns and escapes pipes", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "inferred",
    title: "Inferred Table Plan",
    sections: [
      {
        id: "t",
        title: "Table",
        kind: "rules",
        rows: [
          { a: "one | two", b: "line\nbreak" },
          { b: "only b", a: "only a" },
        ],
      },
    ],
  } as Plan)

  if (!markdown.includes("| a | b |")) {
    throw new Error("Expected inferred columns to be sorted")
  }

  if (!markdown.includes("| one \\| two | line break |")) {
    throw new Error("Expected pipe escaped and newline replaced in table cell")
  }
})

Deno.test("renderPlanMarkdown renders workflows, commands, blockers, order, and exit criteria", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "remainder",
    title: "Remainder Plan",
    workflows: [
      {
        id: "flow",
        title: "Flow",
        kind: "ordered-steps",
        steps: [
          "Simple step.",
          {
            id: "step-2",
            text: "Complex step.",
            command: "task test",
            expectedResults: ["Tests pass."],
            refs: ["E1.S1"],
            status: "planned",
          },
        ],
      },
    ],
    commands: [
      {
        title: "Verify",
        command: "task verify",
        workingDirectory: "~/repos/matcha",
        environment: { HOME: "/tmp" },
        expectedResults: ["Clean diff."],
        refs: ["E5.S4"],
      },
    ],
    blockers: [
      {
        priority: 1,
        area: "Design",
        requiredFix: "Decide CLI shape.",
        status: "planned",
        refs: ["E1.S2"],
      },
    ],
    recommendedOrder: [
      { ref: "E1.S1", reason: "Dispatch first." },
    ],
    exitCriteria: ["All tests pass."],
  } as Plan)

  for (
    const expected of [
      "## Workflows",
      "### flow: Flow",
      "- **Kind:** ordered-steps",
      "**Steps:**",
      "1. Simple step.",
      "2. Complex step. (step-2) (planned)",
      "   ```sh",
      "   task test",
      "   ```",
      "   - Expected: Tests pass.",
      "   - Refs: E1.S1",
      "## Commands",
      "### Verify",
      "- **Working Directory:** `~/repos/matcha`",
      "- **Environment:**",
      "  - HOME=/tmp",
      "```sh",
      "task verify",
      "```",
      "**Expected Results:**",
      "Clean diff.",
      "**Refs:** E5.S4",
      "## Blockers",
      "### Blocker: Design",
      "- **Priority:** 1",
      "- **Required Fix:** Decide CLI shape.",
      "- **Status:** planned",
      "- **Refs:** E1.S2",
      "## Recommended Order",
      "1. **E1.S1**: Dispatch first.",
      "## Exit Criteria",
      "- All tests pass.",
    ]
  ) {
    if (!markdown.includes(expected)) {
      throw new Error(`Expected Markdown to include: ${expected}`)
    }
  }
})

Deno.test("renderPlanMarkdown escapes backticks in inline code", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "escape",
    title: "Escape Plan",
    epics: [
      {
        id: "E1",
        title: "Escape Epic",
        stories: [
          {
            id: "E1.S1",
            title: "Escape Story",
            filesLikelyTouched: ["src/`weird`.ts"],
          },
        ],
      },
    ],
  } as Plan)

  if (!markdown.includes("`src/\\`weird\\`.ts`")) {
    throw new Error("Expected backticks in inline code path to be escaped")
  }
})

Deno.test("renderPlanMarkdown renders a minimal workflow object step", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "minimal-step",
    title: "Minimal Step Plan",
    workflows: [
      {
        id: "flow",
        title: "Flow",
        kind: "ordered-steps",
        steps: [
          {
            text: "Just text.",
          },
        ],
      },
    ],
  } as Plan)

  if (!markdown.includes("1. Just text.")) {
    throw new Error("Expected minimal workflow step to render")
  }

  if (markdown.includes("```sh")) {
    throw new Error("Expected no command block for minimal step")
  }
})

Deno.test("renderPlanMarkdown renders a section item without a title", () => {
  const markdown = renderPlanMarkdown({
    schemaVersion: 1,
    id: "item",
    title: "Item Plan",
    sections: [
      {
        id: "notes",
        title: "Notes",
        kind: "notes",
        items: [
          {
            text: "Plain note.",
          },
        ],
      },
    ],
  } as Plan)

  if (!markdown.includes("- Plain note.")) {
    throw new Error("Expected section item without title to render")
  }

  if (markdown.includes("**undefined**")) {
    throw new Error("Expected no undefined title label")
  }
})
