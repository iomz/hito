import { store } from "../utils/jotaiStore";
import { isHotkeySidebarOpenAtom, hotkeysAtom, categoriesAtom, hotkeyDialogVisibleAtom, hotkeyDialogHotkeyAtom } from "../state";
import { createElement } from "../utils/dom";
import type { HotkeyConfig } from "../types";
import { saveHitoConfig } from "./categories";
import { confirm } from "../utils/dialog";
import { showError } from "./error";

/**
 * Width of the hotkey sidebar when open.
 */
export const SIDEBAR_WIDTH = "350px";

/**
 * Toggle the hotkey sidebar visibility.
 */
export async function toggleHotkeySidebar(): Promise<void> {
  const hotkeySidebar = document.querySelector("#hotkey-sidebar") as HTMLElement | null;
  if (!hotkeySidebar) return;
  
  const current = store.get(isHotkeySidebarOpenAtom);
  store.set(isHotkeySidebarOpenAtom, !current);
  
  if (!current) {
    hotkeySidebar.classList.add("open");
  } else {
    hotkeySidebar.classList.remove("open");
  }
}

/**
 * Close the hotkey sidebar.
 */
export function closeHotkeySidebar(): void {
  const hotkeySidebar = document.querySelector("#hotkey-sidebar") as HTMLElement | null;
  if (!hotkeySidebar) return;
  
  store.set(isHotkeySidebarOpenAtom, false);
  hotkeySidebar.classList.remove("open");
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
  const hotkeys = store.get(hotkeysAtom);
  
  return hotkeys.some((hotkey) => {
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
  const categories = store.get(categoriesAtom);
  if (categories.length > 0) {
    const toggleGroup = createElement("optgroup") as HTMLOptGroupElement;
    toggleGroup.label = "Toggle Category";
    categories.forEach((category) => {
      const option = createElement("option") as HTMLOptionElement;
      option.value = `toggle_category_${category.id}`;
      option.textContent = `Toggle ${category.name}`;
      toggleGroup.appendChild(option);
    });
    actionInput.appendChild(toggleGroup);
    
    const toggleAndNextGroup = createElement("optgroup") as HTMLOptGroupElement;
    toggleAndNextGroup.label = "Toggle Category and Move to Next";
    categories.forEach((category) => {
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
 */
export function showHotkeyDialog(existingHotkey?: HotkeyConfig): void {
  store.set(hotkeyDialogVisibleAtom, true);
  store.set(hotkeyDialogHotkeyAtom, existingHotkey);
}

/**
 * Edit an existing hotkey.
 */
export function editHotkey(hotkeyId: string): void {
  const hotkeys = store.get(hotkeysAtom);
  const hotkey = hotkeys.find(h => h.id === hotkeyId);
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

  const hotkeys = store.get(hotkeysAtom);
  store.set(hotkeysAtom, hotkeys.filter(h => h.id !== hotkeyId));
  try {
    await saveHitoConfig();
  } catch (error) {
    console.error("Failed to save hotkeys:", error);
    showError("Failed to save hotkeys");
  }
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
  const hotkeys = store.get(hotkeysAtom);
  const matchingHotkey = hotkeys.find((hotkey) => {
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
 * Find the first unassigned number key (1-9, then 0).
 * Only checks keys with no modifiers.
 * @returns The first available number key ("1" through "9", then "0"), or null if all are taken
 */
export function findUnassignedNumberKey(): string | null {
  const hotkeys = store.get(hotkeysAtom);
  const numberKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]; // 0 is checked last
  
  for (const key of numberKeys) {
    const isAssigned = hotkeys.some((hotkey) => {
      // Check if key matches and has no modifiers
      return hotkey.key === key && hotkey.modifiers.length === 0;
    });
    
    if (!isAssigned) {
      return key;
    }
  }
  
  return null; // All number keys are assigned
}

/**
 * Automatically assign a hotkey to a category using an unassigned number key.
 * @param categoryId - The ID of the category to assign a hotkey to
 * @returns true if a hotkey was successfully assigned, false otherwise
 */
export async function autoAssignHotkeyToCategory(categoryId: string): Promise<boolean> {
  const unassignedKey = findUnassignedNumberKey();
  
  if (!unassignedKey) {
    // All number keys are already assigned
    console.log("[autoAssignHotkeyToCategory] No unassigned number keys available");
    return false;
  }
  
  const hotkeys = store.get(hotkeysAtom);
  const newHotkey: HotkeyConfig = {
    id: `hotkey_${Date.now()}`,
    key: unassignedKey,
    modifiers: [],
    action: `toggle_category_${categoryId}`,
  };
  
  store.set(hotkeysAtom, [...hotkeys, newHotkey]);
  
  try {
    await saveHitoConfig();
    console.log(`[autoAssignHotkeyToCategory] Successfully assigned key "${unassignedKey}" to category ${categoryId}`);
    return true;
  } catch (error) {
    console.error("[autoAssignHotkeyToCategory] Failed to save hotkey:", error);
    // Rollback the hotkey addition
    store.set(hotkeysAtom, hotkeys);
    return false;
  }
}

/**
 * Format an action string into a human-readable label.
 * @param action - The action string (e.g., "toggle_category_123", "next_image")
 * @param categories - Array of categories to resolve category IDs to names
 * @returns Human-readable action label
 */
export function formatActionLabel(action: string, categories: Array<{ id: string; name: string }>): string {
  if (!action) {
    return "No action";
  }
  
  // Navigation actions
  if (action === "next_image") {
    return "Next Image";
  }
  if (action === "previous_image") {
    return "Previous Image";
  }
  if (action === "delete_image_and_next") {
    return "Delete Image and move to next";
  }
  
  // Category toggle actions
  if (action.startsWith("toggle_category_next_")) {
    const categoryId = action.replace("toggle_category_next_", "");
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      return `Toggle ${category.name} and move to next`;
    }
    return `Toggle category (${categoryId}) and move to next`;
  }
  
  if (action.startsWith("toggle_category_")) {
    const categoryId = action.replace("toggle_category_", "");
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      return `Toggle ${category.name}`;
    }
    return `Toggle category (${categoryId})`;
  }
  
  // Legacy assign actions (for backwards compatibility)
  if (action.startsWith("assign_category_")) {
    const categoryId = action.replace("assign_category_", "");
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      return `Assign ${category.name}`;
    }
    return `Assign category (${categoryId})`;
  }
  
  // Unknown action
  return action;
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
  const hotkeySidebar = document.querySelector("#hotkey-sidebar") as HTMLElement | null;
  if (hotkeySidebar) {
    hotkeySidebar.onclick = (e: MouseEvent) => {
      if (e.target === hotkeySidebar) {
        closeHotkeySidebar();
      }
    };
  }
}

