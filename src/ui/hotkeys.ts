import { state } from "../state";
import { createElement } from "../utils/dom";
import type { HotkeyConfig } from "../types";
import { saveHitoConfig } from "./categories";
import { confirm } from "../utils/dialog";

/**
 * Width of the hotkey sidebar when open.
 */
export const SIDEBAR_WIDTH = "350px";

/**
 * Updates the modal image layout to accommodate the sidebar state.
 * 
 * NOTE: This function is now a no-op. The sidebar overlays on top of the modal
 * (z-index 1002 > 1000), so the image position remains centered and unaffected.
 * 
 * @param isOpen - Whether the sidebar is open (unused, kept for API compatibility)
 */
function updateModalForSidebar(isOpen: boolean): void {
  // No-op: Sidebar overlays on top, image stays centered
}

/**
 * Toggle the hotkey sidebar visibility.
 */
export async function toggleHotkeySidebar(): Promise<void> {
  const hotkeySidebar = document.querySelector("#hotkeys-panel") as HTMLElement | null;
  if (!hotkeySidebar) return;
  
  state.isHotkeySidebarOpen = !state.isHotkeySidebarOpen;
  state.notify();
  
  if (state.isHotkeySidebarOpen) {
    hotkeySidebar.classList.add("open");
    updateModalForSidebar(true);
  } else {
    hotkeySidebar.classList.remove("open");
    updateModalForSidebar(false);
  }
}

/**
 * Close the hotkey sidebar.
 */
export function closeHotkeySidebar(): void {
  const hotkeySidebar = document.querySelector("#hotkeys-panel") as HTMLElement | null;
  if (!hotkeySidebar) return;
  
  state.isHotkeySidebarOpen = false;
  state.notify();
  hotkeySidebar.classList.remove("open");
  updateModalForSidebar(false);
}

/**
 * Format a hotkey combination for display.
 */
export function formatHotkeyDisplay(config: HotkeyConfig): string {
  const parts = [...config.modifiers, config.key];
  return parts.join(" + ");
}

/**
 * Check if a hotkey combination already exists.
 * @param key - The key
 * @param modifiers - Array of modifier keys
 * @param excludeId - Optional hotkey ID to exclude from the check (for editing)
 * @returns true if the combination already exists, false otherwise
 */
export function isHotkeyDuplicate(key: string, modifiers: string[], excludeId?: string): boolean {
  const sortedModifiers = [...modifiers].sort();
  
  return state.hotkeys.some((hotkey) => {
    // Skip the hotkey being edited
    if (excludeId && hotkey.id === excludeId) {
      return false;
    }
    
    // Check if key matches
    if (hotkey.key !== key) {
      return false;
    }
    
    // Check if modifiers match (order doesn't matter)
    const hotkeyModifiers = [...hotkey.modifiers].sort();
    if (hotkeyModifiers.length !== sortedModifiers.length) {
      return false;
    }
    
    return hotkeyModifiers.every((mod, index) => mod === sortedModifiers[index]);
  });
}


/**
 * Populate the action dropdown with available category actions.
 * 
 * NOTE: This function is still used by the React HotkeyDialog component
 * to generate action options. It's exported for use in React.
 */
export function populateActionDropdown(actionInput: HTMLSelectElement, existingAction?: string): void {
  // Clear existing options except the first "Select action..." option
  while (actionInput.children.length > 1) {
    actionInput.removeChild(actionInput.lastChild!);
  }
  
  // Add navigation actions
  const navigationGroup = createElement("optgroup") as HTMLOptGroupElement;
  navigationGroup.label = "Navigation Actions";
  
  const nextImageOption = createElement("option") as HTMLOptionElement;
  nextImageOption.value = "next_image";
  nextImageOption.textContent = "Next Image";
  navigationGroup.appendChild(nextImageOption);
  
  const prevImageOption = createElement("option") as HTMLOptionElement;
  prevImageOption.value = "previous_image";
  prevImageOption.textContent = "Previous Image";
  navigationGroup.appendChild(prevImageOption);
  
  const deleteImageOption = createElement("option") as HTMLOptionElement;
  deleteImageOption.value = "delete_image_and_next";
  deleteImageOption.textContent = "Delete Image and move to next";
  navigationGroup.appendChild(deleteImageOption);
  
  actionInput.appendChild(navigationGroup);
  
  // Add category toggle actions
  if (state.categories.length > 0) {
    const toggleGroup = createElement("optgroup") as HTMLOptGroupElement;
    toggleGroup.label = "Toggle Category";
    state.categories.forEach((category) => {
      const option = createElement("option") as HTMLOptionElement;
      option.value = `toggle_category_${category.id}`;
      option.textContent = `Toggle ${category.name}`;
      toggleGroup.appendChild(option);
    });
    actionInput.appendChild(toggleGroup);
    
    const toggleAndNextGroup = createElement("optgroup") as HTMLOptGroupElement;
    toggleAndNextGroup.label = "Toggle Category and Move to Next";
    state.categories.forEach((category) => {
      const option = createElement("option") as HTMLOptionElement;
      option.value = `toggle_category_next_${category.id}`;
      option.textContent = `Toggle ${category.name} and move to next`;
      toggleAndNextGroup.appendChild(option);
    });
    actionInput.appendChild(toggleAndNextGroup);
  } else {
    const noCategoriesOption = createElement("option") as HTMLOptionElement;
    noCategoriesOption.value = "";
    noCategoriesOption.textContent = "No categories available - create categories first";
    noCategoriesOption.disabled = true;
    actionInput.appendChild(noCategoriesOption);
  }
  
  if (existingAction) {
    // Check if the action exists in the dropdown
    const optionExists = Array.from(actionInput.options).some(opt => opt.value === existingAction);
    if (optionExists) {
      actionInput.value = existingAction;
    } else {
      // Action doesn't exist (e.g., category was deleted), add it as a disabled option
      const missingOption = createElement("option") as HTMLOptionElement;
      missingOption.value = existingAction;
      missingOption.textContent = `${existingAction} (category not found)`;
      missingOption.disabled = true;
      actionInput.appendChild(missingOption);
      actionInput.value = existingAction;
    }
  }
}

