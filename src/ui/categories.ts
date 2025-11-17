import { state, elements } from "../state.js";
import { createElement } from "../utils/dom.js";
import type { Category, HotkeyConfig } from "../types.js";
import { confirm } from "../utils/dialog.js";

interface HitoFile {
  categories?: Category[];
  image_categories?: Array<[string, string[]]>;
  hotkeys?: HotkeyConfig[];
}

function getConfigFileDirectory(): string {
  if (state.configFilePath) {
    const path = state.configFilePath.replace(/\\/g, "/");
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash >= 0) {
      return path.substring(0, lastSlash);
    }
    return state.currentDirectory;
  }
  return state.currentDirectory;
}

function getConfigFileName(): string | undefined {
  if (state.configFilePath) {
    const path = state.configFilePath.replace(/\\/g, "/");
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash >= 0) {
      const filename = path.substring(lastSlash + 1);
      return filename || undefined;
    }
    return path || undefined;
  }
  return undefined;
}

/**
 * Load categories, image assignments, and hotkeys from .hito.json in the current directory.
 */
export async function loadHitoConfig(): Promise<void> {
  const configDir = getConfigFileDirectory();
  if (!configDir) {
    return;
  }

  try {
    if (!window.__TAURI__?.core?.invoke) {
      return;
    }

    const configFileName = getConfigFileName();
    const data = await window.__TAURI__.core.invoke<HitoFile>(
      "load_hito_config",
      {
        directory: configDir,
        filename: configFileName,
      },
    );

    if (data.categories) {
      state.categories = data.categories;
    }

    if (data.image_categories) {
      state.imageCategories = new Map(data.image_categories);
    }

    if (data.hotkeys) {
      // Ensure hotkeys have all required fields
      state.hotkeys = data.hotkeys.map((h) => ({
        id: h.id || `hotkey_${Date.now()}_${Math.random()}`,
        key: h.key || "",
        modifiers: Array.isArray(h.modifiers) ? h.modifiers : [],
        action: h.action || "",
      }));
      // Render hotkey list if sidebar is available
      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();
    }
  } catch (error) {
    console.error("Failed to load .hito.json:", error);
  }
}

export async function saveHitoConfig(): Promise<void> {
  const configDir = getConfigFileDirectory();
  if (!configDir) {
    return;
  }

  try {
    if (!window.__TAURI__?.core?.invoke) {
      return;
    }

    const imageCategoriesArray = Array.from(state.imageCategories.entries());
    const configFileName = getConfigFileName();

    await window.__TAURI__.core.invoke("save_hito_config", {
      directory: configDir,
      categories: state.categories,
      imageCategories: imageCategoriesArray,
      hotkeys: state.hotkeys,
      filename: configFileName,
    });
  } catch (error) {
    console.error("Failed to save .hito.json:", error);
  }
}

/**
 * Generate a random color for a category.
 */
function generateCategoryColor(): string {
  const colors = [
    "#22c55e",
    "#3b82f6",
    "#a855f7",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
    "#f97316",
    "#6366f1",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Render the list of categories.
 */
export function renderCategoryList(): void {
  if (!elements.categoryList) return;

  elements.categoryList.innerHTML = "";

  if (state.categories.length === 0) {
    const emptyState = createElement("div", "category-empty-state");
    emptyState.textContent = "No categories yet. Click 'Add' to create one.";
    elements.categoryList.appendChild(emptyState);
    return;
  }

  state.categories.forEach((category) => {
    const categoryItem = createElement("div", "category-item");

    const categoryColor = createElement("div", "category-color");
    categoryColor.style.backgroundColor = category.color;

    const categoryInfo = createElement("div", "category-info");
    const categoryName = createElement("div", "category-name");
    categoryName.textContent = category.name;

    const categoryCount = createElement("div", "category-count");
    const imageCount = Array.from(state.imageCategories.values()).filter(
      (ids) => ids.includes(category.id),
    ).length;
    categoryCount.textContent = `${imageCount} image${imageCount !== 1 ? "s" : ""}`;

    categoryInfo.appendChild(categoryName);
    categoryInfo.appendChild(categoryCount);

    const categoryActions = createElement("div", "category-actions");

    const editBtn = createElement("button", "category-edit-btn");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => showCategoryDialog(category);

    const deleteBtn = createElement("button", "category-delete-btn");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await deleteCategory(category.id);
      } catch (error) {
        console.error("Failed to delete category:", error);
      }
    };

    categoryActions.appendChild(editBtn);
    categoryActions.appendChild(deleteBtn);

    categoryItem.appendChild(categoryColor);
    categoryItem.appendChild(categoryInfo);
    categoryItem.appendChild(categoryActions);

    if (elements.categoryList) {
      elements.categoryList.appendChild(categoryItem);
    }
  });
}

