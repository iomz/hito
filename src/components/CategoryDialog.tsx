import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import { categoryDialogVisibleAtom, categoryDialogCategoryAtom, categoriesAtom } from "../state";
import type { Category } from "../types";
import { saveAppData, isCategoryNameDuplicate, generateCategoryColor } from "../ui/categories";
import { autoAssignHotkeyToCategory } from "../ui/hotkeys";
import { showError as showErrorNotification } from "../ui/notification";

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID() if available (native and faster), otherwise falls back to uuid library.
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return uuidv4();
}

export function CategoryDialog() {
  const isVisible = useAtomValue(categoryDialogVisibleAtom);
  const editingCategory = useAtomValue(categoryDialogCategoryAtom);
  const categories = useAtomValue(categoriesAtom);
  const setCategoryDialogVisible = useSetAtom(categoryDialogVisibleAtom);
  const setCategoryDialogCategory = useSetAtom(categoryDialogCategoryAtom);
  const setCategories = useSetAtom(categoriesAtom);
  
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Update form when dialog opens/closes or editing category changes
  useEffect(() => {
    if (isVisible) {
      // Dialog opening
      setName(editingCategory?.name || "");
      setColor(editingCategory?.color || generateCategoryColor());
      setErrorMessage("");
      setShowError(false);
      
      // Focus name input after a short delay
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    } else {
      // Dialog closing
      setName("");
      setColor("");
      setErrorMessage("");
      setShowError(false);
    }
  }, [isVisible, editingCategory]);

  // Check for duplicate name as user types
  useEffect(() => {
    if (!name.trim()) {
      setShowError(false);
      return;
    }
    
    const excludeId = editingCategory?.id;
    if (isCategoryNameDuplicate(name.trim(), excludeId)) {
      setErrorMessage(`A category with the name "${name.trim()}" already exists.`);
      setShowError(true);
    } else {
      setShowError(false);
    }
  }, [name, editingCategory]);

  const handleCancel = useCallback(() => {
    setCategoryDialogVisible(false);
    setCategoryDialogCategory(undefined);
  }, [setCategoryDialogVisible, setCategoryDialogCategory]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setErrorMessage("Please enter a category name.");
      setShowError(true);
      return;
    }
    
    // Check for duplicate category name
    const excludeId = editingCategory?.id;
    if (isCategoryNameDuplicate(trimmedName, excludeId)) {
      // Error message is already shown inline
      return;
    }
    
    setShowError(false);

    if (editingCategory) {
      // Update existing category
      const updatedCategories = [...categories];
      const index = updatedCategories.findIndex(
        (c) => c.id === editingCategory.id,
      );
      if (index >= 0) {
        // Store original state for rollback
        const originalCategories = [...categories];
        updatedCategories[index] = {
          ...editingCategory,
          name: trimmedName,
          color,
        };
        
        // Update state optimistically (saveAppData reads from state)
        setCategories(updatedCategories);
        
        try {
          await saveAppData();
          
          // Close dialog only if save succeeds
          setCategoryDialogVisible(false);
          setCategoryDialogCategory(undefined);
        } catch (error) {
          // Rollback state on save failure
          setCategories(originalCategories);
          
          // Show error to user and keep dialog open so they can retry or cancel
          const errorMessage = error instanceof Error ? error.message : String(error);
          setErrorMessage(`Failed to save category: ${errorMessage}`);
          setShowError(true);
        }
      }
    } else {
      // Add new category
      const newCategory: Category = {
        id: generateUUID(),
        name: trimmedName,
        color,
      };
      
      // Store original state for rollback
      const originalCategories = [...categories];
      
      // Update state optimistically (saveAppData reads from state)
      setCategories([...categories, newCategory]);
      
      try {
        await saveAppData();
        
        // Try to auto-assign hotkey, but don't fail the save if this errors
        try {
          await autoAssignHotkeyToCategory(newCategory.id);
        } catch (hotkeyError) {
          // Hotkey assignment failed, but save succeeded
          // Show error notification and still close dialog since category was saved
          const hotkeyErrorMessage = hotkeyError instanceof Error ? hotkeyError.message : String(hotkeyError);
          showErrorNotification(`Failed to assign hotkey: ${hotkeyErrorMessage}`);
        }
        
        // Close dialog after save succeeds (even if hotkey assignment failed)
        setCategoryDialogVisible(false);
        setCategoryDialogCategory(undefined);
      } catch (error) {
        // Rollback state on save failure
        setCategories(originalCategories);
        
        // Show error to user and keep dialog open so they can retry or cancel
        const errorMessage = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Failed to save category: ${errorMessage}`);
        setShowError(true);
      }
    }
  }, [name, color, editingCategory, categories, setCategories, setCategoryDialogVisible, setCategoryDialogCategory]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, handleCancel]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="category-dialog-overlay"
      onClick={handleOverlayClick}
    >
      <div className="category-dialog">
        <div className="category-dialog-header">
          <h3>{editingCategory ? "Edit Category" : "Add Category"}</h3>
          <button className="category-dialog-close" onClick={handleCancel}>
            ×
          </button>
        </div>
        <div className="category-dialog-body">
          <label htmlFor="category-name-input">Category Name:</label>
          <input
            ref={nameInputRef}
            id="category-name-input"
            className="category-input"
            type="text"
            placeholder="e.g., Keep, Archive, Delete"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {showError && (
            <div className="category-error-message" style={{
              display: "block",
              color: "#ef4444",
              fontSize: "0.85em",
              marginTop: "-8px",
              marginBottom: "8px",
            }}>
              {errorMessage}
            </div>
          )}
          <label htmlFor="category-color-input">Color:</label>
          <div className="color-picker-container">
            <input
              id="category-color-input"
              className="category-input"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <div
              className="color-preview"
              style={{ backgroundColor: color }}
            ></div>
          </div>
        </div>
        <div className="category-dialog-footer">
          <button
            className="category-dialog-btn category-dialog-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="category-dialog-btn category-dialog-save"
            onClick={handleSave}
          >
            {editingCategory ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

