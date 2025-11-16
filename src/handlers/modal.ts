import { elements } from "../state.js";
import { closeModal, showPreviousImage, showNextImage } from "../ui/modal.js";

/**
 * Attach click handlers for the modal controls when their DOM elements exist.
 *
 * Binds the close button to close the modal, and binds the previous/next buttons to navigate the modal.
 * Prev/next button clicks stop event propagation to avoid triggering container click handlers.
 */
export function setupModalHandlers(): void {
  if (elements.closeBtn) {
    elements.closeBtn.onclick = closeModal;
  }
  
  if (elements.modalPrevBtn) {
    elements.modalPrevBtn.onclick = (e) => {
      e.stopPropagation();
      showPreviousImage();
    };
  }
  
  if (elements.modalNextBtn) {
    elements.modalNextBtn.onclick = (e) => {
      e.stopPropagation();
      showNextImage();
    };
  }
}

