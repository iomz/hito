import { state } from "../state";
import { createElement } from "../utils/dom";
import type { Category, HotkeyConfig } from "../types";
import { confirm } from "../utils/dialog";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { normalizePath } from "../utils/state";

interface HitoFile {
  categories?: Category[];
  image_categories?: Array<[string, string[]]>;
  hotkeys?: HotkeyConfig[];
}

function getConfigFileDirectory(): string {
  if (state.configFilePath) {
    const path = normalizePath(state.configFilePath);
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
    const path = normalizePath(state.configFilePath);
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
    if (!isTauriInvokeAvailable()) {
      console.warn("[loadHitoConfig] Tauri invoke not available");
      return;
    }

    const configFileName = getConfigFileName();
    const data = await invokeTauri<HitoFile>("load_hito_config", {
      directory: configDir,
      filename: configFileName,
    });

    if (data.categories) {
      state.categories = data.categories;
    }

    if (data.image_categories) {
      state.imageCategories = new Map(data.image_categories);
    }
    
    if (data.categories || data.image_categories) {
      state.notify();
    }

    if (data.hotkeys) {
      // Ensure hotkeys have all required fields
      state.hotkeys = data.hotkeys.map((h) => ({
        id: h.id || `hotkey_${Date.now()}_${Math.random()}`,
        key: h.key || "",
        modifiers: Array.isArray(h.modifiers) ? h.modifiers : [],
        action: h.action || "",
      }));
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
    if (!isTauriInvokeAvailable()) {
      return;
    }

    const imageCategoriesArray = Array.from(state.imageCategories.entries());
    const configFileName = getConfigFileName();

    await invokeTauri("save_hito_config", {
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
export function generateCategoryColor(): string {
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
 * Toggle a category assignment for the current image.
 */
export async function toggleImageCategory(
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
  
  state.notify();
  await saveHitoConfig();
  // Note: All rendering is now handled by React components:
  // - CategoryList component handles category list rendering
  // - CurrentImageCategories component handles current image categories rendering
  // - ModalCategories component handles modal category tags rendering
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
    state.notify();
    await saveHitoConfig();
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
export function isCategoryNameDuplicate(name: string, excludeId?: string): boolean {
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
 * 
 * NOTE: With React managing the dialog, this now sets state instead of creating DOM.
 * The React CategoryDialog component handles rendering based on this state.
 */
export function showCategoryDialog(existingCategory?: Category): void {
  state.categoryDialogVisible = true;
  state.categoryDialogCategory = existingCategory;
  state.notify();
}

/**
 * Delete a category.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
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
  state.notify();

  await saveHitoConfig();
}

/**
 * Initialize category management.
 */
export async function setupCategories(): Promise<void> {
  // Categories will be loaded when a directory is browsed
  // Just initialize the UI here

  const addCategoryBtn = document.querySelector("#add-category-btn") as HTMLElement | null;
  if (addCategoryBtn) {
    addCategoryBtn.onclick = () => showCategoryDialog();
  }
}
