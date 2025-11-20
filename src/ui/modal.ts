import { store, deleteFromAtomMap } from "../utils/jotaiStore";
import {
  currentModalImagePathAtom,
  loadedImagesAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
  shortcutsOverlayVisibleAtom,
  isDeletingImageAtom,
  allImagePathsAtom,
  currentIndexAtom,
} from "../state";
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
  store.set(currentModalImagePathAtom, imagePath);
  
  // Pre-load image data if not already loaded (React component will use it)
  const loadedImages = store.get(loadedImagesAtom);
  let dataUrl = loadedImages.get(imagePath);
  if (!dataUrl) {
    try {
      // loadImageData will update the cache atomically, so we don't need to update it here
      dataUrl = await loadImageData(imagePath);
    } catch (error) {
      showError(`Error loading image: ${error}`);
      // Reset modal on error
      store.set(currentModalImagePathAtom, "");
      return;
    }
  }
  
  // Check if a newer modal request has been made while we were loading
  const currentModalImagePath = store.get(currentModalImagePathAtom);
  if (currentModalImagePath !== requestedPath) {
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
  store.set(currentModalImagePathAtom, "");
  
  // Clear suppress flag and cached snapshot to trigger deferred re-filtering from category assignments
  const hadSuppress = store.get(suppressCategoryRefilterAtom);
  store.set(suppressCategoryRefilterAtom, false);
  store.set(cachedImageCategoriesForRefilterAtom, null);
  
  // Hide shortcuts overlay if visible
  hideShortcutsOverlay();
}

/**
 * Advance the modal viewer to the next image in the filtered/sorted list if one exists.
 *
 * Does nothing when the currently shown image is the last in the filtered list.
 * Clears suppressCategoryRefilter flag to trigger deferred re-filtering.
 */
export function showNextImage(): void {
  const currentModalImagePath = store.get(currentModalImagePathAtom);
  if (!currentModalImagePath) {
    return;
  }
  
  // Get current index in old filtered list BEFORE clearing suppress flag
  // This preserves the position when the current image is removed from the filter or re-sorted
  const hadSuppress = store.get(suppressCategoryRefilterAtom);
  const oldFilteredImages = getFilteredAndSortedImagesSync();
  const oldIndex = oldFilteredImages.findIndex((img) => img.path === currentModalImagePath);
  
  // Remember what image was next in the old sort order before clearing suppress
  // This ensures we navigate to the same image even if sort order changes
  const oldNextImagePath = oldIndex >= 0 && oldIndex < oldFilteredImages.length - 1
    ? oldFilteredImages[oldIndex + 1].path
    : null;
  
  // Clear suppress flag and cached snapshot to trigger deferred re-filtering from category assignments
  store.set(suppressCategoryRefilterAtom, false);
  store.set(cachedImageCategoriesForRefilterAtom, null);
  
  const filteredImages = getFilteredAndSortedImagesSync();
  const currentIndex = filteredImages.findIndex((img) => img.path === currentModalImagePath);
  
  // If suppress was active, the sort order may have changed, so always use remembered next/previous
  // instead of navigating based on the new position
  if (hadSuppress) {
    if (oldNextImagePath) {
      // Current image moved in sort order (e.g., from index 5 to last after toggling category)
      // Navigate to the image that was next in the old order (at index 6), not based on new position
      const newIndex = filteredImages.findIndex((img) => img.path === oldNextImagePath);
      if (newIndex >= 0) {
        openModal(filteredImages[newIndex].path);
      } else if (filteredImages.length > 0) {
        // Old next image no longer in filtered list, fall back to position-based navigation
        const targetIndex = Math.min(oldIndex, filteredImages.length - 1);
        openModal(filteredImages[targetIndex].path);
      }
    } else if (oldIndex < 0 && filteredImages.length > 0) {
      // Image was removed from filtered list (not found in old list), navigate to first image
      openModal(filteredImages[0].path);
    } else if (oldIndex >= 0 && filteredImages.length > 0) {
      // We were at the last index in old order (oldNextImagePath is null), preserve position
      const targetIndex = Math.min(oldIndex, filteredImages.length - 1);
      openModal(filteredImages[targetIndex].path);
    }
    // If oldIndex < 0 and filteredImages is empty, don't navigate
  } else if (currentIndex >= 0) {
    // Current image is still in filtered list and suppress was not active, navigate to next
    if (currentIndex < filteredImages.length - 1) {
      openModal(filteredImages[currentIndex + 1].path);
    }
  }
}

/**
 * Move the modal view to the previous image in the filtered/sorted list.
 *
 * If a previous image exists, opens the modal for that image; otherwise does nothing.
 * Clears suppressCategoryRefilter flag to trigger deferred re-filtering.
 */
