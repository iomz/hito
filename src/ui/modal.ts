import { state, elements } from "../state.js";
import { loadImageData } from "../utils/images.js";
import { showError } from "./error.js";
import { showNotification } from "./notification.js";
import { removeImageFromGrid } from "./grid.js";

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
  // Normalize path: convert backslashes to forward slashes before extracting filename
  const normalized = imagePath.replace(/\\/g, "/");
  elements.modalCaption.textContent = 
    `${imageIndex + 1} / ${state.allImagePaths.length} - ${normalized.split("/").pop() || imagePath}`;
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

/**
 * Delete the current image and navigate to the next one (or previous if it's the last).
 *
 * Sends the current image to the system trash, removes it from the image list and cache,
 * and navigates to the next image. If the deleted image was the last one, navigates to
 * the previous image instead. If it was the only image, closes the modal.
 */
export async function deleteCurrentImage(): Promise<void> {
  // Re-entrancy guard: ignore if deletion is already in progress
  if (state.isDeletingImage) {
    return;
  }
  
  if (state.currentModalIndex < 0 || state.currentModalIndex >= state.allImagePaths.length) {
    return;
  }
  
  const imagePath = state.allImagePaths[state.currentModalIndex].path;
  const deletedIndex = state.currentModalIndex;
  const isLastImage = state.currentModalIndex === state.allImagePaths.length - 1;
  const isOnlyImage = state.allImagePaths.length === 1;
  
  if (!window.__TAURI__?.core?.invoke) {
    showError("Tauri invoke API not available");
    return;
  }
  
  // Set deletion flag to prevent re-entrancy
  state.isDeletingImage = true;
  
  try {
    await window.__TAURI__.core.invoke("delete_image", { imagePath });
    
    // Remove from loaded images cache
    state.loadedImages.delete(imagePath);
    
    // Remove from image list
    state.allImagePaths.splice(deletedIndex, 1);
    
    // Adjust currentIndex if the deleted image was before the current batch loading position
    if (deletedIndex < state.currentIndex) {
      state.currentIndex -= 1;
    }
    
    // Remove from grid DOM
    removeImageFromGrid(imagePath);
    
    // Navigate to next or previous image
    if (isOnlyImage) {
      // If it was the only image, close the modal
      closeModal();
      showNotification("Image deleted. No more images in this directory.");
      state.isDeletingImage = false;
      return; // Return immediately to avoid generic notification
    } else if (isLastImage) {
      // If it was the last image, go to the previous one
      openModal(state.currentModalIndex - 1);
    } else {
      // Otherwise, stay at the same index (which now points to the next image)
      openModal(state.currentModalIndex);
    }
    
    showNotification("Image deleted");
  } catch (error) {
    showError(`Failed to delete image: ${error}`);
  } finally {
    // Always reset the deletion flag
    state.isDeletingImage = false;
  }
}

