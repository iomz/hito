// Use window.__TAURI__ directly (works without bundler)
// Type imports are fine - they're removed during compilation
import type { Event } from "@tauri-apps/api/event";

// Type definitions
interface ImagePath {
  path: string;
}

interface DragDropEvent {
  payload?: {
    paths?: string[];
    position?: { x: number; y: number };
  };
  paths?: string[];
}

// Type augmentation for window.__TAURI__
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      dialog?: {
        open: (options?: { directory?: boolean; multiple?: boolean; title?: string }) => Promise<string | string[] | null>;
      };
      event: {
        listen: <T = unknown>(event: string, handler: (event: Event<T>) => void) => Promise<() => void>;
      };
    };
  }
}

// Dialog is provided via plugin, accessed through window.__TAURI__
function open(options?: { directory?: boolean; multiple?: boolean; title?: string }): Promise<string | string[] | null> {
  if (!window.__TAURI__?.dialog?.open) {
    throw new Error("Dialog API not available");
  }
  return window.__TAURI__.dialog.open(options);
}

// Constants
const BATCH_SIZE = 30;
const DRAG_EVENTS = {
  DROP: "tauri://drag-drop",
  ENTER: "tauri://drag-enter",
  LEAVE: "tauri://drag-leave",
  OVER: "tauri://drag-over"
} as const;

// State
const state = {
  allImagePaths: [] as ImagePath[],
  currentIndex: 0,
  isLoadingBatch: false,
  intersectionObserver: null as IntersectionObserver | null,
  loadedImages: new Map<string, string>(),
  currentModalIndex: -1
};

// DOM Elements
const elements = {
  dropZone: null as HTMLElement | null,
  currentPath: null as HTMLElement | null,
  errorMsg: null as HTMLElement | null,
  imageGrid: null as HTMLElement | null,
  loadingSpinner: null as HTMLElement | null,
  modal: null as HTMLElement | null,
  modalImage: null as HTMLImageElement | null,
  modalCaption: null as HTMLElement | null,
  closeBtn: null as HTMLElement | null,
  shortcutsOverlay: null as HTMLElement | null,
  modalPrevBtn: null as HTMLElement | null,
  modalNextBtn: null as HTMLElement | null
};

/**
 * Selects the first DOM element that matches the provided CSS selector.
 *
 * @returns The first matching element, or `null` if no match is found.
 */
function querySelector<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

/**
 * Create an HTMLElement of the given tag with an optional CSS class and text content.
 *
 * @returns The created `HTMLElement`, with the provided `className` and `textContent` applied when given.
 */
function createElement(tag: string, className?: string, textContent?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

/**
 * Make the loading spinner visible.
 *
 * If the spinner element is not available in the DOM, this is a no-op.
 */
function showSpinner(): void {
  if (!elements.loadingSpinner) return;
  elements.loadingSpinner.style.display = "flex";
  void elements.loadingSpinner.offsetHeight; // Force reflow
}

/**
 * Hide the loading spinner element if present.
 *
 * Does nothing when the spinner element is not available.
 */
function hideSpinner(): void {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = "none";
  }
}

/**
 * Collapse the drop-zone container UI.
 *
 * Adds the `collapsed` class to the path input container and the drop zone so they transition to their collapsed state.
 */
function collapseDropZone(): void {
  const container = querySelector<HTMLElement>(".path-input-container");
  const dropZone = querySelector<HTMLElement>("#drop-zone");
  if (container && dropZone) {
    container.classList.add("collapsed");
    dropZone.classList.add("collapsed");
    void container.offsetHeight; // Force reflow
  }
}

/**
 * Expand the UI drop-zone container to its non-collapsed state.
 *
 * Removes the `collapsed` class from the path input container and drop zone elements if they exist in the DOM.
 */
function expandDropZone(): void {
  const container = querySelector<HTMLElement>(".path-input-container");
  const dropZone = querySelector<HTMLElement>("#drop-zone");
  if (container && dropZone) {
    container.classList.remove("collapsed");
    dropZone.classList.remove("collapsed");
  }
}

/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
function showError(message: string): void {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = message;
  }
}

/**
 * Clear any visible error message from the UI.
 *
 * Removes the text content of the configured error message element if it exists.
 */
