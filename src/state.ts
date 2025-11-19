import type { ImagePath, DirectoryPath, HotkeyConfig, Category, CategoryAssignment } from "./types";

// State change listener type
type StateChangeListener = () => void;

// State change listeners
const listeners = new Set<StateChangeListener>();

// State
export const state = {
  allImagePaths: [] as ImagePath[],
  allDirectoryPaths: [] as DirectoryPath[],
  currentIndex: 0,
  isLoadingBatch: false,
  loadedImages: new Map<string, string>(),
  currentModalIndex: -1, // Deprecated: use currentModalImagePath
  currentModalImagePath: "" as string, // Current image path being viewed in modal (empty = closed)
  isDeletingImage: false,
  hotkeys: [] as HotkeyConfig[],
  isHotkeySidebarOpen: false,
  categories: [] as Category[],
  imageCategories: new Map<string, CategoryAssignment[]>(), // image path -> category assignments with datetime
  currentDirectory: "", // Current directory being viewed
  configFilePath: "", // Custom config file path (empty = default to currentDirectory/.hito.json)
  resetCounter: 0, // Incremented on reset to force ImageGrid remount
  shortcutsOverlayVisible: false, // Whether the keyboard shortcuts overlay is visible
  categoryDialogVisible: false, // Whether the category dialog is visible
  categoryDialogCategory: undefined as Category | undefined, // Category being edited (undefined = new category)
  hotkeyDialogVisible: false, // Whether the hotkey dialog is visible
  hotkeyDialogHotkey: undefined as HotkeyConfig | undefined, // Hotkey being edited (undefined = new hotkey)
  isLoading: false, // Whether the loading spinner should be visible
  errorMessage: "", // Current error message to display (empty = no error)
  sortOption: "name" as "name" | "dateCreated" | "lastCategorized" | "size",
  sortDirection: "ascending" as "ascending" | "descending",
  filterOptions: {
    categoryId: "" as string | "uncategorized" | "",
    namePattern: "",
    nameOperator: "contains" as "contains" | "startsWith" | "endsWith" | "exact",
    sizeOperator: "largerThan" as "largerThan" | "lessThan" | "between",
    sizeValue: "",
    sizeValue2: "",
  },
  selectionMode: false,
  selectedImages: new Set<string>(),
  suppressCategoryRefilter: false, // When true, don't trigger re-filtering on category changes (used during modal assignment)
  cachedImageCategoriesForRefilter: null as Map<string, CategoryAssignment[]> | null, // Cached snapshot of imageCategories when suppressCategoryRefilter is set
  
  // Subscribe to state changes
  subscribe(listener: StateChangeListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  
  // Notify all listeners of state changes
  notify(): void {
    listeners.forEach((listener) => listener());
  },
  
  // Reset all state to initial values
  reset(): void {
    this.allImagePaths = [];
    this.allDirectoryPaths = [];
    this.currentIndex = 0;
    this.isLoadingBatch = false;
    this.loadedImages.clear();
    this.currentModalIndex = -1;
    this.currentModalImagePath = "";
    this.isDeletingImage = false;
    this.hotkeys = [];
    this.isHotkeySidebarOpen = false;
    this.categories = [];
    this.imageCategories.clear();
    this.currentDirectory = "";
    this.configFilePath = "";
    this.resetCounter += 1; // Increment to force remounts
    this.shortcutsOverlayVisible = false;
    this.categoryDialogVisible = false;
    this.categoryDialogCategory = undefined;
    this.hotkeyDialogVisible = false;
    this.hotkeyDialogHotkey = undefined;
    this.isLoading = false;
    this.errorMessage = "";
    this.sortOption = "name";
    this.sortDirection = "ascending";
    this.filterOptions = {
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    };
    this.selectionMode = false;
    this.selectedImages.clear();
    this.suppressCategoryRefilter = false;
    this.cachedImageCategoriesForRefilter = null;
    this.notify();
  }
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
  modalCaptionText: null as HTMLElement | null,
  closeBtn: null as HTMLElement | null,
  shortcutsOverlay: null as HTMLElement | null,
  shortcutsList: null as HTMLElement | null,
  modalPrevBtn: null as HTMLElement | null,
  modalNextBtn: null as HTMLElement | null,
  hotkeySidebar: null as HTMLElement | null,
  hotkeySidebarToggle: null as HTMLElement | null,
  hotkeySidebarClose: null as HTMLElement | null,
  hotkeyList: null as HTMLElement | null,
  addHotkeyBtn: null as HTMLElement | null,
  categoryList: null as HTMLElement | null,
  addCategoryBtn: null as HTMLElement | null,
  currentImageCategories: null as HTMLElement | null,
  modalCategories: null as HTMLElement | null,
  configFilePathInput: null as HTMLInputElement | null,
  notificationBar: null as HTMLElement | null
};

