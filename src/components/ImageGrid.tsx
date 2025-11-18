import React, { useEffect, useRef, useState } from "react";
import { state } from "../state";
import { BATCH_SIZE } from "../constants";
import { loadImageBatch } from "../core/browse";
import { ImageGridItem } from "./ImageGridItem";
import { DirectoryItem } from "./DirectoryItem";

export function ImageGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [, forceUpdate] = useState({});

  // Track previous lengths to detect changes
  const prevImageLengthRef = useRef(-1);
  const prevDirLengthRef = useRef(-1);

  // Force re-render when state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
      const dirPathsLength = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
      
      if (
        prevImageLengthRef.current !== imagePathsLength ||
        prevDirLengthRef.current !== dirPathsLength
      ) {
        prevImageLengthRef.current = imagePathsLength;
        prevDirLengthRef.current = dirPathsLength;
        forceUpdate({});
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Setup IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!Array.isArray(state.allImagePaths)) return;
    
    const imagePathsLength = state.allImagePaths.length;
    
    // Only set up observer if we have more images to load
    if (imagePathsLength > BATCH_SIZE && sentinelRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !state.isLoadingBatch) {
              const nextStartIndex = state.currentIndex;
              const nextEndIndex = state.currentIndex + BATCH_SIZE;
              
              if (nextStartIndex < imagePathsLength) {
                state.currentIndex = nextEndIndex;
                loadImageBatch(nextStartIndex, nextEndIndex).catch((error) => {
                  console.error("Failed to load image batch:", error);
                });
              }
            }
          });
        },
        { rootMargin: "200px" }
      );

      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [state.allImagePaths?.length]);

  // Get the visible range of images
  const visibleImagePaths = Array.isArray(state.allImagePaths)
    ? state.allImagePaths.slice(0, Math.min(state.currentIndex, state.allImagePaths.length))
    : [];

  const directories = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths : [];

  return (
    <div id="image-grid" className="image-grid" ref={gridRef}>
      {/* Render directories first */}
      {directories.map((dir) => (
        <DirectoryItem key={dir.path} path={dir.path} />
      ))}

      {/* Render visible images */}
      {visibleImagePaths.map((imagePathObj) => (
        <ImageGridItem key={imagePathObj.path} imagePath={imagePathObj.path} />
      ))}

      {/* Sentinel for infinite scroll */}
      {Array.isArray(state.allImagePaths) && state.allImagePaths.length > BATCH_SIZE && (
        <div
          ref={sentinelRef}
          id="load-more-sentinel"
          style={{ height: "100px" }}
        />
      )}
    </div>
  );
}

