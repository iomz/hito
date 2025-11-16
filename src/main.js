const { invoke } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog;
const { listen } = window.__TAURI__.event;

// Constants
const BATCH_SIZE = 30;
const DRAG_EVENTS = {
  DROP: "tauri://drag-drop",
  ENTER: "tauri://drag-enter",
  LEAVE: "tauri://drag-leave",
  OVER: "tauri://drag-over"
};

// State
const state = {
  allImagePaths: [],
  currentIndex: 0,
  isLoadingBatch: false,
  intersectionObserver: null,
  loadedImages: new Map(),
  currentModalIndex: -1
};

// DOM Elements
const elements = {
  dropZone: null,
  currentPath: null,
  errorMsg: null,
  imageGrid: null,
  loadingSpinner: null,
  modal: null,
  modalImage: null,
  modalCaption: null,
  closeBtn: null,
  shortcutsOverlay: null,
  modalPrevBtn: null,
  modalNextBtn: null
};

// Utility Functions
function querySelector(selector) {
  return document.querySelector(selector);
}

function createElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

function showSpinner() {
  if (!elements.loadingSpinner) return;
  elements.loadingSpinner.style.display = "flex";
  void elements.loadingSpinner.offsetHeight; // Force reflow
}

function hideSpinner() {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = "none";
  }
}

function collapseDropZone() {
  const container = querySelector(".path-input-container");
  const dropZone = querySelector("#drop-zone");
  if (container && dropZone) {
    container.classList.add("collapsed");
    dropZone.classList.add("collapsed");
    void container.offsetHeight; // Force reflow
  }
}

function expandDropZone() {
  const container = querySelector(".path-input-container");
  const dropZone = querySelector("#drop-zone");
  if (container && dropZone) {
    container.classList.remove("collapsed");
    dropZone.classList.remove("collapsed");
  }
}

function showError(message) {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = message;
  }
}

function clearError() {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = "";
  }
}

function clearImageGrid() {
  if (elements.imageGrid) {
    elements.imageGrid.innerHTML = "";
  }
}

// Image Loading Functions
async function loadImageData(imagePath) {
  try {
    const dataUrl = await invoke("load_image", { imagePath });
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error(`Invalid data URL returned for ${imagePath}`);
    }
    state.loadedImages.set(imagePath, dataUrl);
    return dataUrl;
  } catch (error) {
    throw new Error(`Failed to load image: ${error}`);
  }
}

