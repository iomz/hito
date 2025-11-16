import type { ImagePath } from "./types";

// State
export const state = {
  allImagePaths: [] as ImagePath[],
  currentIndex: 0,
  isLoadingBatch: false,
  intersectionObserver: null as IntersectionObserver | null,
  loadedImages: new Map<string, string>(),
  currentModalIndex: -1
};

// DOM Elements
export const elements = {
  dropZone: null as HTMLElement | null,
  currentPath: null as HTMLElement | null,
  errorMsg: null as HTMLElement | null,
  imageGrid: null as HTMLElement | null,
  loadingSpinner: null as HTMLElement | null,
  modal: null as HTMLElement | null,
  modalImage: null as HTMLImageElement | null,
  modalCaption: null as HTMLElement | null,
  closeBtn: null as HTMLElement | null,
  shortcutsOverlay: null as HTMLElement | null,
  modalPrevBtn: null as HTMLElement | null,
  modalNextBtn: null as HTMLElement | null
};

