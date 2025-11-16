import { elements } from "../state.js";
import { closeModal, showPreviousImage, showNextImage, toggleShortcutsOverlay, deleteCurrentImage } from "../ui/modal.js";

/**
 * Install global keyboard and click handlers to manage modal navigation, closing, and the shortcuts overlay.
 *
 * Handles the following interactions when the modal is visible:
 * - ArrowLeft: navigate to the previous image.
 * - ArrowRight: navigate to the next image.
 * - Escape: hide the shortcuts overlay if visible, otherwise close the modal.
 * - `?` or Shift+/ : toggle the shortcuts overlay.
 * - Delete/Backspace: delete the current image and move to the next (or previous if last).
 *
 * Also closes the modal when the user clicks the modal backdrop, and hides the shortcuts overlay when the user clicks it.
 */
export function setupKeyboardHandlers(): void {
  document.addEventListener("keydown", (e) => {
    if (!elements.modal) {
      return;
    }
    const computedStyle = window.getComputedStyle(elements.modal);
    if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
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
    } else if (e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace") {
      e.preventDefault();
      deleteCurrentImage();
    }
  });
  
  const handleWindowClick = (event: MouseEvent): void => {
    if (event.target === elements.modal) {
      closeModal();
    }
    if (elements.shortcutsOverlay?.style.display === "flex" && 
        event.target === elements.shortcutsOverlay) {
      elements.shortcutsOverlay.style.display = "none";
    }
  };
  
  window.addEventListener("click", handleWindowClick);
}