function createImageElement(imagePath, dataUrl) {
  const img = createElement("img");
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

function createPlaceholder() {
  const placeholder = createElement("div", "image-placeholder", "Loading...");
  placeholder.style.color = "#999";
  placeholder.style.fontSize = "0.9em";
  return placeholder;
}

function createErrorPlaceholder() {
  const errorDiv = createElement("div", null, "Failed to load");
  errorDiv.style.backgroundColor = "#fee";
  errorDiv.style.color = "#c33";
  errorDiv.style.fontSize = "0.9em";
  errorDiv.style.padding = "10px";
  errorDiv.style.textAlign = "center";
  return errorDiv;
}

async function loadImageBatch(startIndex, endIndex) {
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
    elements.imageGrid.appendChild(imageItem);
    
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

function removeSentinel() {
  const sentinel = document.getElementById("load-more-sentinel");
  if (sentinel) sentinel.remove();
}

function cleanupObserver() {
  removeSentinel();
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }
}

function setupIntersectionObserver() {
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

async function browseImages(path) {
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
    const imagePaths = await invoke("list_images", { path });
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
async function openModal(imageIndex) {
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

function updateModalButtons() {
  if (!elements.modalPrevBtn || !elements.modalNextBtn) return;
  
  elements.modalPrevBtn.style.display = state.currentModalIndex > 0 ? "block" : "none";
  elements.modalNextBtn.style.display = 
    state.currentModalIndex < state.allImagePaths.length - 1 ? "block" : "none";
}

function showNextImage() {
  if (state.currentModalIndex < state.allImagePaths.length - 1) {
    openModal(state.currentModalIndex + 1);
  }
}

function showPreviousImage() {
  if (state.currentModalIndex > 0) {
    openModal(state.currentModalIndex - 1);
  }
}

function closeModal() {
  if (elements.modal) {
    elements.modal.style.display = "none";
  }
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
}

function toggleShortcutsOverlay() {
  if (!elements.shortcutsOverlay) return;
  const isVisible = elements.shortcutsOverlay.style.display === "flex";
  elements.shortcutsOverlay.style.display = isVisible ? "none" : "flex";
}

// Folder Handling
function handleFolder(folderPath) {
  if (!elements.currentPath) return;
  
  elements.currentPath.textContent = `Browsing: ${folderPath}`;
  elements.currentPath.style.display = "block";
  collapseDropZone();
  browseImages(folderPath);
}

async function selectFolder() {
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
function extractPathsFromEvent(event) {
  if (Array.isArray(event)) {
    return event;
  }
  if (event.payload?.paths && Array.isArray(event.payload.paths)) {
    return event.payload.paths;
  }
  if (Array.isArray(event.payload)) {
    return event.payload;
  }
  if (event.paths && Array.isArray(event.paths)) {
    return event.paths;
  }
  return null;
}

async function handleFileDrop(event) {
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
  
  try {
    await invoke("list_images", { path: firstPath });
    handleFolder(firstPath);
  } catch (error) {
    try {
      const parentPath = await invoke("get_parent_directory", { file_path: firstPath });
      handleFolder(parentPath);
    } catch (err) {
      hideSpinner();
      showError(`Error: ${err}. Please drop a folder or use the file picker.`);
    }
  }
}

// Event Handlers
function setupDragDropHandlers() {
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

function setupTauriDragEvents() {
  const eventNames = Object.values(DRAG_EVENTS);
  
  eventNames.forEach(async (eventName) => {
    try {
      await listen(eventName, (event) => {
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
  });
}

function setupHTML5DragDrop() {
  if (!elements.dropZone) return;
  
  elements.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.add("drag-over");
  });
  
  elements.dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  elements.dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove("drag-over");
  });
}

function setupDocumentDragHandlers() {
  document.addEventListener("dragover", (e) => {
    if (!elements.dropZone?.contains(e.target)) {
      e.preventDefault();
    }
  });
  
  document.addEventListener("drop", (e) => {
    if (!elements.dropZone?.contains(e.target)) {
      e.preventDefault();
    }
  });
}

function setupModalHandlers() {
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

function setupKeyboardHandlers() {
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
  
  window.onclick = (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
    if (elements.shortcutsOverlay?.style.display === "flex" && 
        event.target === elements.shortcutsOverlay) {
      elements.shortcutsOverlay.style.display = "none";
    }
  };
}

async function checkMacOSPermissions() {
  try {
    const fullDiskAccess = await invoke("plugin:macos-permissions|check_full_disk_access_permission");
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
function initializeElements() {
  elements.dropZone = querySelector("#drop-zone");
  elements.currentPath = querySelector("#current-path");
  elements.errorMsg = querySelector("#error-msg");
  elements.imageGrid = querySelector("#image-grid");
  elements.loadingSpinner = querySelector("#loading-spinner");
  elements.modal = querySelector("#image-modal");
  elements.modalImage = querySelector("#modal-image");
  elements.modalCaption = querySelector("#modal-caption");
  elements.closeBtn = querySelector(".close");
  elements.modalPrevBtn = querySelector("#modal-prev");
  elements.modalNextBtn = querySelector("#modal-next");
  elements.shortcutsOverlay = querySelector("#keyboard-shortcuts-overlay");
}

window.addEventListener("DOMContentLoaded", async () => {
  initializeElements();
  
  if (!elements.dropZone) {
    console.error("Drop zone element not found!");
    return;
  }
  
  setupDocumentDragHandlers();
  setupDragDropHandlers();
  setupHTML5DragDrop();
  setupModalHandlers();
  setupKeyboardHandlers();
  setupTauriDragEvents();
  await checkMacOSPermissions();
});

