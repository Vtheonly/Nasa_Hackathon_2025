/**
 * GalaxyViewer — Configuration.
 *
 * A single frozen object that holds every tunable knob in the viewer.
 * Centralising configuration makes it trivial to theme, resize, and adapt
 * the viewer for different deployment contexts (embedded widget vs.
 * full-page viewer).
 */

import { ConfigurationError } from "./Errors";

export interface ViewerConfig {
  /** Selector (or Element) of the container that will hold the viewer. */
  container: string | HTMLElement;
  /** URL of the .dzi manifest OR a tile source configuration object. */
  source: string | Record<string, unknown>;
  /** Initial zoom hint, where 1.0 means the image fits the viewport. */
  defaultZoomLevel?: number;
  /** Minimum zoom factor (0 = auto-fit). */
  minZoomImageRatio?: number;
  /** Maximum zoom factor (1 = 100% native pixel size). */
  maxZoomPixelRatio?: number;
  /** Enable the navigator (minimap) in the top-right corner. */
  showNavigator?: boolean;
  /** Show the on-screen zoom buttons. */
  showZoomControl?: boolean;
  /** Show the on-screen pan buttons. */
  showHomeControl?: boolean;
  /** Show the fullscreen button. */
  showFullPageControl?: boolean;
  /** Tile fade-in duration in milliseconds. */
  fadeInDuration?: number;
  /** Image smoothing (bilinear) — disable for crisp pixel-level inspection. */
  smoothTileEdgesMinZoom?: number;
  /** Background color of the viewer canvas (CSS color string). */
  backgroundColor?: string;
  /** Theme — controls UI chrome colors. */
  theme?: "dark" | "light" | "auto";
  /** Cross-origin tile loading mode. */
  crossOriginPolicy?: "Anonymous" | "use-credentials" | false;
  /** Maximum number of concurrent tile requests. */
  imageLoaderLimit?: number;
}

export const DEFAULT_CONFIG: Readonly<ViewerConfig> = {
  container: "#galaxyviewer-root",
  source: "",
  defaultZoomLevel: 0,
  minZoomImageRatio: 0.8,
  maxZoomPixelRatio: 1.5,
  showNavigator: true,
  showZoomControl: true,
  showHomeControl: true,
  showFullPageControl: true,
  fadeInDuration: 220,
  smoothTileEdgesMinZoom: Infinity,
  backgroundColor: "#05070d",
  theme: "dark",
  crossOriginPolicy: "Anonymous",
  imageLoaderLimit: 6,
};

export function mergeConfig(
  user: Partial<ViewerConfig>,
  defaults: ViewerConfig = DEFAULT_CONFIG,
): ViewerConfig {
  const merged: ViewerConfig = { ...defaults, ...user };
  if (!merged.container) {
    throw new ConfigurationError("ViewerConfig.container is required.");
  }
  if (!merged.source) {
    throw new ConfigurationError("ViewerConfig.source is required (path to .dzi or tile source).");
  }
  return merged;
}
