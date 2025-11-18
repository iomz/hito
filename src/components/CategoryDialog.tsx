import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";
import type { Category } from "../types";
import { saveHitoConfig, isCategoryNameDuplicate, generateCategoryColor } from "../ui/categories";

export function CategoryDialog() {
  const [isVisible, setIsVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Poll for dialog state changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.categoryDialogVisible !== isVisible) {
        setIsVisible(state.categoryDialogVisible);
        
        if (state.categoryDialogVisible) {
          // Dialog opening
          const category = state.categoryDialogCategory;
          setEditingCategory(category);
          setName(category?.name || "");
          setColor(category?.color || generateCategoryColor());
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
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [isVisible]);

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

  const handleCancel = () => {
    state.categoryDialogVisible = false;
    state.categoryDialogCategory = undefined;
  };

  const handleSave = async () => {
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
      const index = state.categories.findIndex(
        (c) => c.id === editingCategory.id,
      );
      if (index >= 0) {
        state.categories[index] = {
          ...editingCategory,
          name: trimmedName,
          color,
        };
      }
    } else {
      // Add new category
      const newCategory: Category = {
        id: `category_${Date.now()}`,
        name: trimmedName,
        color,
      };
      state.categories.push(newCategory);
    }

    await saveHitoConfig();
    // Note: CategoryList component handles rendering via polling
    
    // Refresh hotkey list to update action dropdowns
    const { renderHotkeyList } = await import("../ui/hotkeys");
    renderHotkeyList();
    
    // Close dialog
    state.categoryDialogVisible = false;
    state.categoryDialogCategory = undefined;
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="category-dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
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

