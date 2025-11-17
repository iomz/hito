import { state, elements } from "../state.js";
import { loadImageData } from "../utils/images.js";
import { showError } from "./error.js";
import { showNotification } from "./notification.js";
import { removeImageFromGrid } from "./grid.js";
import { closeHotkeySidebar } from "./hotkeys.js";
import { renderCurrentImageCategories, renderModalCategories } from "./categories.js";
import { createElement } from "../utils/dom.js";

/**
 * Opens the image viewer modal for the image at the given index, ensuring the image data is available and updating modal UI.
 *
 * If `imageIndex` is out of range or required modal elements are missing, the function does nothing. If loading the image data fails, an error message is shown and the modal is not opened.
 *
 * @param imageIndex - Index of the image in the current image list to display in the modal
 */
export async function openModal(imageIndex: number): Promise<void> {
  // Ensure allImagePaths is an array
  if (!Array.isArray(state.allImagePaths)) {
    console.error("state.allImagePaths is not an array in openModal:", state.allImagePaths);
    state.allImagePaths = [];
    return;
  }
  
  if (imageIndex < 0 || imageIndex >= state.allImagePaths.length || 
      !elements.modalImage || !elements.modalCaption || !elements.modal) {
    return;
  }
  
  const requestedIndex = imageIndex;
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
  
  // Check if a newer modal request has been made while we were loading
  if (state.currentModalIndex !== requestedIndex) {
    return;
  }
  
  elements.modalImage.src = dataUrl;
  // Normalize path: convert backslashes to forward slashes before extracting filename
  const normalized = imagePath.replace(/\\/g, "/");
  if (elements.modalCaptionText) {
    elements.modalCaptionText.textContent = 
      `${imageIndex + 1} / ${state.allImagePaths.length} - ${normalized.split("/").pop() || imagePath}`;
  }
  elements.modal.style.display = "flex";
  elements.modal.classList.add("open");
  
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
  
  // Update current image categories display
  renderCurrentImageCategories();
  renderModalCategories();
  
  updateModalButtons();
}

/**
 * Hide the image viewer modal and the keyboard shortcuts overlay if present.
 */
export function closeModal(): void {
  if (elements.modal) {
    elements.modal.style.display = "none";
    elements.modal.classList.remove("open");
  }
  if (elements.shortcutsOverlay) {
    elements.shortcutsOverlay.style.display = "none";
  }
  state.currentModalIndex = -1;
}

/**
 * Advance the modal viewer to the next image if one exists.
 *
 * Does nothing when the currently shown image is the last in the list.
 */
export function showNextImage(): void {
  if (!Array.isArray(state.allImagePaths)) {
    return;
  }
  if (state.currentModalIndex < state.allImagePaths.length - 1) {
    openModal(state.currentModalIndex + 1);
    // Categories will be updated by openModal
  }
}

/**
 * Move the modal view to the previous image in the gallery.
 *
 * If a previous image exists (current modal index > 0), opens the modal for that image; otherwise does nothing.
 */
export function showPreviousImage(): void {
  if (state.currentModalIndex > 0) {
    openModal(state.currentModalIndex - 1);
    // Categories will be updated by openModal
  }
}

/**
 * Update visibility of the modal's previous/next navigation buttons based on the current image index.
 *
 * Shows the previous button when the modal is not at the first image and shows the next button when the modal is not at the last image; hides each button otherwise.
 */
export function updateModalButtons(): void {
  if (!elements.modalPrevBtn || !elements.modalNextBtn) return;
  
  if (!Array.isArray(state.allImagePaths)) {
    elements.modalPrevBtn.style.display = "none";
    elements.modalNextBtn.style.display = "none";
    return;
  }
  
  elements.modalPrevBtn.style.display = state.currentModalIndex > 0 ? "block" : "none";
  elements.modalNextBtn.style.display = 
    state.currentModalIndex < state.allImagePaths.length - 1 ? "block" : "none";
}

/**
 * Toggle the keyboard shortcuts overlay between visible and hidden.
 *
 * If the overlay element is not present this function does nothing; otherwise it hides the overlay when shown and shows it when hidden.
 */
export function toggleShortcutsOverlay(): void {
  if (!elements.shortcutsOverlay) return;
  const isVisible = elements.shortcutsOverlay.style.display === "flex";
  elements.shortcutsOverlay.style.display = isVisible ? "none" : "flex";
}

/**
 * Delete the current image and navigate to the next one (or previous if it's the last).
 *
 * Sends the current image to the system trash, removes it from the image list and cache,
 * and navigates to the next image. If the deleted image was the last one, navigates to
 * the previous image instead. If it was the only image, closes the modal.
 */
