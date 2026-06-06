import type { Plan } from "./plan.ts"

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

  if (command === "plan") {
    plan()
  } else if (command === "map") {
    map()
  } else {
    printHelp()
    console.log() // add an empty line
    console.error("Unknown command:", command)
    Deno.exit(1)
  }
}

function plan(): void {
  // TODO read plan from cli
  const plan = JSON.parse(Deno.readTextFileSync("sample.json")) as Plan

  const title = plan.title
  const planJs = Deno.readTextFileSync("plan.js")
  const planCss = Deno.readTextFileSync("plan.css")

  const theme = "catppuccin-latte"
  const themeCss = Deno.readTextFileSync(`./themes/${theme}.css`)

  const html = `<!DOCTYPE html>
  <html lang="en" data-theme="${theme}">
  ${createHtmlHead(title, planCss, themeCss)}
  <body>
    <aside id="sidebar"></aside>
    <main id="content-area"></main>

    <script type="application/json" id="plan-data">
  ${JSON.stringify(plan, null, 2)}
    </script>

    <script>
      window.PLAN_DATA = JSON.parse(document.getElementById("plan-data").textContent);

      ;
      ${planJs}
    </script>
  </body>
  </html>
  `
  Deno.mkdirSync("dist", { recursive: true })
  Deno.writeTextFileSync("dist/plan.html", html)
}

function map() {
  const title = "UML Map"
  const mapJs = readOptionalTextFile("map.js")
  const diagram = {
    schemaVersion: 1,
    id: "placeholder-map",
    title: "UML Diagram Placeholder",
    diagramKind: "class",
    status: "draft",
    summary: [
      "Placeholder map document used until UML JSON input is wired into the CLI.",
    ],
    elements: [],
    relationships: [],
  }
  const html = `<!DOCTYPE html>
<html lang="en">
${createMapHtmlHead(title)}
<body>
  <div id="map-root">
    <main class="map-shell">
    <section class="map-placeholder" aria-label="UML diagram placeholder">
      <p class="eyebrow">bob map</p>
      <h1>UML Diagram Placeholder</h1>
      <p class="summary">The JointJS renderer will mount here once the UML JSON format is wired in.</p>
    </section>
  </main>
  </div>
  <script type="application/json" id="map-data">
${JSON.stringify(diagram, null, 2)}
  </script>
  <script>
    window.MAP_DATA = JSON.parse(document.getElementById("map-data").textContent);
    ${mapJs ?? ""}
  </script>
</body>
</html>
`

  Deno.mkdirSync("dist", { recursive: true })
  Deno.writeTextFileSync("dist/map.html", html)
  console.log("Wrote dist/map.html")
}

function readOptionalTextFile(path: string): string | null {
  try {
    return Deno.readTextFileSync(path)
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null
    }

    throw error
  }
}

function createHtmlHead(title: string, planCss: string, themeCss: string): string {
  return `
    <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <style>${themeCss}</style>
        <style>${planCss}</style>
    </head>
    `
}

function createMapHtmlHead(title: string): string {
  return `
  <head>
    <title>${title}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1220;
        --panel: #111827;
        --border: #334155;
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #38bdf8;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
      }

      body {
        overflow: hidden;
        background: var(--bg);
        color: var(--text);
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
        border: 1px solid var(--border);
        border-radius: 8px;
        background: rgba(17, 24, 39, 0.92);
        padding: 28px;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
      }

      .eyebrow {
        margin: 0 0 10px;
        color: var(--accent);
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
        color: var(--muted);
        font-size: 15px;
        line-height: 1.5;
      }
    </style>
  </head>
  `
}

function printHelp(): void {
  console.log(`bob

Usage:
  bob [command]

Commands:
  help      Show this help text
  version   Show the CLI version
  plan      Render a plan based on the given input
  map       Render a map based on the given input`)
}
