import { renderPlanMarkdown } from "./plan_markdown.ts"
import type { Plan } from "./plan.ts"
import type { UmlDiagram } from "./uml.ts"

const themeNames = [
  "catppuccin-latte",
  "catppuccin",
  "dracula",
  "gruvbox",
  "gruvbox-light",
  "kanagawa",
  "kanagawa-lotus",
  "nord",
  "one-dark",
  "one-light",
  "rose-pine",
  "rose-pine-dawn",
  "solarized",
  "solarized-light",
  "terminal",
  "tokyo-night",
  "tokyo-night-day",
  "vesper",
] as const

class CliError extends Error {}

export function runCli(args: string[]): void {
  const command = args[0]

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  if (command === "version" || command === "--version" || command === "-V") {
    console.log("bob 0.1.0")
    return
  }

  if (command === "usage") {
    printUsageGuide()
    return
  }

  if (command === "plan") {
    const planArgs = args.slice(1)

    if (planArgs[0] === "read") {
      try {
        planRead(planArgs.slice(1))
      } catch (error) {
        if (error instanceof CliError) {
          console.error(error.message)
          Deno.exit(1)
        }

        throw error
      }

      return
    }

    plan(parseRenderOptions(planArgs, {
      defaultInput: "sample_plan.json",
      defaultOutput: "dist/plan.html",
    }))
  } else if (command === "map") {
    map(parseRenderOptions(args.slice(1), {
      defaultInput: "sample_map.json",
      defaultOutput: "dist/map.html",
    }))
  } else {
    printHelp()
    console.log() // add an empty line
    console.error("Unknown command:", command)
    Deno.exit(1)
  }
}

type RenderOptions = {
  input: string
  output: string
}

type RenderDefaults = {
  defaultInput: string
  defaultOutput: string
}

function parseRenderOptions(args: string[], defaults: RenderDefaults): RenderOptions {
  let input = defaults.defaultInput
  let output = defaults.defaultOutput

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]

    if (arg === "--input" || arg === "-i") {
      input = readFlagValue(args, ++index, arg)
      continue
    }

    if (arg.startsWith("--input=")) {
      input = arg.slice("--input=".length)
      continue
    }

    if (arg === "--output" || arg === "-o") {
      output = readFlagValue(args, ++index, arg)
      continue
    }

    if (arg.startsWith("--output=")) {
      output = arg.slice("--output=".length)
      continue
    }

    console.error(`Unknown option: ${arg}`)
    Deno.exit(1)
  }

  return {
    input: expandHomePath(input),
    output: expandHomePath(output),
  }
}

function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index]

  if (!value || value.startsWith("-")) {
    console.error(`Missing value for ${flag}`)
    Deno.exit(1)
  }

  return value
}

function plan(options: RenderOptions): void {
  const plan = JSON.parse(Deno.readTextFileSync(options.input)) as Plan

  const title = plan.title
  const planJs = readAssetTextFile("plan.js")
  const planCss = readAssetTextFile("plan.css")
  const planComponentsCss = readOptionalAssetTextFile("plan-components.css")
  const themeCss = readAllThemeCss()

  const html = `<!DOCTYPE html>
  <html lang="en" data-theme="catppuccin-latte">
  ${createHtmlHead(title, themeCss, planCss, planComponentsCss)}
  <body>
    <aside id="sidebar"></aside>
    <main id="content-area"></main>

    <script type="application/json" id="plan-data">
  ${escapeEmbeddedJson(JSON.stringify(plan, null, 2))}
    </script>

    <script>
      window.PLAN_DATA = JSON.parse(document.getElementById("plan-data").textContent);

      ;
      ${planJs}
    </script>
  </body>
  </html>
  `
  writeHtml(options.output, html)
}

export function planRead(args: string[]): void {
  if (args.length === 0 || args.length > 1 || args[0].startsWith("-")) {
    throw new CliError("Usage: bob plan read <path>")
  }

  const inputPath = expandHomePath(args[0])
  let rawInput: string

  try {
    rawInput = Deno.readTextFileSync(inputPath)
  } catch (error) {
    throw new CliError(`Cannot read ${inputPath}: ${errorMessage(error)}`)
  }

  const plan = parsePlanInput(rawInput, inputPath)
  console.log(renderPlanMarkdown(plan))
}

function parsePlanInput(rawInput: string, inputPath: string): Plan {
  const trimmed = rawInput.trimStart()

  if (trimmed.startsWith("{")) {
    return parsePlanJson(rawInput, inputPath)
  }

  return extractPlanFromHtml(rawInput, inputPath)
}

function parsePlanJson(text: string, inputPath: string): Plan {
  try {
    return JSON.parse(text) as Plan
  } catch (error) {
    throw new CliError(`Invalid JSON in ${inputPath}: ${errorMessage(error)}`)
  }
}

