import MapApp from "./MapApp.svelte"
import { mount } from "svelte"
import type { UmlDiagram } from "../../src/uml.ts"

declare global {
  interface Window {
    MAP_DATA?: UmlDiagram
    map?: UmlDiagram
  }
}

function readDiagram(): UmlDiagram | null {
  if (window.MAP_DATA) {
    return window.MAP_DATA
  }

  if (window.map) {
    return window.map
  }

  const mapElement = document.getElementById("map-data")

  if (mapElement?.textContent) {
    return JSON.parse(mapElement.textContent) as UmlDiagram
  }

  return null
}

const target = document.getElementById("map-root")

if (!target) {
  throw new Error("Map content target was not found")
}

target.textContent = ""

mount(MapApp, {
  target,
  props: {
    diagram: readDiagram(),
  },
})
