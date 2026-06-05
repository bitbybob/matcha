import type { Plan } from "./plan.ts"

export function runCli(args: string[]): void {
  const [command] = args

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  if (command === "version" || command === "--version" || command === "-V") {
    console.log("bob 0.1.0")
    return
  }

  console.log("bob cli")

  const plan = JSON.parse(Deno.readTextFileSync("sample.json")) as Plan

  console.log(plan.title)

  const planJs = Deno.readTextFileSync("plan.js")
  const planCss = Deno.readTextFileSync("plan.css")

  const html = `<!DOCTYPE html>
  <html lang="en">
  ${createHtmlHead(planCss)}
  <body>
    <aside id="sidebar"></aside>
    <main id="content-area"></main>

    <script type="application/json" id="plan-data">
  ${JSON.stringify(plan, null, 2)}
    </script>

    <script>
      const plan = JSON.parse(document.getElementById("plan-data").textContent)

      ${planJs}
    </script>
  </body>
  </html>
  `
  Deno.writeTextFileSync("dist/plan.html", html)
}

function createHtmlHead(planCss: string): string {
  return `
    <head>
        <meta charset="UTF-8">
        <style>
${planCss}
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
  version   Show the CLI version`)
}