export function showPreviousImage(): void {
  const currentModalImagePath = store.get(currentModalImagePathAtom);
  if (!currentModalImagePath) {
    return;
  }
  
  // Get current index in old filtered list BEFORE clearing suppress flag
  // This preserves the position when the current image is removed from the filter or re-sorted
  const hadSuppress = store.get(suppressCategoryRefilterAtom);
  const oldFilteredImages = getFilteredAndSortedImagesSync();
  const oldIndex = oldFilteredImages.findIndex((img) => img.path === currentModalImagePath);
  
  // Remember what image was previous in the old sort order before clearing suppress
  // This ensures we navigate to the same image even if sort order changes
  const oldPreviousImagePath = oldIndex > 0
    ? oldFilteredImages[oldIndex - 1].path
    : null;
  
  // Clear suppress flag and cached snapshot to trigger deferred re-filtering from category assignments
  store.set(suppressCategoryRefilterAtom, false);
  store.set(cachedImageCategoriesForRefilterAtom, null);
  
  const filteredImages = getFilteredAndSortedImagesSync();
  const currentIndex = filteredImages.findIndex((img) => img.path === currentModalImagePath);
  
  // If suppress was active, the sort order may have changed, so always use remembered next/previous
  // instead of navigating based on the new position
  if (hadSuppress) {
    if (oldPreviousImagePath) {
      // Current image moved in sort order (e.g., from index 5 to last after toggling category)
      // Navigate to the image that was previous in the old order (at index 4), not based on new position
      const newIndex = filteredImages.findIndex((img) => img.path === oldPreviousImagePath);
      if (newIndex >= 0) {
        openModal(filteredImages[newIndex].path);
      } else if (filteredImages.length > 0) {
        // Old previous image no longer in filtered list, fall back to position-based navigation
        const targetIndex = Math.min(Math.max(0, oldIndex - 1), filteredImages.length - 1);
        openModal(filteredImages[targetIndex].path);
      }
    } else if (oldIndex < 0 && filteredImages.length > 0) {
      // Image was removed from filtered list (not found in old list), navigate to last image
      openModal(filteredImages[filteredImages.length - 1].path);
    } else if (oldIndex >= 0 && filteredImages.length > 0) {
      // We were at the first index in old order (oldPreviousImagePath is null), preserve position
      const targetIndex = Math.min(Math.max(0, oldIndex - 1), filteredImages.length - 1);
      openModal(filteredImages[targetIndex].path);
    }
    // If oldIndex < 0 and filteredImages is empty, don't navigate
  } else if (currentIndex >= 0) {
    // Current image is still in filtered list and suppress was not active, navigate to previous
    if (currentIndex > 0) {
      openModal(filteredImages[currentIndex - 1].path);
    }
  }
}


/**
 * Toggle the keyboard shortcuts overlay between visible and hidden.
 */
export function toggleShortcutsOverlay(): void {
  const current = store.get(shortcutsOverlayVisibleAtom);
  store.set(shortcutsOverlayVisibleAtom, !current);
}

/**
 * Hide the keyboard shortcuts overlay.
 */
export function hideShortcutsOverlay(): void {
  store.set(shortcutsOverlayVisibleAtom, false);
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
  const isDeletingImage = store.get(isDeletingImageAtom);
  if (isDeletingImage) {
    return;
  }
  
  if (!ensureImagePathsArray("deleteCurrentImage")) {
    return;
  }
  
  const currentModalImagePath = store.get(currentModalImagePathAtom);
  if (!currentModalImagePath) {
    return;
  }
  
  const imagePath = currentModalImagePath;
  const filteredImages = getFilteredAndSortedImagesSync();
  const deletedIndex = filteredImages.findIndex((img) => img.path === imagePath);
  const isLastImage = deletedIndex === filteredImages.length - 1;
  const isOnlyImage = filteredImages.length === 1;
  
  // Find the index in allImagePaths for removal
  const allImagePaths = store.get(allImagePathsAtom);
  const allImagePathsIndex = allImagePaths.findIndex((img) => img.path === imagePath);
  
  if (!isTauriInvokeAvailable()) {
    showError("Tauri invoke API not available");
    return;
  }
  
  // Set deletion flag to prevent re-entrancy
  store.set(isDeletingImageAtom, true);
  
  try {
    await invokeTauri("delete_image", { imagePath });
    
    // Remove from loaded images cache
    deleteFromAtomMap(loadedImagesAtom, imagePath);
    
    // Remove from image list (use allImagePathsIndex, not deletedIndex)
    if (allImagePathsIndex >= 0) {
      const updatedAllImagePaths = [...allImagePaths];
      updatedAllImagePaths.splice(allImagePathsIndex, 1);
      store.set(allImagePathsAtom, updatedAllImagePaths);
      
      // Adjust currentIndex if the deleted image was before the current batch loading position
      const currentIndex = store.get(currentIndexAtom);
      if (allImagePathsIndex < currentIndex) {
        store.set(currentIndexAtom, currentIndex - 1);
      }
    }
    
    // Get updated filtered list (without the deleted image)
    const updatedFilteredImages = getFilteredAndSortedImagesSync();
    
    // Navigate to next or previous image
    if (isOnlyImage || updatedFilteredImages.length === 0) {
      // If it was the only image or no images remain, close the modal
      closeModal();
      showNotification("Image deleted. No more images in this directory.");
      store.set(isDeletingImageAtom, false);
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
      // Only access array if deletedIndex is valid (>= 0) and within bounds
      if (deletedIndex >= 0 && deletedIndex < updatedFilteredImages.length) {
        openModal(updatedFilteredImages[deletedIndex].path);
      } else if (updatedFilteredImages.length > 0) {
        // If deleted image was not in filtered list (deletedIndex < 0) or beyond the list,
        // go to the last image
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
    store.set(isDeletingImageAtom, false);
  }
}


