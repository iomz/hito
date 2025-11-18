import { state } from "../state";
import { BATCH_SIZE } from "../constants";
import type { ImagePath, DirectoryContents } from "../types";
import { createElement } from "../utils/dom";
import { loadImageData, createImageElement, createPlaceholder, createErrorPlaceholder } from "../utils/images";
import { showSpinner, hideSpinner } from "../ui/spinner";
import { showError, clearError } from "../ui/error";
import { cleanupObserver } from "./observer";
import { showNotification } from "../ui/notification";
import { handleFolder } from "../handlers/dragDrop";
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
 * @param startIndex - Start index of the batch (unused, kept for API compatibility)
 * @param endIndex - End index of the batch (unused, kept for API compatibility)
 */
export async function loadImageBatch(startIndex: number, endIndex: number): Promise<void> {
  if (!ensureImagePathsArray("loadImageBatch")) {
    return;
  }
  
  if (state.isLoadingBatch || startIndex >= state.allImagePaths.length) {
    return;
  }
  
  // Set loading flag to prevent concurrent batch loads
  state.isLoadingBatch = true;
  
  // React components handle all actual image loading and rendering.
  // The ImageGrid component updates state.currentIndex directly, which triggers
  // React re-renders to show the new images.
  // Clear the flag after React has a chance to process the state update.
  await Promise.resolve(); // Yield to allow React to process state.currentIndex update
  state.isLoadingBatch = false;
}

export async function browseImages(path: string): Promise<void> {
  // React manages imageGrid and spinner now, so don't require DOM elements
  clearError();
  showSpinner();
  // Note: DropZone React component handles collapse/expand based on state.currentDirectory
  cleanupObserver();
  
  // Reset state
  state.currentIndex = 0;
  state.isLoadingBatch = false;
  state.loadedImages.clear();
  state.currentModalIndex = -1;
  state.currentDirectory = path;
  
  // Clear categories and hotkeys state before loading new config
  state.categories = [];
  state.imageCategories.clear();
  state.hotkeys = [];
  state.notify();
  
  // Reset config file path to default when browsing new directory
  const configFilePathInput = document.querySelector("#config-file-path-input") as HTMLInputElement | null;
  if (configFilePathInput) {
    configFilePathInput.value = "";
    configFilePathInput.placeholder = ".hito.json";
    state.configFilePath = "";
  }
  
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
      hideSpinner();
      return;
    }
    
    // Set currentIndex FIRST, then update arrays
    // This ensures ImageGrid sees the correct index when it mounts
    const firstBatchEnd = Math.min(BATCH_SIZE, images.length);
    state.currentIndex = images.length > 0 ? firstBatchEnd : 0;
    
    // Now update the arrays - this will trigger ImageGrid to mount
    state.allDirectoryPaths = directories;
    state.allImagePaths = images;
    state.notify();
    
    // Load categories and hotkeys for this directory
    await loadHitoConfig();
    
    // Show sidebar toggle button when browsing a directory
    const hotkeySidebarToggle = document.querySelector("#hotkey-sidebar-toggle") as HTMLElement | null;
    if (hotkeySidebarToggle) {
      hotkeySidebarToggle.style.display = "flex";
    }
    
    // Hide spinner after everything is loaded
    hideSpinner();
  } catch (error) {
    console.error('[browseImages] ERROR:', error);
    hideSpinner();
    showError(`Error: ${error}`);
  }
}

