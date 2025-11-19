import React, { useEffect, useState } from "react";
import { state } from "../state";

export function ImageGridSelection() {
  const [selectionMode, setSelectionMode] = useState(state.selectionMode);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set(state.selectedImages));

  // Reset selection when selection mode is turned off
  useEffect(() => {
    if (!selectionMode) {
      setSelectedImages(new Set());
    }
  }, [selectionMode]);

  // Expose selection toggle function for ImageGridItem
  useEffect(() => {
    (state as any).toggleImageSelection = (imagePath: string) => {
      if (!selectionMode) return;
      
      setSelectedImages((prev) => {
        const next = new Set(prev);
        if (next.has(imagePath)) {
          next.delete(imagePath);
        } else {
          next.add(imagePath);
        }
        return next;
      });
    };
  }, [selectionMode]);

  // Sync to state
  useEffect(() => {
    state.selectionMode = selectionMode;
    state.notify();
  }, [selectionMode]);

  useEffect(() => {
    state.selectedImages = selectedImages;
    state.notify();
  }, [selectedImages]);

  const selectAll = () => {
    const images = Array.isArray(state.allImagePaths) ? state.allImagePaths : [];
    setSelectedImages(new Set(images.map((img) => img.path)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedImages.size === 0) return;
    // TODO: Implement batch delete
    console.log("Batch delete:", Array.from(selectedImages));
  };

  const handleBatchCopy = () => {
    if (selectedImages.size === 0) return;
    // TODO: Implement batch copy
    console.log("Batch copy:", Array.from(selectedImages));
  };

  const handleBatchMove = () => {
    if (selectedImages.size === 0) return;
    // TODO: Implement batch move
    console.log("Batch move:", Array.from(selectedImages));
  };

  return (
    <div className="image-grid-selection">
      <div className="utility-row">
        <div className="utility-group">
          <button 
            className={`utility-button ${selectionMode ? "utility-button-action" : "utility-button-secondary"}`}
            onClick={() => setSelectionMode(!selectionMode)}
          >
            {selectionMode ? "Browse Mode" : "Selection Mode"}
          </button>
        </div>

        {selectionMode && (
          <>
            <div className="utility-group">
              <button className="utility-button utility-button-link" onClick={selectAll}>
                Select All
              </button>
              <button className="utility-button utility-button-link" onClick={deselectAll}>
                Deselect All
              </button>
              <span className="utility-selection-count">
                {selectedImages.size} selected
              </span>
            </div>

            {selectedImages.size > 0 && (
              <div className="utility-group">
                <button className="utility-button utility-button-action" onClick={handleBatchCopy}>
                  Copy
                </button>
                <button className="utility-button utility-button-action" onClick={handleBatchMove}>
                  Move
                </button>
                <button className="utility-button utility-button-danger" onClick={handleBatchDelete}>
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

