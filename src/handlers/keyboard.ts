import { state } from "../state";
import { closeModal, showPreviousImage, showNextImage, toggleShortcutsOverlay, deleteCurrentImage, hideShortcutsOverlay } from "../ui/modal";
import { checkAndExecuteHotkey } from "../ui/hotkeys";

/**
 * Install global keyboard and click handlers to manage modal navigation, closing, and the shortcuts overlay.
 *
 * Handles the following interactions when the modal is visible:
 * - ArrowLeft: navigate to the previous image.
 * - ArrowRight: navigate to the next image.
 * - Escape: hide the shortcuts overlay if visible, otherwise close the modal.
 * - `?` or Shift+/ : toggle the shortcuts overlay.
 * - Delete/Backspace: delete the current image and move to the next (or previous if last).
 *
 * Also closes the modal when the user clicks the modal backdrop, and hides the shortcuts overlay when the user clicks it.
 */
export function setupKeyboardHandlers(): void {
  document.addEventListener("keydown", (e) => {
    // Skip hotkey handling when user is typing in editable elements
    // Check if the event originated from an editable element
    const target = e.target;
    let isEditable = false;
    
    if (target) {
      // Check tagName and nodeName (works even if instanceof fails in test environments)
      // Access properties directly without optional chaining to avoid issues
      const tagName = (target as any).tagName;
      const nodeName = (target as any).nodeName;
      
      if (tagName && (tagName.toUpperCase() === "INPUT" || tagName.toUpperCase() === "TEXTAREA")) {
        isEditable = true;
      } else if (nodeName && (nodeName.toUpperCase() === "INPUT" || nodeName.toUpperCase() === "TEXTAREA")) {
        isEditable = true;
      } else {
        // Check for contenteditable elements
        // Use type assertion to access properties safely
        const htmlTarget = target as HTMLElement;
        if (htmlTarget.isContentEditable === true || 
            htmlTarget.getAttribute?.("contenteditable") === "true") {
          isEditable = true;
        }
      }
    }
    
    if (!isEditable) {
      // Not typing in an editable element, check hotkeys
      if (checkAndExecuteHotkey(e)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    // If typing in editable element, skip hotkey checks but continue to modal shortcuts
    
    // Only handle modal-specific shortcuts when modal is open
    // Check state.currentModalIndex instead of DOM element display style (React manages visibility)
    if (state.currentModalIndex < 0) {
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
      // Check state.shortcutsOverlayVisible instead of DOM element display style
      if (state.shortcutsOverlayVisible) {
        toggleShortcutsOverlay();
      } else {
        closeModal();
      }
    } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      toggleShortcutsOverlay();
    } else if (e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace") {
      e.preventDefault();
      deleteCurrentImage();
    }
  });
  
  const handleWindowClick = (event: MouseEvent): void => {
    // Check if click is on modal backdrop (modal element itself, not its children)
    const modal = document.querySelector("#image-modal") as HTMLElement | null;
    if (modal && event.target === modal) {
      closeModal();
    }
    // Check if click is on shortcuts overlay backdrop
    if (state.shortcutsOverlayVisible) {
      const shortcutsOverlay = document.querySelector("#keyboard-shortcuts-overlay") as HTMLElement | null;
      if (shortcutsOverlay && event.target === shortcutsOverlay) {
        hideShortcutsOverlay();
      }
    }
  };
  
  window.addEventListener("click", handleWindowClick);
}

