import { state, elements } from "../state";
import { BATCH_SIZE } from "../constants.js";
import type { ImagePath, DirectoryContents } from "../types.js";
import { createElement } from "../utils/dom.js";
import { loadImageData, createImageElement, createPlaceholder, createErrorPlaceholder } from "../utils/images.js";
import { showSpinner, hideSpinner } from "../ui/spinner.js";
import { showError, clearError } from "../ui/error.js";
import { clearImageGrid, removeSentinel } from "../ui/grid";
import { collapseDropZone } from "../ui/dropZone.js";
import { cleanupObserver, setupIntersectionObserver } from "./observer.js";
import { showNotification } from "../ui/notification.js";
import { handleFolder } from "../handlers/dragDrop.js";
import { loadHitoConfig } from "../ui/categories";
import { ensureImagePathsArray } from "../utils/state";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri.js";

export async function loadImageBatch(startIndex: number, endIndex: number): Promise<void> {
  if (!ensureImagePathsArray("loadImageBatch")) {
    return;
  }
  
  if (state.isLoadingBatch || startIndex >= state.allImagePaths.length) {
    return;
  }
  
  state.isLoadingBatch = true;
  const actualEndIndex = Math.min(endIndex, state.allImagePaths.length);
  
  // Just wait a bit to simulate batch loading
  // React components will handle the actual rendering
  await new Promise(resolve => setTimeout(resolve, 100));
  
  state.isLoadingBatch = false;
}

export async function browseImages(path: string): Promise<void> {
  console.log('[browseImages] START - path:', path);
  // React manages imageGrid now, so don't require it
  if (!elements.errorMsg || !elements.loadingSpinner) {
    console.error('[browseImages] Missing elements:', {
      errorMsg: !!elements.errorMsg,
      loadingSpinner: !!elements.loadingSpinner
    });
    return;
  }
  
  console.log('[browseImages] Elements OK, proceeding...');
  clearError();
  clearImageGrid();
  showSpinner();
  collapseDropZone();
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
  
  // Reset config file path to default when browsing new directory
  if (elements.configFilePathInput) {
    elements.configFilePathInput.value = "";
    elements.configFilePathInput.placeholder = ".hito.json";
    state.configFilePath = "";
  }
  
  try {
    console.log('[browseImages] Checking Tauri invoke availability...');
    if (!isTauriInvokeAvailable()) {
      throw new Error("Tauri invoke API not available");
    }
    console.log('[browseImages] Invoking list_images for path:', path);
    const contents = await invokeTauri<DirectoryContents>("list_images", { path });
    console.log('[browseImages] Received contents:', {
      directoriesCount: contents.directories?.length || 0,
      imagesCount: contents.images?.length || 0
    });
    
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
    
    console.log('[browseImages] Setting state:', {
      currentIndex: state.currentIndex,
      imagesLength: images.length,
      directoriesLength: directories.length,
      firstBatchEnd
    });
    
    // Now update the arrays - this will trigger ImageGrid to mount
    state.allDirectoryPaths = directories;
    state.allImagePaths = images;
    
    // Load categories and hotkeys for this directory
    await loadHitoConfig();
    
    // Render category and hotkey lists (will show empty state if no config)
    const { renderCategoryList } = await import("../ui/categories");
    const { renderHotkeyList } = await import("../ui/hotkeys");
    renderCategoryList();
    renderHotkeyList();
    
    // Show sidebar toggle button when browsing a directory
    if (elements.hotkeySidebarToggle) {
      elements.hotkeySidebarToggle.style.display = "flex";
    }
    
    // Hide spinner after everything is loaded
    console.log('[browseImages] SUCCESS - hiding spinner');
    hideSpinner();
  } catch (error) {
    console.error('[browseImages] ERROR:', error);
    hideSpinner();
    showError(`Error: ${error}`);
    clearImageGrid();
  }
}

