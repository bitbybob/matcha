# matcha

Deno CLI scaffold that can be compiled into a standalone executable.

## Tasks

```sh
task fmt
task lint
task check
task test
task run -- help
task build
task install
```

The compiled executable is written to `dist/matcha`.

## Usage

```sh
matcha plan --input path/to/plan.json --output "~/clankers/file.html"
matcha map --input path/to/map.json --output "~/clankers/file.html"
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
