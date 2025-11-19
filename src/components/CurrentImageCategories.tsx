import React from "react";
import { useAtomValue } from "jotai";
import { currentModalImagePathAtom, categoriesAtom, imageCategoriesAtom } from "../state";
import type { Category, CategoryAssignment } from "../types";
import { getContrastColor } from "../utils/colors";

export function CurrentImageCategories() {
  const currentImagePath = useAtomValue(currentModalImagePathAtom);
  const categories = useAtomValue(categoriesAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);

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

