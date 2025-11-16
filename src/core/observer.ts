import { state, elements } from "../state.js";
import { BATCH_SIZE } from "../constants.js";
import { createElement } from "../utils/dom.js";
import { removeSentinel } from "../ui/grid.js";
import { loadImageBatch } from "./browse.js";

/**
 * Removes the load-more sentinel from the DOM and disconnects any active IntersectionObserver.
 *
 * Performs cleanup of the module's intersection-observer-driven loading state by removing the sentinel element and, if present, disconnecting and clearing the stored observer reference.
 */
export function cleanupObserver(): void {
  removeSentinel();
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }
}

/**
 * Initialize an IntersectionObserver and a "load-more-sentinel" element that triggers loading of the next image batch when the sentinel enters the viewport.
 *
 * If an existing observer is present it is disconnected and replaced. If the sentinel element does not exist it is created and appended to the image grid.
 */
export function setupIntersectionObserver(): void {
  if (!elements.imageGrid) return;
  
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
  }
  
  let sentinel = document.getElementById("load-more-sentinel");
  if (!sentinel) {
    sentinel = createElement("div");
    sentinel.id = "load-more-sentinel";
    sentinel.style.height = "100px";
    elements.imageGrid.appendChild(sentinel);
  }
  
  state.intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !state.isLoadingBatch) {
          const nextStartIndex = state.currentIndex;
          const nextEndIndex = state.currentIndex + BATCH_SIZE;
          state.currentIndex = nextEndIndex;
          loadImageBatch(nextStartIndex, nextEndIndex);
        }
      });
    },
    { rootMargin: "200px" }
  );
  
  state.intersectionObserver.observe(sentinel);
}

