import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { Category } from "../types";

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
  const [currentModalIndex, setCurrentModalIndex] = useState(-1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageCategories, setImageCategories] = useState<Map<string, string[]>>(new Map());
  const [currentImagePath, setCurrentImagePath] = useState<string>("");

  // Poll for state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const modalIndex = state.currentModalIndex;
      const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
      
      // Update modal index
      if (modalIndex !== currentModalIndex) {
        setCurrentModalIndex(modalIndex);
        
        if (modalIndex >= 0 && modalIndex < imagePathsLength) {
          const imagePath = state.allImagePaths[modalIndex].path;
          setCurrentImagePath(imagePath);
        } else {
          setCurrentImagePath("");
        }
      }
      
      // Update categories
      if (state.categories !== categories) {
        setCategories([...state.categories]);
      }
      
      // Update image categories
      const imageCategoriesChanged = 
        imageCategories.size !== state.imageCategories.size ||
        Array.from(state.imageCategories.entries()).some(
          ([path, ids]) => {
            const currentIds = imageCategories.get(path);
            return !currentIds || currentIds.length !== ids.length || 
                   !ids.every(id => currentIds.includes(id));
          }
        );
      
      if (imageCategoriesChanged) {
        setImageCategories(new Map(state.imageCategories));
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [currentModalIndex, categories, imageCategories]);

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
  if (currentModalIndex < 0 || !currentImagePath) {
    return null;
  }

  const categoryIds = imageCategories.get(currentImagePath) || [];

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