/**
 * Render the current image's category assignments as tags in the modal.
 */
export function renderModalCategories(): void {
  if (!elements.modalCategories) return;

  elements.modalCategories.innerHTML = "";

  if (
    state.currentModalIndex < 0 ||
    state.currentModalIndex >= state.allImagePaths.length
  ) {
    return;
  }

  const currentImagePath = state.allImagePaths[state.currentModalIndex].path;
  const categoryIds = state.imageCategories.get(currentImagePath) || [];

  if (categoryIds.length === 0) {
    return;
  }

  // Get category details for assigned categories
  const assignedCategories = state.categories.filter((cat) =>
    categoryIds.includes(cat.id),
  );

  assignedCategories.forEach((category) => {
    const categoryTag = createElement("span", "modal-category-tag");
    categoryTag.style.backgroundColor = category.color;
    categoryTag.style.color = getContrastColor(category.color);
    categoryTag.textContent = category.name;
    if (elements.modalCategories) {
      elements.modalCategories.appendChild(categoryTag);
    }
  });
}

/**
 * Get a contrasting text color (black or white) based on background color brightness.
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Render the current image's category assignments.
 */
export function renderCurrentImageCategories(): void {
  if (!elements.currentImageCategories) return;

  elements.currentImageCategories.innerHTML = "";

  if (
    state.currentModalIndex < 0 ||
    state.currentModalIndex >= state.allImagePaths.length
  ) {
    return;
  }

  const currentImagePath = state.allImagePaths[state.currentModalIndex].path;
  const categoryIds = state.imageCategories.get(currentImagePath) || [];

  const header = createElement("div", "current-image-header");
  header.textContent = "Current Image Categories:";
  elements.currentImageCategories.appendChild(header);

  if (state.categories.length === 0) {
    const emptyMsg = createElement("div", "current-image-empty");
    emptyMsg.textContent = "Create categories first to assign them.";
    elements.currentImageCategories.appendChild(emptyMsg);
    return;
  }

  const categoryCheckboxes = createElement("div", "category-checkboxes");

  state.categories.forEach((category) => {
    const checkboxContainer = createElement("div", "category-checkbox-item");

    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.id = `category-${category.id}`;
    checkbox.checked = categoryIds.includes(category.id);
    checkbox.onchange = () => {
      toggleImageCategory(currentImagePath, category.id).catch((error) => {
        console.error("Failed to toggle category:", error);
      });
    };

    const label = createElement("label");
    label.setAttribute("for", `category-${category.id}`);

    const colorDot = createElement("span", "category-dot");
    colorDot.style.backgroundColor = category.color;

    const labelText = createElement("span");
    labelText.textContent = category.name;

    label.appendChild(colorDot);
    label.appendChild(labelText);

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    categoryCheckboxes.appendChild(checkboxContainer);
  });

  elements.currentImageCategories.appendChild(categoryCheckboxes);
}

/**
 * Toggle a category assignment for the current image.
 */
async function toggleImageCategory(
  imagePath: string,
  categoryId: string,
): Promise<void> {
  const currentCategories = state.imageCategories.get(imagePath) || [];

  if (currentCategories.includes(categoryId)) {
    // Remove category
    state.imageCategories.set(
      imagePath,
      currentCategories.filter((id) => id !== categoryId),
    );
  } else {
    // Add category
    state.imageCategories.set(imagePath, [...currentCategories, categoryId]);
  }

  await saveHitoConfig();
  renderCategoryList();
  if (state.currentModalIndex >= 0) {
    renderCurrentImageCategories();
    renderModalCategories();
  }
}

/**
 * Assign a category to an image (always adds, doesn't toggle).
 */
