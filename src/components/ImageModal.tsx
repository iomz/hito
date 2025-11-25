import React, { useEffect, useState, useRef } from "react";
import { useAtomValue } from "jotai";
import { currentModalImagePathAtom, suppressCategoryRefilterAtom, loadedImagesAtom, sortedImagesAtom } from "../state";
import { loadImageData } from "../utils/images";
import { showError } from "../ui/error";
import { ensureImagePathsArray, getFilename } from "../utils/state";
import { closeModal, showPreviousImage, showNextImage } from "../ui/modal";
import { ModalCategories } from "./ModalCategories";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

export function ImageModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentImagePath, setCurrentImagePath] = useState<string>("");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [showPrevBtn, setShowPrevBtn] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(false);
  
  const modalImageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const loadRequestIdRef = useRef<number>(0);

  const modalImagePath = useAtomValue(currentModalImagePathAtom);
  const suppressCategoryRefilter = useAtomValue(suppressCategoryRefilterAtom);
  const loadedImages = useAtomValue(loadedImagesAtom);
  const sortedImages = useAtomValue(sortedImagesAtom);

  // Subscribe to modal state changes
  useEffect(() => {
    const handleStateChange = async () => {
      const shouldBeOpen = Boolean(modalImagePath);
      
      if (shouldBeOpen !== isOpen || modalImagePath !== currentImagePath) {
        setIsOpen(shouldBeOpen);
        setCurrentImagePath(modalImagePath);
        
        if (shouldBeOpen && modalImagePath) {
          // Store previously focused element only when opening the modal for the first time
          if (previouslyFocusedElementRef.current === null && document.activeElement) {
            previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
          }
          
          // Increment load request ID to track the latest request
          loadRequestIdRef.current += 1;
          const currentLoadRequestId = loadRequestIdRef.current;
          
          // Load image data
          if (!ensureImagePathsArray("ImageModal")) {
            // Clear any stale image state before closing
            setImageSrc("");
            setCaption("");
            setShowPrevBtn(false);
            setShowNextBtn(false);
            // Close the modal
            closeModal();
            showError("Unable to load image: image list is not available");
            return;
          }
          
          // Get filtered images to check if image is in the filtered list
          // Skip this check if suppressCategoryRefilter is true (defer refiltering during category assignment)
          if (!suppressCategoryRefilter) {
            const imageIndex = sortedImages.findIndex((img) => img.path === modalImagePath);
            
            if (imageIndex < 0) {
              // Image not in filtered list, close modal (only if not suppressing refilter)
              setImageSrc("");
              setCaption("");
              setShowPrevBtn(false);
              setShowNextBtn(false);
              closeModal();
              return;
            }
          }
          
          const imagePath = modalImagePath;
          
          // Get or load image data
          let dataUrl = loadedImages.get(imagePath);
          if (!dataUrl) {
            try {
              dataUrl = await loadImageData(imagePath);
            } catch (error) {
              // Only show error if this is still the latest request
              if (currentLoadRequestId === loadRequestIdRef.current) {
                // Clear any stale image state before showing error
                setImageSrc("");
                setCaption("");
                showError(`Error loading image: ${error}`);
              }
              return;
            }
          }
          
          // Only update state if this is still the latest request (discard stale results)
          if (currentLoadRequestId !== loadRequestIdRef.current) {
            return;
          }
          
          setImageSrc(dataUrl);
          
          // Update caption with filtered list position
          // Use sortedImages from atom (same source as ImageGrid)
          const currentIndex = sortedImages.findIndex((img) => img.path === imagePath);
          const filename = getFilename(imagePath);
          // If image not found in filtered list but suppressCategoryRefilter is true, show fallback caption
          const captionText = currentIndex >= 0 
            ? `${currentIndex + 1} / ${sortedImages.length} - ${filename}`
            : `? / ${sortedImages.length} - ${filename}`;
          setCaption(captionText);
          
          // Update button visibility based on filtered list (only if image is in list or suppress is active)
          if (currentIndex >= 0) {
            setShowPrevBtn(currentIndex > 0);
            setShowNextBtn(currentIndex < sortedImages.length - 1);
          } else if (suppressCategoryRefilter) {
            // If suppress is active and image not in filtered list (due to category change),
            // keep buttons as they were (don't change visibility)
            // This allows user to navigate which will trigger refilter
          }
        } else {
          // Modal closed - restore focus to previously focused element
          if (previouslyFocusedElementRef.current) {
            previouslyFocusedElementRef.current.focus();
            previouslyFocusedElementRef.current = null;
          }
          
          setImageSrc("");
          setCaption("");
          setShowPrevBtn(false);
          setShowNextBtn(false);
        }
      }
    };
    
    // Initialize with current state
    handleStateChange();
  }, [isOpen, currentImagePath, modalImagePath, suppressCategoryRefilter, loadedImages, sortedImages]);

  // Keyboard handling and focus management
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Set initial focus to close button
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    // Get all focusable elements within the modal
    const getFocusableElements = (): HTMLElement[] => {
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(modal.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0
      );
    };

    // Handle keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }

      if (e.key === 'ArrowLeft' && showPrevBtn) {
        e.preventDefault();
        e.stopPropagation();
        showPreviousImage();
        return;
      }

      if (e.key === 'ArrowRight' && showNextBtn) {
        e.preventDefault();
        e.stopPropagation();
        showNextImage();
        return;
      }

      // Focus trap: handle Tab and Shift+Tab
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (activeElement === firstElement || !modal.contains(activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (activeElement === lastElement || !modal.contains(activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showPrevBtn, showNextBtn]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleCloseClick = () => {
    closeModal();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      id="image-modal"
      className="modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-caption-text"
      aria-describedby="modal-caption"
      style={{ display: "flex" }}
      onClick={handleBackdropClick}
    >
      <button
        ref={closeButtonRef}
        className="close"
        onClick={handleCloseClick}
        aria-label="Close image modal"
      >
        &times;
      </button>
      <button
        className="modal-nav modal-nav-prev"
        id="modal-prev"
        style={{ display: showPrevBtn ? "block" : "none" }}
        aria-label="Previous image"
        onClick={(e) => {
          e.stopPropagation();
          showPreviousImage();
        }}
      >
        &#10094;
      </button>
      <button
        className="modal-nav modal-nav-next"
        id="modal-next"
        style={{ display: showNextBtn ? "block" : "none" }}
        aria-label="Next image"
        onClick={(e) => {
          e.stopPropagation();
          showNextImage();
        }}
      >
        &#10095;
      </button>
      <img
        ref={modalImageRef}
        id="modal-image"
        className="modal-content"
        src={imageSrc}
        alt={caption}
      />
      <div id="modal-caption" className="modal-caption">
        <span id="modal-caption-text">
          {caption}
        </span>
        <span id="modal-categories" className="modal-categories">
          <ModalCategories />
        </span>
      </div>
      <ShortcutsOverlay />
    </div>
  );
}

