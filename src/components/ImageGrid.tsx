import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  allImagePathsAtom,
  allDirectoryPathsAtom,
  currentIndexAtom,
  isLoadingBatchAtom,
  sortOptionAtom,
  sortDirectionAtom,
  filterOptionsAtom,
  imageCategoriesAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
  isLoadingAtom,
} from "../state";
import { store } from "../utils/jotaiStore";
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
  const prevSortFilterKeyRef = useRef<string>("");
  
  // Use jotai atoms for reactive state
  const allImagePaths = useAtomValue(allImagePathsAtom);
  const allDirectoryPaths = useAtomValue(allDirectoryPathsAtom);
  const currentIndex = useAtomValue(currentIndexAtom);
  const sortOption = useAtomValue(sortOptionAtom);
  const sortDirection = useAtomValue(sortDirectionAtom);
  const filterOptions = useAtomValue(filterOptionsAtom);
  const imageCategories = useAtomValue(imageCategoriesAtom);
  const suppressCategoryRefilter = useAtomValue(suppressCategoryRefilterAtom);
  const cachedImageCategoriesForRefilter = useAtomValue(cachedImageCategoriesForRefilterAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const isLoadingBatch = useAtomValue(isLoadingBatchAtom);
  const setCurrentIndex = useSetAtom(currentIndexAtom);
  const setIsLoading = useSetAtom(isLoadingAtom);
  
  // Initialize from atoms to avoid missing initial images
  const [visibleCount, setVisibleCount] = useState(() => {
    if (!Array.isArray(allImagePaths) || allImagePaths.length === 0) {
      return 0;
    }
    // If currentIndex is 0, show first batch. Otherwise, show up to currentIndex
    const initialCount = currentIndex > 0 
      ? Math.min(currentIndex, allImagePaths.length)
      : Math.min(BATCH_SIZE, allImagePaths.length);
    return initialCount;
  });
  const [dirCount, setDirCount] = useState(() => {
    return Array.isArray(allDirectoryPaths) ? allDirectoryPaths.length : 0;
  });
  
  // Compute sortFilterKey from atoms
  const sortFilterKey = useMemo(() => {
    const categoriesHash = JSON.stringify(Array.from(imageCategories.entries()).sort());
    return `${sortOption}|${sortDirection}|${JSON.stringify(filterOptions)}|${categoriesHash}`;
  }, [sortOption, sortDirection, filterOptions, imageCategories]);
  
  // Store sorted images after Rust sorting
  const [sortedImages, setSortedImages] = useState<ImagePath[]>(() => 
    Array.isArray(allImagePaths) ? [...allImagePaths] : []
  );

  // Immediately reset visibleCount to 0 when array becomes empty to prevent DOM mismatch
  // Use useLayoutEffect to run synchronously before browser paint
  useLayoutEffect(() => {
    const imagePathsLength = Array.isArray(allImagePaths) ? allImagePaths.length : 0;
    if (imagePathsLength === 0 && visibleCount > 0) {
      setVisibleCount(0);
      setDirCount(0);
      setSortedImages([]);
    }
  }, [allImagePaths, visibleCount]);

  // Track mounted state and react to atom changes
  useEffect(() => {
    isMountedRef.current = true;
    
    const imagePathsLength = Array.isArray(allImagePaths) ? allImagePaths.length : 0;
    const dirPathsLength = Array.isArray(allDirectoryPaths) ? allDirectoryPaths.length : 0;
    
    // Calculate what visibleCount should be (for pagination)
    let newVisibleCount = 0;
    if (imagePathsLength > 0) {
      if (currentIndex > 0) {
        newVisibleCount = Math.min(currentIndex, imagePathsLength);
      } else {
        // If currentIndex is 0 but we have images, show first batch
        newVisibleCount = Math.min(BATCH_SIZE, imagePathsLength);
      }
    }
    
    setVisibleCount(newVisibleCount);
    setDirCount(dirPathsLength);
    
    // Reset pagination when sort/filter/categories change (handled by sortFilterKey dependency)
    // Only reset when sortFilterKey actually changes, not on every render
    if (sortFilterKey !== prevSortFilterKeyRef.current) {
      prevSortFilterKeyRef.current = sortFilterKey;
      // Reset to first batch when sort/filter/categories change
      if (imagePathsLength > 0) {
        setCurrentIndex(Math.min(BATCH_SIZE, imagePathsLength));
      } else {
        setCurrentIndex(0);
      }
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [allImagePaths, allDirectoryPaths, currentIndex, sortFilterKey, setCurrentIndex]);

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

      const images = Array.isArray(allImagePaths) ? [...allImagePaths] : [];
      if (images.length === 0) {
        if (!cancelled) {
          setSortedImages([]);
        }
        return;
      }

      // Show loading spinner while sorting
      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        // Use cached snapshot if suppressCategoryRefilter is active (defer refiltering)
        const imageCategoriesForSorting = suppressCategoryRefilter && cachedImageCategoriesForRefilter
          ? cachedImageCategoriesForRefilter
          : imageCategories;
        
        // Convert imageCategories Map to array format for Rust
        const imageCategoriesArray = Array.from(imageCategoriesForSorting.entries());

        // Convert filterOptions to Rust format (camelCase to snake_case)
        const filters = filterOptions;
        const hasCategoryFilter = filters.categoryId && filters.categoryId !== "";
        const hasNameFilter = filters.namePattern && filters.namePattern !== "";
        const hasSizeFilter = filters.sizeValue && filters.sizeValue !== "";
        const rustFilterOptions = (hasCategoryFilter || hasNameFilter || hasSizeFilter) ? {
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
          sortOption: sortOption,
          sortDirection: sortDirection,
          imageCategories: imageCategoriesArray,
          filterOptions: rustFilterOptions,
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
          setIsLoading(false);
        }
      }
    };

    performRustSorting();

    return () => {
      cancelled = true;
    };
  }, [allImagePaths, sortOption, sortDirection, sortFilterKey, imageCategories, suppressCategoryRefilter, cachedImageCategoriesForRefilter, setIsLoading]);

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
              
              const currentIsLoadingBatch = store.get(isLoadingBatchAtom);
              if (entry.isIntersecting && !currentIsLoadingBatch) {
                // Use currentIndex to track how many images are shown
                const currentIndexValue = store.get(currentIndexAtom);
                const currentVisibleCount = currentIndexValue > 0 ? currentIndexValue : Math.min(BATCH_SIZE, processedImagesLength);
                const nextStartIndex = currentVisibleCount;
                const nextEndIndex = currentVisibleCount + BATCH_SIZE;
                
                // Check against processed images length, not allImagePaths
                if (nextStartIndex < processedImagesLength) {
                  setCurrentIndex(nextEndIndex);
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
  }, [processedImages, sortOption, filterOptions, setCurrentIndex]);

  // Get the visible range of images - use visibleCount (React state) not currentIndex
  // Ensure visibleCount never exceeds array length to prevent DOM mismatch errors
  const imagePathsLength = processedImages.length;
  const safeVisibleCount = Math.min(visibleCount, imagePathsLength);
  const visibleImagePaths = processedImages.slice(0, safeVisibleCount);

  const directories = Array.isArray(allDirectoryPaths) ? allDirectoryPaths : [];

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

