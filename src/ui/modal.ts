import { state } from "../state";
import { loadImageData } from "../utils/images";
import { showError } from "./error";
import { showNotification } from "./notification";
import { ensureImagePathsArray } from "../utils/state";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";

/**
 * Opens the image viewer modal for the image at the given index, ensuring the image data is available and updating modal UI.
 *
 * If `imageIndex` is out of range or required modal elements are missing, the function does nothing. If loading the image data fails, an error message is shown and the modal is not opened.
 *
 * @param imageIndex - Index of the image in the current image list to display in the modal
 */
export async function openModal(imageIndex: number): Promise<void> {
  if (!ensureImagePathsArray("openModal")) {
    return;
  }
  
  if (imageIndex < 0 || imageIndex >= state.allImagePaths.length) {
    return;
  }
  
  const requestedIndex = imageIndex;
  state.currentModalIndex = imageIndex;
  state.notify();
  const imagePath = state.allImagePaths[imageIndex].path;
  
  // Pre-load image data if not already loaded (React component will use it)
  let dataUrl = state.loadedImages.get(imagePath);
  if (!dataUrl) {
    try {
      dataUrl = await loadImageData(imagePath);
      // Cache the dataUrl only if it's valid
      if (dataUrl) {
        state.loadedImages.set(imagePath, dataUrl);
      }
    } catch (error) {
      showError(`Error loading image: ${error}`);
      // Reset modal index on error
      state.currentModalIndex = -1;
      state.notify();
      return;
    }
  }
  
  // Check if a newer modal request has been made while we were loading
  if (state.currentModalIndex !== requestedIndex) {
    return;
  }
  
  // Hide shortcuts overlay if visible
  hideShortcutsOverlay();
}

/**
 * Hide the image viewer modal and the keyboard shortcuts overlay if present.
 */
export function closeModal(): void {
  state.currentModalIndex = -1;
  
  // Hide shortcuts overlay if visible
  hideShortcutsOverlay();
}

/**
 * Advance the modal viewer to the next image if one exists.
 *
 * Does nothing when the currently shown image is the last in the list.
 */
export function showNextImage(): void {
  if (!Array.isArray(state.allImagePaths)) {
    return;
  }
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
    // Modal content will be updated by openModal
    openModal(state.currentModalIndex - 1);
  }
}


/**
 * Toggle the keyboard shortcuts overlay between visible and hidden.
 */
export function toggleShortcutsOverlay(): void {
  state.shortcutsOverlayVisible = !state.shortcutsOverlayVisible;
  state.notify();
}

/**
 * Hide the keyboard shortcuts overlay.
 */
export function hideShortcutsOverlay(): void {
  state.shortcutsOverlayVisible = false;
  state.notify();
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
  
  if (!ensureImagePathsArray("deleteCurrentImage")) {
    return;
  }
  
  if (state.currentModalIndex < 0 || state.currentModalIndex >= state.allImagePaths.length) {
    return;
  }
  
  const imagePath = state.allImagePaths[state.currentModalIndex].path;
  const deletedIndex = state.currentModalIndex;
  const isLastImage = state.currentModalIndex === state.allImagePaths.length - 1;
  const isOnlyImage = state.allImagePaths.length === 1;
  
  if (!isTauriInvokeAvailable()) {
    showError("Tauri invoke API not available");
    return;
  }
  
  // Set deletion flag to prevent re-entrancy
  state.isDeletingImage = true;
  
  try {
    await invokeTauri("delete_image", { imagePath });
    
    // Remove from loaded images cache
    state.loadedImages.delete(imagePath);
    
    // Remove from image list
    state.allImagePaths.splice(deletedIndex, 1);
    state.notify();
    
    // Adjust currentIndex if the deleted image was before the current batch loading position
    if (deletedIndex < state.currentIndex) {
      state.currentIndex -= 1;
    }
    
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


