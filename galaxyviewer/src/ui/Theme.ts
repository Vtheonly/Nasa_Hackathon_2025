/**
 * Theme — centralised design tokens.
 *
 * Keeping the palette, spacing, and typography in one place makes the
 * viewer trivially re-themeable. The values are exposed both as TypeScript
 * constants (for inline styles in components) and as CSS custom properties
 * (for stylesheets).
 */

export interface ThemeTokens {
  bgCanvas: string;
  bgChrome: string;
  bgChromeHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  radius: string;
  fontStack: string;
  fontMono: string;
}

export const DARK_THEME: ThemeTokens = {
  bgCanvas: "#05070d",
  bgChrome: "rgba(15, 18, 28, 0.85)",
  bgChromeHover: "rgba(30, 34, 48, 0.95)",
  textPrimary: "#f1f1f3",
  textSecondary: "#b9bfcc",
  textMuted: "#6c7178",
  accent: "#5aa8ff",
  accentHover: "#88c0ff",
  success: "#4ade80",
  warning: "#f5a623",
  error: "#ff5a5a",
  border: "rgba(255, 255, 255, 0.08)",
  radius: "8px",
  fontStack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
};

export const LIGHT_THEME: ThemeTokens = {
  bgCanvas: "#f4f5f7",
  bgChrome: "rgba(255, 255, 255, 0.92)",
  bgChromeHover: "rgba(245, 247, 250, 1)",
  textPrimary: "#0c1322",
  textSecondary: "#3a4356",
  textMuted: "#6c7178",
  accent: "#0066cc",
  accentHover: "#0050a8",
  success: "#15803d",
  warning: "#b45309",
  error: "#dc2626",
  border: "rgba(0, 0, 0, 0.08)",
  radius: "8px",
  fontStack: DARK_THEME.fontStack,
  fontMono: DARK_THEME.fontMono,
};

export function installTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty("--gv-bg-canvas", tokens.bgCanvas);
  root.style.setProperty("--gv-bg-chrome", tokens.bgChrome);
  root.style.setProperty("--gv-bg-chrome-hover", tokens.bgChromeHover);
  root.style.setProperty("--gv-text-primary", tokens.textPrimary);
  root.style.setProperty("--gv-text-secondary", tokens.textSecondary);
  root.style.setProperty("--gv-text-muted", tokens.textMuted);
  root.style.setProperty("--gv-accent", tokens.accent);
  root.style.setProperty("--gv-accent-hover", tokens.accentHover);
  root.style.setProperty("--gv-success", tokens.success);
  root.style.setProperty("--gv-warning", tokens.warning);
  root.style.setProperty("--gv-error", tokens.error);
  root.style.setProperty("--gv-border", tokens.border);
  root.style.setProperty("--gv-radius", tokens.radius);
  root.style.setProperty("--gv-font", tokens.fontStack);
  root.style.setProperty("--gv-font-mono", tokens.fontMono);
}
