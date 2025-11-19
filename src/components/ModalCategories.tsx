import React from "react";
import { useAtomValue } from "jotai";
import { currentModalImagePathAtom, categoriesAtom, imageCategoriesAtom } from "../state";
import type { Category, CategoryAssignment } from "../types";
import { getContrastColor } from "../utils/colors";

export function ModalCategories() {
  const currentImagePath = useAtomValue(currentModalImagePathAtom);
  const categories = useAtomValue(categoriesAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);

  // Don't render if modal is not open or no categories assigned
  if (!currentImagePath) {
    return null;
  }

  const assignments = imageCategories.get(currentImagePath) || [];
  
  if (assignments.length === 0) {
    return null;
  }

  // Extract category IDs from assignments
  const categoryIds = assignments.map((assignment) => assignment.category_id);

  // Get category details for assigned categories
  const assignedCategories = categories.filter((cat) =>
    categoryIds.includes(cat.id),
  );

  return (
    <>
      {assignedCategories.map((category) => (
        <span
          key={category.id}
          className="modal-category-tag"
          style={{
            backgroundColor: category.color,
            color: getContrastColor(category.color),
          }}
        >
          {category.name}
        </span>
      ))}
    </>
  );
}

