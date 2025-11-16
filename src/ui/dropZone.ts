import { querySelector } from "../utils/dom.js";

/**
 * Collapse the drop-zone container UI.
 *
 * Adds the `collapsed` class to the path input container and the drop zone so they transition to their collapsed state.
 */
export function collapseDropZone(): void {
  const container = querySelector<HTMLElement>(".path-input-container");
  const dropZone = querySelector<HTMLElement>("#drop-zone");
  if (container && dropZone) {
    container.classList.add("collapsed");
    dropZone.classList.add("collapsed");
    void container.offsetHeight; // Force reflow
  }
}

/**
 * Expand the UI drop-zone container to its non-collapsed state.
 *
 * Removes the `collapsed` class from the path input container and drop zone elements if they exist in the DOM.
 */
export function expandDropZone(): void {
  const container = querySelector<HTMLElement>(".path-input-container");
  const dropZone = querySelector<HTMLElement>("#drop-zone");
  if (container && dropZone) {
    container.classList.remove("collapsed");
    dropZone.classList.remove("collapsed");
  }
}

