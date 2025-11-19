import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";

export function ImageGridSelection() {
  const [selectionMode, setSelectionMode] = useState(state.selectionMode);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set(state.selectedImages));
  
  // Use refs to track current values for subscription callback
  const selectionModeRef = useRef(selectionMode);
  const selectedImagesRef = useRef(selectedImages);
  
  // Keep refs in sync with state
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);
  
  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  // Reset selection when selection mode is turned off
  useEffect(() => {
    if (!selectionMode) {
      setSelectedImages(new Set());
    }
  }, [selectionMode]);

  // Subscribe to global state changes and update local state
  useEffect(() => {
    const updateFromGlobalState = () => {
      // Update selectionMode if it changed
      if (state.selectionMode !== selectionModeRef.current) {
        setSelectionMode(state.selectionMode);
      }
      
      // Update selectedImages if it changed (compare Set contents, not references)
      const globalSet = state.selectedImages;
      const localSet = selectedImagesRef.current;
      const setsAreEqual = 
        globalSet.size === localSet.size &&
        Array.from(globalSet).every(item => localSet.has(item));
      
      if (!setsAreEqual) {
        setSelectedImages(new Set(globalSet));
      }
    };
    
    // Update immediately on mount
    updateFromGlobalState();
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(updateFromGlobalState);
    
    return unsubscribe;
  }, []);

  // Expose selection toggle function for ImageGridItem
  // TODO: Refactor this pattern to use React Context or a proper state manager (e.g., Zustand, Jotai)
  // to avoid mutating shared state objects and prevent memory leaks from component-bound functions.
  useEffect(() => {
    state.toggleImageSelection = (imagePath: string) => {
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
    
    // Cleanup: remove the function to prevent memory leak
    return () => {
      state.toggleImageSelection = undefined;
    };
  }, []); // Empty deps - we use selectionModeRef to read current value

  // Sync to state
  useEffect(() => {
    // Compare Set contents, not references
    const setsAreEqual = 
      state.selectedImages.size === selectedImages.size &&
      Array.from(state.selectedImages).every(item => selectedImages.has(item));
    
    const changed = 
      state.selectionMode !== selectionMode ||
      !setsAreEqual;
    
    if (changed) {
      state.selectionMode = selectionMode;
      state.selectedImages = selectedImages;
      state.notify();
    }
  }, [selectionMode, selectedImages]);

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