function extractPlanFromHtml(html: string, inputPath: string): Plan {
  const match = html.match(
    /<script[^\u003e]*?id=["']plan-data["'][^\u003e]*?>([\s\S]*?)<\/script>/i,
  )

  if (!match) {
    throw new CliError(
      `Unsupported input: ${inputPath} is not plan JSON or a bob-generated plan HTML file`,
    )
  }

  return parsePlanJson(match[1].trim(), inputPath)
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function map(options: RenderOptions) {
  const mapJs = readOptionalAssetTextFile("map.js")
  const mapCss = readOptionalAssetTextFile("map.css")
  const themeCss = readAllThemeCss()
  const diagram = JSON.parse(
    Deno.readTextFileSync(options.input),
  ) as UmlDiagram
  const title = diagram.title
  const html = `<!DOCTYPE html>
<html lang="en" data-theme="catppuccin-latte">
${createMapHtmlHead(title, themeCss, mapCss)}
<body>
  <div id="map-root"></div>
  <script type="application/json" id="map-data">
${escapeEmbeddedJson(JSON.stringify(diagram, null, 2))}
  </script>
  <script>
    window.MAP_DATA = JSON.parse(document.getElementById("map-data").textContent);
    ${mapJs ?? ""}
  </script>
</body>
</html>
`

  writeHtml(options.output, html)
}

function escapeEmbeddedJson(json: string): string {
  return json.replaceAll("<", "\\u003c")
}

function readAllThemeCss(): string {
  return themeNames.map((name) => readAssetTextFile(`themes/${name}.css`)).join(
    "\n",
  )
}

function readAssetTextFile(path: string): string {
  return Deno.readTextFileSync(new URL(`../${path}`, import.meta.url))
}

function readOptionalAssetTextFile(path: string): string | null {
  try {
    return readAssetTextFile(path)
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null
    }

    throw error
  }
}

function writeHtml(outputPath: string, html: string): void {
  const parentDirectory = getParentDirectory(outputPath)

  if (parentDirectory) {
    Deno.mkdirSync(parentDirectory, { recursive: true })
  }

  Deno.writeTextFileSync(outputPath, html)
  console.log(`Wrote ${outputPath}`)
}

function getParentDirectory(path: string): string | null {
  const lastForwardSlash = path.lastIndexOf("/")
  const lastBackSlash = path.lastIndexOf("\\")
  const lastSeparator = Math.max(lastForwardSlash, lastBackSlash)

  if (lastSeparator <= 0) {
    return null
  }

  return path.slice(0, lastSeparator)
}

function expandHomePath(path: string): string {
  if (path !== "~" && !path.startsWith("~/") && !path.startsWith("~\\")) {
    return path
  }

  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE")

  if (!home) {
    console.error(`Cannot expand ${path}: HOME is not set`)
    Deno.exit(1)
  }

  return path === "~" ? home : `${home}${path.slice(1)}`
}

function createHtmlHead(
  title: string,
  themeCss: string,
  planCss: string,
  planComponentsCss: string | null,
): string {
  return `
    <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        ${createThemeBootScript("bob-plan-theme")}
        <style>${themeCss}</style>
        <style>${planCss}</style>
        ${planComponentsCss ? `<style>${planComponentsCss}</style>` : ""}
    </head>
    `
}

function createMapHtmlHead(
  title: string,
  themeCss: string,
  mapCss: string | null,
): string {
  return `
  <head>
    <title>${title}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${createThemeBootScript("bob-map-theme")}
    <style>${themeCss}</style>
    ${mapCss ? `<style>${mapCss}</style>` : ""}
  </head>
  `
}

function createThemeBootScript(storageKey: "bob-plan-theme" | "bob-map-theme"): string {
  return `<script>
      (function () {
        var themes = new Set(${JSON.stringify(themeNames)});
        try {
          var saved = localStorage.getItem(${JSON.stringify(storageKey)});
          if (themes.has(saved)) {
            document.documentElement.setAttribute("data-theme", saved);
          }
        } catch {
        }
      })();
    </script>`
}

function printUsageGuide(): void {
  const planFormat = readAssetTextFile("llm_output_format.txt").trim()
  const mapFormat = readAssetTextFile("llm_uml_output_format.txt").trim()

  console.log(`bob usage for LLMs

Purpose:
  bob turns structured JSON into self-contained HTML artifacts.
  Use "bob plan" for implementation plans.
  Use "bob map" for semantic UML-style diagrams.

Commands:
  bob plan --input path/to/plan.json --output path/to/plan.html
  bob map --input path/to/map.json --output path/to/map.html
  bob plan read path/to/plan.json          Print Markdown to stdout
  bob plan read path/to/plan.html          Read a bob-generated plan HTML back as Markdown

Defaults:
  bob plan reads sample_plan.json and writes dist/plan.html.
  bob map reads sample_map.json and writes dist/map.html.

Path rules:
  --input is a JSON file matching the selected command format.
  --output is the HTML file to write.
  Parent directories for --output are created automatically.
  Quoted home paths such as "~/clankers/file.html" are expanded by bob.

LLM workflow:
  1. Decide whether the requested artifact is a plan or map.
  2. Produce exactly one valid JSON object matching the format below.
  3. Save that JSON to a file.
  4. Run the matching bob command with --input and --output.
  5. Do not put Markdown fences or commentary in the JSON input file.
  6. To read an existing plan as Markdown, run \`bob plan read <path>\`.
  7. No --output option exists for plan read; redirect stdout (\`> plan.md\`) or pipe it.

Reading plans as Markdown:
  Use \`bob plan read\` when you need to consume an existing plan without parsing JSON or
  scraping rendered HTML. The command is deterministic, offline, and writes to stdout only.

Plan input format:
${indentText(planFormat)}

Map input format:
${indentText(mapFormat)}`)
}

function indentText(text: string): string {
  return text.split("\n").map((line) => `  ${line}`).join("\n")
}

function printHelp(): void {
  console.log(`bob

Usage:
  bob [command] [options]

Commands:
  help      Show this help text
  usage     Explain CLI usage and input formats for LLMs
  version   Show the CLI version
  plan      Render a plan based on the given input
  plan read <path>  Print a bob plan as Markdown to stdout
  map       Render a map based on the given input

Options:
  -i, --input <path>    JSON file to render
  -o, --output <path>   HTML file to write`)
}
