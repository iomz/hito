import React, { useMemo } from "react";
import { useAtomValue } from "jotai";
import { allImagePathsAtom, imageCategoriesAtom } from "../state";

export function ImageGridStats() {
  const allImagePaths = useAtomValue(allImagePathsAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);
  
  const { totalImages, imagesWithCategory } = useMemo(() => {
    const images = Array.isArray(allImagePaths) ? allImagePaths : [];
    const total = images.length;
    
    // Count images with at least one category
    let withCategory = 0;
    images.forEach((imagePathObj) => {
      const assignments = imageCategories?.get(imagePathObj.path);
      if (assignments && assignments.length > 0) {
        withCategory++;
      }
    });
    
    return { totalImages: total, imagesWithCategory: withCategory };
  }, [allImagePaths, imageCategories]);

  if (totalImages === 0) {
    return null;
  }

  return (
    <div className="image-grid-stats">
      {totalImages} image{totalImages !== 1 ? "s" : ""} found
      {imagesWithCategory > 0 && (
        <> · {imagesWithCategory} with categor{imagesWithCategory !== 1 ? "ies" : "y"}</>
      )}
    </div>
  );
}

