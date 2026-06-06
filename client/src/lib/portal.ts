import type { Action } from "svelte/action"

export const portal: Action<HTMLElement, HTMLElement | null> = (node, target) => {
  function update(newTarget: HTMLElement | null) {
    if (newTarget && node.parentNode !== newTarget) {
      newTarget.appendChild(node)
    }
  }

  update(target)

  return {
    update,
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node)
      }
    },
  }
}
