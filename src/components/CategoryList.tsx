import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { Category } from "../types";
import { showCategoryDialog } from "../ui/categories";

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageCategories, setImageCategories] = useState<Map<string, string[]>>(new Map());

  // Poll for changes to categories and imageCategories
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCategories = Array.isArray(state.categories) ? state.categories : [];
      const currentImageCategories = state.imageCategories instanceof Map 
        ? new Map(state.imageCategories) 
        : new Map();

      // Check if categories changed
      if (currentCategories.length !== categories.length ||
          currentCategories.some((cat, idx) => 
            !categories[idx] || 
            cat.id !== categories[idx].id || 
            cat.name !== categories[idx].name ||
            cat.color !== categories[idx].color
          )) {
        setCategories([...currentCategories]);
      }

      // Check if imageCategories changed
      if (currentImageCategories.size !== imageCategories.size ||
          Array.from(currentImageCategories.entries()).some(([path, ids]) => {
            const existingIds = imageCategories.get(path);
            return !existingIds || 
                   existingIds.length !== ids.length ||
                   !existingIds.every(id => ids.includes(id));
          })) {
        setImageCategories(new Map(currentImageCategories));
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [categories, imageCategories]);

  // Calculate image count for a category
  const getImageCount = (categoryId: string): number => {
    return Array.from(imageCategories.values()).filter(
      (ids) => ids.includes(categoryId)
    ).length;
  };

  const handleEdit = (category: Category) => {
    showCategoryDialog(category);
  };

  const handleDelete = async (categoryId: string) => {
    const { deleteCategory } = await import("../ui/categories");
    await deleteCategory(categoryId);
    
    // Trigger re-render after deletion
    setCategories([...state.categories]);
    setImageCategories(new Map(state.imageCategories));
  };

  if (categories.length === 0) {
    return (
      <div id="category-list" className="category-list">
        <div className="category-empty-state">
          No categories yet. Click 'Add' to create one.
        </div>
      </div>
    );
  }

  return (
    <div id="category-list" className="category-list">
      {categories.map((category) => {
        const imageCount = getImageCount(category.id);
        return (
          <div key={category.id} className="category-item">
            <div className="category-color" style={{ backgroundColor: category.color }} />
            <div className="category-info">
              <div className="category-name">{category.name}</div>
              <div className="category-count">
                {imageCount} image{imageCount !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="category-actions">
              <button
                className="category-edit-btn"
                onClick={() => handleEdit(category)}
              >
                Edit
              </button>
              <button
                className="category-delete-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(category.id).catch((error) => {
                    console.error("Failed to delete category:", error);
                  });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

