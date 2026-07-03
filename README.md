# Matcha 🍵

Matcha is is a finely ground powder of green tea specially processed from shade-grown tea leaves but its also a CLI.
The Matcha CLI lets your agent output static artifacts like a plan or a map, without having to worry about semi-functional / semi-broken vibe coded UIs.
Furthermore matcha lets you escape the markdown flavoured hellscape that interacting with a clanker has become.

tl;dr: Matcha turns agentic output into human friendly plans & maps.

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
