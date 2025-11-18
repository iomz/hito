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

export function ModalCategories() {
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

  // Don't render if modal is not open or no categories assigned
  if (currentModalIndex < 0 || !currentImagePath) {
    return null;
  }

  const categoryIds = imageCategories.get(currentImagePath) || [];
  
  if (categoryIds.length === 0) {
    return null;
  }

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

