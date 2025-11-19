import { state } from "../state";
import { loadImageData } from "../utils/images";
import { showError } from "./error";
import { showNotification } from "./notification";
import { ensureImagePathsArray } from "../utils/state";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { getFilteredAndSortedImagesSync } from "../utils/filteredImages";

/**
 * Opens the image viewer modal for the image at the given path, ensuring the image data is available and updating modal UI.
 *
 * The image path must exist in the filtered/sorted list. If loading the image data fails, an error message is shown and the modal is not opened.
 *
 * @param imagePath - Path of the image to display in the modal
 */
export async function openModal(imagePath: string): Promise<void> {
  if (!ensureImagePathsArray("openModal")) {
    return;
  }
  
  // Get the filtered and sorted images
  const filteredImages = getFilteredAndSortedImagesSync();
  const imageIndex = filteredImages.findIndex((img) => img.path === imagePath);
  
  if (imageIndex < 0) {
    // Image not in filtered list, don't open modal
    return;
  }
  
  const requestedPath = imagePath;
  state.currentModalImagePath = imagePath;
  // Keep currentModalIndex for backward compatibility, but calculate from filtered list
  state.currentModalIndex = imageIndex;
  state.notify();
  
  // Pre-load image data if not already loaded (React component will use it)
  let dataUrl = state.loadedImages.get(imagePath);
  if (!dataUrl) {
    try {
      dataUrl = await loadImageData(imagePath);
    } catch (error) {
      showError(`Error loading image: ${error}`);
      // Reset modal on error
      state.currentModalImagePath = "";
      state.currentModalIndex = -1;
      state.notify();
      return;
    }
  }
  
  // Check if a newer modal request has been made while we were loading
  if (state.currentModalImagePath !== requestedPath) {
    return;
  }
  
  // Hide shortcuts overlay if visible
  hideShortcutsOverlay();
}

/**
 * Opens the image viewer modal for the image at the given index in the filtered/sorted list.
 * @deprecated Use openModal(imagePath) instead. This is kept for backward compatibility.
 * @param imageIndex - Index of the image in the filtered/sorted list
 */
export async function openModalByIndex(imageIndex: number): Promise<void> {
  if (!ensureImagePathsArray("openModalByIndex")) {
    return;
  }
  const filteredImages = getFilteredAndSortedImagesSync();
  if (imageIndex < 0 || imageIndex >= filteredImages.length) {
    return;
  }
  await openModal(filteredImages[imageIndex].path);
}

/**
 * Hide the image viewer modal and the keyboard shortcuts overlay if present.
 * Clears suppressCategoryRefilter flag to trigger deferred re-filtering if needed.
 */
export function closeModal(): void {
  state.currentModalImagePath = "";
  state.currentModalIndex = -1;
  
  // Clear suppress flag and cached snapshot to trigger deferred re-filtering from category assignments
  const hadSuppress = state.suppressCategoryRefilter;
  state.suppressCategoryRefilter = false;
  state.cachedImageCategoriesForRefilter = null;
  
  // Hide shortcuts overlay if visible
  hideShortcutsOverlay();
  
  // Notify to trigger refilter if suppress was active
  if (hadSuppress) {
    state.notify();
  }
}

/**
 * Advance the modal viewer to the next image in the filtered/sorted list if one exists.
 *
 * Does nothing when the currently shown image is the last in the filtered list.
 * Clears suppressCategoryRefilter flag to trigger deferred re-filtering.
 */
export function showNextImage(): void {
  if (!state.currentModalImagePath) {
    return;
  }
  
  // Clear suppress flag and cached snapshot to trigger deferred re-filtering from category assignments
  const hadSuppress = state.suppressCategoryRefilter;
  state.suppressCategoryRefilter = false;
  state.cachedImageCategoriesForRefilter = null;
  
  const filteredImages = getFilteredAndSortedImagesSync();
  const currentIndex = filteredImages.findIndex((img) => img.path === state.currentModalImagePath);
  
  if (currentIndex >= 0) {
    // Current image is still in filtered list, navigate to next
    if (currentIndex < filteredImages.length - 1) {
      openModal(filteredImages[currentIndex + 1].path);
    }
  } else if (hadSuppress && filteredImages.length > 0) {
    // Current image no longer in filtered list (due to category change),
    // navigate to first image in new filtered list
    openModal(filteredImages[0].path);
  } else if (hadSuppress) {
    // No images in filtered list, notify to trigger refilter (may close modal)
    state.notify();
  }
}

