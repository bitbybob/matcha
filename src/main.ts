import { runCli } from "./mod.ts"

if (import.meta.main) {
  runCli(Deno.args)
}
