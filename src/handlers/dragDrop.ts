import type { Event } from "@tauri-apps/api/event";
import { DRAG_EVENTS } from "../constants.js";
import type { DragDropEvent } from "../types.js";
import { elements } from "../state.js";
import { showSpinner, hideSpinner } from "../ui/spinner.js";
import { showError, clearError } from "../ui/error.js";
import { clearImageGrid } from "../ui/grid.js";
import { collapseDropZone, expandDropZone } from "../ui/dropZone.js";
import { browseImages } from "../core/browse.js";
import { open } from "../utils/dialog.js";

/**
 * Normalize various drag-and-drop event shapes into a list of file paths.
 *
 * @param event - The drag/drop input which may be an array of path strings, a DragDropEvent object, or a Tauri `Event<DragDropEvent>` wrapper.
 * @returns An array of file paths extracted from the input, or `null` if no paths are present.
 */
export function extractPathsFromEvent(event: Event<DragDropEvent> | DragDropEvent | string[] | null | undefined): string[] | null {
  if (event == null) {
    return null;
  }
  if (Array.isArray(event)) {
    return event;
  }
  if (typeof event === 'object' && event != null && 'payload' in event && event.payload) {
    if (Array.isArray(event.payload.paths)) {
      return event.payload.paths;
    }
    if (Array.isArray(event.payload)) {
      return event.payload as string[];
    }
  }
  if (typeof event === 'object' && event != null && 'paths' in event && Array.isArray(event.paths)) {
    return event.paths;
  }
  return null;
}

/**
 * Update the UI to show the selected folder and start loading its images.
 *
 * @param folderPath - Filesystem path of the folder to browse and load images from
 */
export function handleFolder(folderPath: string): void {
  if (!elements.currentPath) return;
  
  elements.currentPath.textContent = `Browsing: ${folderPath}`;
  elements.currentPath.style.display = "block";
  collapseDropZone();
  browseImages(folderPath);
}

/**
 * Handle a file or folder drop payload and initiate browsing of the detected folder.
 *
 * Clears prior UI state, extracts paths from the given drop payload (accepting a Tauri `Event<DragDropEvent>`, a `DragDropEvent`, or an array of path strings), validates that a Tauri invoke API is available, and attempts to locate an image directory from the first path. If a direct image listing fails, attempts to resolve and use the parent directory. Updates UI feedback (spinner, error message, image grid) and starts browsing when a valid folder is identified.
 *
 * @param event - The drop payload: a Tauri event, a DragDropEvent object, or an array of file/folder path strings.
 */
export async function handleFileDrop(event: Event<DragDropEvent> | DragDropEvent | string[]): Promise<void> {
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

/**
 * Prevent default drag-and-drop behavior for events that occur outside the configured drop zone.
 *
 * Blocks the browser's default handling of `dragover` and `drop` when the event target is not contained within `elements.dropZone`, preventing unintended navigations or file openings.
 */
export function setupDocumentDragHandlers(): void {
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

/**
 * Attach mouse handlers to the drop zone to distinguish drags from clicks and initiate folder selection on click.
 *
 * When the drop zone is clicked without prior mouse movement, this shows the loading spinner, collapses the drop zone,
 * clears any error message and the image grid, and opens the folder picker.
 */
export function setupDragDropHandlers(): void {
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

/**
 * Registers HTML5 drag-and-drop handlers on the configured drop zone to prevent default browser behavior and manage the drag-over visual state.
 */
export function setupHTML5DragDrop(): void {
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

/**
 * Registers TAURI drag-and-drop event listeners and updates the UI in response to those events.
 *
 * When TAURI event listening is available, this attaches handlers for DROP, ENTER, OVER, and LEAVE
 * that toggle the drop zone visual state, show or hide the spinner, clear errors and the image grid,
 * and delegate dropped paths to the file-drop handler. If TAURI event listening is unavailable or
 * an individual event fails to register, the function exits or continues silently without throwing.
 *
 * @returns Nothing.
 */
export async function setupTauriDragEvents(): Promise<void> {
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

/**
 * Open a folder picker and handle the selected directory for image browsing.
 *
 * If the user selects a folder, calls `handleFolder` with the chosen path.
 * If the selection is cancelled or no valid path is returned, restores the drop
 * zone UI. On error, displays an error message and restores the drop zone UI.
 */
export async function selectFolder(): Promise<void> {
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