function clearError(): void {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = "";
  }
}

/**
 * Removes all child nodes from the image grid container.
 *
 * If the image grid element is not present, the function does nothing.
 */
function clearImageGrid(): void {
  if (elements.imageGrid) {
    elements.imageGrid.innerHTML = "";
  }
}

/**
 * Load an image from disk, return its data URL, and cache it in the module's image cache.
 *
 * @param imagePath - The filesystem path of the image to load
 * @returns The image encoded as a data URL string
 * @throws If the Tauri invoke API is unavailable or the image cannot be loaded or decoded
 */
async function loadImageData(imagePath: string): Promise<string> {
  try {
    if (!window.__TAURI__?.core?.invoke) {
      throw new Error("Tauri invoke API not available");
    }
    const dataUrl = await window.__TAURI__.core.invoke<string>("load_image", { imagePath });
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error(`Invalid data URL returned for ${imagePath}`);
    }
    state.loadedImages.set(imagePath, dataUrl);
    return dataUrl;
  } catch (error) {
    throw new Error(`Failed to load image: ${error}`);
  }
}

/**
 * Create an image element for a given image path and data URL, with lazy loading,
 * an inline error fallback, and a click handler that opens the image modal.
 *
 * @param imagePath - Original filesystem path used for the element's alt text and to locate the image in the gallery when opening the modal
 * @param dataUrl - Data URL or source string to assign to the image's `src`
 * @returns The constructed HTMLImageElement with lazy loading, an error fallback image, and a click handler that opens the modal at this image's index
 */
function createImageElement(imagePath: string, dataUrl: string): HTMLImageElement {
  const img = createElement("img") as HTMLImageElement;
  img.src = dataUrl;
  img.alt = imagePath.split("/").pop() || imagePath;
  img.loading = "lazy";
  
  img.onerror = () => {
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EFailed to load%3C/text%3E%3C/svg%3E";
  };
  
  img.onclick = () => {
    const imageIndex = state.allImagePaths.findIndex(img => img.path === imagePath);
    openModal(imageIndex);
  };
  
  return img;
}

/**
 * Creates a lightweight placeholder element displayed while an image is loading.
 *
 * @returns A DIV element with class `image-placeholder` and text content `"Loading..."` to show in image slots during load.
 */
function createPlaceholder(): HTMLElement {
  const placeholder = createElement("div", "image-placeholder", "Loading...");
  placeholder.style.color = "#999";
  placeholder.style.fontSize = "0.9em";
  return placeholder;
}

/**
 * Create a visual placeholder used when an image fails to load.
 *
 * @returns An HTMLElement (a styled `div`) containing the text "Failed to load" and styled to indicate an error state.
 */
function createErrorPlaceholder(): HTMLElement {
  const errorDiv = createElement("div", undefined, "Failed to load");
  errorDiv.style.backgroundColor = "#fee";
  errorDiv.style.color = "#c33";
  errorDiv.style.fontSize = "0.9em";
  errorDiv.style.padding = "10px";
  errorDiv.style.textAlign = "center";
  return errorDiv;
}

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
async function loadImageBatch(startIndex: number, endIndex: number): Promise<void> {
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
    
    imageItem.appendChild(createPlaceholder());
    elements.imageGrid!.appendChild(imageItem);
    
    try {
      const dataUrl = await loadImageData(imagePath);
      imageItem.innerHTML = "";
      imageItem.style.backgroundColor = "";
      imageItem.appendChild(createImageElement(imagePath, dataUrl));
    } catch (error) {
      imageItem.innerHTML = "";
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
 * Remove the DOM element with id "load-more-sentinel" if it exists.
 *
 * This clears the sentinel used to trigger loading additional image batches.
 */
function removeSentinel(): void {
  const sentinel = document.getElementById("load-more-sentinel");
  if (sentinel) sentinel.remove();
}

/**
 * Removes the load-more sentinel from the DOM and disconnects any active IntersectionObserver.
 *
 * Performs cleanup of the module's intersection-observer-driven loading state by removing the sentinel element and, if present, disconnecting and clearing the stored observer reference.
 */
function cleanupObserver(): void {
  removeSentinel();
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }
}

/**
 * Initialize an IntersectionObserver and a "load-more-sentinel" element that triggers loading of the next image batch when the sentinel enters the viewport.
 *
 * If an existing observer is present it is disconnected and replaced. If the sentinel element does not exist it is created and appended to the image grid.
 */
function setupIntersectionObserver(): void {
  if (!elements.imageGrid) return;
  
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
  }
  
  let sentinel = document.getElementById("load-more-sentinel");
  if (!sentinel) {
    sentinel = createElement("div");
    sentinel.id = "load-more-sentinel";
    sentinel.style.height = "100px";
    elements.imageGrid.appendChild(sentinel);
  }
  
  state.intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !state.isLoadingBatch) {
          const nextStartIndex = state.currentIndex;
          const nextEndIndex = state.currentIndex + BATCH_SIZE;
          state.currentIndex = nextEndIndex;
          loadImageBatch(nextStartIndex, nextEndIndex);
        }
      });
    },
    { rootMargin: "200px" }
  );
  
  state.intersectionObserver.observe(sentinel);
}

