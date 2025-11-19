import React, { useEffect, useState } from "react";
import { state } from "../state";

export function ImageGridStats() {
  const [totalImages, setTotalImages] = useState(0);
  const [imagesWithCategory, setImagesWithCategory] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      const images = Array.isArray(state.allImagePaths) ? state.allImagePaths : [];
      const total = images.length;
      
      // Count images with at least one category
            let withCategory = 0;
            images.forEach((imagePathObj) => {
              const assignments = state.imageCategories.get(imagePathObj.path);
              if (assignments && assignments.length > 0) {
                withCategory++;
              }
            });
      
      setTotalImages(total);
      setImagesWithCategory(withCategory);
    };

    // Initial update
    updateStats();

    // Subscribe to state changes
    const unsubscribe = state.subscribe(updateStats);

    return unsubscribe;
  }, []);

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

