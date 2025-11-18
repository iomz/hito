import { state } from "../state";
import { clearImageGrid } from "../ui/grid";
// Note: expandDropZone import removed - React handles this now
import { clearError } from "../ui/error";
import { hideSpinner } from "../ui/spinner";
import { closeModal } from "../ui/modal";
import { cleanupObserver } from "../core/observer";
import { closeHotkeySidebar } from "../ui/hotkeys";

export async function resetToHome(): Promise<void> {
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
  
  // Wait a tick for React to process state changes
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Now safely manipulate DOM for non-React managed elements
  clearImageGrid(); // No-op now, but kept for consistency
  // Note: DropZone React component handles collapse/expand based on state.currentDirectory
  
  // Clear current path
  const currentPath = document.querySelector("#current-path") as HTMLElement | null;
  if (currentPath) {
    currentPath.innerHTML = "";
    currentPath.style.display = "none";
  }
  
  // Reset config file path input
  const configFilePathInput = document.querySelector("#config-file-path-input") as HTMLInputElement | null;
  if (configFilePathInput) {
    configFilePathInput.value = "";
    configFilePathInput.placeholder = ".hito.json";
  }
  
  // Hide sidebar toggle button on home screen
  const hotkeySidebarToggle = document.querySelector("#hotkey-sidebar-toggle") as HTMLElement | null;
  if (hotkeySidebarToggle) {
    hotkeySidebarToggle.style.display = "none";
  }
}