/**
 * Browse a directory and populate the image grid with its images.
 *
 * Initiates a fresh browse of `path`: clears previous UI state, requests the directory's image list, loads the initial batch of images into the grid, and sets up the intersection observer to load additional batches when available. On error, displays an error message in the UI and clears the grid.
 *
 * @param path - Filesystem path to the directory to browse
 */
async function browseImages(path: string): Promise<void> {
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
  
  try {
    if (!window.__TAURI__?.core?.invoke) {
      throw new Error("Tauri invoke API not available");
    }
    const imagePaths = await window.__TAURI__.core.invoke<ImagePath[]>("list_images", { path });
    hideSpinner();
    
    if (imagePaths.length === 0) {
      const message = createElement("p", undefined, "No images found in this directory.");
      if (elements.imageGrid) {
        elements.imageGrid.innerHTML = "";
        elements.imageGrid.appendChild(message);
      }
      return;
    }
    
    state.allImagePaths = imagePaths;
    const firstBatchEnd = Math.min(BATCH_SIZE, state.allImagePaths.length);
    state.currentIndex = firstBatchEnd;
    await loadImageBatch(0, firstBatchEnd);
    
    if (state.allImagePaths.length > BATCH_SIZE) {
      setupIntersectionObserver();
    }
  } catch (error) {
    hideSpinner();
    showError(`Error: ${error}`);
    clearImageGrid();
  }
}

/**
 * Opens the image viewer modal for the image at the given index, ensuring the image data is available and updating modal UI.
 *
 * If `imageIndex` is out of range or required modal elements are missing, the function does nothing. If loading the image data fails, an error message is shown and the modal is not opened.
 *
 * @param imageIndex - Index of the image in the current image list to display in the modal
 */
async function openModal(imageIndex: number): Promise<void> {
  if (imageIndex < 0 || imageIndex >= state.allImagePaths.length || 
      !elements.modalImage || !elements.modalCaption || !elements.modal) {
    return;
  }
  
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
  
  elements.modalImage.src = dataUrl;
  elements.modalCaption.textContent = 
    `${imageIndex + 1} / ${state.allImagePaths.length} - ${imagePath.split("/").pop() || imagePath}`;
  elements.modal.style.display = "flex";
  
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
  
  updateModalButtons();
}

/**
 * Update visibility of the modal's previous/next navigation buttons based on the current image index.
 *
 * Shows the previous button when the modal is not at the first image and shows the next button when the modal is not at the last image; hides each button otherwise.
 */
function updateModalButtons(): void {
  if (!elements.modalPrevBtn || !elements.modalNextBtn) return;
  
  elements.modalPrevBtn.style.display = state.currentModalIndex > 0 ? "block" : "none";
  elements.modalNextBtn.style.display = 
    state.currentModalIndex < state.allImagePaths.length - 1 ? "block" : "none";
}

/**
 * Advance the modal viewer to the next image if one exists.
 *
 * Does nothing when the currently shown image is the last in the list.
 */
function showNextImage(): void {
  if (state.currentModalIndex < state.allImagePaths.length - 1) {
    openModal(state.currentModalIndex + 1);
  }
}

/**
 * Move the modal view to the previous image in the gallery.
 *
 * If a previous image exists (current modal index > 0), opens the modal for that image; otherwise does nothing.
 */
