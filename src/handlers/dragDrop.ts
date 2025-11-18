import type { Event } from "@tauri-apps/api/event";
import { DRAG_EVENTS } from "../constants";
import type { DragDropEvent } from "../types";
import { showSpinner, hideSpinner } from "../ui/spinner";
import { showError, clearError } from "../ui/error";
import { clearImageGrid } from "../ui/grid";
// Note: collapseDropZone/expandDropZone imports removed - React handles this now
import { browseImages } from "../core/browse";
import { open } from "../utils/dialog";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";

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
  // Note: CurrentPath React component handles breadcrumb rendering based on state.currentDirectory
  // Note: DropZone React component handles collapse/expand based on state.currentDirectory
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
  // React manages imageGrid now, so don't require it
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  const loadingSpinner = document.querySelector("#loading-spinner") as HTMLElement | null;
  if (!errorMsg || !loadingSpinner) {
    return;
  }
  
  clearError();
  clearImageGrid();
  
  const paths = extractPathsFromEvent(event);
  
  if (!paths || paths.length === 0) {
    hideSpinner();
    showError("No file paths detected in drop event.");
    return;
  }
  
  const firstPath = paths[0];
  const isSingleFile = paths.length === 1;
  
  if (!isTauriInvokeAvailable()) {
    hideSpinner();
    showError("Tauri invoke API not available");
    return;
  }
  
  try {
    await invokeTauri("list_images", { path: firstPath });
    handleFolder(firstPath);
  } catch (error) {
    // If it's a single file or the path is not a directory, open parent directory
    const errorMessage = String(error);
    if (isSingleFile || errorMessage.includes("not a directory")) {
      try {
        const parentPath = await invokeTauri<string>("get_parent_directory", { filePath: firstPath });
        handleFolder(parentPath);
      } catch (err) {
        hideSpinner();
        showError(`Error: ${err}. Please drop a folder or use the file picker.`);
      }
    } else {
      // For multiple paths, try parent directory as fallback
      try {
        const parentPath = await invokeTauri<string>("get_parent_directory", { filePath: firstPath });
        handleFolder(parentPath);
      } catch (err) {
        hideSpinner();
        showError(`Error: ${err}. Please drop a folder or use the file picker.`);
      }
    }
  }
}

/**
 * Prevent default drag-and-drop behavior for events that occur outside the configured drop zone.
 *
 * Blocks the browser's default handling of `dragover` and `drop` when the event target is not contained within the drop zone, preventing unintended navigations or file openings.
 */
export function setupDocumentDragHandlers(): void {
  document.addEventListener("dragover", (e) => {
    const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
    if (!dropZone?.contains(e.target as Node)) {
      e.preventDefault();
    }
  });
  
  document.addEventListener("drop", (e) => {
    const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
    if (!dropZone?.contains(e.target as Node)) {
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
  const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
  if (!dropZone) return;
  
  let isDragging = false;
  
  dropZone.addEventListener("mousedown", () => {
    isDragging = false;
  });
  
  dropZone.addEventListener("mousemove", () => {
    isDragging = true;
  });
  
  dropZone.addEventListener("click", async () => {
    if (isDragging) return;
    
    showSpinner();
    // Note: DropZone React component handles collapse/expand based on state.currentDirectory
    clearError();
    clearImageGrid();
    await selectFolder();
  });
}

/**
 * Registers HTML5 drag-and-drop handlers on the configured drop zone to prevent default browser behavior and manage the drag-over visual state.
 */
export function setupHTML5DragDrop(): void {
  const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
  if (!dropZone) return;
  
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("drag-over");
  });
  
  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drag-over");
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
  try {
    const eventNames = Object.values(DRAG_EVENTS);
    
    // Use window.__TAURI__.event.listen directly (works without bundler)
    if (!window.__TAURI__?.event?.listen) {
      console.warn('[setupTauriDragEvents] Tauri event API not available - returning early');
      return;
    }
    
    const eventListen = window.__TAURI__.event.listen;
    
    // Use for...of loop to properly await async operations
    for (const eventName of eventNames) {
      try {
        await eventListen(eventName, (event: Event<DragDropEvent>) => {
          try {
            if (eventName === DRAG_EVENTS.DROP) {
              showSpinner();
              // Note: DropZone React component handles collapse/expand based on state.currentDirectory
              clearError();
              clearImageGrid();
              const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
              if (dropZone) {
                dropZone.classList.remove("drag-over");
              }
              handleFileDrop(event).catch((err) => {
                console.error('[TauriDragEvent] handleFileDrop error:', err);
                hideSpinner();
                showError(`Error: ${err}`);
              });
            } else if (eventName === DRAG_EVENTS.ENTER || eventName === DRAG_EVENTS.OVER) {
              const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
              if (dropZone) {
                dropZone.classList.add("drag-over");
              }
              showSpinner();
              clearError();
              clearImageGrid();
            } else if (eventName === DRAG_EVENTS.LEAVE) {
              const dropZone = document.querySelector("#drop-zone") as HTMLElement | null;
              if (dropZone) {
                dropZone.classList.remove("drag-over");
              }
              hideSpinner();
            }
          } catch (handlerError) {
            console.error('[TauriDragEvent] Error in event handler for', eventName, ':', handlerError);
          }
        });
      } catch (error) {
        console.error('[setupTauriDragEvents] Failed to register listener for', eventName, ':', error);
      }
    }
  } catch (error) {
    console.error('[setupTauriDragEvents] FATAL ERROR:', error);
    console.error('[setupTauriDragEvents] Error value:', error);
    throw error;
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
      // Note: DropZone React component handles collapse/expand based on state.currentDirectory
    }
  } catch (error) {
    hideSpinner();
    showError(`Error selecting folder: ${error}`);
    // Note: DropZone React component handles collapse/expand based on state.currentDirectory
  }
}

