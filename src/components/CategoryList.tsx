import React from "react";
import { useAtomValue } from "jotai";
import { categoriesAtom, imageCategoriesAtom } from "../state";
import type { Category, CategoryAssignment } from "../types";
import { showCategoryDialog, deleteCategory } from "../ui/categories";

export function CategoryList() {
  const categories = useAtomValue(categoriesAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);

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

