# GalaxyViewer

A modern, modular Deep Zoom Image (DZI) viewer built with **Vite + TypeScript** and powered by **OpenSeadragon**. Designed to render multi-gigabyte astronomical imagery efficiently with progressive tile loading, smooth zoom/pan, and a polished dark "space" aesthetic.

---

## Architecture

```
galaxyviewer/
├── index.html              ← HTML entry (just the root element + splash)
├── package.json            ← Vite + TypeScript + OpenSeadragon
├── tsconfig.json           ← Strict TypeScript config
├── vite.config.ts          ← Vite config (CORS-enabled dev server)
└── src/
    ├── main.ts             ← Bootstrap — wires layers together
    ├── core/
    │   ├── Config.ts       ← ViewerConfig dataclass + validation
    │   ├── Events.ts       ← Typed EventBus + canonical event names
    │   ├── Errors.ts       ← Typed error hierarchy
    │   └── Logger.ts       ← Timestamped leveled logger
    ├── services/
    │   ├── DziService.ts           ← DZI XML manifest parsing
    │   ├── TileLoaderService.ts    ← Tile-load progress tracking
    │   ├── ViewportService.ts      ← Viewport state mirror
    │   └── KeyboardService.ts      ← Accessible keyboard shortcuts
    ├── ui/
    │   ├── Viewer.ts               ← Owns the OpenSeadragon instance
    │   ├── Controls.ts             ← Zoom / home / fullscreen / help buttons
    │   ├── ProgressBar.ts          ← Animated tile-load progress bar
    │   ├── StatusBar.ts            ← Zoom %, dimensions, cursor coords
    │   ├── HelpOverlay.ts          ← Dismissible keyboard-shortcut overlay
    │   └── Theme.ts                ← Design tokens (dark/light themes)
    └── styles/
        └── main.css                ← All chrome styling (CSS variables)
```

### Design principles

| Principle | How it's enforced |
|-----------|-------------------|
| **Single source of truth for OSD** | `ui/Viewer.ts` is the *only* file that imports `openseadragon`. Everything else talks to it through the EventBus. |
| **Typed event bus** | Services communicate via `EventBus.emit/on` with strictly-typed payloads — no direct references. |
| **Centralised config** | `core/Config.ts` validates every knob; `core/Theme.ts` exposes design tokens as CSS variables. |
| **Accessibility** | ARIA roles on toolbar, progressbar, dialog. Keyboard shortcuts for every action. |
| **Responsive** | CSS variables + media queries; chrome collapses on small screens. |

---

## Quickstart

### Develop

```bash
cd galaxyviewer
npm install
npm run dev          # http://localhost:5173
```

### Build for production

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build
```

### Use it to view an ElectPyNasa DZI pyramid

After running the ElectPyNasa pyramid pipeline, you'll have a directory like:

```
output/deepzoom-images/my_image/my_image.dzi
output/deepzoom-images/my_image/my_image_files/
```

Serve the directory and point GalaxyViewer at the `.dzi` file:

```bash
# From the galaxyviewer directory:
npm run dev
# Then open:
# http://localhost:5173/?src=http://localhost:8000/output/deepzoom-images/my_image/my_image.dzi
```

Or use a static file server:

```bash
cd output/deepzoom-images
python3 -m http.server 8000
# Then visit:
# http://localhost:5173/?src=http://localhost:8000/my_image/my_image.dzi
```

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `−` / `_` | Zoom out |
| `0` | Reset to home (fit) view |
| `↑` `↓` `←` `→` or `WASD` | Pan |
| `F` | Toggle fullscreen |
| `H` | Toggle help overlay |
| `Esc` | Close dialogs |

---

## URL parameters

| Param | Description | Example |
|-------|-------------|---------|
| `src` | URL of the `.dzi` manifest | `?src=https://example.com/image.dzi` |

---

## Extending the viewer

| You want to… | Where to add code |
|--------------|-------------------|
| Add a new UI component | `src/ui/` — subscribe to the EventBus in the constructor, render DOM, append to the root |
| Add a new event | `src/core/Events.ts` — add to `ViewerEvents`, then emit/handle anywhere |
| Add a new keyboard shortcut | `src/services/KeyboardService.ts` — extend `DEFAULT_SHORTCUTS` |
| Replace the rendering engine | `src/ui/Viewer.ts` — swap OpenSeadragon for any DZI-capable renderer; keep the EventBus API stable |
| Add a new theme | `src/ui/Theme.ts` — define a new `ThemeTokens` object and call `installTheme()` |

---

## License

MIT
