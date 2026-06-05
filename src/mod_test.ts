import { assertSpyCalls, spy } from "jsr:@std/testing/mock"
import { runCli } from "./mod.ts"
import type { Plan } from "./plan.ts"
import samplePlan from "../sample.json" with { type: "json" }

Deno.test("prints version", () => {
  using logSpy = spy(console, "log")

  runCli(["version"])

  assertSpyCalls(logSpy, 1)
})

Deno.test("sample plan matches Plan type", () => {
  const sample = samplePlan as Plan

  if (sample.epics?.length !== 10) {
    throw new Error("Expected sample plan to contain 10 epics")
  }
})
