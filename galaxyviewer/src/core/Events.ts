/**
 * GalaxyViewer — Typed event bus.
 *
 * A minimal publish/subscribe mechanism that the services use to communicate
 * without holding direct references to each other. Every event has a
 * strictly-typed payload so subscribers get autocompletion and type safety.
 *
 * Architecture role
 * -----------------
 * The event bus is the *only* communication channel between services. This
 * keeps the dependency graph acyclic: services depend on the bus, not on
 * each other.
 */

type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<any>>>();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<any>);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as EventHandler<any>);
      if (set.size === 0) this.handlers.delete(event);
    }
  }

  emit<T>(event: string, payload?: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy to a stable list so handlers can safely unsubscribe during emit.
    for (const handler of Array.from(set)) {
      try {
        handler(payload as T);
      } catch (err) {
        // Never let one failing handler break the dispatch loop.
        console.error(`[EventBus] handler for "${event}" threw:`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

// ---------------------------------------------------------------------------
// Canonical event names — kept in one place to avoid typos.
// ---------------------------------------------------------------------------
export const ViewerEvents = {
  ViewportChange: "viewport:change",
  ZoomChange: "viewport:zoom",
  PanChange: "viewport:pan",
  TileLoadStart: "tile:load-start",
  TileLoadComplete: "tile:load-complete",
  TileLoadError: "tile:load-error",
  Open: "viewer:open",
  Close: "viewer:close",
  Resize: "viewer:resize",
  Error: "viewer:error",
} as const;

export type ViewerEventName = (typeof ViewerEvents)[keyof typeof ViewerEvents];
