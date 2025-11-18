import { state } from "../state";
import { BATCH_SIZE } from "../constants";
import type { ImagePath, DirectoryContents } from "../types";
import { createElement } from "../utils/dom";
import { loadImageData, createImageElement, createPlaceholder, createErrorPlaceholder } from "../utils/images";
import { showSpinner, hideSpinner } from "../ui/spinner";
import { showError, clearError } from "../ui/error";
import { clearImageGrid, removeSentinel } from "../ui/grid";
// Note: collapseDropZone import removed - React handles this now
import { cleanupObserver, setupIntersectionObserver } from "./observer";
import { showNotification } from "../ui/notification";
import { handleFolder } from "../handlers/dragDrop";
import { loadHitoConfig } from "../ui/categories";
import { ensureImagePathsArray } from "../utils/state";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";

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
  // React manages imageGrid now, so don't require it
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  const loadingSpinner = document.querySelector("#loading-spinner") as HTMLElement | null;
  if (!errorMsg || !loadingSpinner) {
    console.error('[browseImages] Missing elements:', {
      errorMsg: !!errorMsg,
      loadingSpinner: !!loadingSpinner
    });
    return;
  }
  
  clearError();
  clearImageGrid();
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
    
    // Load categories and hotkeys for this directory
    await loadHitoConfig();
    
    // Render category and hotkey lists (will show empty state if no config)
    const { renderCategoryList } = await import("../ui/categories");
    const { renderHotkeyList } = await import("../ui/hotkeys");
    renderCategoryList();
    renderHotkeyList();
    
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
    clearImageGrid();
  }
}