/**
 * Show the add/edit hotkey dialog.
 * 
 * NOTE: With React managing the dialog, this now sets state instead of creating DOM.
 * The React HotkeyDialog component handles rendering based on this state.
 */
export function showHotkeyDialog(existingHotkey?: HotkeyConfig): void {
  state.hotkeyDialogVisible = true;
  state.hotkeyDialogHotkey = existingHotkey;
  state.notify();
}

/**
 * Edit an existing hotkey.
 */
export function editHotkey(hotkeyId: string): void {
  const hotkey = state.hotkeys.find(h => h.id === hotkeyId);
  if (hotkey) {
    showHotkeyDialog(hotkey);
  }
}

/**
 * Delete a hotkey.
 */
export async function deleteHotkey(hotkeyId: string): Promise<void> {
  const userConfirmed = await confirm("Are you sure you want to delete this hotkey?", {
    title: "Delete Hotkey",
  });

  if (!userConfirmed) {
    return;
  }

  state.hotkeys = state.hotkeys.filter(h => h.id !== hotkeyId);
  state.notify();
  saveHitoConfig().catch((error) => {
    console.error("Failed to save hotkeys:", error);
  });
}

/**
 * Execute a hotkey action.
 */
export async function executeHotkeyAction(action: string): Promise<void> {
  if (!action) {
    return;
  }
  
  // Handle navigation actions
  if (action === "next_image") {
    const { showNextImage } = await import("./modal");
    showNextImage();
    return;
  }
  
  if (action === "previous_image") {
    const { showPreviousImage } = await import("./modal");
    showPreviousImage();
    return;
  }
  
  if (action === "delete_image_and_next") {
    const { deleteCurrentImage } = await import("./modal");
    await deleteCurrentImage();
    return;
  }
  
  // Handle category toggle actions (migrate old assign actions to toggle)
  if (action.startsWith("assign_category_") || action.startsWith("toggle_category_")) {
    // Match longer patterns first to avoid partial matches
    let categoryId: string;
    if (action.startsWith("toggle_category_next_")) {
      categoryId = action.replace("toggle_category_next_", "");
    } else if (action.startsWith("toggle_category_")) {
      categoryId = action.replace("toggle_category_", "");
    } else {
      categoryId = action.replace("assign_category_", "");
    }
    
    const { toggleCategoryForCurrentImage } = await import("./categories");
    await toggleCategoryForCurrentImage(categoryId);
    
    // Move to next image only if action is "toggle_category_next_"
    if (action.startsWith("toggle_category_next_")) {
      const { showNextImage } = await import("./modal");
      showNextImage();
    }
    return;
  }
  
  // Add more action types here in the future
  console.warn("Unknown hotkey action:", action);
}

/**
 * Check if a keyboard event matches a configured hotkey and execute its action.
 */
export function checkAndExecuteHotkey(event: KeyboardEvent): boolean {
  const modifiers: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    modifiers.push(event.metaKey ? "Cmd" : "Ctrl");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }
  
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  
  // Find matching hotkey
  const matchingHotkey = state.hotkeys.find((hotkey) => {
    if (hotkey.key !== key) {
      return false;
    }
    
    if (hotkey.modifiers.length !== modifiers.length) {
      return false;
    }
    
    // Check if all modifiers match (order doesn't matter)
    const hotkeyModifiers = [...hotkey.modifiers].sort();
    const eventModifiers = [...modifiers].sort();
    return hotkeyModifiers.every((mod, index) => mod === eventModifiers[index]);
  });
  
  if (matchingHotkey && matchingHotkey.action) {
    executeHotkeyAction(matchingHotkey.action).catch((error) => {
      console.error("Failed to execute hotkey action:", error);
    });
    return true;
  }
  
  return false;
}

/**
 * Initialize hotkey sidebar event handlers.
 */
export function setupHotkeySidebar(): void {
  const hotkeySidebarToggle = document.querySelector("#hotkey-sidebar-toggle") as HTMLElement | null;
  const hotkeySidebarClose = document.querySelector("#hotkey-sidebar-close") as HTMLElement | null;
  const addHotkeyBtn = document.querySelector("#add-hotkey-btn") as HTMLElement | null;
  
  if (!hotkeySidebarToggle || !hotkeySidebarClose || !addHotkeyBtn) {
    return;
  }
  
  hotkeySidebarToggle.onclick = () => toggleHotkeySidebar();
  hotkeySidebarClose.onclick = () => closeHotkeySidebar();
  addHotkeyBtn.onclick = () => showHotkeyDialog();
  
  // Close sidebar when clicking outside
  const hotkeySidebar = document.querySelector("#hotkeys-panel") as HTMLElement | null;
  if (hotkeySidebar) {
    hotkeySidebar.onclick = (e: MouseEvent) => {
      if (e.target === hotkeySidebar) {
        closeHotkeySidebar();
      }
    };
  }
}

