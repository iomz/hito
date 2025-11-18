import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { state } from "../state";
import { BATCH_SIZE } from "../constants";
import { loadImageBatch } from "../core/browse";
import { ImageGridItem } from "./ImageGridItem";
import { DirectoryItem } from "./DirectoryItem";

export function ImageGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isMountedRef = useRef(true);
  // Initialize from state to avoid missing initial images
  const [visibleCount, setVisibleCount] = useState(() => {
    if (!Array.isArray(state.allImagePaths) || state.allImagePaths.length === 0) {
      return 0;
    }
    // If currentIndex is 0, show first batch. Otherwise, show up to currentIndex
    const initialCount = state.currentIndex > 0 
      ? Math.min(state.currentIndex, state.allImagePaths.length)
      : Math.min(BATCH_SIZE, state.allImagePaths.length);
    return initialCount;
  });
  const [dirCount, setDirCount] = useState(() => {
    return Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
  });

  // Immediately reset visibleCount to 0 when array becomes empty to prevent DOM mismatch
  // Use useLayoutEffect to run synchronously before browser paint
  useLayoutEffect(() => {
    const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
    if (imagePathsLength === 0 && visibleCount > 0) {
      setVisibleCount(0);
      setDirCount(0);
    }
  }, [state.allImagePaths, visibleCount]);

  // Track mounted state and subscribe to state changes
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize tracking variables from current state
    let lastIndex = state.currentIndex;
    let lastImagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
    let lastDirPathsLength = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
    let lastVisibleCount = visibleCount;
    
    // Subscribe to state changes
    const checkForUpdates = () => {
      if (!isMountedRef.current) return;
      
      const currentIndex = state.currentIndex;
      const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
      const dirPathsLength = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
      
      // Calculate what visibleCount should be
      let newVisibleCount = 0;
      if (imagePathsLength > 0) {
        if (currentIndex > 0) {
          newVisibleCount = Math.min(currentIndex, imagePathsLength);
        } else {
          // If currentIndex is 0 but we have images, show first batch
          newVisibleCount = Math.min(BATCH_SIZE, imagePathsLength);
        }
      }
      
      // Re-render if something changed
      if (currentIndex !== lastIndex || imagePathsLength !== lastImagePathsLength || dirPathsLength !== lastDirPathsLength || newVisibleCount !== lastVisibleCount) {
        lastIndex = currentIndex;
        lastImagePathsLength = imagePathsLength;
        lastDirPathsLength = dirPathsLength;
        lastVisibleCount = newVisibleCount;
        setVisibleCount(newVisibleCount);
        setDirCount(dirPathsLength);
      }
    };
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(checkForUpdates);
    
    // Check immediately on mount
    checkForUpdates();
    
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []); // Empty deps - we're subscribing to external state

  // Setup IntersectionObserver for infinite scroll
  useEffect(() => {
    // Cleanup any existing observer first
    if (observerRef.current) {
      try {
        observerRef.current.disconnect();
      } catch (error) {
        // Silently ignore cleanup errors
      }
      observerRef.current = null;
    }
    
    if (!Array.isArray(state.allImagePaths)) return;
    
    const imagePathsLength = state.allImagePaths.length;
    
    // Only set up observer if we have more images to load
    if (imagePathsLength > BATCH_SIZE && sentinelRef.current && document.contains(sentinelRef.current)) {
      try {
        const observer = new IntersectionObserver(
          (entries) => {
            if (!isMountedRef.current) return;
            
            entries.forEach((entry) => {
              if (!isMountedRef.current) return;
              
              if (entry.isIntersecting && !state.isLoadingBatch && Array.isArray(state.allImagePaths)) {
                const nextStartIndex = state.currentIndex;
                const nextEndIndex = state.currentIndex + BATCH_SIZE;
                
                if (nextStartIndex < state.allImagePaths.length) {
                  state.currentIndex = nextEndIndex;
                  state.notify();
                  loadImageBatch(nextStartIndex, nextEndIndex).catch((error) => {
                    console.error("Failed to load image batch:", error);
                  });
                }
              }
            });
          },
          { rootMargin: "200px" }
        );

        if (sentinelRef.current && document.contains(sentinelRef.current)) {
          observer.observe(sentinelRef.current);
          observerRef.current = observer;
        }
      } catch (error) {
        console.error("Failed to setup IntersectionObserver:", error);
      }
    }

    return () => {
      if (observerRef.current) {
        try {
          observerRef.current.disconnect();
        } catch (error) {
          // Silently ignore cleanup errors
        }
        observerRef.current = null;
      }
    };
  }, [state.allImagePaths]);

  // Get the visible range of images - use visibleCount (React state) not state.currentIndex
  // Ensure visibleCount never exceeds array length to prevent DOM mismatch errors
  const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
  const safeVisibleCount = Math.min(visibleCount, imagePathsLength);
  const visibleImagePaths = Array.isArray(state.allImagePaths)
    ? state.allImagePaths.slice(0, safeVisibleCount)
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
      {safeVisibleCount < imagePathsLength && (
        <div
          ref={sentinelRef}
          id="load-more-sentinel"
          style={{ height: "100px" }}
        />
      )}
    </div>
  );
}

