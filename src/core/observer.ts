import { state } from "../state";

/**
 * Removes the load-more sentinel from the DOM and disconnects any active IntersectionObserver.
 *
 * Performs cleanup of the module's intersection-observer-driven loading state by removing the sentinel element and, if present, disconnecting and clearing the stored observer reference.
 * 
 * NOTE: With React managing the grid and observer, this only cleans up legacy state.
 * React ImageGrid component manages its own IntersectionObserver.
 */
export function cleanupObserver(): void {
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }
}


