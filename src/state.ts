import { atom } from "jotai";
import type { ImagePath, DirectoryPath, HotkeyConfig, Category, CategoryAssignment } from "./types";

// Jotai atoms for state management
export const allImagePathsAtom = atom<ImagePath[]>([]);
export const allDirectoryPathsAtom = atom<DirectoryPath[]>([]);
export const currentIndexAtom = atom<number>(0);
export const isLoadingBatchAtom = atom<boolean>(false);
export const loadedImagesAtom = atom<Map<string, string>>(new Map<string, string>());
export const currentModalImagePathAtom = atom<string>(""); // Current image path being viewed in modal (empty = closed)
export const isDeletingImageAtom = atom<boolean>(false);
export const hotkeysAtom = atom<HotkeyConfig[]>([]);
export const isHotkeySidebarOpenAtom = atom<boolean>(false);
export const categoriesAtom = atom<Category[]>([]);
export const imageCategoriesAtom = atom<Map<string, CategoryAssignment[]>>(new Map<string, CategoryAssignment[]>()); // image path -> category assignments with datetime
export const currentDirectoryAtom = atom<string>(""); // Current directory being viewed
export const configFilePathAtom = atom<string>(""); // Custom config file path (empty = default to currentDirectory/.hito.json)
export const resetCounterAtom = atom<number>(0); // Incremented on reset to force ImageGrid remount
export const shortcutsOverlayVisibleAtom = atom<boolean>(false); // Whether the keyboard shortcuts overlay is visible
export const categoryDialogVisibleAtom = atom<boolean>(false); // Whether the category dialog is visible
export const categoryDialogCategoryAtom = atom<Category | undefined>(undefined); // Category being edited (undefined = new category)
export const hotkeyDialogVisibleAtom = atom<boolean>(false); // Whether the hotkey dialog is visible
export const hotkeyDialogHotkeyAtom = atom<HotkeyConfig | undefined>(undefined); // Hotkey being edited (undefined = new hotkey)
export const isLoadingAtom = atom<boolean>(false); // Whether the loading spinner should be visible
export const errorMessageAtom = atom<string>(""); // Current error message to display (empty = no error)
export const sortOptionAtom = atom<"name" | "dateCreated" | "lastCategorized" | "size">("name");
export const sortDirectionAtom = atom<"ascending" | "descending">("ascending");

// Shared initial filter options to avoid duplication between atom default and resetStateAtom
const initialFilterOptions = {
  categoryId: "",
  namePattern: "",
  nameOperator: "contains" as const,
  sizeOperator: "largerThan" as const,
  sizeValue: "",
  sizeValue2: "",
} satisfies {
  categoryId: "" | "uncategorized" | string;
  namePattern: string;
  nameOperator: "contains" | "startsWith" | "endsWith" | "exact";
  sizeOperator: "largerThan" | "lessThan" | "between";
  sizeValue: string;
  sizeValue2: string;
};

export const filterOptionsAtom = atom<{
  categoryId: "" | "uncategorized" | string;
  namePattern: string;
  nameOperator: "contains" | "startsWith" | "endsWith" | "exact";
  sizeOperator: "largerThan" | "lessThan" | "between";
  sizeValue: string;
  sizeValue2: string;
}>(initialFilterOptions);
export const selectionModeAtom = atom<boolean>(false);
export const selectedImagesAtom = atom<Set<string>>(new Set<string>());
export const toggleImageSelectionAtom = atom<((path: string) => void) | undefined>(undefined); // Optional function to toggle image selection (set by ImageGridSelection component)
export const suppressCategoryRefilterAtom = atom<boolean>(false); // When true, don't trigger re-filtering on category changes (used during modal assignment)
export const cachedImageCategoriesForRefilterAtom = atom<Map<string, CategoryAssignment[]> | null>(null); // Cached snapshot of imageCategories when suppressCategoryRefilter is set

// Create a write-only atom that resets all state to initial values
export const resetStateAtom = atom(null, (get, set) => {
  set(allImagePathsAtom, []);
  set(allDirectoryPathsAtom, []);
  set(currentIndexAtom, 0);
  set(isLoadingBatchAtom, false);
  set(loadedImagesAtom, new Map<string, string>());
  set(currentModalImagePathAtom, "");
  set(isDeletingImageAtom, false);
  set(hotkeysAtom, []);
  set(isHotkeySidebarOpenAtom, false);
  set(categoriesAtom, []);
  set(imageCategoriesAtom, new Map<string, CategoryAssignment[]>());
  set(currentDirectoryAtom, "");
  set(configFilePathAtom, "");
  set(resetCounterAtom, (prev) => prev + 1); // Increment to force remounts
  set(shortcutsOverlayVisibleAtom, false);
  set(categoryDialogVisibleAtom, false);
  set(categoryDialogCategoryAtom, undefined);
  set(hotkeyDialogVisibleAtom, false);
  set(hotkeyDialogHotkeyAtom, undefined);
  set(isLoadingAtom, false);
  set(errorMessageAtom, "");
  set(sortOptionAtom, "name");
  set(sortDirectionAtom, "ascending");
  set(filterOptionsAtom, { ...initialFilterOptions });
  set(selectionModeAtom, false);
  set(selectedImagesAtom, new Set<string>());
  set(toggleImageSelectionAtom, undefined);
  set(suppressCategoryRefilterAtom, false);
  set(cachedImageCategoriesForRefilterAtom, null);
});

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