function showPreviousImage(): void {
  if (state.currentModalIndex > 0) {
    openModal(state.currentModalIndex - 1);
  }
}

/**
 * Hide the image viewer modal and the keyboard shortcuts overlay if present.
 */
function closeModal(): void {
  if (elements.modal) {
    elements.modal.style.display = "none";
  }
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
}

/**
 * Toggle the keyboard shortcuts overlay between visible and hidden.
 *
 * If the overlay element is not present this function does nothing; otherwise it hides the overlay when shown and shows it when hidden.
 */
function toggleShortcutsOverlay(): void {
  if (!elements.shortcutsOverlay) return;
  const isVisible = elements.shortcutsOverlay.style.display === "flex";
  elements.shortcutsOverlay.style.display = isVisible ? "none" : "flex";
}

/**
 * Update the UI to show the selected folder and start loading its images.
 *
 * @param folderPath - Filesystem path of the folder to browse and load images from
 */
function handleFolder(folderPath: string): void {
  if (!elements.currentPath) return;
  
  elements.currentPath.textContent = `Browsing: ${folderPath}`;
  elements.currentPath.style.display = "block";
  collapseDropZone();
  browseImages(folderPath);
}

/**
 * Open a folder picker and handle the selected directory for image browsing.
 *
 * If the user selects a folder, calls `handleFolder` with the chosen path.
 * If the selection is cancelled or no valid path is returned, restores the drop
 * zone UI. On error, displays an error message and restores the drop zone UI.
 */
async function selectFolder(): Promise<void> {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a folder to browse images"
    });
    
    if (selected && typeof selected === 'string') {
      handleFolder(selected);
    } else if (selected && Array.isArray(selected) && selected.length > 0) {
      handleFolder(selected[0]);
    } else {
      hideSpinner();
      expandDropZone();
    }
  } catch (error) {
    hideSpinner();
    showError(`Error selecting folder: ${error}`);
    expandDropZone();
  }
}

/**
 * Normalize various drag-and-drop event shapes into a list of file paths.
 *
 * @param event - The drag/drop input which may be an array of path strings, a DragDropEvent object, or a Tauri `Event<DragDropEvent>` wrapper.
 * @returns An array of file paths extracted from the input, or `null` if no paths are present.
 */
function extractPathsFromEvent(event: Event<DragDropEvent> | DragDropEvent | string[]): string[] | null {
  if (Array.isArray(event)) {
    return event;
  }
  if (typeof event === 'object' && 'payload' in event && event.payload) {
    if (Array.isArray(event.payload.paths)) {
      return event.payload.paths;
    }
    if (Array.isArray(event.payload)) {
      return event.payload as string[];
    }
  }
  if (typeof event === 'object' && 'paths' in event && Array.isArray(event.paths)) {
    return event.paths;
  }
  return null;
}

/**
 * Handle a file or folder drop payload and initiate browsing of the detected folder.
 *
 * Clears prior UI state, extracts paths from the given drop payload (accepting a Tauri `Event<DragDropEvent>`, a `DragDropEvent`, or an array of path strings), validates that a Tauri invoke API is available, and attempts to locate an image directory from the first path. If a direct image listing fails, attempts to resolve and use the parent directory. Updates UI feedback (spinner, error message, image grid) and starts browsing when a valid folder is identified.
 *
 * @param event - The drop payload: a Tauri event, a DragDropEvent object, or an array of file/folder path strings.
 */
async function handleFileDrop(event: Event<DragDropEvent> | DragDropEvent | string[]): Promise<void> {
  if (!elements.errorMsg || !elements.imageGrid || !elements.loadingSpinner) return;
  
  clearError();
  clearImageGrid();
  
  const paths = extractPathsFromEvent(event);
  
  if (!paths || paths.length === 0) {
    hideSpinner();
    showError("No file paths detected in drop event.");
    return;
  }
  
  const firstPath = paths[0];
  
  if (!window.__TAURI__?.core?.invoke) {
    hideSpinner();
    showError("Tauri invoke API not available");
    return;
  }
  
  try {
    await window.__TAURI__.core.invoke("list_images", { path: firstPath });
    handleFolder(firstPath);
  } catch (error) {
    try {
      const parentPath = await window.__TAURI__.core.invoke<string>("get_parent_directory", { file_path: firstPath });
      handleFolder(parentPath);
    } catch (err) {
      hideSpinner();
      showError(`Error: ${err}. Please drop a folder or use the file picker.`);
    }
  }
}