export async function assignImageCategory(
  imagePath: string,
  categoryId: string,
): Promise<void> {
  const currentCategories = state.imageCategories.get(imagePath) || [];

  if (!currentCategories.includes(categoryId)) {
    state.imageCategories.set(imagePath, [...currentCategories, categoryId]);
    await saveHitoConfig();
    renderCategoryList();
    if (state.currentModalIndex >= 0) {
      renderCurrentImageCategories();
      renderModalCategories();
    }
  }
}

/**
 * Assign a category to the currently viewing image in the modal.
 */
export async function assignCategoryToCurrentImage(
  categoryId: string,
): Promise<void> {
  if (
    state.currentModalIndex < 0 ||
    state.currentModalIndex >= state.allImagePaths.length
  ) {
    return;
  }

  const currentImagePath = state.allImagePaths[state.currentModalIndex].path;
  await assignImageCategory(currentImagePath, categoryId);
}

/**
 * Toggle a category for the currently viewing image in the modal.
 */
export async function toggleCategoryForCurrentImage(
  categoryId: string,
): Promise<void> {
  if (
    state.currentModalIndex < 0 ||
    state.currentModalIndex >= state.allImagePaths.length
  ) {
    return;
  }

  const currentImagePath = state.allImagePaths[state.currentModalIndex].path;
  await toggleImageCategory(currentImagePath, categoryId);
}

/**
 * Check if a category name already exists.
 * @param name - The category name to check
 * @param excludeId - Optional category ID to exclude from the check (for editing)
 * @returns true if the name already exists, false otherwise
 */
function isCategoryNameDuplicate(name: string, excludeId?: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  return state.categories.some((category) => {
    // Skip the category being edited
    if (excludeId && category.id === excludeId) {
      return false;
    }
    // Case-insensitive comparison
    return category.name.toLowerCase() === normalizedName;
  });
}

/**
 * Show the add/edit category dialog.
 */
function showCategoryDialog(existingCategory?: Category): void {
  const overlay = createElement("div", "category-dialog-overlay");

  const dialog = createElement("div", "category-dialog");

  const dialogHeader = createElement("div", "category-dialog-header");
  const dialogTitle = createElement("h3");
  dialogTitle.textContent = existingCategory ? "Edit Category" : "Add Category";
  dialogHeader.appendChild(dialogTitle);

  const dialogClose = createElement("button", "category-dialog-close");
  dialogClose.textContent = "×";
  dialogClose.onclick = () => overlay.remove();
  dialogHeader.appendChild(dialogClose);

  const dialogBody = createElement("div", "category-dialog-body");

  // Error message element for duplicate name warning (created early so it can be referenced)
  const errorMsg = createElement("div", "category-error-message");
  errorMsg.style.display = "none";
  errorMsg.style.color = "#ef4444";
  errorMsg.style.fontSize = "0.85em";
  errorMsg.style.marginTop = "-8px";
  errorMsg.style.marginBottom = "8px";

  // Name input
  const nameLabel = createElement("label");
  nameLabel.textContent = "Category Name:";
  nameLabel.setAttribute("for", "category-name-input");
  const nameInput = createElement(
    "input",
    "category-input",
  ) as HTMLInputElement;
  nameInput.id = "category-name-input";
  nameInput.type = "text";
  nameInput.placeholder = "e.g., Keep, Archive, Delete";
  if (existingCategory) {
    nameInput.value = existingCategory.name;
  }
  
  // Function to check and show/hide duplicate warning
  const checkDuplicate = () => {
    const name = nameInput.value.trim();
    if (!name) {
      errorMsg.style.display = "none";
      return;
    }
    
    const excludeId = existingCategory?.id;
    if (isCategoryNameDuplicate(name, excludeId)) {
      errorMsg.textContent = `A category with the name "${name}" already exists.`;
      errorMsg.style.display = "block";
    } else {
      errorMsg.style.display = "none";
    }
  };
  
  // Check for duplicate as user types
  nameInput.oninput = checkDuplicate;
  
  // Check for duplicate when editing (should be none since it's the same category)
  if (existingCategory) {
    checkDuplicate();
  }

  // Color picker
  const colorLabel = createElement("label");
  colorLabel.textContent = "Color:";
  colorLabel.setAttribute("for", "category-color-input");
  const colorInput = createElement(
    "input",
    "category-input",
  ) as HTMLInputElement;
  colorInput.id = "category-color-input";
  colorInput.type = "color";
  colorInput.value = existingCategory?.color || generateCategoryColor();

  const colorPreview = createElement("div", "color-preview");
  colorPreview.style.backgroundColor = colorInput.value;

  colorInput.oninput = () => {
    colorPreview.style.backgroundColor = colorInput.value;
  };

  dialogBody.appendChild(nameLabel);
  dialogBody.appendChild(nameInput);
  dialogBody.appendChild(errorMsg);
  dialogBody.appendChild(colorLabel);
  const colorContainer = createElement("div", "color-picker-container");
  colorContainer.appendChild(colorInput);
  colorContainer.appendChild(colorPreview);
  dialogBody.appendChild(colorContainer);

  const dialogFooter = createElement("div", "category-dialog-footer");

  const cancelBtn = createElement(
    "button",
    "category-dialog-btn category-dialog-cancel",
  );
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = createElement(
    "button",
    "category-dialog-btn category-dialog-save",
  );
  saveBtn.textContent = existingCategory ? "Update" : "Add";
  saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      errorMsg.textContent = "Please enter a category name.";
      errorMsg.style.display = "block";
      return;
    }
    
    // Check for duplicate category name
    const excludeId = existingCategory?.id;
    if (isCategoryNameDuplicate(name, excludeId)) {
      // Error message is already shown inline, just prevent saving
      return;
    }
    
    // Hide any error messages before saving
    errorMsg.style.display = "none";

    const color = colorInput.value;

    if (existingCategory) {
      // Update existing category
      const index = state.categories.findIndex(
        (c) => c.id === existingCategory.id,
      );
      if (index >= 0) {
        state.categories[index] = {
          ...existingCategory,
          name,
          color,
        };
      }
    } else {
      // Add new category
      const newCategory: Category = {
        id: `category_${Date.now()}`,
        name,
        color,
      };
      state.categories.push(newCategory);
    }

    await saveHitoConfig();
    renderCategoryList();
    if (state.currentModalIndex >= 0) {
      renderCurrentImageCategories();
      renderModalCategories();
    }
    // Refresh hotkey list to update action dropdowns
    const { renderHotkeyList } = await import("./hotkeys.js");
    renderHotkeyList();
    overlay.remove();
  };

  dialogFooter.appendChild(cancelBtn);
  dialogFooter.appendChild(saveBtn);

  dialog.appendChild(dialogHeader);
  dialog.appendChild(dialogBody);
  dialog.appendChild(dialogFooter);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the name input
  setTimeout(() => nameInput.focus(), 100);
}

