import { elements } from "../state.js";
import { createElement } from "../utils/dom.js";

/**
 * Removes all child nodes from the image grid container.
 *
 * If the image grid element is not present, the function does nothing.
 */
export function clearImageGrid(): void {
  if (elements.imageGrid) {
    elements.imageGrid.innerHTML = "";
  }
}

/**
 * Remove the DOM element with id "load-more-sentinel" if it exists.
 *
 * This clears the sentinel used to trigger loading additional image batches.
 */
export function removeSentinel(): void {
  const sentinel = document.getElementById("load-more-sentinel");
  if (sentinel) sentinel.remove();
}

