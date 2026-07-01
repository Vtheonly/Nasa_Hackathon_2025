/**
 * GalaxyViewer — application entry point.
 *
 * Wires together every layer:
 *   - core:  Config, EventBus, Logger
 *   - services: DziService, TileLoaderService, ViewportService, KeyboardService
 *   - ui:     Viewer, Controls, ProgressBar, StatusBar, HelpOverlay, Theme
 *
 * The entry point resolves the image source from the URL query string
 * (`?src=...`) or falls back to a demo DZI. This makes the viewer usable
 * both as a standalone demo and as a drop-in viewer for any DZI pyramid
 * produced by ElectPyNasa.
 */

import { GalaxyViewer } from "./ui/Viewer";
import { Controls } from "./ui/Controls";
import { ProgressBar } from "./ui/ProgressBar";
import { StatusBar } from "./ui/StatusBar";
import { HelpOverlay } from "./ui/HelpOverlay";
import { installTheme, DARK_THEME } from "./ui/Theme";
import { KeyboardService } from "./services/KeyboardService";
import { ViewerEvents } from "./core/Events";
import type { Logger } from "./core/Logger";
import type { ViewerConfig } from "./core/Config";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
installTheme(DARK_THEME);

// ---------------------------------------------------------------------------
// Resolve the DZI source from the URL or use a demo image
// ---------------------------------------------------------------------------
function resolveSource(): string {
  const params = new URLSearchParams(window.location.search);
  const src = params.get("src");
  if (src) return src;

  // Demo DZI (OpenSeadragon's public test pyramid)
  return "https://openseadragon.github.io/example-images/duomo/duomo.dzi";
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#galaxyviewer-root");
  if (!root) {
    console.error("[GalaxyViewer] Root element #galaxyviewer-root not found.");
    return;
  }

  const config: Partial<ViewerConfig> = {
    container: root,
    source: resolveSource(),
    showNavigator: true,
  };

  const viewer = new GalaxyViewer(config);
  await viewer.mount();

  // Attach UI components — they subscribe to the bus, no direct coupling.
  new Controls(viewer.bus, root);
  new ProgressBar(viewer.bus, root);
  const status = new StatusBar(viewer.bus, root);
  const help = new HelpOverlay(root);

  // Emit metadata for the status bar.
  viewer.bus.on<{ width: number; height: number }>(ViewerEvents.Open, (payload) => {
    if (payload && typeof payload === "object" && "tileSource" in payload) {
      const ts = (payload as any).tileSource;
      if (ts && ts.width && ts.height) {
        viewer.bus.emit("viewer:metadata", { width: ts.width, height: ts.height });
        status.setMetadata({ width: ts.width, height: ts.height, tileSize: ts.tileSize, overlap: ts.tileOverlap, format: ts.tileFormat, baseUrl: "" });
      }
    }
  });

  // Keyboard service
  const keyboard = new KeyboardService(viewer.bus, viewer["log"] as Logger);
  keyboard.attach(root);
  viewer.bus.on("keyboard:help", () => help.toggle());

  // Update help button state when overlay is toggled externally
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") help.hide();
  });

  // Surface the logger on window for debugging in dev tools.
  (window as any).galaxyviewer = viewer;
  console.info("[GalaxyViewer] Ready. Use window.galaxyviewer for imperative access.");
}

bootstrap().catch((err) => {
  console.error("[GalaxyViewer] Bootstrap failed:", err);
});
