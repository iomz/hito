import React, { useEffect, useRef, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectionModeAtom, selectedImagesAtom, toggleImageSelectionAtom, allImagePathsAtom, loadedImagesAtom, categoriesAtom, imageCategoriesAtom } from "../state";
import { invokeTauri } from "../utils/tauri";
import { store, deleteFromAtomMap } from "../utils/jotaiStore";
import { showNotification, showError } from "../ui/notification";
import { open } from "../utils/dialog";
import { toggleImageCategory } from "../ui/categories";
import { getContrastColor } from "../utils/colors";

export function ImageGridSelection() {
  const selectionMode = useAtomValue(selectionModeAtom);
  const selectedImages = useAtomValue(selectedImagesAtom);
  const allImagePaths = useAtomValue(allImagePathsAtom);
  const categories = useAtomValue(categoriesAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);
  const setSelectionMode = useSetAtom(selectionModeAtom);
  const setSelectedImages = useSetAtom(selectedImagesAtom);
  const setToggleImageSelection = useSetAtom(toggleImageSelectionAtom);
  
  // Calculate checkbox states for each category based on selected images
  const categoryStates = useMemo(() => {
    const states: Record<string, { checked: boolean; indeterminate: boolean }> = {};
    
    // Filter to only include actual image paths
    const validImagePaths = new Set(allImagePaths.map((img) => img.path));
    const imagePaths = Array.from(selectedImages).filter((path) => validImagePaths.has(path));
    
    if (imagePaths.length === 0) {
      // No valid images selected, all checkboxes unchecked
      categories.forEach((cat) => {
        states[cat.id] = { checked: false, indeterminate: false };
      });
      return states;
    }
    
    categories.forEach((category) => {
      let assignedCount = 0;
      
      imagePaths.forEach((imagePath) => {
        const assignments = imageCategories.get(imagePath) || [];
        if (assignments.some((assignment) => assignment.category_id === category.id)) {
          assignedCount++;
        }
      });
      
      if (assignedCount === 0) {
        states[category.id] = { checked: false, indeterminate: false };
      } else if (assignedCount === imagePaths.length) {
        states[category.id] = { checked: true, indeterminate: false };
      } else {
        states[category.id] = { checked: false, indeterminate: true };
      }
    });
    
    return states;
  }, [selectedImages, imageCategories, categories, allImagePaths]);
  
  // Use ref to track current selectionMode for toggle function
  const selectionModeRef = useRef(selectionMode);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  // Reset selection when selection mode is turned off
  useEffect(() => {
    if (!selectionMode) {
      setSelectedImages(new Set());
    }
  }, [selectionMode, setSelectedImages]);

  // Expose selection toggle function for ImageGridItem
  useEffect(() => {
    const toggleFunction = (imagePath: string) => {
      // Use ref to read current selectionMode value to avoid stale closure
      if (!selectionModeRef.current) return;
      
      setSelectedImages((prev) => {
        const next = new Set(prev);
        if (next.has(imagePath)) {
          next.delete(imagePath);
        } else {
          next.add(imagePath);
        }
        return next;
      });
    };
    
    setToggleImageSelection(() => toggleFunction);
    
    // Cleanup: remove the function to prevent memory leak
    return () => {
      setToggleImageSelection(undefined);
    };
  }, [setSelectedImages, setToggleImageSelection]);

  const selectAll = () => {
    const images = Array.isArray(allImagePaths) ? allImagePaths : [];
    setSelectedImages(new Set(images.map((img) => img.path)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedImages.size === 0) return;
    
    // Filter to only include actual image paths (exclude any directory paths)
    const currentAllImagePaths = store.get(allImagePathsAtom);
    const validImagePaths = new Set(currentAllImagePaths.map((img) => img.path));
    const imagePaths = Array.from(selectedImages).filter((path) => validImagePaths.has(path));
    
    if (imagePaths.length === 0) {
      showError("No valid images selected. Directory items cannot be deleted.");
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Delete each selected image
    for (const imagePath of imagePaths) {
      try {
        await invokeTauri("delete_image", { imagePath });
        
        // Remove from loaded images cache
        deleteFromAtomMap(loadedImagesAtom, imagePath);
        
        // Remove from image list
        const currentAllImagePaths = store.get(allImagePathsAtom);
        const updatedAllImagePaths = currentAllImagePaths.filter((img) => img.path !== imagePath);
        store.set(allImagePathsAtom, updatedAllImagePaths);
        
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${imagePath}: ${errorMessage}`);
      }
    }
    
    // Clear selection after deletion
    setSelectedImages(new Set());
    
    // Show appropriate notification
    if (successCount > 0 && errorCount === 0) {
      showNotification(
        successCount === 1 
          ? "Image deleted" 
          : `${successCount} images deleted`
      );
    } else if (successCount > 0 && errorCount > 0) {
      showError(
        `${successCount} deleted, ${errorCount} failed. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    } else {
      showError(
        `Failed to delete ${errorCount} image${errorCount === 1 ? "" : "s"}. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    }
  };

  const handleBatchCopy = async () => {
    if (selectedImages.size === 0) return;
    
    // Open folder picker dialog
    let destinationDir: string | null = null;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select destination folder"
      });
      
      if (selected && typeof selected === 'string') {
        destinationDir = selected;
      } else if (selected && Array.isArray(selected) && selected.length > 0) {
        destinationDir = selected[0];
      } else {
        // User cancelled the dialog
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showError(`Failed to open folder picker: ${errorMessage}`);
      return;
    }
    
    if (!destinationDir) return;
    
    // Filter to only include actual image paths (exclude any directory paths)
    const currentAllImagePaths = store.get(allImagePathsAtom);
    const validImagePaths = new Set(currentAllImagePaths.map((img) => img.path));
    const imagePaths = Array.from(selectedImages).filter((path) => validImagePaths.has(path));
    
    if (imagePaths.length === 0) {
      showError("No valid images selected. Directory items cannot be copied.");
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Copy each selected image
    for (const imagePath of imagePaths) {
      try {
        await invokeTauri("copy_image", { imagePath, destinationDir });
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${imagePath}: ${errorMessage}`);
      }
    }
    
    // Show appropriate notification
    if (successCount > 0 && errorCount === 0) {
      showNotification(
        successCount === 1 
          ? "Image copied" 
          : `${successCount} images copied`
      );
    } else if (successCount > 0 && errorCount > 0) {
      showError(
        `${successCount} copied, ${errorCount} failed. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    } else {
      showError(
        `Failed to copy ${errorCount} image${errorCount === 1 ? "" : "s"}. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    }
  };

  const handleBatchMove = async () => {
    if (selectedImages.size === 0) return;
    
    // Open folder picker dialog
    let destinationDir: string | null = null;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select destination folder"
      });
      
      if (selected && typeof selected === 'string') {
        destinationDir = selected;
      } else if (selected && Array.isArray(selected) && selected.length > 0) {
        destinationDir = selected[0];
      } else {
        // User cancelled the dialog
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showError(`Failed to open folder picker: ${errorMessage}`);
      return;
    }
    
    if (!destinationDir) return;
    
    // Filter to only include actual image paths (exclude any directory paths)
    const currentAllImagePaths = store.get(allImagePathsAtom);
    const validImagePaths = new Set(currentAllImagePaths.map((img) => img.path));
    const imagePaths = Array.from(selectedImages).filter((path) => validImagePaths.has(path));
    
    if (imagePaths.length === 0) {
      showError("No valid images selected. Directory items cannot be moved.");
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Move each selected image
    for (const imagePath of imagePaths) {
      try {
        await invokeTauri("move_image", { imagePath, destinationDir });
        
        // Remove from loaded images cache
        deleteFromAtomMap(loadedImagesAtom, imagePath);
        
        // Remove from image list
        const currentAllImagePaths = store.get(allImagePathsAtom);
        const updatedAllImagePaths = currentAllImagePaths.filter((img) => img.path !== imagePath);
        store.set(allImagePathsAtom, updatedAllImagePaths);
        
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${imagePath}: ${errorMessage}`);
      }
    }
    
    // Clear selection after moving
    setSelectedImages(new Set());
    
    // Show appropriate notification
    if (successCount > 0 && errorCount === 0) {
      showNotification(
        successCount === 1 
          ? "Image moved" 
          : `${successCount} images moved`
      );
    } else if (successCount > 0 && errorCount > 0) {
      showError(
        `${successCount} moved, ${errorCount} failed. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    } else {
      showError(
        `Failed to move ${errorCount} image${errorCount === 1 ? "" : "s"}. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    }
  };

  const handleBatchToggleCategory = async (categoryId: string) => {
    if (selectedImages.size === 0) return;
    
    // Filter to only include actual image paths (exclude any directory paths)
    const currentAllImagePaths = store.get(allImagePathsAtom);
    const validImagePaths = new Set(currentAllImagePaths.map((img) => img.path));
    const imagePaths = Array.from(selectedImages).filter((path) => validImagePaths.has(path));
    
    if (imagePaths.length === 0) {
      showError("No valid images selected. Directory items cannot be assigned categories.");
      return;
    }
    
    // Find category name for notification
    const category = categories.find((cat) => cat.id === categoryId);
    const categoryName = category?.name || categoryId;
    
    // Determine if we're assigning or unassigning based on current state
    const state = categoryStates[categoryId];
    const isAssigning = !state.checked; // If not all are checked, we're assigning
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Toggle category for each selected image
    for (const imagePath of imagePaths) {
      try {
        // Only toggle images that need to be changed
        const assignments = imageCategories.get(imagePath) || [];
        const hasCategory = assignments.some((assignment) => assignment.category_id === categoryId);
        
        // If we're assigning and it already has it, skip. If we're unassigning and it doesn't have it, skip.
        if ((isAssigning && hasCategory) || (!isAssigning && !hasCategory)) {
          successCount++; // Count as success since it's already in the desired state
          continue;
        }
        
        await toggleImageCategory(imagePath, categoryId);
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`${imagePath}: ${errorMessage}`);
      }
    }
    
    // Show appropriate notification
    if (successCount > 0 && errorCount === 0) {
      const action = isAssigning ? "assigned to" : "unassigned from";
      showNotification(
        successCount === 1 
          ? `Category "${categoryName}" ${action} image` 
          : `Category "${categoryName}" ${action} ${successCount} images`
      );
    } else if (successCount > 0 && errorCount > 0) {
      showError(
        `${successCount} ${isAssigning ? "assigned" : "unassigned"}, ${errorCount} failed. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    } else {
      showError(
        `Failed to ${isAssigning ? "assign" : "unassign"} category to ${errorCount} image${errorCount === 1 ? "" : "s"}. ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`
      );
    }
  };

  return (
    <div className="image-grid-selection">
      <div className="utility-row">
        <div className="utility-group">
          <button 
            className={`utility-button ${selectionMode ? "utility-button-action" : "utility-button-secondary"}`}
            onClick={() => setSelectionMode(!selectionMode)}
          >
            {selectionMode ? "Browse Mode" : "Selection Mode"}
          </button>
        </div>

        {selectionMode && (
          <>
            <div className="utility-group">
              <button className="utility-button utility-button-link" onClick={selectAll}>
                Select All
              </button>
              <button className="utility-button utility-button-link" onClick={deselectAll}>
                Deselect All
              </button>
              <span className="utility-selection-count">
                {selectedImages.size} selected
              </span>
            </div>

            {selectedImages.size > 0 && (
              <>
                <div className="utility-group">
                  <button className="utility-button utility-button-action" onClick={handleBatchCopy}>
                    Copy
                  </button>
                  <button className="utility-button utility-button-action" onClick={handleBatchMove}>
                    Move
                  </button>
                  <button className="utility-button utility-button-danger" onClick={handleBatchDelete}>
                    Delete
                  </button>
                </div>
                {categories.length > 0 && (
                  <div className="utility-group" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.9em", color: "#666" }}>Categories:</span>
                    {categories.map((category) => {
                      const state = categoryStates[category.id] || { checked: false, indeterminate: false };
                      return (
                        <label
                          key={category.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: state.checked || state.indeterminate ? `${category.color}20` : "transparent",
                            transition: "background-color 0.2s",
                          }}
                          title={`${state.checked ? "Unassign" : "Assign"} "${category.name}" ${state.indeterminate ? "(some images already have this category)" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={state.checked}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = state.indeterminate;
                              }
                            }}
                            onChange={() => handleBatchToggleCategory(category.id)}
                            style={{
                              cursor: "pointer",
                              accentColor: category.color,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.9em",
                              color: state.checked || state.indeterminate ? category.color : "#666",
                              fontWeight: state.checked ? 500 : 400,
                            }}
                          >
                            {category.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

