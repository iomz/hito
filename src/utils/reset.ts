import { elements, state } from "../state.js";
import { clearImageGrid } from "../ui/grid.js";
import { expandDropZone } from "../ui/dropZone.js";
import { clearError } from "../ui/error.js";
import { hideSpinner } from "../ui/spinner.js";
import { closeModal } from "../ui/modal.js";
import { cleanupObserver } from "../core/observer.js";
import { closeHotkeySidebar } from "../ui/hotkeys.js";

export async function resetToHome(): Promise<void> {
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
  closeHotkeySidebar();
  
  if (elements.hotkeySidebarToggle) {
    elements.hotkeySidebarToggle.style.display = "none";
  }
}

