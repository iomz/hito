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
const open: (options?: { directory?: boolean; multiple?: boolean; title?: string }) => Promise<string | string[] | null> = 
  window.__TAURI__?.dialog?.open || (() => {
    throw new Error("Dialog API not available");
  });

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

// Utility Functions
function querySelector<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function createElement(tag: string, className?: string, textContent?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

function showSpinner(): void {
  if (!elements.loadingSpinner) return;
  elements.loadingSpinner.style.display = "flex";
  void elements.loadingSpinner.offsetHeight; // Force reflow
}

function hideSpinner(): void {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = "none";
  }
}

function collapseDropZone(): void {
  const container = querySelector<HTMLElement>(".path-input-container");
  const dropZone = querySelector<HTMLElement>("#drop-zone");
  if (container && dropZone) {
    container.classList.add("collapsed");
    dropZone.classList.add("collapsed");
    void container.offsetHeight; // Force reflow
  }
}

function expandDropZone(): void {
  const container = querySelector<HTMLElement>(".path-input-container");
  const dropZone = querySelector<HTMLElement>("#drop-zone");
  if (container && dropZone) {
    container.classList.remove("collapsed");
    dropZone.classList.remove("collapsed");
  }
}

function showError(message: string): void {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = message;
  }
}

function clearError(): void {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = "";
  }
}

function clearImageGrid(): void {
  if (elements.imageGrid) {
    elements.imageGrid.innerHTML = "";
  }
}

// Image Loading Functions
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

function createPlaceholder(): HTMLElement {
  const placeholder = createElement("div", "image-placeholder", "Loading...");
  placeholder.style.color = "#999";
  placeholder.style.fontSize = "0.9em";
  return placeholder;
}

function createErrorPlaceholder(): HTMLElement {
  const errorDiv = createElement("div", undefined, "Failed to load");
  errorDiv.style.backgroundColor = "#fee";
  errorDiv.style.color = "#c33";
  errorDiv.style.fontSize = "0.9em";
  errorDiv.style.padding = "10px";
  errorDiv.style.textAlign = "center";
  return errorDiv;
}

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

function removeSentinel(): void {
  const sentinel = document.getElementById("load-more-sentinel");
  if (sentinel) sentinel.remove();
}

function cleanupObserver(): void {
  removeSentinel();
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }
}

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
      elements.imageGrid.innerHTML = "<p>No images found in this directory.</p>";
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

// Modal Functions
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

function updateModalButtons(): void {
  if (!elements.modalPrevBtn || !elements.modalNextBtn) return;
  
  elements.modalPrevBtn.style.display = state.currentModalIndex > 0 ? "block" : "none";
  elements.modalNextBtn.style.display = 
    state.currentModalIndex < state.allImagePaths.length - 1 ? "block" : "none";
}

function showNextImage(): void {
  if (state.currentModalIndex < state.allImagePaths.length - 1) {
    openModal(state.currentModalIndex + 1);
  }
}

function showPreviousImage(): void {
  if (state.currentModalIndex > 0) {
    openModal(state.currentModalIndex - 1);
  }
}

function closeModal(): void {
  if (elements.modal) {
    elements.modal.style.display = "none";
  }
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
}

function toggleShortcutsOverlay(): void {
  if (!elements.shortcutsOverlay) return;
  const isVisible = elements.shortcutsOverlay.style.display === "flex";
  elements.shortcutsOverlay.style.display = isVisible ? "none" : "flex";
}

// Folder Handling
function handleFolder(folderPath: string): void {
  if (!elements.currentPath) return;
  
  elements.currentPath.textContent = `Browsing: ${folderPath}`;
  elements.currentPath.style.display = "block";
  collapseDropZone();
  browseImages(folderPath);
}

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

// File Drop Handling
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

// Event Handlers
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

// Initialization
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

