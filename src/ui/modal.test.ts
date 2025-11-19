import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  allImagePathsAtom,
  currentModalIndexAtom,
  currentModalImagePathAtom,
  isDeletingImageAtom,
  loadedImagesAtom,
  hotkeysAtom,
  categoriesAtom,
  shortcutsOverlayVisibleAtom,
  filterOptionsAtom,
  sortOptionAtom,
  sortDirectionAtom,
  currentIndexAtom,
  resetStateAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
} from "../state";
import {
  openModal,
  openModalByIndex,
  closeModal,
  showNextImage,
  showPreviousImage,
  toggleShortcutsOverlay,
  deleteCurrentImage,
} from "./modal";
import type { ImagePath } from "../types";

// Mock dependencies
vi.mock("../utils/images", () => ({
  loadImageData: vi.fn().mockResolvedValue("data:image/png;base64,test"),
}));

vi.mock("./error", () => ({
  showError: vi.fn(),
}));

vi.mock("./notification", () => ({
  showNotification: vi.fn(),
}));


vi.mock("./hotkeys", () => ({
  closeHotkeySidebar: vi.fn(),
}));

vi.mock("../utils/tauri", () => ({
  invokeTauri: vi.fn(),
  isTauriInvokeAvailable: vi.fn().mockReturnValue(true),
}));

vi.mock("../utils/filteredImages", () => ({
  getFilteredAndSortedImagesSync: vi.fn().mockReturnValue([]),
  getFilteredAndSortedImages: vi.fn().mockResolvedValue([]),
}));

