import { store } from "../utils/jotaiStore";
import {
  allImagePathsAtom,
  allDirectoryPathsAtom,
  currentIndexAtom,
  isLoadingBatchAtom,
  loadedImagesAtom,
  currentModalIndexAtom,
  currentModalImagePathAtom,
  currentDirectoryAtom,
  configFilePathAtom,
  categoriesAtom,
  imageCategoriesAtom,
  hotkeysAtom,
  isLoadingAtom,
} from "../state";
import { BATCH_SIZE } from "../constants";
import type { DirectoryContents } from "../types";
import { showNotification } from "../ui/notification";
import { showError, clearError } from "../ui/error";
import { loadHitoConfig } from "../ui/categories";
import { ensureImagePathsArray } from "../utils/state";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";

/**
 * Manages the batch loading state flag to prevent concurrent batch loading operations.
 * 
 * IMPORTANT: This function does NOT actually load images. React components (ImageGrid) handle
 * all image loading and rendering. This function only manages the `isLoadingBatch` flag
 * to coordinate with the IntersectionObserver and prevent race conditions.
 * 
 * The flag is set to prevent concurrent calls, then cleared after React has a chance to
 * process the state update (via microtask). The function name is kept for backward compatibility,
 * but it should be understood that this is a state management function, not an image loading function.
 * 
 * @param startIndex - Start index of the batch; used to guard against out-of-range requests
 * @param endIndex - End index of the batch (unused, kept for API compatibility)
 */
export async function loadImageBatch(startIndex: number, endIndex: number): Promise<void> {
  if (!ensureImagePathsArray("loadImageBatch")) {
    return;
  }
  
  const allImagePaths = store.get(allImagePathsAtom);
  const isLoadingBatch = store.get(isLoadingBatchAtom);
  
  if (isLoadingBatch || startIndex >= allImagePaths.length) {
    return;
  }
  
  // Set loading flag to prevent concurrent batch loads
  store.set(isLoadingBatchAtom, true);
  
  // React components handle all actual image loading and rendering.
  // The ImageGrid component updates currentIndexAtom directly, which triggers
  // React re-renders to show the new images.
  // Clear the flag after React has a chance to process the state update.
  await Promise.resolve(); // Yield to allow React to process currentIndexAtom update
  store.set(isLoadingBatchAtom, false);
}

export async function browseImages(path: string): Promise<void> {
  clearError();
  store.set(isLoadingAtom, true);
  
  // Reset state
  store.set(currentIndexAtom, 0);
  store.set(isLoadingBatchAtom, false);
  store.set(loadedImagesAtom, new Map<string, string>());
  store.set(currentModalIndexAtom, -1);
  store.set(currentModalImagePathAtom, "");
  store.set(currentDirectoryAtom, path);
  
  // Clear categories and hotkeys state before loading new config
  store.set(categoriesAtom, []);
  store.set(imageCategoriesAtom, new Map());
  store.set(hotkeysAtom, []);
  
  // Reset config file path to default when browsing new directory
  store.set(configFilePathAtom, "");
  
  try {
    if (!isTauriInvokeAvailable()) {
      throw new Error("Tauri invoke API not available");
    }
    const contents = await invokeTauri<DirectoryContents>("list_images", { path });
    
    // Store directories and images - ensure they are arrays
    const directories = Array.isArray(contents.directories) ? contents.directories : [];
    const images = Array.isArray(contents.images) ? contents.images : [];
    
    if (images.length === 0 && directories.length === 0) {
      showNotification("No images or directories found in this directory.");
      store.set(isLoadingAtom, false);
      return;
    }
    
    // Set currentIndex FIRST, then update arrays
    // This ensures ImageGrid sees the correct index when it mounts.
    // NOTE: currentIndex represents the exclusive end of the loaded range (i.e., the count
    // of loaded images), not a position/index. When images.length > 0, it's set to firstBatchEnd
    // to indicate the first batch of images should be loaded. When 0, it means no images are loaded.
    const firstBatchEnd = Math.min(BATCH_SIZE, images.length);
    store.set(currentIndexAtom, images.length > 0 ? firstBatchEnd : 0);
    
    // Now update the arrays - this will trigger ImageGrid to mount
    store.set(allDirectoryPathsAtom, directories);
    store.set(allImagePathsAtom, images);
    
    // Load categories and hotkeys for this directory
    await loadHitoConfig();
    
    // Hide spinner after everything is loaded
    store.set(isLoadingAtom, false);
  } catch (error) {
    console.error('[browseImages] ERROR:', error);
    store.set(isLoadingAtom, false);
    showError(`Error: ${error}`);
  }
}

