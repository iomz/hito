import { elements } from "../state.js";
import { closeModal, showPreviousImage, showNextImage, toggleShortcutsOverlay } from "../ui/modal.js";

/**
 * Install global keyboard and click handlers to manage modal navigation, closing, and the shortcuts overlay.
 *
 * Handles the following interactions when the modal is visible:
 * - ArrowLeft: navigate to the previous image.
 * - ArrowRight: navigate to the next image.
 * - Escape: hide the shortcuts overlay if visible, otherwise close the modal.
 * - `?` or Shift+/ : toggle the shortcuts overlay.
 *
 * Also closes the modal when the user clicks the modal backdrop, and hides the shortcuts overlay when the user clicks it.
 */
export function setupKeyboardHandlers(): void {
  document.addEventListener("keydown", (e) => {
    if (!elements.modal || 
        (elements.modal.style.display !== "flex" && elements.modal.style.display !== "block")) {
      return;
    }
    
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      showPreviousImage();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      showNextImage();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (elements.shortcutsOverlay?.style.display === "flex") {
        elements.shortcutsOverlay.style.display = "none";
      } else {
        closeModal();
      }
    } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      toggleShortcutsOverlay();
    }
  });
  
  window.onclick = (event: MouseEvent) => {
    if (event.target === elements.modal) {
      closeModal();
    }
    if (elements.shortcutsOverlay?.style.display === "flex" && 
        event.target === elements.shortcutsOverlay) {
      elements.shortcutsOverlay.style.display = "none";
    }
  };
}

