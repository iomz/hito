import { store } from "../utils/jotaiStore";
import {
  categoriesAtom,
  imageCategoriesAtom,
  hotkeysAtom,
  dataFilePathAtom,
  currentDirectoryAtom,
  allImagePathsAtom,
  filterOptionsAtom,
  currentModalImagePathAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
  categoryDialogVisibleAtom,
  categoryDialogCategoryAtom,
} from "../state";
import type { Category, HotkeyConfig, CategoryAssignment } from "../types";
import { confirm } from "../utils/dialog";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { normalizePath } from "../utils/state";

interface HitoFile {
  image_categories?: Array<[string, CategoryAssignment[]]>;
  categories?: Category[];
  hotkeys?: HotkeyConfig[];
}

interface AppData {
  categories?: Category[];
  hotkeys?: HotkeyConfig[];
}

function getDataFileDirectory(): string {
  const dataFilePath = store.get(dataFilePathAtom);
  const currentDirectory = store.get(currentDirectoryAtom);
  if (dataFilePath) {
    const path = normalizePath(dataFilePath);
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash >= 0) {
      return path.substring(0, lastSlash);
    }
    return currentDirectory;
  }
  return currentDirectory;
}

function getDataFileName(): string | undefined {
  const dataFilePath = store.get(dataFilePathAtom);
  if (dataFilePath) {
    const path = normalizePath(dataFilePath);
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
 * Create default hotkey configurations.
 */
function createDefaultHotkeys(): HotkeyConfig[] {
  const baseId = Date.now();
  return [
    {
      id: `hotkey_${baseId}_0`,
      key: "J",
      modifiers: [],
      action: "next_image",
    },
    {
      id: `hotkey_${baseId}_1`,
      key: "K",
      modifiers: [],
      action: "previous_image",
    },
  ];
}

/**
 * Initialize default hotkeys if the store is empty.
 * @param abortSignal - Optional AbortSignal to cancel the operation
 * @returns true if default hotkeys were set, false otherwise
 */
function initializeDefaultHotkeysIfEmpty(abortSignal?: AbortSignal): boolean {
  const hotkeys = store.get(hotkeysAtom);
  if (!hotkeys || hotkeys.length === 0) {
    if (abortSignal?.aborted) {
      return false;
    }
    store.set(hotkeysAtom, createDefaultHotkeys());
    return true;
  }
  return false;
}

/**
 * Load categories and hotkeys from app data directory.
 * @param abortSignal - Optional AbortSignal to cancel the operation
 */
export async function loadAppData(abortSignal?: AbortSignal): Promise<void> {
  try {
    if (!isTauriInvokeAvailable()) {
      console.warn("[loadAppData] Tauri invoke not available");
      return;
    }

    if (abortSignal?.aborted) {
      return;
    }

    console.log("[loadAppData] Loading app data");
    
    const data = await invokeTauri<AppData>("load_app_data");
    
    if (abortSignal?.aborted) {
      return;
    }

    console.log("[loadAppData] Loaded app data:", {
      categoriesCount: data.categories?.length || 0,
      hotkeysCount: data.hotkeys?.length || 0,
    });

    if (data.categories) {
      store.set(categoriesAtom, data.categories);
    }

    if (data.hotkeys && data.hotkeys.length > 0) {
      // Ensure hotkeys have all required fields
      store.set(hotkeysAtom, data.hotkeys.map((h) => ({
        id: h.id || `hotkey_${Date.now()}_${Math.random()}`,
        key: h.key || "",
        modifiers: Array.isArray(h.modifiers) ? h.modifiers : [],
        action: h.action || "",
      })));
    } else {
      // No hotkeys in app data - create default hotkeys
      if (initializeDefaultHotkeysIfEmpty(abortSignal)) {
        // Save the default hotkeys to app data
        try {
          await saveHitoConfig();
          if (abortSignal?.aborted) {
            return;
          }
          console.log("[loadAppData] Default hotkeys saved successfully");
        } catch (saveError) {
          if (abortSignal?.aborted) {
            return;
          }
          console.error("[loadAppData] Failed to save default hotkeys:", saveError);
        }
      }
    }
  } catch (error) {
    if (abortSignal?.aborted) {
      return;
    }
    console.error("[loadAppData] Failed to load app data:", error);
    // Initialize with defaults if loading fails
    initializeDefaultHotkeysIfEmpty(abortSignal);
  }
}

/**
 * Save categories and hotkeys to app data directory.
 */
export async function saveAppData(): Promise<void> {
  try {
    if (!isTauriInvokeAvailable()) {
      console.warn("[saveAppData] Tauri invoke not available");
      return;
    }

    const categories = store.get(categoriesAtom);
    const hotkeys = store.get(hotkeysAtom);

    console.log("[saveAppData] Saving app data:", {
      categoriesCount: categories.length,
      hotkeysCount: hotkeys.length,
    });

    await invokeTauri("save_app_data", {
      categories: categories,
      hotkeys: hotkeys,
    });

    console.log("[saveAppData] App data saved successfully");
  } catch (error) {
    console.error("[saveAppData] Failed to save app data:", error);
    throw error; // Re-throw to allow callers to handle it
  }
}

/**
 * Load image category assignments from .hito.json in the current directory.
 */
export async function loadHitoConfig(): Promise<void> {
  const dataDir = getDataFileDirectory();
  const currentDirectory = store.get(currentDirectoryAtom);
  const dataFilePath = store.get(dataFilePathAtom);
  if (!dataDir || dataDir.trim() === "") {
    console.warn("[loadHitoConfig] Data directory is empty or not set. currentDirectory:", currentDirectory, "dataFilePath:", dataFilePath);
    return;
  }

  try {
    if (!isTauriInvokeAvailable()) {
      console.warn("[loadHitoConfig] Tauri invoke not available");
      return;
    }

    const dataFileName = getDataFileName();
    console.log("[loadHitoConfig] Loading data file:", { directory: dataDir, filename: dataFileName });
    
    const data = await invokeTauri<HitoFile>("load_hito_config", {
      directory: dataDir,
      filename: dataFileName,
    });
    
    console.log("[loadHitoConfig] Loaded data file:", {
      imageCategoriesCount: data.image_categories?.length || 0,
      categoriesCount: data.categories?.length || 0,
      hotkeysCount: data.hotkeys?.length || 0,
    });

    if (data.image_categories) {
      store.set(imageCategoriesAtom, new Map(data.image_categories));
    }
    
    // Load categories if present
    if (data.categories) {
      store.set(categoriesAtom, data.categories);
    }
    
    // Load hotkeys if present
    if (data.hotkeys && data.hotkeys.length > 0) {
      // Ensure hotkeys have all required fields
      store.set(hotkeysAtom, data.hotkeys.map((h) => ({
        id: h.id || `hotkey_${Date.now()}_${Math.random()}`,
        key: h.key || "",
        modifiers: Array.isArray(h.modifiers) ? h.modifiers : [],
        action: h.action || "",
      })));
    } else {
      // Initialize default hotkeys if missing
      const hotkeys = store.get(hotkeysAtom);
      if (!hotkeys || hotkeys.length === 0) {
        if (initializeDefaultHotkeysIfEmpty()) {
          // Save the default hotkeys to .hito.json
          try {
            await saveHitoConfig();
            console.log("[loadHitoConfig] Default hotkeys saved successfully");
          } catch (saveError) {
            console.error("[loadHitoConfig] Failed to save default hotkeys:", saveError);
          }
        }
      }
    }
  } catch (error) {
    // Check if this is a file-not-found error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;
    const isFileNotFound = 
      errorCode === 'ENOENT' ||
      errorMessage.toLowerCase().includes('no such file') ||
      errorMessage.toLowerCase().includes('not found');
    
    if (isFileNotFound) {
      // File doesn't exist - clear assignments
      console.log("[loadHitoConfig] Data file not found, clearing assignments");
      store.set(imageCategoriesAtom, new Map());
    } else {
      // Other errors (permission, parse, network, etc.) - log and rethrow
      console.error("[loadHitoConfig] Failed to load .hito.json:", error);
      throw error;
    }
  }
}

/**
 * Save image category assignments to .hito.json in the current directory.
 */
export async function saveHitoConfig(): Promise<void> {
  const dataDir = getDataFileDirectory();
  const currentDirectory = store.get(currentDirectoryAtom);
  const dataFilePath = store.get(dataFilePathAtom);
  if (!dataDir || dataDir.trim() === "") {
    console.warn("[saveHitoConfig] Data directory is empty or not set. currentDirectory:", currentDirectory, "dataFilePath:", dataFilePath);
    return;
  }

  try {
    if (!isTauriInvokeAvailable()) {
      console.warn("[saveHitoConfig] Tauri invoke not available");
      return;
    }

    const imageCategories = store.get(imageCategoriesAtom);
    const imageCategoriesArray = Array.from(imageCategories.entries());
    const categories = store.get(categoriesAtom);
    const hotkeys = store.get(hotkeysAtom);
    const dataFileName = getDataFileName();

    console.log("[saveHitoConfig] Saving data file:", {
      directory: dataDir,
      filename: dataFileName,
      imageCategoriesCount: imageCategoriesArray.length,
      categoriesCount: categories.length,
      hotkeysCount: hotkeys.length,
    });

    await invokeTauri("save_hito_config", {
      directory: dataDir,
      imageCategories: imageCategoriesArray,
      filename: dataFileName,
      categories: categories.length > 0 ? categories : undefined,
      hotkeys: hotkeys.length > 0 ? hotkeys : undefined,
    });

    console.log("[saveHitoConfig] Data file saved successfully");
  } catch (error) {
    console.error("Failed to save .hito.json:", error);
    throw error; // Re-throw to allow callers to handle it
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
 * Check if an image matches the current category filter.
 * @internal - Exported for testing only
 */
export function imageMatchesCategoryFilter(imagePath: string, filterCategoryId: string | "uncategorized" | ""): boolean {
  if (!filterCategoryId || filterCategoryId === "") {
    return true; // No filter, all images match
  }
  
  // Use cached snapshot if suppressCategoryRefilter is active (defer refiltering)
  const suppressCategoryRefilter = store.get(suppressCategoryRefilterAtom);
  const cachedImageCategoriesForRefilter = store.get(cachedImageCategoriesForRefilterAtom);
  const imageCategories = store.get(imageCategoriesAtom);
  const imageCategoriesForFiltering = suppressCategoryRefilter && cachedImageCategoriesForRefilter
    ? cachedImageCategoriesForRefilter
    : imageCategories;
  
  const assignments = imageCategoriesForFiltering.get(imagePath);
  
  if (filterCategoryId === "uncategorized") {
    return !assignments || assignments.length === 0;
  } else {
    return Boolean(assignments && assignments.some(
      (assignment) => assignment.category_id === filterCategoryId
    ));
  }
}

/**
 * Get the filtered list of images based on current filter options.
 * @internal - Exported for testing only
 */
export function getFilteredImages(): string[] {
  const allImagePaths = store.get(allImagePathsAtom);
  const rawImages = Array.isArray(allImagePaths) ? [...allImagePaths] : [];
  
  // Normalize images to a consistent shape: strictly validate and filter invalid entries
  // Only include entries where item is a non-empty string or an object with a non-empty string "path" property
  const discardedItems: unknown[] = [];
  let images: Array<{ path: string }> = rawImages
    .map((item: unknown): { path: string } | null => {
      // Handle string items: must be non-empty
      if (typeof item === "string") {
        return item.trim() !== "" ? { path: item } : null;
      }
      
      // Handle object items: must have a non-empty string "path" property
      if (typeof item === "object" && item !== null && "path" in item) {
        const path = (item as { path: unknown }).path;
        if (typeof path === "string" && path.trim() !== "") {
          return { path };
        }
      }
      
      // Item is invalid: null, undefined, or object without usable path
      // Collect for debugging instead of coercing to string
      discardedItems.push(item);
      return null;
    })
    .filter((item): item is { path: string } => item !== null);
  
  // Log discarded items for debugging if any were found
  if (discardedItems.length > 0) {
    console.warn(
      `getFilteredImages: Filtered out ${discardedItems.length} invalid image entries:`,
      discardedItems
    );
  }
  
  const filters = store.get(filterOptionsAtom);

  // Apply category filter
  if (filters.categoryId) {
    images = images.filter((img) => imageMatchesCategoryFilter(img.path, filters.categoryId));
  }

  // Apply name filter
  if (filters.namePattern) {
    const pattern = filters.namePattern.toLowerCase();
    const fileName = (path: string) => path.split(/[/\\]/).pop()?.toLowerCase() || "";
    images = images.filter((img) => {
      const name = fileName(img.path);
      switch (filters.nameOperator) {
        case "contains":
          return name.includes(pattern);
        case "startsWith":
          return name.startsWith(pattern);
        case "endsWith":
          return name.endsWith(pattern);
        case "exact":
          return name === pattern;
        default:
          return true;
      }
    });
  }

  // Apply size filter (simplified - just return filtered paths)
  // Size filtering would need more complex logic
  
  return images.map((img) => img.path);
}

/**
 * Navigate to next or previous image in the filtered list.
 * @internal - Exported for testing only
 */
export async function navigateToNextFilteredImage(currentImagePath: string): Promise<void> {
  const { openModal } = await import("./modal");
  
  const filteredPaths = getFilteredImages();
  const currentIndex = filteredPaths.indexOf(currentImagePath);
  
  if (currentIndex < 0) {
    // Current image not in filtered list, find first image in filtered list
    if (filteredPaths.length > 0) {
      openModal(filteredPaths[0]);
      return;
    }
    // No filtered images, close modal
    const { closeModal } = await import("./modal");
    closeModal();
    return;
  }
  
  // Try next image
  if (currentIndex < filteredPaths.length - 1) {
    const nextFilteredPath = filteredPaths[currentIndex + 1];
    openModal(nextFilteredPath);
    return;
  }
  
  // If at last, go to previous
  if (currentIndex > 0) {
    const prevFilteredPath = filteredPaths[currentIndex - 1];
    openModal(prevFilteredPath);
    return;
  }
  
  // No other filtered images, close modal
  const { closeModal } = await import("./modal");
  closeModal();
}

/**
 * Toggle a category assignment for the current image.
 */
export async function toggleImageCategory(
  imagePath: string,
  categoryId: string,
): Promise<void> {
  const imageCategories = store.get(imageCategoriesAtom);
  const categories = store.get(categoriesAtom);
  const currentAssignments = imageCategories.get(imagePath) || [];
  const existingIndex = currentAssignments.findIndex(
    (assignment) => assignment.category_id === categoryId
  );
  
  const updatedImageCategories = new Map(imageCategories);
  if (existingIndex >= 0) {
    // Remove category
    const updatedAssignments = currentAssignments.filter((_, index) => index !== existingIndex);
    if (updatedAssignments.length === 0) {
      // Delete entry when last assignment is removed, consistent with deleteCategory
      updatedImageCategories.delete(imagePath);
    } else {
      updatedImageCategories.set(imagePath, updatedAssignments);
    }
  } else {
    // Add category with current datetime
    // First, find the category being assigned to check for mutually exclusive categories
    const categoryBeingAssigned = categories.find((cat) => cat.id === categoryId);
    
    // Collect all category IDs that need to be removed due to mutual exclusivity
    const categoriesToRemove = new Set<string>();
    
    // 1. Check if the category being assigned has mutually exclusive categories
    if (categoryBeingAssigned?.mutuallyExclusiveWith) {
      for (const exclusiveId of categoryBeingAssigned.mutuallyExclusiveWith) {
        if (currentAssignments.some((a) => a.category_id === exclusiveId)) {
          categoriesToRemove.add(exclusiveId);
        }
      }
    }
    
    // 2. Check all other assigned categories to see if any of them have this category in their mutuallyExclusiveWith list
    for (const assignment of currentAssignments) {
      const assignedCategory = categories.find((cat) => cat.id === assignment.category_id);
      if (assignedCategory?.mutuallyExclusiveWith?.includes(categoryId)) {
        categoriesToRemove.add(assignment.category_id);
      }
    }
    
    // Remove mutually exclusive categories
    let updatedAssignments = currentAssignments.filter(
      (assignment) => !categoriesToRemove.has(assignment.category_id)
    );
    
    // Add the new category
    updatedAssignments = [
      ...updatedAssignments,
      {
        category_id: categoryId,
        assigned_at: new Date().toISOString(),
      },
    ];
    
    updatedImageCategories.set(imagePath, updatedAssignments);
  }
  store.set(imageCategoriesAtom, updatedImageCategories);
  
  await saveHitoConfig();
  
  // Only navigate away if suppressCategoryRefilter is false (not called from modal assignment)
  const suppressCategoryRefilter = store.get(suppressCategoryRefilterAtom);
  if (!suppressCategoryRefilter) {
    const filters = store.get(filterOptionsAtom);
    const currentModalImagePath = store.get(currentModalImagePathAtom);
    if (filters.categoryId && currentModalImagePath) {
      if (currentModalImagePath === imagePath) {
        // Check if the image would still match the filter after the toggle
        const stillMatches = imageMatchesCategoryFilter(imagePath, filters.categoryId);
        if (!stillMatches) {
          // Image no longer matches filter, navigate to next/previous
          await navigateToNextFilteredImage(imagePath);
        }
      }
    }
  }
}

/**
 * Assign a category to an image (always adds, doesn't toggle).
 */
export async function assignImageCategory(
  imagePath: string,
  categoryId: string,
): Promise<void> {
  const imageCategories = store.get(imageCategoriesAtom);
  const categories = store.get(categoriesAtom);
  const currentAssignments = imageCategories.get(imagePath) || [];
  const exists = currentAssignments.some(
    (assignment) => assignment.category_id === categoryId
  );

  if (!exists) {
    // Find the category being assigned to check for mutually exclusive categories
    const categoryBeingAssigned = categories.find((cat) => cat.id === categoryId);
    
    // Collect all category IDs that need to be removed due to mutual exclusivity
    const categoriesToRemove = new Set<string>();
    
    // 1. Check if the category being assigned has mutually exclusive categories
    if (categoryBeingAssigned?.mutuallyExclusiveWith) {
      for (const exclusiveId of categoryBeingAssigned.mutuallyExclusiveWith) {
        if (currentAssignments.some((a) => a.category_id === exclusiveId)) {
          categoriesToRemove.add(exclusiveId);
        }
      }
    }
    
    // 2. Check all other assigned categories to see if any of them have this category in their mutuallyExclusiveWith list
    for (const assignment of currentAssignments) {
      const assignedCategory = categories.find((cat) => cat.id === assignment.category_id);
      if (assignedCategory?.mutuallyExclusiveWith?.includes(categoryId)) {
        categoriesToRemove.add(assignment.category_id);
      }
    }
    
    // Remove mutually exclusive categories
    let updatedAssignments = currentAssignments.filter(
      (assignment) => !categoriesToRemove.has(assignment.category_id)
    );
    
    // Add the new category
    updatedAssignments = [
      ...updatedAssignments,
      {
        category_id: categoryId,
        assigned_at: new Date().toISOString(),
      },
    ];
    
    const updatedImageCategories = new Map(imageCategories);
    updatedImageCategories.set(imagePath, updatedAssignments);
    store.set(imageCategoriesAtom, updatedImageCategories);
    await saveHitoConfig();
    
    // Only navigate away if suppressCategoryRefilter is false (not called from modal assignment)
    const suppressCategoryRefilter = store.get(suppressCategoryRefilterAtom);
    if (!suppressCategoryRefilter) {
      const filters = store.get(filterOptionsAtom);
      const currentModalImagePath = store.get(currentModalImagePathAtom);
      if (filters.categoryId && currentModalImagePath) {
        if (currentModalImagePath === imagePath) {
          // Check if the image would still match the filter after the assign
          // If filtering by "uncategorized", adding a category removes it from the filter
          const stillMatches = imageMatchesCategoryFilter(imagePath, filters.categoryId);
          if (!stillMatches) {
            // Image no longer matches filter, navigate to next/previous
            await navigateToNextFilteredImage(imagePath);
          }
        }
      }
    }
  }
}

/**
 * Assign a category to the currently viewing image in the modal.
 * Updates the UI instantly but defers re-filtering until navigation.
 */
export async function assignCategoryToCurrentImage(
  categoryId: string,
): Promise<void> {
  const currentModalImagePath = store.get(currentModalImagePathAtom);
  if (!currentModalImagePath) {
    return;
  }

  const currentImagePath = currentModalImagePath;
  
  // Cache a snapshot of imageCategories before the change for deferred filtering
  const imageCategories = store.get(imageCategoriesAtom);
  store.set(cachedImageCategoriesForRefilterAtom, new Map(imageCategories));
  
  // Suppress immediate re-filtering - will happen on next navigation
  store.set(suppressCategoryRefilterAtom, true);
  await assignImageCategory(currentImagePath, categoryId);
  // Keep suppress flag set - it will be cleared on next navigation
}

/**
 * Toggle a category for the currently viewing image in the modal.
 * Updates the UI instantly but defers re-filtering until navigation.
 */
export async function toggleCategoryForCurrentImage(
  categoryId: string,
): Promise<void> {
  const currentModalImagePath = store.get(currentModalImagePathAtom);
  if (!currentModalImagePath) {
    return;
  }

  const currentImagePath = currentModalImagePath;
  
  // Cache a snapshot of imageCategories before the change for deferred filtering
  const imageCategories = store.get(imageCategoriesAtom);
  store.set(cachedImageCategoriesForRefilterAtom, new Map(imageCategories));
  
  // Suppress immediate re-filtering - will happen on next navigation
  store.set(suppressCategoryRefilterAtom, true);
  await toggleImageCategory(currentImagePath, categoryId);
  // Keep suppress flag set - it will be cleared on next navigation
}

/**
 * Check if a category name already exists.
 * @param name - The category name to check
 * @param excludeId - Optional category ID to exclude from the check (for editing)
 * @returns true if the name already exists, false otherwise
 */
export function isCategoryNameDuplicate(name: string, excludeId?: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  const categories = store.get(categoriesAtom);
  return categories.some((category) => {
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
export function showCategoryDialog(existingCategory?: Category): void {
  store.set(categoryDialogVisibleAtom, true);
  store.set(categoryDialogCategoryAtom, existingCategory);
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
  const imageCategories = store.get(imageCategoriesAtom);
  const updatedImageCategories = new Map(imageCategories);
  imageCategories.forEach((assignments, imagePath) => {
    const updatedAssignments = assignments.filter(
      (assignment) => assignment.category_id !== categoryId
    );
    if (updatedAssignments.length === 0) {
      updatedImageCategories.delete(imagePath);
    } else {
      updatedImageCategories.set(imagePath, updatedAssignments);
    }
  });
  store.set(imageCategoriesAtom, updatedImageCategories);
  
  // Save the updated image category assignments to .hito.json
  await saveHitoConfig();

  // Clean up hotkeys that reference this category
  const hotkeys = store.get(hotkeysAtom);
  const updatedHotkeys = hotkeys.map((hotkey) => {
    if (hotkey.action) {
      // Check for all action patterns that reference this category
      if (
        hotkey.action === `toggle_category_${categoryId}` ||
        hotkey.action === `toggle_category_next_${categoryId}` ||
        hotkey.action.startsWith(`assign_category_${categoryId}`)
      ) {
        // Clear the action, allowing hotkeys without actions
        return { ...hotkey, action: "" };
      }
    }
    return hotkey;
  });
  store.set(hotkeysAtom, updatedHotkeys);

  // Remove category
  const categories = store.get(categoriesAtom);
  store.set(categoriesAtom, categories.filter((c) => c.id !== categoryId));

  // Categories are now saved via saveHitoConfig (already called above)
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
