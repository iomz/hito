import React, { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectionModeAtom, selectedImagesAtom, toggleImageSelectionAtom, allImagePathsAtom } from "../state";

export function ImageGridSelection() {
  const selectionMode = useAtomValue(selectionModeAtom);
  const selectedImages = useAtomValue(selectedImagesAtom);
  const allImagePaths = useAtomValue(allImagePathsAtom);
  const setSelectionMode = useSetAtom(selectionModeAtom);
  const setSelectedImages = useSetAtom(selectedImagesAtom);
  const setToggleImageSelection = useSetAtom(toggleImageSelectionAtom);
  
  // Use ref to track current selectionMode for toggle function
  const selectionModeRef = useRef(selectionMode);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  // Reset selection when selection mode is turned off
  useEffect(() => {
    if (!selectionMode) {
      setSelectedImages(new Set());
    }
  }, [selectionMode, setSelectedImages]);

  // Expose selection toggle function for ImageGridItem
  useEffect(() => {
    const toggleFunction = (imagePath: string) => {
      // Use ref to read current selectionMode value to avoid stale closure
      if (!selectionModeRef.current) return;
      
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
    
    setToggleImageSelection(() => toggleFunction);
    
    // Cleanup: remove the function to prevent memory leak
    return () => {
      setToggleImageSelection(undefined);
    };
  }, [setSelectedImages, setToggleImageSelection]);

  const selectAll = () => {
    const images = Array.isArray(allImagePaths) ? allImagePaths : [];
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

