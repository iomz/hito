import { state, elements } from "../state.js";
import { BATCH_SIZE } from "../constants.js";
import type { ImagePath, DirectoryContents } from "../types.js";
import { createElement } from "../utils/dom.js";
import { loadImageData, createImageElement, createPlaceholder, createErrorPlaceholder } from "../utils/images.js";
import { showSpinner, hideSpinner } from "../ui/spinner.js";
import { showError, clearError } from "../ui/error.js";
import { clearImageGrid, removeSentinel } from "../ui/grid.js";
import { collapseDropZone } from "../ui/dropZone.js";
import { cleanupObserver, setupIntersectionObserver } from "./observer.js";
import { showNotification } from "../ui/notification.js";
import { handleFolder } from "../handlers/dragDrop.js";
import { loadHitoConfig } from "../ui/categories.js";
import { ensureImagePathsArray } from "../utils/state.js";
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
  if (!elements.errorMsg || !elements.imageGrid || !elements.loadingSpinner) return;
  
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
    if (!isTauriInvokeAvailable()) {
      throw new Error("Tauri invoke API not available");
    }
    const contents = await invokeTauri<DirectoryContents>("list_images", { path });
    hideSpinner();
    
    // Store directories and images - ensure they are arrays
    const directories = Array.isArray(contents.directories) ? contents.directories : [];
    const images = Array.isArray(contents.images) ? contents.images : [];
    
    state.allDirectoryPaths = directories;
    state.allImagePaths = images;
    
    if (images.length === 0 && directories.length === 0) {
      showNotification("No images or directories found in this directory.");
      return;
    }
    
    // React components will handle rendering directories and images
    // Just set up the initial batch size for images
    if (images.length > 0) {
      const firstBatchEnd = Math.min(BATCH_SIZE, state.allImagePaths.length);
      state.currentIndex = firstBatchEnd;
    }
    
    // Load categories and hotkeys for this directory
    await loadHitoConfig();
    
    // Render category and hotkey lists (will show empty state if no config)
    const { renderCategoryList } = await import("../ui/categories.js");
    const { renderHotkeyList } = await import("../ui/hotkeys.js");
    renderCategoryList();
    renderHotkeyList();
    
    // Show sidebar toggle button when browsing a directory
    if (elements.hotkeySidebarToggle) {
      elements.hotkeySidebarToggle.style.display = "flex";
    }
  } catch (error) {
    hideSpinner();
    showError(`Error: ${error}`);
    clearImageGrid();
  }
}