/**
 * Attach mouse handlers to the drop zone to distinguish drags from clicks and initiate folder selection on click.
 *
 * When the drop zone is clicked without prior mouse movement, this shows the loading spinner, collapses the drop zone,
 * clears any error message and the image grid, and opens the folder picker.
 */
function setupDragDropHandlers(): void {
  if (!elements.dropZone) return;
  
  let isDragging = false;
  
  elements.dropZone.addEventListener("mousedown", () => {
    isDragging = false;
  });
  
  elements.dropZone.addEventListener("mousemove", () => {
    isDragging = true;
  });
  
  elements.dropZone.addEventListener("click", async () => {
    if (isDragging) return;
    
    showSpinner();
    collapseDropZone();
    clearError();
    clearImageGrid();
    await selectFolder();
  });
}

/**
 * Registers TAURI drag-and-drop event listeners and updates the UI in response to those events.
 *
 * When TAURI event listening is available, this attaches handlers for DROP, ENTER, OVER, and LEAVE
 * that toggle the drop zone visual state, show or hide the spinner, clear errors and the image grid,
 * and delegate dropped paths to the file-drop handler. If TAURI event listening is unavailable or
 * an individual event fails to register, the function exits or continues silently without throwing.
 *
 * @returns Nothing.
 */
async function setupTauriDragEvents(): Promise<void> {
  const eventNames = Object.values(DRAG_EVENTS);
  
  // Use window.__TAURI__.event.listen directly (works without bundler)
  if (!window.__TAURI__?.event?.listen) {
    return;
  }
  
  const eventListen = window.__TAURI__.event.listen;
  
  // Use for...of loop to properly await async operations
  for (const eventName of eventNames) {
    try {
      await eventListen(eventName, (event: Event<DragDropEvent>) => {
        if (eventName === DRAG_EVENTS.DROP) {
          showSpinner();
          collapseDropZone();
          clearError();
          clearImageGrid();
          if (elements.dropZone) {
            elements.dropZone.classList.remove("drag-over");
          }
          handleFileDrop(event).catch((err) => {
            hideSpinner();
            showError(`Error: ${err}`);
          });
        } else if (eventName === DRAG_EVENTS.ENTER || eventName === DRAG_EVENTS.OVER) {
          if (elements.dropZone) {
            elements.dropZone.classList.add("drag-over");
          }
          showSpinner();
          clearError();
          clearImageGrid();
        } else if (eventName === DRAG_EVENTS.LEAVE) {
          if (elements.dropZone) {
            elements.dropZone.classList.remove("drag-over");
          }
          hideSpinner();
        }
      });
    } catch (error) {
      // Silently fail for events that don't exist
    }
  }
}

/**
 * Registers HTML5 drag-and-drop handlers on the configured drop zone to prevent default browser behavior and manage the drag-over visual state.
 */
function setupHTML5DragDrop(): void {
  if (!elements.dropZone) return;
  
  elements.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone!.classList.add("drag-over");
  });
  
  elements.dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  elements.dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone!.classList.remove("drag-over");
  });
}

/**
 * Prevent default drag-and-drop behavior for events that occur outside the configured drop zone.
 *
 * Blocks the browser's default handling of `dragover` and `drop` when the event target is not contained within `elements.dropZone`, preventing unintended navigations or file openings.
 */
function setupDocumentDragHandlers(): void {
  document.addEventListener("dragover", (e) => {
    if (!elements.dropZone?.contains(e.target as Node)) {
      e.preventDefault();
    }
  });
  
  document.addEventListener("drop", (e) => {
    if (!elements.dropZone?.contains(e.target as Node)) {
      e.preventDefault();
    }
  });
}

/**
 * Attach click handlers for the modal controls when their DOM elements exist.
 *
 * Binds the close button to close the modal, and binds the previous/next buttons to navigate the modal.
 * Prev/next button clicks stop event propagation to avoid triggering container click handlers.
 */
