import { elements, state } from "./state.js";
import { querySelector } from "./utils/dom.js";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop.js";
import { setupModalHandlers } from "./handlers/modal.js";
import { setupKeyboardHandlers } from "./handlers/keyboard.js";
import { checkMacOSPermissions } from "./handlers/permissions.js";
import { setupHotkeySidebar } from "./ui/hotkeys.js";
import { setupCategories, renderCurrentImageCategories } from "./ui/categories.js";
import { clearImageGrid } from "./ui/grid.js";
import { expandDropZone } from "./ui/dropZone.js";
import { clearError } from "./ui/error.js";
import { hideSpinner } from "./ui/spinner.js";
import { closeModal, updateShortcutsOverlay } from "./ui/modal.js";
import { cleanupObserver } from "./core/observer.js";

function initializeElements(): void {
  elements.dropZone = querySelector("#drop-zone");
  elements.currentPath = querySelector("#current-path");
  elements.errorMsg = querySelector("#error-msg");
  elements.imageGrid = querySelector("#image-grid");
  elements.loadingSpinner = querySelector("#loading-spinner");
  elements.modal = querySelector("#image-modal");
  elements.modalImage = querySelector<HTMLImageElement>("#modal-image");
  elements.modalCaption = querySelector("#modal-caption");
  elements.modalCaptionText = querySelector("#modal-caption-text");
  elements.closeBtn = querySelector(".close");
  elements.modalPrevBtn = querySelector("#modal-prev");
  elements.modalNextBtn = querySelector("#modal-next");
  elements.shortcutsOverlay = querySelector("#keyboard-shortcuts-overlay");
  elements.shortcutsList = querySelector("#shortcuts-list");
  elements.hotkeySidebar = querySelector("#hotkey-sidebar");
  elements.hotkeySidebarToggle = querySelector("#hotkey-sidebar-toggle");
  elements.hotkeySidebarClose = querySelector("#hotkey-sidebar-close");
  elements.hotkeyList = querySelector("#hotkey-list");
  elements.addHotkeyBtn = querySelector("#add-hotkey-btn");
  elements.categoryList = querySelector("#category-list");
  elements.addCategoryBtn = querySelector("#add-category-btn");
  elements.currentImageCategories = querySelector("#current-image-categories");
  elements.modalCategories = querySelector("#modal-categories");
  elements.configFilePathInput = querySelector<HTMLInputElement>("#config-file-path");
}

async function resetToHome(): Promise<void> {
  clearImageGrid();
  expandDropZone();
  clearError();
  hideSpinner();
  closeModal();
  cleanupObserver();
  
  // Clear current path
  if (elements.currentPath) {
    elements.currentPath.innerHTML = "";
    elements.currentPath.style.display = "none";
  }
  
  // Reset state
  state.allImagePaths = [];
  state.currentIndex = 0;
  state.isLoadingBatch = false;
  state.loadedImages.clear();
  state.currentModalIndex = -1;
  state.currentDirectory = "";
  state.configFilePath = "";
  state.categories = [];
  state.imageCategories.clear();
  state.hotkeys = [];
  
  // Reset config file path input
  if (elements.configFilePathInput) {
    elements.configFilePathInput.value = "";
    elements.configFilePathInput.placeholder = ".hito.json";
  }
  
  // Close and hide sidebar on home screen
  const { closeHotkeySidebar } = await import("./ui/hotkeys.js");
  closeHotkeySidebar();
  
  if (elements.hotkeySidebarToggle) {
    elements.hotkeySidebarToggle.style.display = "none";
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  initializeElements();
  
  if (!elements.dropZone) {
    return;
  }
  
  // Hide sidebar toggle button initially (home screen)
  if (elements.hotkeySidebarToggle) {
    elements.hotkeySidebarToggle.style.display = "none";
  }
  
  // Add click handler to h1 to reset to home screen
  const h1Element = querySelector("h1");
  if (h1Element) {
    h1Element.style.cursor = "pointer";
    h1Element.addEventListener("click", resetToHome);
  }
  
  setupDocumentDragHandlers();
  setupDragDropHandlers();
  setupHTML5DragDrop();
  setupModalHandlers();
  setupKeyboardHandlers();
  setupHotkeySidebar();
  
  // Setup categories (non-blocking - don't prevent drag & drop if it fails)
  setupCategories().catch((error) => {
    console.error("Failed to setup categories:", error);
  });
  
  // Initialize shortcuts overlay
  updateShortcutsOverlay();
  
  // Setup sidebar tabs
  const categoryTab = querySelector('[data-tab="categories"]');
  const hotkeyTab = querySelector('[data-tab="hotkeys"]');
  const fileTab = querySelector('[data-tab="file"]');
  const categoriesPanel = querySelector("#categories-panel");
  const hotkeysPanel = querySelector("#hotkeys-panel");
  const filePanel = querySelector("#file-panel");
  
  if (categoryTab && hotkeyTab && fileTab && categoriesPanel && hotkeysPanel && filePanel) {
    const switchToTab = (activeTab: HTMLElement, activePanel: HTMLElement) => {
      // Remove active from all tabs and panels
      [categoryTab, hotkeyTab, fileTab].forEach(tab => tab?.classList.remove("active"));
      [categoriesPanel, hotkeysPanel, filePanel].forEach(panel => panel?.classList.remove("active"));
      
      // Add active to selected tab and panel
      activeTab.classList.add("active");
      activePanel.classList.add("active");
    };
    
    categoryTab.onclick = () => switchToTab(categoryTab, categoriesPanel);
    hotkeyTab.onclick = () => switchToTab(hotkeyTab, hotkeysPanel);
    fileTab.onclick = () => switchToTab(fileTab, filePanel);
  }
  
  // Setup config file path input
  if (elements.configFilePathInput) {
    elements.configFilePathInput.placeholder = ".hito.json";
    elements.configFilePathInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      state.configFilePath = target.value.trim();
    });
  }
  
  await setupTauriDragEvents();
  await checkMacOSPermissions();
});