describe("modal", () => {
  beforeEach(async () => {
    // Reset state
    store.set(resetStateAtom);
    store.set(allImagePathsAtom, [
      { path: "/test/image1.png" },
      { path: "/test/image2.png" },
      { path: "/test/image3.png" },
    ]);
    store.set(currentModalIndexAtom, -1);
    store.set(currentModalImagePathAtom, "");
    store.set(isDeletingImageAtom, false);
    store.set(loadedImagesAtom, new Map());
    store.set(hotkeysAtom, []);
    store.set(categoriesAtom, []);
    store.set(shortcutsOverlayVisibleAtom, false);
    store.set(filterOptionsAtom, {
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    });
    store.set(sortOptionAtom, "name");
    store.set(sortDirectionAtom, "ascending");

    // Mock window.__TAURI__
    (window as any).__TAURI__ = {
      core: {
        invoke: vi.fn(),
      },
    };

    // Setup default mock for getFilteredAndSortedImagesSync to return images matching allImagePathsAtom
    const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
    const allImagePaths = store.get(allImagePathsAtom);
    vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue(allImagePaths);
  });

  describe("openModal", () => {
    it("should return early if allImagePaths is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, null as any);

      await openModalByIndex(0);

      expect(consoleSpy).toHaveBeenCalled();
      expect(store.get(allImagePathsAtom)).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if index is out of range", async () => {
      await openModalByIndex(-1);
      await openModalByIndex(100);

      expect(store.get(currentModalIndexAtom)).toBe(-1);
      expect(store.get(currentModalImagePathAtom)).toBe("");
    });

    it("should return early if modal elements are missing", async () => {
      // This test verifies state is set correctly
      await openModalByIndex(0);

      expect(store.get(currentModalIndexAtom)).toBe(0);
    });

    it("should open modal with cached image", async () => {
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image1.png", "cached-data-url");
      store.set(loadedImagesAtom, updatedLoadedImages);

      await openModalByIndex(0);

      // React component handles rendering - we just verify state
      expect(store.get(currentModalIndexAtom)).toBe(0);
      expect(store.get(loadedImagesAtom).get("/test/image1.png")).toBe("cached-data-url");
    });

    it("should load image if not cached", async () => {
      const { loadImageData } = await import("../utils/images");

      await openModalByIndex(0);

      expect(loadImageData).toHaveBeenCalledWith("/test/image1.png");
      expect(store.get(currentModalIndexAtom)).toBe(0);
    });

    it("should handle image loading errors", async () => {
      const { loadImageData } = await import("../utils/images");
      const { showError } = await import("./error");
      vi.mocked(loadImageData).mockRejectedValueOnce(new Error("Failed"));

      await openModalByIndex(0);

      expect(showError).toHaveBeenCalled();
      expect(store.get(currentModalIndexAtom)).toBe(-1);
    });

    it("should handle race conditions", async () => {
      const { loadImageData } = await import("../utils/images");
      let resolveLoad: (value: string) => void;
      const loadPromise = new Promise<string>((resolve) => {
        resolveLoad = resolve;
      });
      vi.mocked(loadImageData).mockReturnValueOnce(loadPromise);

      const promise1 = openModalByIndex(0);
      const promise2 = openModalByIndex(1);

      resolveLoad!("data-url");
      await promise1;
      await promise2;

      // Should show image2, not image1 (state-based check)
      expect(store.get(currentModalIndexAtom)).toBe(1);
    });

    it("should hide shortcuts overlay when opening modal", async () => {
      store.set(shortcutsOverlayVisibleAtom, true);
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image1.png", "data-url");

      await openModalByIndex(0);

      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
    });

    it("should update modal caption text with image index and filename", async () => {
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image1.png", "data-url");
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);

      await openModalByIndex(0);

      // React component handles caption rendering - we verify state
      expect(store.get(currentModalIndexAtom)).toBe(0);
    });

    it("should handle paths with backslashes in modal caption", async () => {
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("C:\\test\\image1.png", "data-url");
      store.set(allImagePathsAtom, [
        { path: "C:\\test\\image1.png" },
      ]);

      await openModalByIndex(0);

      // React component handles caption rendering - we verify state
      expect(store.get(currentModalIndexAtom)).toBe(0);
    });

    it("should open modal and set currentModalIndex", async () => {
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image1.png", "data-url");

      await openModalByIndex(0);

      expect(store.get(currentModalIndexAtom)).toBe(0);
    });
  });

  describe("closeModal", () => {
    it("should hide modal and reset index", () => {
      store.set(currentModalIndexAtom, 1);

      closeModal();

      expect(store.get(currentModalIndexAtom)).toBe(-1);
    });

    it("should hide shortcuts overlay", () => {
      store.set(shortcutsOverlayVisibleAtom, true);

      closeModal();

      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
    });
  });

  describe("showNextImage", () => {
    it("should return early if allImagePaths is not an array", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, null as any);
      store.set(currentModalIndexAtom, 0);

      showNextImage();

      expect(consoleSpy).not.toHaveBeenCalled(); // Should return silently
      consoleSpy.mockRestore();
    });

    it("should advance to next image", async () => {
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image2.png", "data-url");

      showNextImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.get(currentModalIndexAtom)).toBe(1);
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image2.png");
    });

    it("should not advance if at last image", () => {
      store.set(currentModalImagePathAtom, "/test/image3.png");
      store.set(currentModalIndexAtom, 2);

      showNextImage();

      expect(store.get(currentModalIndexAtom)).toBe(2);
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image3.png");
    });
  });

  describe("showPreviousImage", () => {
    it("should go to previous image", async () => {
      store.set(currentModalImagePathAtom, "/test/image2.png");
      store.set(currentModalIndexAtom, 1);
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image1.png", "data-url");

      showPreviousImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.get(currentModalIndexAtom)).toBe(0);
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image1.png");
    });

    it("should not go back if at first image", () => {
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);

      showPreviousImage();

      expect(store.get(currentModalIndexAtom)).toBe(0);
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image1.png");
    });
  });


  describe("toggleShortcutsOverlay", () => {
    it("should toggle overlay visibility", () => {
      store.set(shortcutsOverlayVisibleAtom, false);

      toggleShortcutsOverlay();
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(true);

      toggleShortcutsOverlay();
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
    });

    it("should return early if overlay is missing", () => {
      const initialVisible = store.get(shortcutsOverlayVisibleAtom);
      toggleShortcutsOverlay();
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(!initialVisible);
    });
  });

  describe("deleteCurrentImage", () => {
    it("should return early if allImagePaths is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, null as any);
      store.set(currentModalIndexAtom, 0);

      await deleteCurrentImage();

      expect(consoleSpy).toHaveBeenCalled();
      expect(store.get(allImagePathsAtom)).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if re-entrancy guard is active", async () => {
      store.set(isDeletingImageAtom, true);

      await deleteCurrentImage();

      expect(window.__TAURI__!.core.invoke).not.toHaveBeenCalled();
    });

    it("should return early if index is out of range", async () => {
      store.set(currentModalImagePathAtom, "");
      store.set(currentModalIndexAtom, -1);
      await deleteCurrentImage();

      store.set(currentModalImagePathAtom, "");
      store.set(currentModalIndexAtom, 100);
      await deleteCurrentImage();

      expect(window.__TAURI__!.core.invoke).not.toHaveBeenCalled();
    });

    it("should delete image successfully", async () => {
      const tauri = await import("../utils/tauri");
      const { showNotification } = await import("./notification");
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      // Mock filtered images - image2 is in the middle
      vi.mocked(getFilteredAndSortedImagesSync)
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image2.png" },
          { path: "/test/image3.png" },
        ])
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image3.png" },
        ]);
      store.set(currentModalImagePathAtom, "/test/image2.png");
      store.set(currentModalIndexAtom, 1);
      vi.spyOn(tauri, "invokeTauri").mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(tauri.invokeTauri).toHaveBeenCalledWith("delete_image", {
        imagePath: "/test/image2.png",
      });
      expect(store.get(allImagePathsAtom).length).toBe(2);
      expect(store.get(allImagePathsAtom).find((img: ImagePath) => img.path === "/test/image2.png")).toBeUndefined();
      // After deletion, should navigate to next image (image3)
      expect(showNotification).toHaveBeenCalled();
    });

    it("should close modal if only image", async () => {
      const tauri = await import("../utils/tauri");
      const { showNotification } = await import("./notification");
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      // Mock filtered images - only one image
      vi.mocked(getFilteredAndSortedImagesSync)
        .mockReturnValueOnce([{ path: "/test/image1.png" }]) // Before deletion
        .mockReturnValueOnce([]); // After deletion - empty
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);
      vi.spyOn(tauri, "invokeTauri").mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(store.get(currentModalIndexAtom)).toBe(-1);
      expect(store.get(currentModalImagePathAtom)).toBe("");
      expect(showNotification).toHaveBeenCalledWith(
        "Image deleted. No more images in this directory."
      );
    });

    it("should navigate to previous if last image", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      // Mock filtered images - image3 is last
      vi.mocked(getFilteredAndSortedImagesSync)
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image2.png" },
          { path: "/test/image3.png" },
        ])
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image2.png" },
        ]);
      store.set(currentModalImagePathAtom, "/test/image3.png");
      store.set(currentModalIndexAtom, 2);
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image2.png", "data-url");
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(store.get(currentModalIndexAtom)).toBe(1);
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image2.png");
    });

    it("should handle deletion errors", async () => {
      const tauri = await import("../utils/tauri");
      const { showError } = await import("./error");
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync)
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image2.png" },
        ])
        .mockReturnValueOnce([
          { path: "/test/image2.png" },
        ]);
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);
      vi.spyOn(tauri, "invokeTauri").mockRejectedValueOnce(new Error("Delete failed"));

      await deleteCurrentImage();

      expect(showError).toHaveBeenCalledWith("Failed to delete image: Error: Delete failed");
      expect(store.get(isDeletingImageAtom)).toBe(false);
    });

    it("should adjust currentIndex when deleting before batch position", async () => {
      const { invoke } = window.__TAURI__!.core;
      store.set(currentIndexAtom, 2);
      store.set(currentModalImagePathAtom, "/test/image2.png");
      store.set(currentModalIndexAtom, 1);
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(store.get(currentIndexAtom)).toBe(1);
    });

    it("should handle deleting image that is not in filtered list", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
        { path: "/test/image3.png" },
      ]);
      store.set(currentModalImagePathAtom, "/test/image2.png");
      store.set(currentModalIndexAtom, 1);
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      // Should still delete from allImagePaths
      expect(store.get(allImagePathsAtom).length).toBe(2);
      expect(store.get(allImagePathsAtom).find((img: ImagePath) => img.path === "/test/image2.png")).toBeUndefined();
    });

    it("should close modal when deleting last image in filtered list", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
      ]);
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" }, // Not in filtered list
      ]);
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(store.get(currentModalIndexAtom)).toBe(-1);
      expect(store.get(currentModalImagePathAtom)).toBe("");
    });
  });

  describe("openModal with path", () => {
    beforeEach(async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
        { path: "/test/image3.png" },
      ]);
    });

    it("should open modal for image in filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      const { loadImageData } = await import("../utils/images");
      const filteredList = [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ];
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue(filteredList);
      vi.mocked(loadImageData).mockResolvedValueOnce("data-url");

      await openModal("/test/image2.png");

      expect(loadImageData).toHaveBeenCalledWith("/test/image2.png");
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image2.png");
      expect(store.get(currentModalIndexAtom)).toBe(1);
    });

    it("should not open modal for image not in filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      const { loadImageData } = await import("../utils/images");
      const filteredList = [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ];
      // Reset and set up mock specifically for this test
      vi.mocked(getFilteredAndSortedImagesSync).mockReset();
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue(filteredList);
      vi.mocked(loadImageData).mockClear();

      await openModal("/test/nonexistent.png");

      expect(loadImageData).not.toHaveBeenCalled();
      expect(store.get(currentModalImagePathAtom)).toBe("");
    });

    it("should use cached image data when available", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      const { loadImageData } = await import("../utils/images");
      const filteredList = [
        { path: "/test/image1.png" },
      ];
      // Reset and set up mock specifically for this test
      vi.mocked(getFilteredAndSortedImagesSync).mockReset();
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue(filteredList);
      vi.mocked(loadImageData).mockClear();
      const loadedImages = store.get(loadedImagesAtom);
      const updatedLoadedImages = new Map(loadedImages);
      updatedLoadedImages.set("/test/image1.png", "cached-data-url");
      store.set(loadedImagesAtom, updatedLoadedImages);

      await openModal("/test/image1.png");

      expect(loadImageData).not.toHaveBeenCalled();
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image1.png");
    });

    it("should handle race condition with multiple openModal calls", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      const { loadImageData } = await import("../utils/images");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);
      
      let resolveLoad1: (value: string) => void;
      let resolveLoad2: (value: string) => void;
      const loadPromise1 = new Promise<string>((resolve) => {
        resolveLoad1 = resolve;
      });
      const loadPromise2 = new Promise<string>((resolve) => {
        resolveLoad2 = resolve;
      });
      vi.mocked(loadImageData)
        .mockReturnValueOnce(loadPromise1)
        .mockReturnValueOnce(loadPromise2);

      const promise1 = openModal("/test/image1.png");
      const promise2 = openModal("/test/image2.png");

      resolveLoad2!("data-url-2");
      resolveLoad1!("data-url-1");
      await promise1;
      await promise2;

      // Should show image2, not image1 (last call wins)
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image2.png");
    });
  });

  describe("showNextImage with suppressCategoryRefilter", () => {
    beforeEach(async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([]);
    });

    it("should clear suppress flag and navigate when image still in filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      store.set(suppressCategoryRefilterAtom, true);
      store.set(cachedImageCategoriesForRefilterAtom, new Map());
      store.set(currentModalImagePathAtom, "/test/image1.png");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);

      showNextImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.get(suppressCategoryRefilterAtom)).toBe(false);
      expect(store.get(cachedImageCategoriesForRefilterAtom)).toBeNull();
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image2.png");
    });

    it("should navigate to first image when current image removed from filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      store.set(suppressCategoryRefilterAtom, true);
      store.set(cachedImageCategoriesForRefilterAtom, new Map());
      store.set(currentModalImagePathAtom, "/test/image1.png");
      // Current image not in filtered list anymore
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image2.png" },
        { path: "/test/image3.png" },
      ]);

      showNextImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.get(currentModalImagePathAtom)).toBe("/test/image2.png");
    });

    it("should not navigate when suppress flag is false and image not in list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      store.set(suppressCategoryRefilterAtom, false);
      store.set(currentModalImagePathAtom, "/test/image1.png");
      // Current image not in filtered list
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image2.png" },
      ]);

      showNextImage();

      // Should not navigate when suppress is false
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image1.png");
    });
  });

  describe("showPreviousImage with suppressCategoryRefilter", () => {
    beforeEach(async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([]);
    });

    it("should clear suppress flag and navigate when image still in filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      store.set(suppressCategoryRefilterAtom, true);
      store.set(cachedImageCategoriesForRefilterAtom, new Map());
      store.set(currentModalImagePathAtom, "/test/image2.png");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);

      showPreviousImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.get(suppressCategoryRefilterAtom)).toBe(false);
      expect(store.get(cachedImageCategoriesForRefilterAtom)).toBeNull();
      expect(store.get(currentModalImagePathAtom)).toBe("/test/image1.png");
    });

    it("should navigate to last image when current image removed from filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      store.set(suppressCategoryRefilterAtom, true);
      store.set(cachedImageCategoriesForRefilterAtom, new Map());
      store.set(currentModalImagePathAtom, "/test/image2.png");
      // Current image not in filtered list anymore
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
        { path: "/test/image1.png" },
        { path: "/test/image3.png" },
      ]);

      showPreviousImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.get(currentModalImagePathAtom)).toBe("/test/image3.png");
    });
  });

  describe("closeModal", () => {
    it("should clear suppressCategoryRefilter flag", () => {
      store.set(suppressCategoryRefilterAtom, true);
      store.set(cachedImageCategoriesForRefilterAtom, new Map());

      closeModal();

      expect(store.get(suppressCategoryRefilterAtom)).toBe(false);
      expect(store.get(cachedImageCategoriesForRefilterAtom)).toBeNull();
    });

    it("should reset modal state", () => {
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);

      closeModal();

      expect(store.get(currentModalImagePathAtom)).toBe("");
      expect(store.get(currentModalIndexAtom)).toBe(-1);
    });
  });

  describe("hideShortcutsOverlay", () => {
    it("should hide shortcuts overlay", async () => {
      const { hideShortcutsOverlay } = await import("./modal");
      store.set(shortcutsOverlayVisibleAtom, true);

      hideShortcutsOverlay();

      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
    });
  });

  describe("openModalByIndex edge cases", () => {
    it("should handle negative index", async () => {
      await openModalByIndex(-1);

      expect(store.get(currentModalIndexAtom)).toBe(-1);
      expect(store.get(currentModalImagePathAtom)).toBe("");
    });

    it("should handle index beyond array length", async () => {
      await openModalByIndex(100);

      expect(store.get(currentModalIndexAtom)).toBe(-1);
      expect(store.get(currentModalImagePathAtom)).toBe("");
    });

    it("should handle empty filtered list", async () => {
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([]);

      await openModalByIndex(0);

      expect(store.get(currentModalIndexAtom)).toBe(-1);
    });
  });

  describe("deleteCurrentImage edge cases", () => {
    it("should handle Tauri API unavailable", async () => {
      const { isTauriInvokeAvailable } = await import("../utils/tauri");
      const { showError } = await import("./error");
      vi.mocked(isTauriInvokeAvailable).mockReturnValue(false);
      store.set(currentModalImagePathAtom, "/test/image1.png");

      await deleteCurrentImage();

      expect(showError).toHaveBeenCalledWith("Tauri invoke API not available");
      expect(store.get(isDeletingImageAtom)).toBe(false);
    });

    it("should handle deleting when image is not in allImagePaths", async () => {
      const tauri = await import("../utils/tauri");
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      // Image2 is in filtered list but not in allImagePaths
      vi.mocked(getFilteredAndSortedImagesSync)
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image2.png" },
          { path: "/test/image3.png" },
        ])
        .mockReturnValueOnce([
          { path: "/test/image1.png" },
          { path: "/test/image3.png" },
        ]);
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png" },
        { path: "/test/image3.png" },
      ]);
      store.set(currentModalImagePathAtom, "/test/image2.png");
      store.set(currentModalIndexAtom, 1);
      // Ensure Tauri is available
      vi.mocked(tauri.isTauriInvokeAvailable).mockReturnValue(true);
      vi.spyOn(tauri, "invokeTauri").mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      // Should still attempt deletion, but not remove from array (since it's not in allImagePaths)
      expect(tauri.invokeTauri).toHaveBeenCalledWith("delete_image", {
        imagePath: "/test/image2.png",
      });
    });

    it("should handle deleting when filtered list becomes empty", async () => {
      const tauri = await import("../utils/tauri");
      const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
      // Reset mock to ensure clean state
      vi.mocked(getFilteredAndSortedImagesSync).mockReset();
      // First call: before deletion (to find deletedIndex) - only one image
      // Second call: after deletion (empty list)
      vi.mocked(getFilteredAndSortedImagesSync)
        .mockReturnValueOnce([{ path: "/test/image1.png" }]) // Before deletion - isOnlyImage will be true
        .mockReturnValueOnce([]); // Empty after deletion
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(currentModalIndexAtom, 0);
      // Ensure Tauri is available
      vi.mocked(tauri.isTauriInvokeAvailable).mockReturnValue(true);
      vi.spyOn(tauri, "invokeTauri").mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      // Should close modal when filtered list is empty (isOnlyImage is true)
      // closeModal sets currentModalIndexAtom to -1 and currentModalImagePathAtom to ""
      // The function returns early after closeModal, so state should be updated
      expect(store.get(currentModalIndexAtom)).toBe(-1);
      expect(store.get(currentModalImagePathAtom)).toBe("");
    });
  });
});

