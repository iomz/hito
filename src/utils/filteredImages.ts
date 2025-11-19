import { state } from "../state";
import { invokeTauri, isTauriInvokeAvailable } from "./tauri";
import type { ImagePath } from "../types";

/**
 * Parse size value from KB string to bytes.
 * Returns null if invalid or empty.
 */
function parseSizeKb(sizeValue: string | null | undefined): number | null {
  if (!sizeValue || sizeValue.trim() === "") {
    return null;
  }
  const parsed = Number.parseInt(sizeValue.trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  // Convert KB to bytes (1 KB = 1024 bytes)
  return parsed * 1024;
}

/**
 * Apply size filter to images based on size operator and value(s).
 */
function applySizeFilter(images: ImagePath[], sizeOperator: string, sizeValue: string | null | undefined, sizeValue2: string | null | undefined): ImagePath[] {
  const sizeValueBytes = parseSizeKb(sizeValue);
  
  // If invalid or null, no size filter is applied
  if (sizeValueBytes === null) {
    return images;
  }
  
  const operator = sizeOperator || "largerThan";
  
  switch (operator) {
    case "lessThan": {
      return images.filter((img) => {
        const imgSize = img.size || 0;
        return imgSize < sizeValueBytes;
      });
    }
    case "between": {
      const sizeValue2Bytes = parseSizeKb(sizeValue2);
      if (sizeValue2Bytes === null) {
        // If sizeValue2 is invalid, don't apply filter
        return images;
      }
      const minSize = Math.min(sizeValueBytes, sizeValue2Bytes);
      const maxSize = Math.max(sizeValueBytes, sizeValue2Bytes);
      return images.filter((img) => {
        const imgSize = img.size || 0;
        return imgSize >= minSize && imgSize <= maxSize;
      });
    }
    default: {
      // "largerThan" or default
      return images.filter((img) => {
        const imgSize = img.size || 0;
        return imgSize > sizeValueBytes;
      });
    }
  }
}

/**
 * Apply sorting to images array in-place based on current sort options.
 */
function applySorting(images: ImagePath[]): void {
  switch (state.sortOption) {
    case "name":
      images.sort((a, b) => {
        const nameA = a.path.split(/[/\\]/).pop()?.toLowerCase() || "";
        const nameB = b.path.split(/[/\\]/).pop()?.toLowerCase() || "";
        const result = nameA.localeCompare(nameB);
        return state.sortDirection === "descending" ? -result : result;
      });
      break;
    case "size":
      images.sort((a, b) => {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        const result = sizeA - sizeB;
        return state.sortDirection === "descending" ? -result : result;
      });
      break;
    case "dateCreated":
      images.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        const result = dateA - dateB;
        return state.sortDirection === "descending" ? -result : result;
      });
      break;
    case "lastCategorized": {
      // Use cached snapshot if suppressCategoryRefilter is active (defer refiltering)
      const imageCategoriesForSorting = state.suppressCategoryRefilter && state.cachedImageCategoriesForRefilter
        ? state.cachedImageCategoriesForRefilter
        : state.imageCategories;
      images.sort((a, b) => {
        const getLatestAssignment = (path: string): number => {
          const assignments = imageCategoriesForSorting.get(path);
          if (!assignments || assignments.length === 0) {
            return 0;
          }
          const timestamps = assignments
            .map((a) => new Date(a.assigned_at).getTime())
            .filter((t) => !Number.isNaN(t));
          return timestamps.length > 0 ? Math.max(...timestamps) : 0;
        };
        const dateA = getLatestAssignment(a.path);
        const dateB = getLatestAssignment(b.path);
        const result = dateA - dateB;
        return state.sortDirection === "descending" ? -result : result;
      });
      break;
    }
  }
}

/**
 * Apply filtering to images array based on current filter options.
 */
function applyFiltering(images: ImagePath[]): ImagePath[] {
  const filters = state.filterOptions;
  
  // Use cached snapshot if suppressCategoryRefilter is active (defer refiltering)
  const imageCategoriesForFiltering = state.suppressCategoryRefilter && state.cachedImageCategoriesForRefilter
    ? state.cachedImageCategoriesForRefilter
    : state.imageCategories;

  // Apply category filter
  if (filters.categoryId) {
    if (filters.categoryId === "uncategorized") {
      images = images.filter((img) => {
        const assignments = imageCategoriesForFiltering.get(img.path);
        return !assignments || assignments.length === 0;
      });
    } else {
      images = images.filter((img) => {
        const assignments = imageCategoriesForFiltering.get(img.path);
        return assignments && assignments.some(
          (assignment) => assignment.category_id === filters.categoryId
        );
      });
    }
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

  // Apply size filter
  if (filters.sizeValue) {
    images = applySizeFilter(images, filters.sizeOperator || "largerThan", filters.sizeValue, filters.sizeValue2);
  }

  return images;
}

/**
 * Get the sorted and filtered list of images based on current sort and filter options.
 * This mirrors the logic in ImageGrid's processedImages useMemo.
 */
export async function getFilteredAndSortedImages(): Promise<ImagePath[]> {
  let images = Array.isArray(state.allImagePaths) ? [...state.allImagePaths] : [];
  
  if (images.length === 0) {
    return [];
  }

  // Apply Rust sorting and filtering if available
  let rustSucceeded = false;
  if (isTauriInvokeAvailable()) {
    try {
      const imageCategoriesArray = Array.from(state.imageCategories.entries());
      
      // Convert filterOptions to Rust format (camelCase to snake_case)
      const filters = state.filterOptions;
      const hasCategoryFilter = filters.categoryId && filters.categoryId !== "";
      const hasNameFilter = filters.namePattern && filters.namePattern !== "";
      const hasSizeFilter = filters.sizeValue && filters.sizeValue !== "";
      const filterOptions = (hasCategoryFilter || hasNameFilter || hasSizeFilter) ? {
        category_id: hasCategoryFilter ? filters.categoryId : null,
        name_pattern: hasNameFilter ? filters.namePattern : null,
        name_operator: hasNameFilter ? filters.nameOperator : null,
        size_operator: hasSizeFilter ? filters.sizeOperator : null,
        size_value: hasSizeFilter ? filters.sizeValue : null,
        size_value2: hasSizeFilter && filters.sizeOperator === "between" ? filters.sizeValue2 : null,
      } : null;
      
      images = await invokeTauri<ImagePath[]>("sort_images", {
        images,
        sortOption: state.sortOption,
        sortDirection: state.sortDirection,
        imageCategories: imageCategoriesArray,
        filterOptions: filterOptions,
      });
      rustSucceeded = true;
    } catch (error) {
      console.error("Failed to sort and filter images in Rust:", error);
      // Fallback to JavaScript sorting and filtering on error
    }
  }
  
  // Fallback to JavaScript sorting and filtering if Rust is not available or failed
  if (!rustSucceeded) {
    applySorting(images);
    images = applyFiltering(images);
  }

  return images;
}

/**
 * Get the filtered and sorted images synchronously (without Rust sorting).
 * Use this for immediate UI updates where async sorting would cause delays.
 */
export function getFilteredAndSortedImagesSync(): ImagePath[] {
  let images = Array.isArray(state.allImagePaths) ? [...state.allImagePaths] : [];
  
  applySorting(images);
  images = applyFiltering(images);

  return images;
}

