import { elements } from "./state.js";
import { querySelector } from "./utils/dom.js";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop.js";
import { setupModalHandlers } from "./handlers/modal.js";
import { setupKeyboardHandlers } from "./handlers/keyboard.js";
import { checkMacOSPermissions } from "./handlers/permissions.js";

/**
 * Cache references to frequently used DOM elements into the shared `elements` object.
 *
 * Stores the following selectors: `#drop-zone`, `#current-path`, `#error-msg`, `#image-grid`,
 * `#loading-spinner`, `#image-modal`, `#modal-image`, `#modal-caption`, `.close`,
 * `#modal-prev`, `#modal-next`, and `#keyboard-shortcuts-overlay`.
 */
function initializeElements(): void {
  elements.dropZone = querySelector("#drop-zone");
  elements.currentPath = querySelector("#current-path");
  elements.errorMsg = querySelector("#error-msg");
  elements.imageGrid = querySelector("#image-grid");
  elements.loadingSpinner = querySelector("#loading-spinner");
  elements.modal = querySelector("#image-modal");
  elements.modalImage = querySelector<HTMLImageElement>("#modal-image");
  elements.modalCaption = querySelector("#modal-caption");
  elements.closeBtn = querySelector(".close");
  elements.modalPrevBtn = querySelector("#modal-prev");
  elements.modalNextBtn = querySelector("#modal-next");
  elements.shortcutsOverlay = querySelector("#keyboard-shortcuts-overlay");
}

window.addEventListener("DOMContentLoaded", async () => {
  initializeElements();
  
  if (!elements.dropZone) {
    return;
  }
  
  setupDocumentDragHandlers();
  setupDragDropHandlers();
  setupHTML5DragDrop();
  setupModalHandlers();
  setupKeyboardHandlers();
  await setupTauriDragEvents();
  await checkMacOSPermissions();
});
