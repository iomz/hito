import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { state } from "../state";
import { BATCH_SIZE } from "../constants";
import { loadImageBatch } from "../core/browse";
import { ImageGridItem } from "./ImageGridItem";
import { DirectoryItem } from "./DirectoryItem";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { getFilteredAndSortedImages } from "../utils/filteredImages";
import type { ImagePath } from "../types";

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
  // Track sort/filter/categories changes to force useMemo recalculation
  const [sortFilterKey, setSortFilterKey] = useState(() => {
    const categoriesHash = JSON.stringify(Array.from(state.imageCategories.entries()).sort());
    return `${state.sortOption}|${state.sortDirection}|${JSON.stringify(state.filterOptions)}|${categoriesHash}`;
  });
  // Store sorted images after Rust sorting
  const [sortedImages, setSortedImages] = useState<ImagePath[]>(() => 
    Array.isArray(state.allImagePaths) ? [...state.allImagePaths] : []
  );
  // Track loading state for spinner overlay
  const [isLoading, setIsLoading] = useState(state.isLoading);

  // Immediately reset visibleCount to 0 when array becomes empty to prevent DOM mismatch
  // Use useLayoutEffect to run synchronously before browser paint
  useLayoutEffect(() => {
    const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
    if (imagePathsLength === 0 && visibleCount > 0) {
      setVisibleCount(0);
      setDirCount(0);
      setSortedImages([]);
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
    let lastSortOption = state.sortOption;
    let lastSortDirection = state.sortDirection;
    let lastFilterOptions = JSON.stringify(state.filterOptions);
    let lastImageCategoriesSize = state.imageCategories.size;
    let lastImageCategoriesHash = JSON.stringify(Array.from(state.imageCategories.entries()).sort());
    let lastSuppressCategoryRefilter = state.suppressCategoryRefilter;
    
    // Subscribe to state changes
    const checkForUpdates = () => {
      if (!isMountedRef.current) return;
      
      const currentIndex = state.currentIndex;
      const imagePathsLength = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
      const dirPathsLength = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
      const currentSortOption = state.sortOption;
      const currentSortDirection = state.sortDirection;
      const currentFilterOptions = JSON.stringify(state.filterOptions);
      const currentImageCategoriesSize = state.imageCategories.size;
      const currentImageCategoriesHash = JSON.stringify(Array.from(state.imageCategories.entries()).sort());
      const currentSuppressCategoryRefilter = state.suppressCategoryRefilter;
      
      // Check if suppress flag was just cleared (was true, now false) - this triggers deferred refilter
      const suppressFlagCleared = lastSuppressCategoryRefilter && !currentSuppressCategoryRefilter;
      
      // Re-render on any state change (including sort/filter/categories)
      const sortFilterChanged = currentSortOption !== lastSortOption || currentSortDirection !== lastSortDirection || currentFilterOptions !== lastFilterOptions;
      const imageCategoriesChanged = currentImageCategoriesSize !== lastImageCategoriesSize || currentImageCategoriesHash !== lastImageCategoriesHash;
      
      // If sort/filter/categories changed, reset pagination to start from the beginning
      if (sortFilterChanged || imageCategoriesChanged) {
        state.currentIndex = 0;
        lastIndex = 0;
      }
      
      // Calculate what visibleCount should be (for pagination)
      let newVisibleCount = 0;
      if (imagePathsLength > 0) {
        if (sortFilterChanged || imageCategoriesChanged) {
          // Reset to first batch when sort/filter/categories change
          newVisibleCount = Math.min(BATCH_SIZE, imagePathsLength);
        } else if (state.currentIndex > 0) {
          newVisibleCount = Math.min(state.currentIndex, imagePathsLength);
        } else {
          // If currentIndex is 0 but we have images, show first batch
          newVisibleCount = Math.min(BATCH_SIZE, imagePathsLength);
        }
      }
      
      // Re-render if something changed
      if (state.currentIndex !== lastIndex || imagePathsLength !== lastImagePathsLength || dirPathsLength !== lastDirPathsLength || newVisibleCount !== lastVisibleCount || sortFilterChanged || imageCategoriesChanged || suppressFlagCleared) {
        lastIndex = state.currentIndex;
        lastImagePathsLength = imagePathsLength;
        lastDirPathsLength = dirPathsLength;
        lastVisibleCount = newVisibleCount;
        lastSortOption = currentSortOption;
        lastSortDirection = currentSortDirection;
        lastFilterOptions = currentFilterOptions;
        lastImageCategoriesSize = currentImageCategoriesSize;
        lastImageCategoriesHash = currentImageCategoriesHash;
        lastSuppressCategoryRefilter = currentSuppressCategoryRefilter;
        setVisibleCount(newVisibleCount);
        setDirCount(dirPathsLength);
        
        // Update sortFilterKey to force useMemo recalculation when sort/filter/categories change
        // Also update when suppress flag is cleared (deferred refilter on navigation)
        // But suppress if suppressCategoryRefilter is true (defer re-filtering until navigation)
        if (sortFilterChanged || (imageCategoriesChanged && !state.suppressCategoryRefilter) || suppressFlagCleared) {
          setSortFilterKey(`${currentSortOption}|${currentSortDirection}|${currentFilterOptions}|${currentImageCategoriesHash}`);
        }
      }
    };
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(checkForUpdates);
    
    // Subscribe to loading state changes
    const updateLoading = () => {
      setIsLoading(state.isLoading);
    };
    updateLoading();
    const unsubscribeLoading = state.subscribe(updateLoading);
    
    // Check immediately on mount
    checkForUpdates();
    
    return () => {
      isMountedRef.current = false;
      unsubscribe();
      unsubscribeLoading();
    };
  }, []); // Empty deps - we're subscribing to external state

  // Call Rust sorting when sort option or images change
  useEffect(() => {
    let cancelled = false;

    const performRustSorting = async () => {
      if (!isTauriInvokeAvailable()) {
        // Fallback to JavaScript sorting if Tauri not available
        const sorted = await getFilteredAndSortedImages();
        if (!cancelled) {
          setSortedImages(sorted);
        }
        return;
      }

      const images = Array.isArray(state.allImagePaths) ? [...state.allImagePaths] : [];
      if (images.length === 0) {
        if (!cancelled) {
          setSortedImages([]);
        }
        return;
      }

      // Show loading spinner while sorting
      if (!cancelled) {
        state.isLoading = true;
        state.notify();
      }

      try {
        // Use cached snapshot if suppressCategoryRefilter is active (defer refiltering)
        const imageCategoriesForSorting = state.suppressCategoryRefilter && state.cachedImageCategoriesForRefilter
          ? state.cachedImageCategoriesForRefilter
          : state.imageCategories;
        
        // Convert imageCategories Map to array format for Rust
        const imageCategoriesArray = Array.from(imageCategoriesForSorting.entries());

        // Convert filterOptions to Rust format (camelCase to snake_case)
        const filters = state.filterOptions;
        const hasCategoryFilter = filters.categoryId && filters.categoryId !== "";
        const hasNameFilter = filters.namePattern && filters.namePattern !== "";
        const hasSizeFilter = filters.sizeValue && filters.sizeValue !== "";
        const filterOptions = (hasCategoryFilter || hasNameFilter || hasSizeFilter) ? {
          category_id: hasCategoryFilter ? filters.categoryId : null,
          name_pattern: hasNameFilter ? filters.namePattern : null,
          name_operator: hasNameFilter ? filters.nameOperator : null,
          size_operator: hasSizeFilter ? filters.sizeOperator : null,
          size_value: hasSizeFilter ? filters.sizeValue : null,
          size_value2: hasSizeFilter && filters.sizeOperator === "between" ? filters.sizeValue2 : null,
        } : null;

        // Call Rust sorting and filtering
        const sorted = await invokeTauri<ImagePath[]>("sort_images", {
          images,
          sortOption: state.sortOption,
          sortDirection: state.sortDirection,
          imageCategories: imageCategoriesArray,
          filterOptions: filterOptions,
        });

        if (!cancelled) {
          setSortedImages(sorted);
        }
      } catch (error) {
        console.error("Failed to sort images in Rust:", error);
        // Fallback to JavaScript utility on error
        const sorted = await getFilteredAndSortedImages();
        if (!cancelled) {
          setSortedImages(sorted);
        }
      } finally {
        // Hide loading spinner after sorting completes
        if (!cancelled) {
          state.isLoading = false;
          state.notify();
        }
      }
    };

    performRustSorting();

    return () => {
      cancelled = true;
    };
  }, [state.allImagePaths, state.sortOption, state.sortDirection, sortFilterKey]);

  // Filtering is now done in Rust, so sortedImages are already filtered
  const processedImages = React.useMemo(() => {
    return [...sortedImages];
  }, [sortedImages]);

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
    
    if (!Array.isArray(processedImages) || processedImages.length === 0) return;
    
    const processedImagesLength = processedImages.length;
    
    // Only set up observer if we have more images to load
    if (processedImagesLength > BATCH_SIZE && sentinelRef.current && document.contains(sentinelRef.current)) {
      try {
        const observer = new IntersectionObserver(
          (entries) => {
            if (!isMountedRef.current) return;
            
            entries.forEach((entry) => {
              if (!isMountedRef.current) return;
              
              if (entry.isIntersecting && !state.isLoadingBatch) {
                // Use state.currentIndex to track how many images are shown
                const currentVisibleCount = state.currentIndex > 0 ? state.currentIndex : Math.min(BATCH_SIZE, processedImagesLength);
                const nextStartIndex = currentVisibleCount;
                const nextEndIndex = currentVisibleCount + BATCH_SIZE;
                
                // Check against processed images length, not allImagePaths
                if (nextStartIndex < processedImagesLength) {
                  state.currentIndex = nextEndIndex;
                  state.notify();
                  // Note: loadImageBatch is just for state management, actual loading is handled by React
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
  }, [processedImages, state.sortOption, state.filterOptions]);

  // Get the visible range of images - use visibleCount (React state) not state.currentIndex
  // Ensure visibleCount never exceeds array length to prevent DOM mismatch errors
  const imagePathsLength = processedImages.length;
  const safeVisibleCount = Math.min(visibleCount, imagePathsLength);
  const visibleImagePaths = processedImages.slice(0, safeVisibleCount);

  const directories = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths : [];

  return (
    <div id="image-grid" className="image-grid" ref={gridRef}>
      {isLoading ? (
        /* Show loading spinner while sorting */
        <div className="image-grid-loading-container">
          <div className="spinner"></div>
          <p>Sorting images...</p>
        </div>
      ) : (
        /* Show image grid when not sorting */
        <>
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
        </>
      )}
    </div>
  );
}