function setupModalHandlers(): void {
  if (elements.closeBtn) {
    elements.closeBtn.onclick = closeModal;
  }
  
  if (elements.modalPrevBtn) {
    elements.modalPrevBtn.onclick = (e) => {
      e.stopPropagation();
      showPreviousImage();
    };
  }
  
  if (elements.modalNextBtn) {
    elements.modalNextBtn.onclick = (e) => {
      e.stopPropagation();
      showNextImage();
    };
  }
}

/**
 * Install global keyboard and click handlers to manage modal navigation, closing, and the shortcuts overlay.
 *
 * Handles the following interactions when the modal is visible:
 * - ArrowLeft: navigate to the previous image.
 * - ArrowRight: navigate to the next image.
 * - Escape: hide the shortcuts overlay if visible, otherwise close the modal.
 * - `?` or Shift+/ : toggle the shortcuts overlay.
 *
 * Also closes the modal when the user clicks the modal backdrop, and hides the shortcuts overlay when the user clicks it.
 */
function setupKeyboardHandlers(): void {
  document.addEventListener("keydown", (e) => {
    if (!elements.modal || 
        (elements.modal.style.display !== "flex" && elements.modal.style.display !== "block")) {
      return;
    }
    
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      showPreviousImage();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      showNextImage();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (elements.shortcutsOverlay?.style.display === "flex") {
        elements.shortcutsOverlay.style.display = "none";
      } else {
        closeModal();
      }
    } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      toggleShortcutsOverlay();
    }
  });
  
  window.onclick = (event: MouseEvent) => {
    if (event.target === elements.modal) {
      closeModal();
    }
    if (elements.shortcutsOverlay?.style.display === "flex" && 
        event.target === elements.shortcutsOverlay) {
      elements.shortcutsOverlay.style.display = "none";
    }
  };
}

/**
 * Checks whether the app has macOS Full Disk Access and, if not, displays a guidance message in the UI.
 *
 * If the permission check is unavailable or fails, the function silently returns without modifying the UI.
 */
async function checkMacOSPermissions(): Promise<void> {
  try {
    if (!window.__TAURI__?.core?.invoke) {
      return;
    }
    const fullDiskAccess = await window.__TAURI__.core.invoke<boolean>("plugin:macos-permissions|check_full_disk_access_permission");
    if (!fullDiskAccess && elements.errorMsg) {
      elements.errorMsg.textContent = 
        "Note: Full Disk Access permission may be required for file drops. " +
        "If drops don't work, grant permission in System Settings > Privacy & Security > Full Disk Access.";
    }
  } catch (error) {
    // Permission check not available, continue anyway
  }
}

/**
 * Cache references to frequently used DOM elements into the shared `elements` object.
 *
 * Stores the following selectors: `#drop-zone`, `#current-path`, `#error-msg`, `#image-grid`,
 * `#loading-spinner`, `#image-modal`, `#modal-image`, `#modal-caption`, `.close`,
 * `#modal-prev`, `#modal-next`, and `#keyboard-shortcuts-overlay`.
 */
function initializeElements(): void {
  elements.dropZone = querySelector("#drop-zone");
  elements.currentPath = querySelector("#current-path");
  elements.errorMsg = querySelector("#error-msg");
  elements.imageGrid = querySelector("#image-grid");
  elements.loadingSpinner = querySelector("#loading-spinner");
  elements.modal = querySelector("#image-modal");
  elements.modalImage = querySelector<HTMLImageElement>("#modal-image");
  elements.modalCaption = querySelector("#modal-caption");
  elements.closeBtn = querySelector(".close");
  elements.modalPrevBtn = querySelector("#modal-prev");
  elements.modalNextBtn = querySelector("#modal-next");
  elements.shortcutsOverlay = querySelector("#keyboard-shortcuts-overlay");
}

window.addEventListener("DOMContentLoaded", async () => {
  initializeElements();
  
  if (!elements.dropZone) {
    return;
  }
  
  setupDocumentDragHandlers();
  setupDragDropHandlers();
  setupHTML5DragDrop();
  setupModalHandlers();
  setupKeyboardHandlers();
  await setupTauriDragEvents();
  await checkMacOSPermissions();
});
