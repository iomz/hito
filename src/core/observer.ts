import { state } from "../state";
import { BATCH_SIZE } from "../constants";
import { createElement } from "../utils/dom";
import { removeSentinel } from "../ui/grid";
import { loadImageBatch } from "./browse";

/**
 * Removes the load-more sentinel from the DOM and disconnects any active IntersectionObserver.
 *
 * Performs cleanup of the module's intersection-observer-driven loading state by removing the sentinel element and, if present, disconnecting and clearing the stored observer reference.
 * 
 * NOTE: With React managing the grid and observer, this only cleans up legacy state.
 * React ImageGrid component manages its own IntersectionObserver.
 */
export function cleanupObserver(): void {
  removeSentinel(); // No-op now
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }
}

/**
 * Initialize an IntersectionObserver and a "load-more-sentinel" element that triggers loading of the next image batch when the sentinel enters the viewport.
 *
 * If an existing observer is present it is disconnected and replaced. If the sentinel element does not exist it is created and appended to the image grid.
 * 
 * NOTE: With React managing the grid, this is now a no-op.
 * React ImageGrid component manages its own IntersectionObserver.
 */
export function setupIntersectionObserver(): void {
  // No-op: React ImageGrid component manages the observer now
}

