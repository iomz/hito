import React, { useState, useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import { loadImageData } from "../utils/images";
import { openModal } from "../ui/modal";
import { selectionModeAtom, selectedImagesAtom, toggleImageSelectionAtom } from "../state";

interface ImageGridItemProps {
  imagePath: string;
}

export function ImageGridItem({ imagePath }: ImageGridItemProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const selectionMode = useAtomValue(selectionModeAtom);
  const selectedImages = useAtomValue(selectedImagesAtom);
  const toggleImageSelection = useAtomValue(toggleImageSelectionAtom);
  
  const isSelected = useMemo(() => selectedImages.has(imagePath), [selectedImages, imagePath]);

  useEffect(() => {
    if (!imagePath || typeof imagePath !== "string") {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      try {
        const dataUrl = await loadImageData(imagePath);
        if (!cancelled) {
          setImageData(dataUrl);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`Failed to load image: ${imagePath}`, error);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  const handleClick = (e: React.MouseEvent) => {
    if (hasError) return;
    
    if (selectionMode) {
      e.stopPropagation();
      if (toggleImageSelection) {
        toggleImageSelection(imagePath);
      }
    } else {
      // Open modal with image path (it will find the image in the filtered/sorted list)
      openModal(imagePath);
    }
  };

  return (
    <div
      className={`image-item ${selectionMode ? "selection-mode" : ""} ${isSelected ? "selected" : ""}`}
      data-image-path={imagePath}
      onClick={handleClick}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{
        backgroundColor: isLoading ? "#f0f0f0" : "",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: hasError ? "default" : "pointer",
        position: "relative",
      }}
    >
      {selectionMode && (
        <div className="image-item-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              if (toggleImageSelection) {
                toggleImageSelection(imagePath);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {isLoading && (
        <div className="placeholder" style={{ width: "60px", height: "60px", opacity: 0.6 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
      )}

      {!isLoading && !hasError && imageData && (
        <img 
          src={imageData} 
          alt={imagePath.split('/').pop()?.split('.')[0] || 'Image'} 
          loading="lazy"
          draggable={false}
        />
      )}

      {hasError && (
        <div className="error-placeholder" style={{ color: "#ef4444", textAlign: "center", padding: "10px" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p style={{ fontSize: "0.75em", marginTop: "4px" }}>Failed to load</p>
        </div>
      )}
    </div>
  );
}