export async function deleteCurrentImage(): Promise<void> {
  // Re-entrancy guard: ignore if deletion is already in progress
  if (state.isDeletingImage) {
    return;
  }
  
  // Ensure allImagePaths is an array
  if (!Array.isArray(state.allImagePaths)) {
    console.error("state.allImagePaths is not an array in deleteCurrentImage:", state.allImagePaths);
    state.allImagePaths = [];
    return;
  }
  
  if (state.currentModalIndex < 0 || state.currentModalIndex >= state.allImagePaths.length) {
    return;
  }
  
  const imagePath = state.allImagePaths[state.currentModalIndex].path;
  const deletedIndex = state.currentModalIndex;
  const isLastImage = state.currentModalIndex === state.allImagePaths.length - 1;
  const isOnlyImage = state.allImagePaths.length === 1;
  
  if (!window.__TAURI__?.core?.invoke) {
    showError("Tauri invoke API not available");
    return;
  }
  
  // Set deletion flag to prevent re-entrancy
  state.isDeletingImage = true;
  
  try {
    await window.__TAURI__.core.invoke("delete_image", { imagePath });
    
    // Remove from loaded images cache
    state.loadedImages.delete(imagePath);
    
    // Remove from image list
    state.allImagePaths.splice(deletedIndex, 1);
    
    // Adjust currentIndex if the deleted image was before the current batch loading position
    if (deletedIndex < state.currentIndex) {
      state.currentIndex -= 1;
    }
    
    // Remove from grid DOM
    removeImageFromGrid(imagePath);
    
    // Navigate to next or previous image
    if (isOnlyImage) {
      // If it was the only image, close the modal
      closeModal();
      showNotification("Image deleted. No more images in this directory.");
      state.isDeletingImage = false;
      return; // Return immediately to avoid generic notification
    } else if (isLastImage) {
      // If it was the last image, go to the previous one
      openModal(state.currentModalIndex - 1);
    } else {
      // Otherwise, stay at the same index (which now points to the next image)
      openModal(state.currentModalIndex);
    }
    
    showNotification("Image deleted");
  } catch (error) {
    showError(`Failed to delete image: ${error}`);
  } finally {
    // Always reset the deletion flag
    state.isDeletingImage = false;
  }
}

/**
 * Update the keyboard shortcuts overlay with default shortcuts and user-configured hotkeys.
 * Shows default modal navigation shortcuts on the left, custom category hotkeys on the right.
 */
export function updateShortcutsOverlay(): void {
  if (!elements.shortcutsList) return;

  elements.shortcutsList.innerHTML = "";

  // Create 2-column container
  const columnsContainer = createElement("div", "shortcuts-columns");

  // Left column: Default shortcuts
  const leftColumn = createElement("div", "shortcuts-column shortcuts-column-left");
  const defaultSection = createElement("div", "shortcuts-section");
  
  const heading = createElement("h3", "shortcuts-heading");
  heading.textContent = "Default Shortcuts";
  defaultSection.appendChild(heading);
  
  const defaultShortcuts = [
    { key: "←", desc: "Previous image" },
    { key: "→", desc: "Next image" },
    { key: "Esc", desc: "Close modal" },
    { key: "?", desc: "Show/hide this help" },
    { key: "Delete", desc: "Delete image and move to next" },
  ];

  defaultShortcuts.forEach(({ key, desc }) => {
    const item = createElement("div", "shortcut-item");
    
    const keySpan = createElement("span", "shortcut-key");
    keySpan.textContent = key;
    
    const descSpan = createElement("span", "shortcut-desc");
    descSpan.textContent = desc;
    
    item.appendChild(keySpan);
    item.appendChild(descSpan);
    defaultSection.appendChild(item);
  });

  leftColumn.appendChild(defaultSection);
  columnsContainer.appendChild(leftColumn);

  // Right column: Custom hotkeys
  const rightColumn = createElement("div", "shortcuts-column shortcuts-column-right");
  
  // Filter hotkeys with actions
  const activeHotkeys = state.hotkeys.filter(h => h.action);
  
  if (activeHotkeys.length > 0) {
    const customSection = createElement("div", "shortcuts-section");
    
    const heading = createElement("h3", "shortcuts-heading");
    heading.textContent = "Custom Hotkeys";
    customSection.appendChild(heading);

    activeHotkeys.forEach((hotkey) => {
      const item = createElement("div", "shortcut-item");
      
      // Format hotkey display
      const keyParts = [...hotkey.modifiers, hotkey.key];
      const keyDisplay = keyParts.join(" + ");
      
      const keySpan = createElement("span", "shortcut-key");
      keySpan.textContent = keyDisplay;
      
      // Format action description
      let actionDesc = "Unknown action";
      
      if (hotkey.action === "next_image") {
        actionDesc = "Next Image";
      } else if (hotkey.action === "previous_image") {
        actionDesc = "Previous Image";
      } else if (hotkey.action === "delete_image_and_next") {
        actionDesc = "Delete Image and move to next";
      } else if (hotkey.action.startsWith("toggle_category_next_")) {
        const categoryId = hotkey.action.replace("toggle_category_next_", "");
        const category = state.categories.find((c) => c.id === categoryId);
        actionDesc = category 
          ? `Toggle "${category.name}" and move to next`
          : "Toggle category and move to next";
      } else if (hotkey.action.startsWith("toggle_category_")) {
        const categoryId = hotkey.action.replace("toggle_category_", "");
        const category = state.categories.find((c) => c.id === categoryId);
        actionDesc = category 
          ? `Toggle "${category.name}"`
          : "Toggle category";
      } else if (hotkey.action.startsWith("assign_category_")) {
        const categoryId = hotkey.action.replace("assign_category_", "");
        const category = state.categories.find((c) => c.id === categoryId);
        actionDesc = category 
          ? `Assign "${category.name}"`
          : "Assign category";
      }
      
      const descSpan = createElement("span", "shortcut-desc");
      descSpan.textContent = actionDesc;
      
      item.appendChild(keySpan);
      item.appendChild(descSpan);
      customSection.appendChild(item);
    });

    rightColumn.appendChild(customSection);
  } else {
    // Show empty state if no custom hotkeys
    const emptyState = createElement("div", "shortcuts-empty");
    emptyState.textContent = "No custom hotkeys";
    rightColumn.appendChild(emptyState);
  }

  columnsContainer.appendChild(rightColumn);
  elements.shortcutsList.appendChild(columnsContainer);
}

