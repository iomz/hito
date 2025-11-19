import React, { useMemo } from "react";
import { useAtomValue } from "jotai";
import { categoriesAtom, imageCategoriesAtom } from "../state";
import type { Category, CategoryAssignment } from "../types";
import { showCategoryDialog, deleteCategory } from "../ui/categories";

export function CategoryList() {
  const categories = useAtomValue(categoriesAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);

  // Pre-compute image counts for all categories in a single pass (O(m) instead of O(n × m))
  // This map stores categoryId -> number of images with that category
  const categoryImageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    
    // Single pass through all image assignments
    for (const assignments of imageCategories.values()) {
      // Track unique category IDs per image to avoid double-counting
      const categoryIdsInImage = new Set<string>();
      for (const assignment of assignments) {
        categoryIdsInImage.add(assignment.category_id);
      }
      // Increment count for each unique category in this image
      for (const categoryId of categoryIdsInImage) {
        counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
      }
    }
    
    return counts;
  }, [imageCategories]);

  // Get image count for a category (O(1) lookup)
  const getImageCount = (categoryId: string): number => {
    return categoryImageCounts.get(categoryId) || 0;
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

