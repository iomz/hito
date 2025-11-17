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

/**
 * Loads a range of images into the grid and ensures subsequent batch loading is scheduled.
 *
 * Loads images from state.allImagePaths between `startIndex` (inclusive) and `endIndex` (exclusive),
 * rendering placeholders while each image is fetched, replacing them with the loaded image or an error
 * placeholder on failure, updating internal loading state, and configuring or cleaning up the
 * intersection observer used to trigger further batch loads.
 *
 * This function is a no-op if a batch is already loading, `startIndex` is outside the available
 * images, or the image grid element is not present.
 *
 * @param startIndex - Inclusive start index into `state.allImagePaths` for this batch
 * @param endIndex - Exclusive end index for this batch (may be beyond available images; it will be clamped)
 */
export async function loadImageBatch(startIndex: number, endIndex: number): Promise<void> {
  // Ensure allImagePaths is an array
  if (!Array.isArray(state.allImagePaths)) {
    console.error("state.allImagePaths is not an array:", state.allImagePaths);
    state.allImagePaths = [];
    return;
  }
  
  if (state.isLoadingBatch || startIndex >= state.allImagePaths.length || !elements.imageGrid) {
    return;
  }
  
  state.isLoadingBatch = true;
  const actualEndIndex = Math.min(endIndex, state.allImagePaths.length);
  const batch = state.allImagePaths.slice(startIndex, actualEndIndex);
  
  const loadPromises = batch.map(async (imagePathObj) => {
    const imagePath = imagePathObj.path;
    const imageItem = createElement("div", "image-item");
    imageItem.style.backgroundColor = "#f0f0f0";
    imageItem.style.display = "flex";
    imageItem.style.alignItems = "center";
    imageItem.style.justifyContent = "center";
    // Store the image path as a data attribute for easy lookup
    imageItem.setAttribute("data-image-path", imagePath);
    
    imageItem.appendChild(createPlaceholder());
    elements.imageGrid!.appendChild(imageItem);
    
    try {
      const dataUrl = await loadImageData(imagePath);
      imageItem.innerHTML = "";
      imageItem.style.backgroundColor = "";
      // Re-set the data attribute after clearing innerHTML
      imageItem.setAttribute("data-image-path", imagePath);
      imageItem.appendChild(createImageElement(imagePath, dataUrl));
    } catch (error) {
      imageItem.innerHTML = "";
      // Re-set the data attribute after clearing innerHTML
      imageItem.setAttribute("data-image-path", imagePath);
      imageItem.appendChild(createErrorPlaceholder());
    }
  });
  
  await Promise.all(loadPromises);
  state.isLoadingBatch = false;
  
  if (actualEndIndex < state.allImagePaths.length) {
    removeSentinel();
    setupIntersectionObserver();
  } else {
    cleanupObserver();
  }
}

/**
 * Browse a directory and populate the image grid with its images.
 *
 * Initiates a fresh browse of `path`: clears previous UI state, requests the directory's image list, loads the initial batch of images into the grid, and sets up the intersection observer to load additional batches when available. On error, displays an error message in the UI and clears the grid.
 *
 * @param path - Filesystem path to the directory to browse
 */
export async function browseImages(path: string): Promise<void> {
  if (!elements.errorMsg || !elements.imageGrid || !elements.loadingSpinner) return;
  
  console.log("browseImages called with path:", path);
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
  
  try {
    if (!window.__TAURI__?.core?.invoke) {
      throw new Error("Tauri invoke API not available");
    }
    console.log("Calling list_images with path:", path);
    const contents = await window.__TAURI__.core.invoke<DirectoryContents>("list_images", { path });
    console.log("Received directories:", contents.directories?.length ?? 0, "images:", contents.images?.length ?? 0);
    hideSpinner();
    
    // Store directories and images - ensure they are arrays
    const directories = Array.isArray(contents.directories) ? contents.directories : [];
    const images = Array.isArray(contents.images) ? contents.images : [];
    
    state.allDirectoryPaths = directories;
    state.allImagePaths = images;
    
    // Display directories first
    if (!elements.imageGrid) return;
    
    directories.forEach((dir) => {
      const dirItem = createElement("div", "image-item directory-item");
      dirItem.setAttribute("data-directory-path", dir.path);
      dirItem.style.cursor = "pointer";
      dirItem.style.display = "flex";
      dirItem.style.flexDirection = "column";
      dirItem.style.alignItems = "center";
      dirItem.style.justifyContent = "center";
      dirItem.style.backgroundColor = "#f0f0f0";
      dirItem.style.borderRadius = "8px";
      
      // Extract directory name from path
      const normalized = dir.path.replace(/\\/g, "/");
      const dirName = normalized.split("/").pop() || dir.path;
      
      // Folder icon (simple SVG)
      const folderIcon = createElement("div");
      folderIcon.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      folderIcon.style.color = "#22c55e";
      folderIcon.style.marginBottom = "8px";
      
      const dirNameEl = createElement("div", "directory-name");
      dirNameEl.textContent = dirName;
      dirNameEl.style.fontSize = "0.9em";
      dirNameEl.style.color = "#333";
      dirNameEl.style.textAlign = "center";
      dirNameEl.style.padding = "0 8px";
      dirNameEl.style.wordBreak = "break-word";
      
      dirItem.appendChild(folderIcon);
      dirItem.appendChild(dirNameEl);
      
      dirItem.onclick = () => {
        handleFolder(dir.path);
      };
      
      if (elements.imageGrid) {
        elements.imageGrid.appendChild(dirItem);
      }
    });
    
    if (images.length === 0 && directories.length === 0) {
      showNotification("No images or directories found in this directory.");
      return;
    }
    
    // Load images
    if (images.length > 0) {
      const firstBatchEnd = Math.min(BATCH_SIZE, state.allImagePaths.length);
      state.currentIndex = firstBatchEnd;
      await loadImageBatch(0, firstBatchEnd);
      
      if (state.allImagePaths.length > BATCH_SIZE) {
        setupIntersectionObserver();
      }
    }
  } catch (error) {
    hideSpinner();
    showError(`Error: ${error}`);
    clearImageGrid();
  }
}

