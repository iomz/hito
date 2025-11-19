import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { Category, CategoryAssignment } from "../types";

function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    console.warn(`Invalid hex color: ${hexColor}`);
    return "#000000"; // Default to black
  }

  // Convert to RGB (0-255)
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance with gamma correction (WCAG 2.0 formula)
  const getRelativeLuminance = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  const l1 = 0.2126 * getRelativeLuminance(r) + 
             0.7152 * getRelativeLuminance(g) + 
             0.0722 * getRelativeLuminance(b);

  // Relative luminances for black and white
  const blackLuminance = 0; // #000000
  const whiteLuminance = 1; // #ffffff

  // Calculate contrast ratios (WCAG formula: (L1 + 0.05) / (L2 + 0.05))
  const contrastWithBlack = (l1 + 0.05) / (blackLuminance + 0.05);
  const contrastWithWhite = (whiteLuminance + 0.05) / (l1 + 0.05);

  // Return the color with better contrast ratio
  return contrastWithBlack > contrastWithWhite ? "#000000" : "#ffffff";
}

export function ModalCategories() {
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

