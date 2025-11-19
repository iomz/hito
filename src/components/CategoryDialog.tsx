import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { categoryDialogVisibleAtom, categoryDialogCategoryAtom, categoriesAtom } from "../state";
import type { Category } from "../types";
import { saveHitoConfig, isCategoryNameDuplicate, generateCategoryColor } from "../ui/categories";

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID() if available, otherwise falls back to a random-based implementation.
 */
function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node.js 14.17.0+)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate UUID v4-like string using crypto.getRandomValues()
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = "0123456789abcdef";
  
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);
    
    // Set version (4) and variant bits according to RFC 4122
    randomValues[6] = (randomValues[6] & 0x0f) | 0x40; // Version 4
    randomValues[8] = (randomValues[8] & 0x3f) | 0x80; // Variant 10
    
    // Convert to UUID string format
    const parts: string[] = [];
    for (let i = 0; i < 16; i++) {
      parts.push(hex[randomValues[i] >> 4]);
      parts.push(hex[randomValues[i] & 0x0f]);
      if (i === 3 || i === 5 || i === 7 || i === 9) {
        parts.push("-");
      }
    }
    return parts.join("");
  }
  
  // Final fallback: Use Math.random() (less secure but works everywhere)
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return hex[v];
  });
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
        updatedCategories[index] = {
          ...editingCategory,
          name: trimmedName,
          color,
        };
        setCategories(updatedCategories);
      }
    } else {
      // Add new category
      const newCategory: Category = {
        id: generateUUID(),
        name: trimmedName,
        color,
      };
      setCategories([...categories, newCategory]);
    }
    
    await saveHitoConfig();
    
    // Close dialog
    setCategoryDialogVisible(false);
    setCategoryDialogCategory(undefined);
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

