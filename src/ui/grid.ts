import { elements } from "../state";
import { createElement } from "../utils/dom.js";

/**
 * Removes all child nodes from the image grid container.
 *
 * If the image grid element is not present, the function does nothing.
 * 
 * NOTE: With React managing the grid, this is now a no-op.
 * React components will handle clearing based on state changes.
 */
export function clearImageGrid(): void {
  // No-op: React manages the grid now
}

/**
 * Remove the DOM element with id "load-more-sentinel" if it exists.
 *
 * This clears the sentinel used to trigger loading additional image batches.
 * 
 * NOTE: With React managing the grid, this is now a no-op.
 * React ImageGrid component manages the sentinel internally.
 */
export function removeSentinel(): void {
  // No-op: React manages the sentinel now
}

/**
 * Remove an image tile from the grid by its image path.
 *
 * Finds the image-item element with the matching data-image-path attribute and removes it from the DOM.
 *
 * @param imagePath - The filesystem path of the image to remove from the grid
 */
export function removeImageFromGrid(imagePath: string): void {
  if (!elements.imageGrid) return;
  
  const imageItems = elements.imageGrid.querySelectorAll(".image-item");
  for (const item of imageItems) {
    const itemPath = item.getAttribute("data-image-path");
    if (itemPath === imagePath) {
      item.remove();
      break;
    }
  }
}