/**
 * Delete a category.
 */
async function deleteCategory(categoryId: string): Promise<void> {
  const userConfirmed = await confirm(
    "Are you sure you want to delete this category? This will remove it from all images.",
    {
      title: "Delete Category",
    }
  );

  if (!userConfirmed) {
    return;
  }

  // Remove category from all images
  state.imageCategories.forEach((categoryIds, imagePath) => {
    const updatedIds = categoryIds.filter((id) => id !== categoryId);
    if (updatedIds.length === 0) {
      state.imageCategories.delete(imagePath);
    } else {
      state.imageCategories.set(imagePath, updatedIds);
    }
  });

  // Clean up hotkeys that reference this category
  state.hotkeys.forEach((hotkey) => {
    if (hotkey.action) {
      // Check for all action patterns that reference this category
      if (
        hotkey.action === `toggle_category_${categoryId}` ||
        hotkey.action === `toggle_category_next_${categoryId}` ||
        hotkey.action.startsWith(`assign_category_${categoryId}`)
      ) {
        // Clear the action, allowing hotkeys without actions
        hotkey.action = "";
      }
    }
  });

  // Remove category
  state.categories = state.categories.filter((c) => c.id !== categoryId);

  await saveHitoConfig();
  renderCategoryList();
  if (state.currentModalIndex >= 0) {
    renderCurrentImageCategories();
    renderModalCategories();
  }
  // Refresh hotkey list to update action dropdowns
  const { renderHotkeyList } = await import("./hotkeys.js");
  renderHotkeyList();
}

/**
 * Initialize category management.
 */
export async function setupCategories(): Promise<void> {
  // Categories will be loaded when a directory is browsed
  // Just initialize the UI here
  renderCategoryList();

  if (elements.addCategoryBtn) {
    elements.addCategoryBtn.onclick = () => showCategoryDialog();
  }
}
