import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { Category, CategoryAssignment } from "../types";
import { showCategoryDialog, deleteCategory } from "../ui/categories";

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageCategories, setImageCategories] = useState<Map<string, CategoryAssignment[]>>(new Map());

  // Subscribe to state changes instead of polling
  useEffect(() => {
    const unsubscribe = state.subscribe(() => {
      setCategories(Array.isArray(state.categories) ? [...state.categories] : []);
      setImageCategories(new Map(state.imageCategories));
    });
    
    // Initialize
    setCategories(Array.isArray(state.categories) ? [...state.categories] : []);
    setImageCategories(new Map(state.imageCategories));
    
    return unsubscribe;
  }, []);

  // Calculate image count for a category
  const getImageCount = (categoryId: string): number => {
    return Array.from(imageCategories.values()).filter(
      (assignments) => assignments.some(
        (assignment) => assignment.category_id === categoryId
      )
    ).length;
  };

  const handleEdit = (category: Category) => {
    showCategoryDialog(category);
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
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
                  handleDelete(category.id);
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

