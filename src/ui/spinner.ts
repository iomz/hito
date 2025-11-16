import { elements } from "../state.js";

/**
 * Make the loading spinner visible.
 *
 * If the spinner element is not available in the DOM, this is a no-op.
 */
export function showSpinner(): void {
  if (!elements.loadingSpinner) return;
  elements.loadingSpinner.style.display = "flex";
  void elements.loadingSpinner.offsetHeight; // Force reflow
}

/**
 * Hide the loading spinner element if present.
 *
 * Does nothing when the spinner element is not available.
 */
export function hideSpinner(): void {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = "none";
  }
}

