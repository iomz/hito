import { state } from "./state";
import { querySelector } from "./utils/dom.js";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop.js";
import { setupModalHandlers } from "./handlers/modal.js";
import { setupKeyboardHandlers } from "./handlers/keyboard.js";
import { setupHotkeySidebar } from "./ui/hotkeys";
import { setupCategories } from "./ui/categories";
import { clearImageGrid } from "./ui/grid.js";
import { expandDropZone } from "./ui/dropZone.js";
import { clearError } from "./ui/error.js";
import { hideSpinner } from "./ui/spinner.js";
import { closeModal, updateShortcutsOverlay } from "./ui/modal";
import { cleanupObserver } from "./core/observer.js";

export async function resetToHome(): Promise<void> {
  clearImageGrid();
  expandDropZone();
  clearError();
  hideSpinner();
  closeModal();
  cleanupObserver();
  
  // Clear current path
  const currentPath = document.querySelector("#current-path") as HTMLElement | null;
  if (currentPath) {
    currentPath.innerHTML = "";
    currentPath.style.display = "none";
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
  const configFilePathInput = document.querySelector("#config-file-path-input") as HTMLInputElement | null;
  if (configFilePathInput) {
    configFilePathInput.value = "";
    configFilePathInput.placeholder = ".hito.json";
  }
  
  // Close and hide sidebar on home screen
  const { closeHotkeySidebar } = await import("./ui/hotkeys");
  closeHotkeySidebar();
  
  const hotkeySidebarToggle = document.querySelector("#hotkey-sidebar-toggle") as HTMLElement | null;
  if (hotkeySidebarToggle) {
    hotkeySidebarToggle.style.display = "none";
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  // Note: This is the legacy entry point. React App.tsx is the main entry point now.
  const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
  if (!dropZone) {
    return;
  }
  
  // Hide sidebar toggle button initially (home screen)
  const hotkeySidebarToggle = document.querySelector("#hotkey-sidebar-toggle") as HTMLElement | null;
  if (hotkeySidebarToggle) {
    hotkeySidebarToggle.style.display = "none";
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
  const configFilePathInput = document.querySelector("#config-file-path-input") as HTMLInputElement | null;
  if (configFilePathInput) {
    configFilePathInput.placeholder = ".hito.json";
    configFilePathInput.addEventListener("input", (e: Event) => {
      const target = e.target as HTMLInputElement;
      state.configFilePath = target.value.trim();
    });
  }
  
  await setupTauriDragEvents();
});
