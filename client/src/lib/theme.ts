export const defaultTheme = "catppuccin-latte"
export const planThemeStorageKey = "matcha-plan-theme"
export const mapThemeStorageKey = "matcha-map-theme"

export const themes = [
  { id: "catppuccin-latte", label: "Catppuccin Latte" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "dracula", label: "Dracula" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "gruvbox-light", label: "Gruvbox Light" },
  { id: "kanagawa", label: "Kanagawa" },
  { id: "kanagawa-lotus", label: "Kanagawa Lotus" },
  { id: "nord", label: "Nord" },
  { id: "one-dark", label: "One Dark" },
  { id: "one-light", label: "One Light" },
  { id: "rose-pine", label: "Rose Pine" },
  { id: "rose-pine-dawn", label: "Rose Pine Dawn" },
  { id: "solarized", label: "Solarized" },
  { id: "solarized-light", label: "Solarized Light" },
  { id: "terminal", label: "Terminal" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "tokyo-night-day", label: "Tokyo Night Day" },
  { id: "vesper", label: "Vesper" },
] as const

export type ThemeId = (typeof themes)[number]["id"]

export function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}

export function readStoredTheme(storageKey: string): ThemeId {
  try {
    const saved = localStorage.getItem(storageKey)
    if (isThemeId(saved)) {
      return saved
    }
  } catch {
  }

  return defaultTheme
}

export function writeStoredTheme(storageKey: string, theme: ThemeId): void {
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.setAttribute("data-theme", theme)
}
