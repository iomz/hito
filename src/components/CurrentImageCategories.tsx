import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { Category, CategoryAssignment } from "../types";

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

export function CurrentImageCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageCategories, setImageCategories] = useState<Map<string, CategoryAssignment[]>>(new Map());
  const [currentImagePath, setCurrentImagePath] = useState<string>("");

  // Subscribe to state changes
  useEffect(() => {
    // One-time initial sync
    const modalImagePath = state.currentModalImagePath;
    setCurrentImagePath(modalImagePath || "");
    setCategories([...state.categories]);
    setImageCategories(new Map(state.imageCategories));
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      const newModalImagePath = state.currentModalImagePath;
      setCurrentImagePath(newModalImagePath || "");
      setCategories([...state.categories]);
      setImageCategories(new Map(state.imageCategories));
    });
    
    return unsubscribe;
  }, []);

  const handleToggleCategory = async (categoryId: string) => {
    if (!currentImagePath) return;
    
    const { toggleImageCategory } = await import("../ui/categories");
    try {
      await toggleImageCategory(currentImagePath, categoryId);
    } catch (error) {
      console.error("Failed to toggle category:", error);
    }
  };

  // Don't render if modal is not open
  if (!currentImagePath) {
    return null;
  }

  const assignments = imageCategories.get(currentImagePath) || [];
  const categoryIds = assignments.map((assignment) => assignment.category_id);

  return (
    <div id="current-image-categories" className="current-image-categories">
      <div className="current-image-header">Current Image Categories:</div>
      {categories.length === 0 ? (
        <div className="current-image-empty">Create categories first to assign them.</div>
      ) : (
        <div className="category-checkboxes">
          {categories.map((category) => {
            const isChecked = categoryIds.includes(category.id);
            return (
              <div key={category.id} className="category-checkbox-item">
                <input
                  type="checkbox"
                  id={`category-${category.id}`}
                  checked={isChecked}
                  onChange={() => handleToggleCategory(category.id)}
                />
                <label htmlFor={`category-${category.id}`}>
                  <span
                    className="category-dot"
                    style={{ backgroundColor: category.color }}
                  ></span>
                  <span>{category.name}</span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

