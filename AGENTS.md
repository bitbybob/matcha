# Agent Notes for `matcha`

## What this project is

`matcha` is a Deno CLI that turns structured JSON plans and UML diagrams into self-contained HTML
artifacts. It is also a Svelte/Vite client build that produces the embedded JavaScript bundles the
CLI injects into those HTML files.

## Repository layout

| Path                                       | Purpose                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                              | CLI entrypoint.                                                                                               |
| `src/mod.ts`                               | `runCli` implementation. Dispatches `help`, `version`, `plan`, and `map` commands and writes HTML to `dist/`. |
| `src/plan.ts`                              | TypeScript types for the plan JSON schema.                                                                    |
| `src/uml.ts`                               | TypeScript types for the UML JSON schema.                                                                     |
| `src/mod_test.ts`                          | Deno tests for CLI, plan schema, and UML schema.                                                              |
| `client/`                                  | Svelte/Vite client. Builds `plan.js`/`plan.css` and `map.js`/`map.css`.                                       |
| `client/src/main.ts`                       | Plan client entrypoint; mounts `App.svelte` into `dist/plan.html`.                                            |
| `client/src/map.ts`                        | Map client entrypoint; mounts `MapApp.svelte` into `dist/map.html`.                                           |
| `plan.js`, `plan.css`, `map.js`, `map.css` | Built client artifacts committed at the repo root for the CLI to read.                                        |
| `plan.schema.json`, `uml.schema.json`      | Canonical JSON schemas for the two input formats.                                                             |
| `llm_output_format.txt`                    | Prompt output format for plans.                                                                               |
| `llm_uml_output_format.txt`                | Prompt output format for UML diagrams.                                                                        |
| `sample_plan.json`, `sample_map.json`      | Example inputs used by the CLI and tests.                                                                     |
| `themes/`                                  | Color-theme CSS files (e.g. `catppuccin-latte.css`).                                                          |
| `dist/`                                    | Output directory for generated HTML and compiled binary.                                                      |

## Commands

Use `task` (go-task) for day-to-day work:

```sh
task fmt      # deno fmt
task lint     # deno lint
task check    # deno check src/main.ts
task test     # deno test
task run -- help
task run-plan # writes dist/plan.html from sample_plan.json
task run-map  # writes dist/map.html from sample_map.json
task build    # compile CLI to dist/matcha
task build-client  # npm run build in client/
```

## How data flows

1. The CLI reads a `sample_plan.json` or `sample_map.json` file.
2. It builds a standalone HTML page by inlining:
   - a theme CSS,
   - the matching `plan.css`/`map.css`,
   - the input JSON,
   - the matching `plan.js`/`map.js` bundle.
3. The Svelte bundle reads the inlined JSON from a `<script type="application/json">` tag or
   `window.PLAN_DATA` / `window.MAP_DATA` and renders the UI.

## Important conventions

- Runtime is **Deno**, not Node. Use `deno` tasks and `jsr:` imports.
- The CLI expects `sample_plan.json` and `sample_map.json` in the working directory when running
  `plan`/`map`.
- `deno fmt` / `deno lint` exclude `client/`, `plan.js`, and `map.js`.
- The Svelte client is built in IIFE format so it can run inline in generated HTML.
- Keep the UML format semantic. `JOINTJS_NOTES.md` records JointJS implementation notes; the JSON
  schema stays independent of any diagram library.

## Where to start when changing things

- New CLI command or output behavior: `src/mod.ts`.
- Plan data shape: `src/plan.ts` + `plan.schema.json` + `llm_output_format.txt`.
- UML data shape: `src/uml.ts` + `uml.schema.json` + `llm_uml_output_format.txt`.
- Plan UI: `client/src/App.svelte` and `client/src/components/`.
- Map UI: `client/src/MapApp.svelte` and `client/src/map.ts`.
- Client build output consumed by CLI: `client/package.json` copies `dist/plan.js`, `dist/plan.css`,
  `dist/map.js`, and `dist/map.css` to the repo root.
