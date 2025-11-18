import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";
import { loadImageData } from "../utils/images";
import { showError } from "../ui/error";
import { ensureImagePathsArray, getFilename } from "../utils/state";
import { closeModal, showPreviousImage, showNextImage } from "../ui/modal";
import { ModalCategories } from "./ModalCategories";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

export function ImageModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [showPrevBtn, setShowPrevBtn] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(false);
  
  const modalImageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Subscribe to modal state changes
  useEffect(() => {
    const handleStateChange = async () => {
      const modalIndex = state.currentModalIndex;
      const shouldBeOpen = modalIndex >= 0;
      
      if (shouldBeOpen !== isOpen || modalIndex !== currentIndex) {
        setIsOpen(shouldBeOpen);
        setCurrentIndex(modalIndex);
        
        if (shouldBeOpen && modalIndex >= 0) {
          // Store previously focused element when opening
          if (document.activeElement) {
            previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
          }
          
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
          
          if (modalIndex >= state.allImagePaths.length) {
            // Clear any stale image state before closing
            setImageSrc("");
            setCaption("");
            setShowPrevBtn(false);
            setShowNextBtn(false);
            // Close the modal
            closeModal();
            showError(`Image index ${modalIndex} is out of range`);
            return;
          }
          
          const imagePath = state.allImagePaths[modalIndex].path;
          
          // Get or load image data
          let dataUrl = state.loadedImages.get(imagePath);
          if (!dataUrl) {
            try {
              dataUrl = await loadImageData(imagePath);
            } catch (error) {
              showError(`Error loading image: ${error}`);
              return;
            }
          }
          
          setImageSrc(dataUrl);
          
          // Update caption
          const filename = getFilename(imagePath);
          const captionText = `${modalIndex + 1} / ${state.allImagePaths.length} - ${filename}`;
          setCaption(captionText);
          
          // Update button visibility
          setShowPrevBtn(modalIndex > 0);
          setShowNextBtn(modalIndex < state.allImagePaths.length - 1);
          
          // Note: ModalCategories is handled by React component
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

    // Subscribe to state changes
    const unsubscribe = state.subscribe(handleStateChange);
    
    // Initialize with current state
    handleStateChange();
    
    return unsubscribe;
  }, [isOpen, currentIndex]);

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

