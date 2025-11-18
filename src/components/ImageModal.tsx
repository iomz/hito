import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";
import { loadImageData } from "../utils/images";
import { showError } from "../ui/error";
import { ensureImagePathsArray, getFilename } from "../utils/state";
import { updateModalButtons, closeModal, showPreviousImage, showNextImage } from "../ui/modal";
import { ModalCategories } from "./ModalCategories";
import { ShortcutsOverlay } from "./ShortcutsOverlay";
import { SIDEBAR_WIDTH } from "../ui/hotkeys";

export function ImageModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [showPrevBtn, setShowPrevBtn] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(false);
  
  const modalImageRef = useRef<HTMLImageElement>(null);

  // Update modal image layout when sidebar state changes
  useEffect(() => {
    if (!modalImageRef.current) return;
    
    if (state.isHotkeySidebarOpen) {
      modalImageRef.current.style.marginLeft = SIDEBAR_WIDTH;
      modalImageRef.current.style.maxWidth = `calc(90% - ${SIDEBAR_WIDTH})`;
    } else {
      modalImageRef.current.style.marginLeft = "";
      modalImageRef.current.style.maxWidth = "";
    }
  }, [state.isHotkeySidebarOpen, isOpen]);

  // Poll for modal state changes
  useEffect(() => {
    const interval = setInterval(async () => {
      const modalIndex = state.currentModalIndex;
      const shouldBeOpen = modalIndex >= 0;
      
      if (shouldBeOpen !== isOpen || modalIndex !== currentIndex) {
        setIsOpen(shouldBeOpen);
        setCurrentIndex(modalIndex);
        
        if (shouldBeOpen && modalIndex >= 0) {
          // Load image data
          if (!ensureImagePathsArray("ImageModal")) {
            return;
          }
          
          if (modalIndex >= state.allImagePaths.length) {
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
          
          // Update modal buttons (for backward compatibility)
          updateModalButtons();
          
          // Note: ModalCategories is handled by React component
        } else {
          // Modal closed
          setImageSrc("");
          setCaption("");
          setShowPrevBtn(false);
          setShowNextBtn(false);
        }
      }
    }, 50); // Poll frequently for responsive UI
    
    return () => clearInterval(interval);
  }, [isOpen, currentIndex]);

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
      id="image-modal"
      className="modal open"
      style={{ display: "flex" }}
      onClick={handleBackdropClick}
    >
      <span className="close" onClick={handleCloseClick}>
        &times;
      </span>
      <button
        className="modal-nav modal-nav-prev"
        id="modal-prev"
        style={{ display: showPrevBtn ? "block" : "none" }}
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

