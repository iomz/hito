import { state, elements } from "../state.js";
import { loadImageData } from "../utils/images.js";
import { showError } from "./error.js";

/**
 * Opens the image viewer modal for the image at the given index, ensuring the image data is available and updating modal UI.
 *
 * If `imageIndex` is out of range or required modal elements are missing, the function does nothing. If loading the image data fails, an error message is shown and the modal is not opened.
 *
 * @param imageIndex - Index of the image in the current image list to display in the modal
 */
export async function openModal(imageIndex: number): Promise<void> {
  if (imageIndex < 0 || imageIndex >= state.allImagePaths.length || 
      !elements.modalImage || !elements.modalCaption || !elements.modal) {
    return;
  }
  
  const requestedIndex = imageIndex;
  state.currentModalIndex = imageIndex;
  const imagePath = state.allImagePaths[imageIndex].path;
  
  let dataUrl = state.loadedImages.get(imagePath);
  if (!dataUrl) {
    try {
      dataUrl = await loadImageData(imagePath);
    } catch (error) {
      showError(`Error loading image: ${error}`);
      return;
    }
  }
  
  // Check if a newer modal request has been made while we were loading
  if (state.currentModalIndex !== requestedIndex) {
    return;
  }
  
  elements.modalImage.src = dataUrl;
  elements.modalCaption.textContent = 
    `${imageIndex + 1} / ${state.allImagePaths.length} - ${imagePath.split("/").pop() || imagePath}`;
  elements.modal.style.display = "flex";
  
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
  
  updateModalButtons();
}

/**
 * Hide the image viewer modal and the keyboard shortcuts overlay if present.
 */
export function closeModal(): void {
  if (elements.modal) {
    elements.modal.style.display = "none";
  }
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
  state.currentModalIndex = -1;
}

/**
 * Advance the modal viewer to the next image if one exists.
 *
 * Does nothing when the currently shown image is the last in the list.
 */
export function showNextImage(): void {
  if (state.currentModalIndex < state.allImagePaths.length - 1) {
    openModal(state.currentModalIndex + 1);
  }
}

/**
 * Move the modal view to the previous image in the gallery.
 *
 * If a previous image exists (current modal index > 0), opens the modal for that image; otherwise does nothing.
 */
export function showPreviousImage(): void {
  if (state.currentModalIndex > 0) {
    openModal(state.currentModalIndex - 1);
  }
}

/**
 * Update visibility of the modal's previous/next navigation buttons based on the current image index.
 *
 * Shows the previous button when the modal is not at the first image and shows the next button when the modal is not at the last image; hides each button otherwise.
 */
export function updateModalButtons(): void {
  if (!elements.modalPrevBtn || !elements.modalNextBtn) return;
  
  elements.modalPrevBtn.style.display = state.currentModalIndex > 0 ? "block" : "none";
  elements.modalNextBtn.style.display = 
    state.currentModalIndex < state.allImagePaths.length - 1 ? "block" : "none";
}

/**
 * Toggle the keyboard shortcuts overlay between visible and hidden.
 *
 * If the overlay element is not present this function does nothing; otherwise it hides the overlay when shown and shows it when hidden.
 */
export function toggleShortcutsOverlay(): void {
  if (!elements.shortcutsOverlay) return;
  const isVisible = elements.shortcutsOverlay.style.display === "flex";
  elements.shortcutsOverlay.style.display = isVisible ? "none" : "flex";
}

