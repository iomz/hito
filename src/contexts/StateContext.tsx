import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { state as globalState } from "../state";
import type { ImagePath, DirectoryPath, HotkeyConfig, Category } from "../types";

interface AppState {
  allImagePaths: ImagePath[];
  allDirectoryPaths: DirectoryPath[];
  currentIndex: number;
  isLoadingBatch: boolean;
  loadedImages: Map<string, string>;
  currentModalIndex: number;
  isDeletingImage: boolean;
  hotkeys: HotkeyConfig[];
  isHotkeySidebarOpen: boolean;
  categories: Category[];
  imageCategories: Map<string, string[]>;
  currentDirectory: string;
  configFilePath: string;
  shortcutsOverlayVisible: boolean;
  categoryDialogVisible: boolean;
  categoryDialogCategory: Category | undefined;
  hotkeyDialogVisible: boolean;
  hotkeyDialogHotkey: HotkeyConfig | undefined;
}

interface StateContextValue {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  syncWithGlobalState: () => void;
}

const StateContext = createContext<StateContextValue | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [localState, setLocalState] = useState<AppState>(() => ({
    allImagePaths: globalState.allImagePaths,
    allDirectoryPaths: globalState.allDirectoryPaths,
    currentIndex: globalState.currentIndex,
    isLoadingBatch: globalState.isLoadingBatch,
    loadedImages: new Map(globalState.loadedImages),
    currentModalIndex: globalState.currentModalIndex,
    isDeletingImage: globalState.isDeletingImage,
    hotkeys: [...globalState.hotkeys],
    isHotkeySidebarOpen: globalState.isHotkeySidebarOpen,
    categories: [...globalState.categories],
    imageCategories: new Map(globalState.imageCategories),
    currentDirectory: globalState.currentDirectory,
    configFilePath: globalState.configFilePath,
    shortcutsOverlayVisible: globalState.shortcutsOverlayVisible,
    categoryDialogVisible: globalState.categoryDialogVisible,
    categoryDialogCategory: globalState.categoryDialogCategory,
    hotkeyDialogVisible: globalState.hotkeyDialogVisible,
    hotkeyDialogHotkey: globalState.hotkeyDialogHotkey,
  }));

  const syncWithGlobalState = useCallback(() => {
    setLocalState({
      allImagePaths: globalState.allImagePaths,
      allDirectoryPaths: globalState.allDirectoryPaths,
      currentIndex: globalState.currentIndex,
      isLoadingBatch: globalState.isLoadingBatch,
      loadedImages: new Map(globalState.loadedImages),
      currentModalIndex: globalState.currentModalIndex,
      isDeletingImage: globalState.isDeletingImage,
      hotkeys: [...globalState.hotkeys],
      isHotkeySidebarOpen: globalState.isHotkeySidebarOpen,
      categories: [...globalState.categories],
      imageCategories: new Map(globalState.imageCategories),
      currentDirectory: globalState.currentDirectory,
      configFilePath: globalState.configFilePath,
      shortcutsOverlayVisible: globalState.shortcutsOverlayVisible,
      categoryDialogVisible: globalState.categoryDialogVisible,
      categoryDialogCategory: globalState.categoryDialogCategory,
      hotkeyDialogVisible: globalState.hotkeyDialogVisible,
      hotkeyDialogHotkey: globalState.hotkeyDialogHotkey,
    });
  }, []);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setLocalState((prev) => ({ ...prev, ...updates }));
    // Also update global state
    Object.assign(globalState, updates);
  }, []);

  // Sync with global state periodically (for vanilla JS updates)
  useEffect(() => {
    const interval = setInterval(syncWithGlobalState, 100);
    return () => clearInterval(interval);
  }, [syncWithGlobalState]);

  return (
    <StateContext.Provider value={{ state: localState, updateState, syncWithGlobalState }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error("useAppState must be used within StateProvider");
  }
  return context;
}

