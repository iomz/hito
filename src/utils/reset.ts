import { elements, state } from "../state";
import { clearImageGrid } from "../ui/grid";
import { expandDropZone } from "../ui/dropZone.js";
import { clearError } from "../ui/error.js";
import { hideSpinner } from "../ui/spinner.js";
import { closeModal } from "../ui/modal.js";
import { cleanupObserver } from "../core/observer.js";
import { closeHotkeySidebar } from "../ui/hotkeys";

export async function resetToHome(): Promise<void> {
  console.log("[resetToHome] START", {
    imageCount: Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0,
    dirCount: Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0,
  });
  // Close modal and sidebar first
  closeModal();
  closeHotkeySidebar();
  
  // Clean up observers and hide UI elements
  cleanupObserver();
  hideSpinner();
  clearError();
  
  // Reset state (this will trigger React re-renders)
  state.allImagePaths = [];
  state.allDirectoryPaths = [];
  state.currentIndex = 0;
  state.isLoadingBatch = false;
  state.loadedImages.clear();
  state.currentModalIndex = -1;
  state.currentDirectory = "";
  state.configFilePath = "";
  state.categories = [];
  state.imageCategories.clear();
  state.hotkeys = [];
  state.resetCounter += 1; // Increment to force ImageGrid remount
  console.log("[resetToHome] State cleared, resetCounter:", state.resetCounter);
  
  // Wait a tick for React to process state changes
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Now safely manipulate DOM for non-React managed elements
  clearImageGrid(); // No-op now, but kept for consistency
  expandDropZone();
  
  // Clear current path
  if (elements.currentPath) {
    elements.currentPath.innerHTML = "";
    elements.currentPath.style.display = "none";
  }
  
  // Reset config file path input
  if (elements.configFilePathInput) {
    elements.configFilePathInput.value = "";
    elements.configFilePathInput.placeholder = ".hito.json";
  }
  
  // Hide sidebar toggle button on home screen
  if (elements.hotkeySidebarToggle) {
    elements.hotkeySidebarToggle.style.display = "none";
  }

  console.log("[resetToHome] DONE");
}

