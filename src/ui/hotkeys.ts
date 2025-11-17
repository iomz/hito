import { state, elements } from "../state.js";
import { createElement } from "../utils/dom.js";
import type { HotkeyConfig } from "../types.js";
import { saveHitoConfig } from "./categories.js";
import { confirm } from "../utils/dialog.js";
import { updateShortcutsOverlay } from "./modal.js";

/**
 * Width of the hotkey sidebar when open.
 */
export const SIDEBAR_WIDTH = "350px";

/**
 * Updates the modal image layout to accommodate the sidebar state.
 * 
 * @param isOpen - Whether the sidebar is open. If true, applies sidebar offset;
 *                 if false, resets modal image styles.
 */
function updateModalForSidebar(isOpen: boolean): void {
  if (!elements.modalImage || state.currentModalIndex < 0) {
    return;
  }
  
  if (isOpen) {
    elements.modalImage.style.marginLeft = SIDEBAR_WIDTH;
    elements.modalImage.style.maxWidth = `calc(90% - ${SIDEBAR_WIDTH})`;
  } else {
    elements.modalImage.style.marginLeft = "";
    elements.modalImage.style.maxWidth = "";
  }
}

/**
 * Toggle the hotkey sidebar visibility.
 */
export async function toggleHotkeySidebar(): Promise<void> {
  if (!elements.hotkeySidebar) return;
  
  state.isHotkeySidebarOpen = !state.isHotkeySidebarOpen;
  
  if (state.isHotkeySidebarOpen) {
    elements.hotkeySidebar.classList.add("open");
    updateModalForSidebar(true);
    renderHotkeyList();
    // Refresh categories display
    const { renderCurrentImageCategories, renderCategoryList } = await import("./categories.js");
    renderCategoryList();
    if (state.currentModalIndex >= 0) {
      renderCurrentImageCategories();
    }
  } else {
    elements.hotkeySidebar.classList.remove("open");
    updateModalForSidebar(false);
  }
}

/**
 * Close the hotkey sidebar.
 */
export function closeHotkeySidebar(): void {
  if (!elements.hotkeySidebar) return;
  
  state.isHotkeySidebarOpen = false;
  elements.hotkeySidebar.classList.remove("open");
  updateModalForSidebar(false);
}

/**
 * Format a hotkey combination for display.
 */
