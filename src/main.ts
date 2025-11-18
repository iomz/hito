import { state } from "./state";
import { querySelector } from "./utils/dom";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupModalHandlers } from "./handlers/modal";
import { setupKeyboardHandlers } from "./handlers/keyboard";
// Note: setupHotkeySidebar, setupCategories, updateShortcutsOverlay removed - React components handle this now
import { clearImageGrid } from "./ui/grid";
// Note: expandDropZone import removed - React handles this now
import { clearError } from "./ui/error";
import { hideSpinner } from "./ui/spinner";
import { closeModal } from "./ui/modal";
import { cleanupObserver } from "./core/observer";

export async function resetToHome(): Promise<void> {
  clearImageGrid();
  // Note: DropZone React component handles collapse/expand based on state.currentDirectory
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
  // Note: HotkeySidebar React component handles its own event handlers now
  // Note: Categories setup handled by HotkeySidebar React component
  // Note: Shortcuts overlay handled by ShortcutsOverlay React component
  // Note: Sidebar tabs handled by HotkeySidebar React component
  // Note: Config file input handled by ConfigFileInput React component
  
  await setupTauriDragEvents();
});