/**
 * Move the modal view to the previous image in the filtered/sorted list.
 *
 * If a previous image exists, opens the modal for that image; otherwise does nothing.
 * Clears suppressCategoryRefilter flag to trigger deferred re-filtering.
 */
export function showPreviousImage(): void {
  if (!state.currentModalImagePath) {
    return;
  }
  
  // Clear suppress flag and cached snapshot to trigger deferred re-filtering from category assignments
  const hadSuppress = state.suppressCategoryRefilter;
  state.suppressCategoryRefilter = false;
  state.cachedImageCategoriesForRefilter = null;
  
  const filteredImages = getFilteredAndSortedImagesSync();
  const currentIndex = filteredImages.findIndex((img) => img.path === state.currentModalImagePath);
  
  if (currentIndex >= 0) {
    // Current image is still in filtered list, navigate to previous
    if (currentIndex > 0) {
      openModal(filteredImages[currentIndex - 1].path);
    }
  } else if (hadSuppress && filteredImages.length > 0) {
    // Current image no longer in filtered list (due to category change),
    // navigate to last image in new filtered list
    openModal(filteredImages[filteredImages.length - 1].path);
  } else if (hadSuppress) {
    // No images in filtered list, notify to trigger refilter (may close modal)
    state.notify();
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
  
  if (!state.currentModalImagePath) {
    return;
  }
  
  const imagePath = state.currentModalImagePath;
  const filteredImages = getFilteredAndSortedImagesSync();
  const deletedIndex = filteredImages.findIndex((img) => img.path === imagePath);
  const isLastImage = deletedIndex === filteredImages.length - 1;
  const isOnlyImage = filteredImages.length === 1;
  
  // Find the index in allImagePaths for removal
  const allImagePathsIndex = state.allImagePaths.findIndex((img) => img.path === imagePath);
  
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
    
    // Remove from image list (use allImagePathsIndex, not deletedIndex)
    if (allImagePathsIndex >= 0) {
      state.allImagePaths.splice(allImagePathsIndex, 1);
      state.notify();
      
      // Adjust currentIndex if the deleted image was before the current batch loading position
      if (allImagePathsIndex < state.currentIndex) {
        state.currentIndex -= 1;
      }
    }
    
    // Get updated filtered list (without the deleted image)
    const updatedFilteredImages = getFilteredAndSortedImagesSync();
    
    // Navigate to next or previous image
    if (isOnlyImage || updatedFilteredImages.length === 0) {
      // If it was the only image or no images remain, close the modal
      closeModal();
      showNotification("Image deleted. No more images in this directory.");
      state.isDeletingImage = false;
      return; // Return immediately to avoid generic notification
    } else if (isLastImage || deletedIndex >= updatedFilteredImages.length) {
      // If it was the last image, go to the previous one
      if (updatedFilteredImages.length > 0) {
        openModal(updatedFilteredImages[updatedFilteredImages.length - 1].path);
      } else {
        closeModal();
      }
    } else {
      // Otherwise, go to the next image (same index now points to the next one)
      if (deletedIndex < updatedFilteredImages.length) {
        openModal(updatedFilteredImages[deletedIndex].path);
      } else if (updatedFilteredImages.length > 0) {
        // If deleted image was beyond the list, go to the last image
        openModal(updatedFilteredImages[updatedFilteredImages.length - 1].path);
      } else {
        closeModal();
      }
    }
    
    showNotification("Image deleted");
  } catch (error) {
    showError(`Failed to delete image: ${error}`);
  } finally {
    // Always reset the deletion flag
    state.isDeletingImage = false;
  }
}


