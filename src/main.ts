import { elements, state } from "./state.js";
import { querySelector } from "./utils/dom.js";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop.js";
import { setupModalHandlers } from "./handlers/modal.js";
import { setupKeyboardHandlers } from "./handlers/keyboard.js";
import { checkMacOSPermissions } from "./handlers/permissions.js";
import { clearImageGrid } from "./ui/grid.js";
import { expandDropZone } from "./ui/dropZone.js";
import { clearError } from "./ui/error.js";
import { hideSpinner } from "./ui/spinner.js";
import { closeModal } from "./ui/modal.js";
import { cleanupObserver } from "./core/observer.js";

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

/**
 * Reset the application to the home screen state.
 *
 * Clears the image grid, expands the drop zone, hides the current path, clears errors,
 * hides the spinner, closes any open modal, resets application state, and cleans up observers.
 */
function resetToHome(): void {
  clearImageGrid();
  expandDropZone();
  clearError();
  hideSpinner();
  closeModal();
  cleanupObserver();
  
  // Clear current path
  if (elements.currentPath) {
    elements.currentPath.innerHTML = "";
    elements.currentPath.style.display = "none";
  }
  
  // Reset state
  state.allImagePaths = [];
  state.currentIndex = 0;
  state.isLoadingBatch = false;
  state.loadedImages.clear();
  state.currentModalIndex = -1;
}

window.addEventListener("DOMContentLoaded", async () => {
  initializeElements();
  
  if (!elements.dropZone) {
    return;
  }
  
  // Add click handler to h1 to reset to home screen
  const h1Element = querySelector("h1");
  if (h1Element) {
    h1Element.style.cursor = "pointer";
    h1Element.addEventListener("click", resetToHome);
  }
  
  setupDocumentDragHandlers();
  setupDragDropHandlers();
  setupHTML5DragDrop();
  setupModalHandlers();
  setupKeyboardHandlers();
  await setupTauriDragEvents();
  await checkMacOSPermissions();
});
