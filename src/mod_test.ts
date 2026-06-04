import { assertSpyCalls, spy } from "jsr:@std/testing/mock"
import { runCli } from "./mod.ts"

Deno.test("prints version", () => {
  using logSpy = spy(console, "log")

  runCli(["version"])

  assertSpyCalls(logSpy, 1)
})
