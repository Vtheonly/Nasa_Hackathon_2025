/**
 * Viewer — the central component that owns the OpenSeadragon instance.
 *
 * Responsibilities
 * ----------------
 *   - Construct OpenSeadragon with the resolved configuration
 *   - Wire OpenSeadragon events into the EventBus
 *   - Bridge keyboard / control events back to OpenSeadragon actions
 *   - Expose a tiny imperative API (open, close, zoomIn, zoomOut, home,
 *     fullscreen) for external callers
 *
 * The Viewer is the *only* component that imports OpenSeadragon. Every
 * other UI piece talks to it through the EventBus or via the typed
 * imperative API. This keeps the heavy dependency in one file.
 */

import OpenSeadragon from "openseadragon";
import type { Viewer as OsdViewer, TileSource as OsdTileSource, Point as OsdPoint } from "openseadragon";

import type { ViewerConfig } from "../core/Config";
import { mergeConfig } from "../core/Config";
import { EventBus, ViewerEvents } from "../core/Events";
import { Logger } from "../core/Logger";
import { TileLoaderService } from "../services/TileLoaderService";
import { ViewportService } from "../services/ViewportService";
import { DziService } from "../services/DziService";
import type { DziManifest } from "../services/DziService";

export class GalaxyViewer {
  public readonly bus = new EventBus();
  public readonly viewport: ViewportService;
  public readonly tiles: TileLoaderService;
  private readonly dzi: DziService;
  private osdViewer: OsdViewer | null = null;
  private readonly config: ViewerConfig;
  private readonly log: Logger;
  private readonly logger: Logger;

  constructor(userConfig: Partial<ViewerConfig>) {
    this.config = mergeConfig(userConfig);
    this.logger = new Logger(this.bus);
    this.log = this.logger;
    this.viewport = new ViewportService(this.bus, this.log);
    this.tiles = new TileLoaderService(this.bus, this.log);
    this.dzi = new DziService(this.log);
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------
  async mount(): Promise<void> {
    const container = this.resolveContainer();
    this.log.info("GalaxyViewer mounting.", { container });

    const manifest = await this.dzi.load(this.config.source);
    this.log.info("Tile source resolved.", {
      width: manifest.width,
      height: manifest.height,
      tileSize: manifest.tileSize,
    });

    this.osdViewer = OpenSeadragon({
      element: container,
      tileSources: this.toOsdTileSource(manifest),
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/images/",
      showNavigationControl: false, // we render our own controls
      showNavigator: this.config.showNavigator,
      navigatorPosition: "TOP_RIGHT",
      navigatorSizeRatio: 0.12,
      defaultZoomLevel: this.config.defaultZoomLevel,
      minZoomImageRatio: this.config.minZoomImageRatio,
      maxZoomPixelRatio: this.config.maxZoomPixelRatio,
      fadeInDuration: this.config.fadeInDuration,
      smoothTileEdgesMinZoom: this.config.smoothTileEdgesMinZoom,
      imageLoaderLimit: this.config.imageLoaderLimit,
      crossOriginPolicy: this.config.crossOriginPolicy === false ? false : this.config.crossOriginPolicy,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, flickEnabled: true },
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true },
      visibilityRatio: 0.7,
      constrainDuringPan: true,
    });

    this.bindEvents();
    this.bus.emit(ViewerEvents.Open, { tileSource: manifest });
    this.log.info("GalaxyViewer mounted.");
  }

  unmount(): void {
    if (this.osdViewer) {
      this.osdViewer.close();
      this.osdViewer.destroy();
      this.osdViewer = null;
    }
    this.bus.emit(ViewerEvents.Close);
    this.log.info("GalaxyViewer unmounted.");
  }

  // ------------------------------------------------------------------
  // Imperative API
  // ------------------------------------------------------------------
  zoomIn(): void {
    this.osdViewer?.viewport.zoomBy(1.4);
  }

  zoomOut(): void {
    this.osdViewer?.viewport.zoomBy(1 / 1.4);
  }

  home(): void {
    this.osdViewer?.viewport.goHome();
  }

  panBy(dx: number, dy: number): void {
    // OpenSeadragon's Point constructor is callable via the default export.
    const point = new (OpenSeadragon as unknown as { Point: new (x: number, y: number) => OsdPoint }).Point(dx, dy);
    this.osdViewer?.viewport.panBy(point);
  }

  toggleFullscreen(): void {
    if (this.osdViewer?.isFullPage()) {
      this.osdViewer.setFullPage(false);
    } else {
      this.osdViewer?.setFullPage(true);
    }
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------
  private resolveContainer(): HTMLElement {
    const c = this.config.container;
    if (typeof c === "string") {
      const el = document.querySelector<HTMLElement>(c);
      if (!el) throw new Error(`GalaxyViewer: container "${c}" not found.`);
      return el;
    }
    return c;
  }

  private toOsdTileSource(manifest: DziManifest): OsdTileSource {
    // OpenSeadragon accepts a configured tile-source object with a custom
    // getTileUrl callback. We build it from the parsed DZI manifest.
    const m = manifest;
    return {
      height: m.height,
      width: m.width,
      tileSize: m.tileSize,
      tileOverlap: m.overlap,
      tileFormat: m.format,
      getTileUrl: (level: number, x: number, y: number) =>
        `${m.baseUrl}${level}/${x}_${y}.${m.format}`,
      minLevel: 8,
      maxLevel: Math.ceil(Math.log2(Math.max(m.width, m.height))),
    } as unknown as OsdTileSource;
  }

  private bindEvents(): void {
    if (!this.osdViewer) return;
    const v = this.osdViewer;

    v.addHandler("open", () => {
      this.bus.emit(ViewerEvents.Open);
    });

    v.addHandler("zoom", (e: { zoom?: number } | Record<string, unknown>) => {
      const zoom = (e as { zoom?: number }).zoom ?? 1;
      this.viewport.update({ zoom, scale: zoom });
    });

    v.addHandler("pan", (e: { center?: { x: number; y: number } } | Record<string, unknown>) => {
      const center = (e as { center?: { x: number; y: number } }).center;
      if (center) {
        this.viewport.update({ panX: center.x, panY: center.y });
      }
    });

    v.addHandler("animation", () => {
      const vp = v.viewport;
      const bounds = vp.getBounds();
      this.viewport.update({
        zoom: vp.getZoom(),
        scale: vp.getZoom(true),
        panX: vp.getCenter().x,
        panY: vp.getCenter().y,
        bounds: { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
      });
    });

    // Tile load tracking — OpenSeadragon fires these per tile.
    try {
      v.world?.getItemAt?.(0)?.addHandler?.("tiled-image-level-loaded", () => {
        this.tiles.onTileLoaded();
      });
    } catch {
      // Safe no-op — some OSD versions don't expose this event.
    }

    v.addHandler("tile-load-failed", () => {
      this.tiles.onTileFailed();
    });

    v.addHandler("tile-drawing", () => {
      // intentionally empty — drawing is per-frame, not per-load
    });

    // Bridge keyboard events from the EventBus.
    this.bus.on<{ dx: number; dy: number }>("keyboard:pan", (p) => this.panBy(p.dx, p.dy));
    this.bus.on("keyboard:zoom-in", () => this.zoomIn());
    this.bus.on("keyboard:zoom-out", () => this.zoomOut());
    this.bus.on("keyboard:home", () => this.home());
    this.bus.on("keyboard:fullscreen", () => this.toggleFullscreen());

    // Resize handling
    window.addEventListener("resize", () => {
      this.bus.emit(ViewerEvents.Resize, { width: window.innerWidth, height: window.innerHeight });
    });
  }
}
