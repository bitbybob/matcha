# Matcha 🍵

Matcha is is a finely ground powder of green tea specially processed from shade-grown tea leaves but its also a CLI.
The Matcha CLI lets your agent output static artifacts like a plan or a map, without having to worry about semi-functional / semi-broken vibe coded UIs.
Furthermore matcha lets you escape the markdown flavoured hellscape that interacting with a clanker has become.

tl;dr: Matcha turns agentic output into human friendly plans & maps.

## Install

```sh
bash -c "$(curl -fsSL https://raw.githubusercontent.com/bitbybob/matcha/main/scripts/setup)"
```

This installs `matcha` to `~/.local/bin`. Set `MATCHA_INSTALL_DIR` to choose a different directory.
It builds from source and expects `zig`, `node`, and `npm` to be available.

## Build and Run

Matcha is now a Zig CLI. Use `task` for day-to-day operations:

```sh
task run -- help
task run-plan        # writes dist/plan.html from sample_plan.json
task run-map         # writes dist/map.html from sample_map.json
task test            # runs Zig unit tests
task build           # builds dist/matcha
```

The Svelte/Vite client remains a separate npm build:

```sh
task build-client
```

`task build-client` produces `plan.js`, `plan.css`, `map.js`, and `map.css` at the repo root. The
Zig CLI injects these assets when rendering HTML output.

## Usage

```sh
matcha plan --input path/to/plan.json --output "~/matcha/file.html"
matcha map --input path/to/map.json --output "~/matcha/file.html"
matcha plan read plan.json
matcha plan read dist/plan.html > plan.md
matcha plan read dist/plan.html | codex
matcha usage
```

Without explicit paths, `matcha plan` reads `sample_plan.json` and writes `dist/plan.html`; `matcha map`
reads `sample_map.json` and writes `dist/map.html`.

`matcha plan read <path>` prints a plan as Markdown to stdout. It accepts canonical plan JSON or a
matcha-generated plan HTML file. The command is stdout-only and has no `--output` option; use shell
redirection or piping to capture or forward the Markdown:

```sh
matcha plan read sample_plan.json > plan.md
matcha plan read dist/plan.html | codex
```

`matcha usage` prints CLI instructions and the expected JSON input formats for LLMs.

To make the compiled CLI available as `matcha`, install it into `~/.local/bin` after building:

```sh
task install
```