function formatHotkeyDisplay(config: HotkeyConfig): string {
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
function isHotkeyDuplicate(key: string, modifiers: string[], excludeId?: string): boolean {
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
 * Render the list of configured hotkeys.
 */
export function renderHotkeyList(): void {
  if (!elements.hotkeyList) {
    return;
  }
  
  elements.hotkeyList.innerHTML = "";
  
  // Update shortcuts overlay when hotkeys change
  updateShortcutsOverlay();
  
  if (state.hotkeys.length === 0) {
    const emptyState = createElement("div", "hotkey-empty-state");
    emptyState.textContent = "No hotkeys configured. Click 'Add Hotkey' to create one.";
    elements.hotkeyList.appendChild(emptyState);
    return;
  }
  
  state.hotkeys.forEach((hotkey) => {
    const hotkeyItem = createElement("div", "hotkey-item");
    
    const hotkeyInfo = createElement("div", "hotkey-info");
    
    const hotkeyKey = createElement("div", "hotkey-key");
    hotkeyKey.textContent = formatHotkeyDisplay(hotkey);
    
    hotkeyInfo.appendChild(hotkeyKey);
    
    const hotkeyActions = createElement("div", "hotkey-actions");
    
    const editBtn = createElement("button", "hotkey-edit-btn");
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", `Edit hotkey ${hotkey.id}`);
    editBtn.onclick = () => editHotkey(hotkey.id);
    
    const deleteBtn = createElement("button", "hotkey-delete-btn");
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete hotkey ${hotkey.id}`);
    deleteBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await deleteHotkey(hotkey.id);
      } catch (error) {
        console.error("Failed to delete hotkey:", error);
      }
    };
    
    hotkeyActions.appendChild(editBtn);
    hotkeyActions.appendChild(deleteBtn);
    
    hotkeyItem.appendChild(hotkeyInfo);
    hotkeyItem.appendChild(hotkeyActions);
    
    if (elements.hotkeyList) {
      elements.hotkeyList.appendChild(hotkeyItem);
    }
  });
}

/**
 * Populate the action dropdown with available category actions.
 */
function populateActionDropdown(actionInput: HTMLSelectElement, existingAction?: string): void {
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
 */
function showHotkeyDialog(existingHotkey?: HotkeyConfig): void {
  // Create dialog overlay
  const overlay = createElement("div", "hotkey-dialog-overlay");
  
  const dialog = createElement("div", "hotkey-dialog");
  
  const dialogHeader = createElement("div", "hotkey-dialog-header");
  const dialogTitle = createElement("h3");
  dialogTitle.textContent = existingHotkey ? "Edit Hotkey" : "Add Hotkey";
  dialogHeader.appendChild(dialogTitle);
  
  const dialogClose = createElement("button", "hotkey-dialog-close");
  dialogClose.textContent = "×";
  dialogClose.onclick = () => overlay.remove();
  dialogHeader.appendChild(dialogClose);
  
  const dialogBody = createElement("div", "hotkey-dialog-body");
  
  // Error message element for duplicate hotkey warning (created early so it can be referenced)
  const errorMsg = createElement("div", "hotkey-error-message");
  errorMsg.style.display = "none";
  errorMsg.style.color = "#ef4444";
  errorMsg.style.fontSize = "0.85em";
  errorMsg.style.marginTop = "-8px";
  
  // Key input (read-only, will be set by key capture)
  const keyLabel = createElement("label");
  keyLabel.textContent = "Key Combination:";
  keyLabel.setAttribute("for", "hotkey-key-display");
  const keyDisplay = createElement("div", "hotkey-key-display");
  keyDisplay.id = "hotkey-key-display";
  keyDisplay.textContent = existingHotkey 
    ? formatHotkeyDisplay(existingHotkey)
    : "Press keys to capture...";
  keyDisplay.setAttribute("tabindex", "0");
  
  let capturedModifiers: string[] = [];
  let capturedKey: string = "";
  let isCapturing = false;
  
  const startCapture = () => {
    isCapturing = true;
    capturedModifiers = [];
    capturedKey = "";
    keyDisplay.textContent = "Press keys...";
    keyDisplay.classList.add("capturing");
    errorMsg.style.display = "none"; // Hide error when starting to capture
  };
  
  const showKeyCaptureError = () => {
    errorMsg.textContent = "Please capture a key combination before saving.";
    errorMsg.style.display = "block";
  };
  
  const stopCapture = () => {
    isCapturing = false;
    keyDisplay.classList.remove("capturing");
    if (capturedKey) {
      keyDisplay.textContent = formatHotkeyDisplay({
        id: "",
        key: capturedKey,
        modifiers: capturedModifiers,
        action: ""
      });
    }
  };
  
  // Function to check and show/hide duplicate warning
  const checkDuplicate = () => {
    if (!capturedKey) {
      errorMsg.style.display = "none";
      return;
    }
    
    const excludeId = existingHotkey?.id;
    if (isHotkeyDuplicate(capturedKey, capturedModifiers, excludeId)) {
      const hotkeyDisplay = formatHotkeyDisplay({
        id: "",
        key: capturedKey,
        modifiers: capturedModifiers,
        action: ""
      });
      errorMsg.textContent = `This hotkey combination (${hotkeyDisplay}) is already in use.`;
      errorMsg.style.display = "block";
    } else {
      errorMsg.style.display = "none";
    }
  };
  
  keyDisplay.onfocus = startCapture;
  keyDisplay.onblur = stopCapture;
  
  keyDisplay.onkeydown = (e: KeyboardEvent) => {
    if (!isCapturing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push(e.metaKey ? "Cmd" : "Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");
    
    capturedModifiers = modifiers;
    
    // Get the key, avoiding modifier keys
    if (!["Control", "Meta", "Alt", "Shift"].includes(e.key)) {
      capturedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      stopCapture();
      errorMsg.style.display = "none"; // Hide key capture error when key is captured
      checkDuplicate(); // Check for duplicate after capturing
    }
  };
  
  if (existingHotkey) {
    capturedModifiers = [...existingHotkey.modifiers]; // Copy array
    capturedKey = existingHotkey.key;
    keyDisplay.textContent = formatHotkeyDisplay(existingHotkey);
    // Check for duplicate when editing (should be none since it's the same hotkey)
    checkDuplicate();
  }
  
  // Action input - populate with category actions
  const actionLabel = createElement("label");
  actionLabel.textContent = "Action:";
  actionLabel.setAttribute("for", "hotkey-action-input");
  const actionInput = createElement("select", "hotkey-input") as HTMLSelectElement;
  actionInput.id = "hotkey-action-input";
  
  // Add "None" option
  const noneOption = createElement("option") as HTMLOptionElement;
  noneOption.value = "";
  noneOption.textContent = "Select action...";
  actionInput.appendChild(noneOption);
  
  // Populate with current categories
  populateActionDropdown(actionInput, existingHotkey?.action);
  
  dialogBody.appendChild(keyLabel);
  dialogBody.appendChild(keyDisplay);
  dialogBody.appendChild(errorMsg);
  dialogBody.appendChild(actionLabel);
  dialogBody.appendChild(actionInput);
  
  const dialogFooter = createElement("div", "hotkey-dialog-footer");
  
  const cancelBtn = createElement("button", "hotkey-dialog-btn hotkey-dialog-cancel");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => overlay.remove();
  
  const saveBtn = createElement("button", "hotkey-dialog-btn hotkey-dialog-save");
  saveBtn.textContent = existingHotkey ? "Update" : "Add";
  saveBtn.onclick = () => {
    if (!capturedKey) {
      showKeyCaptureError();
      return;
    }
    
    // Check for duplicate hotkey combination
    const excludeId = existingHotkey?.id;
    if (isHotkeyDuplicate(capturedKey, capturedModifiers, excludeId)) {
      // Error message is already shown inline, just prevent saving
      return;
    }
    
    // Hide any error messages before saving
    errorMsg.style.display = "none";
    
    const action = (actionInput as HTMLSelectElement).value || `action_${Date.now()}`;
    
    if (existingHotkey) {
      // Update existing hotkey
      const index = state.hotkeys.findIndex(h => h.id === existingHotkey.id);
      if (index >= 0) {
        state.hotkeys[index] = {
          ...existingHotkey,
          key: capturedKey,
          modifiers: [...capturedModifiers], // Copy array
          action
        };
      }
    } else {
      // Add new hotkey
      const newHotkey: HotkeyConfig = {
        id: `hotkey_${Date.now()}`,
        key: capturedKey,
        modifiers: [...capturedModifiers], // Copy array
        action
      };
      state.hotkeys.push(newHotkey);
    }
    
    renderHotkeyList();
    saveHitoConfig().catch((error) => {
      console.error("Failed to save hotkeys:", error);
    });
    overlay.remove();
  };
  
  dialogFooter.appendChild(cancelBtn);
  dialogFooter.appendChild(saveBtn);
  
  dialog.appendChild(dialogHeader);
  dialog.appendChild(dialogBody);
  dialog.appendChild(dialogFooter);
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Only auto-start capture for new hotkeys, not when editing
  if (!existingHotkey) {
    // Delay is necessary to ensure the DOM is fully rendered and the element
    // is focusable before attempting to focus it. Without this delay, focus()
    // may fail silently if called before the element is ready.
    setTimeout(() => {
      keyDisplay.focus();
      startCapture();
    }, 100);
  }
}

/**
 * Edit an existing hotkey.
 */
function editHotkey(hotkeyId: string): void {
  const hotkey = state.hotkeys.find(h => h.id === hotkeyId);
  if (hotkey) {
    showHotkeyDialog(hotkey);
  }
}

/**
 * Delete a hotkey.
 */
async function deleteHotkey(hotkeyId: string): Promise<void> {
  const userConfirmed = await confirm("Are you sure you want to delete this hotkey?", {
    title: "Delete Hotkey",
  });

  if (!userConfirmed) {
    return;
  }

  state.hotkeys = state.hotkeys.filter(h => h.id !== hotkeyId);
  renderHotkeyList();
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
    const { showNextImage } = await import("./modal.js");
    showNextImage();
    return;
  }
  
  if (action === "previous_image") {
    const { showPreviousImage } = await import("./modal.js");
    showPreviousImage();
    return;
  }
  
  if (action === "delete_image_and_next") {
    const { deleteCurrentImage } = await import("./modal.js");
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
    
    const { toggleCategoryForCurrentImage } = await import("./categories.js");
    await toggleCategoryForCurrentImage(categoryId);
    
    // Move to next image only if action is "toggle_category_next_"
    if (action.startsWith("toggle_category_next_")) {
      const { showNextImage } = await import("./modal.js");
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
  if (!elements.hotkeySidebarToggle || !elements.hotkeySidebarClose || !elements.addHotkeyBtn) {
    return;
  }
  
  elements.hotkeySidebarToggle.onclick = () => toggleHotkeySidebar();
  elements.hotkeySidebarClose.onclick = () => closeHotkeySidebar();
  elements.addHotkeyBtn.onclick = () => showHotkeyDialog();
  
  // Close sidebar when clicking outside
  if (elements.hotkeySidebar) {
    elements.hotkeySidebar.onclick = (e: MouseEvent) => {
      if (e.target === elements.hotkeySidebar) {
        closeHotkeySidebar();
      }
    };
  }
}

