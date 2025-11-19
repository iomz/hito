import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  allImagePathsAtom,
  allDirectoryPathsAtom,
  currentIndexAtom,
  isLoadingBatchAtom,
  loadedImagesAtom,
  currentModalIndexAtom,
  currentModalImagePathAtom,
  currentDirectoryAtom,
  configFilePathAtom,
  categoriesAtom,
  imageCategoriesAtom,
  hotkeysAtom,
  isLoadingAtom,
  resetStateAtom,
} from "../state";
import { loadImageBatch, browseImages } from "./browse";
import { BATCH_SIZE } from "../constants";
import type { DirectoryContents } from "../types";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { showError } from "../ui/error";
import { showNotification } from "../ui/notification";

// Mock dependencies
vi.mock("../utils/images", () => ({
  loadImageData: vi.fn().mockResolvedValue("data:image/png;base64,test"),
  createImageElement: vi.fn().mockReturnValue(document.createElement("img")),
  createPlaceholder: vi.fn().mockReturnValue(document.createElement("div")),
  createErrorPlaceholder: vi.fn().mockReturnValue(document.createElement("div")),
}));

vi.mock("../ui/error", () => ({
  showError: vi.fn(),
  clearError: vi.fn(),
}));


vi.mock("../ui/notification", () => ({
  showNotification: vi.fn(),
}));

vi.mock("../handlers/dragDrop", () => ({
  handleFolder: vi.fn(),
}));

vi.mock("../ui/categories", () => ({
  loadHitoConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../utils/tauri", () => ({
  invokeTauri: vi.fn(),
  isTauriInvokeAvailable: vi.fn().mockReturnValue(true),
}));

describe("browse", () => {
  beforeEach(() => {
    // Reset state
    store.set(resetStateAtom);

    // Setup DOM elements (code uses querySelector)
    const existingErrorMsg = document.getElementById("error-msg");
    if (existingErrorMsg) existingErrorMsg.remove();
    const existingSpinner = document.getElementById("loading-spinner");
    if (existingSpinner) existingSpinner.remove();

    const errorMsg = document.createElement("div");
    errorMsg.id = "error-msg";
    document.body.appendChild(errorMsg);

    const loadingSpinner = document.createElement("div");
    loadingSpinner.id = "loading-spinner";
    document.body.appendChild(loadingSpinner);

    // Mock window.__TAURI__
    (window as any).__TAURI__ = {
      core: {
        invoke: vi.fn(),
      },
    };
  });

  afterEach(() => {
    // Clean up DOM elements
    const errorMsg = document.getElementById("error-msg");
    if (errorMsg) errorMsg.remove();
    const loadingSpinner = document.getElementById("loading-spinner");
    if (loadingSpinner) loadingSpinner.remove();
  });

  describe("loadImageBatch", () => {
    it("should return early if allImagePaths is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Set invalid value - ensureImagePathsArray will handle this
      store.set(allImagePathsAtom, null as any);

      await loadImageBatch(0, 10);

      expect(consoleSpy).toHaveBeenCalled();
      expect(store.get(allImagePathsAtom)).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if allImagePaths is not an array (string)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, "not an array" as any);

      await loadImageBatch(0, 10);

      expect(consoleSpy).toHaveBeenCalled();
      expect(store.get(allImagePathsAtom)).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if already loading", async () => {
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);
      store.set(isLoadingBatchAtom, true);

      await loadImageBatch(0, 10);

      // We just verify it doesn't throw and resets loading state
      expect(store.get(isLoadingBatchAtom)).toBe(true); // Still true since it returns early
    });

    it("should return early if startIndex >= allImagePaths.length", async () => {
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(10, 20);

      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should return early if imageGrid is null", async () => {
      // This test verifies it doesn't throw
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(0, 10);

      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should load images successfully", async () => {
      // This test verifies the function completes without errors
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);

      await loadImageBatch(0, 2);

      // Function is no-op, React component handles rendering
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should handle image loading errors", async () => {
      // This test verifies the function completes without errors
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(0, 1);

      // Function is no-op, React component handles error states
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should clamp endIndex to array length", async () => {
      // This test verifies the function completes correctly
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(0, 100);

      // Function is no-op, React component handles rendering
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });
  });

  describe("browseImages", () => {
    it("should return early if required elements are missing", async () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg?.remove();
      // Mock invokeTauri to return a valid payload so browseImages can complete
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: [],
        images: [],
      });
      await browseImages("/test/path");
      // Should not throw
    });

    it("should handle invalid backend response (non-array directories)", async () => {
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: "not an array",
        images: [],
      } as any);

      await browseImages("/test/path");

      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(allImagePathsAtom)).toEqual([]);
    });

    it("should handle invalid backend response (non-array images)", async () => {
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: [],
        images: "not an array",
      } as any);

      await browseImages("/test/path");

      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(allImagePathsAtom)).toEqual([]);
    });

    it("should handle invalid backend response (null values)", async () => {
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: null,
        images: null,
      } as any);

      await browseImages("/test/path");

      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(allImagePathsAtom)).toEqual([]);
    });

    it("should process valid directory contents", async () => {
      const contents: DirectoryContents = {
        directories: [{ path: "/test/dir1" }],
        images: [{ path: "/test/image1.png" }],
      };
      vi.mocked(invokeTauri).mockResolvedValueOnce(contents);

      await browseImages("/test/path");

      expect(invokeTauri).toHaveBeenCalledWith("list_images", { path: "/test/path" });
      expect(store.get(allDirectoryPathsAtom)).toEqual(contents.directories);
      expect(store.get(allImagePathsAtom)).toEqual(contents.images);
    });

    it("should handle Tauri API unavailable", async () => {
      vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
    });

    it("should handle backend errors", async () => {
      vi.mocked(invokeTauri).mockRejectedValueOnce(new Error("Backend error"));

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
      expect(store.get(isLoadingAtom)).toBe(false);
    });

    it("should reset state before browsing", async () => {
      store.set(currentIndexAtom, 100);
      store.set(isLoadingBatchAtom, true);
      store.set(currentModalIndexAtom, 5);
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: [],
        images: [],
      });

      await browseImages("/test/path");

      expect(store.get(currentIndexAtom)).toBe(0); // Reset to 0 when empty
      expect(store.get(isLoadingBatchAtom)).toBe(false);
      expect(store.get(currentModalIndexAtom)).toBe(-1);
    });

    it("should show notification when no images or directories found", async () => {
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: [],
        images: [],
      });

      await browseImages("/test/path");

      expect(showNotification).toHaveBeenCalledWith(
        "No images or directories found in this directory."
      );
    });
  });
});
