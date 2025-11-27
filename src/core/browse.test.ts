import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  allImagePathsAtom,
  allDirectoryPathsAtom,
  currentIndexAtom,
  isLoadingBatchAtom,
  isLoadingAtom,
  resetStateAtom,
} from "../state";
import { loadImageBatch, browseImages } from "./browse";
import type { DirectoryContents } from "../types";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { showError } from "../ui/error";
import { showNotification } from "../ui/notification";
import { loadAppData, loadHitoConfig } from "../ui/categories";

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
  loadAppData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../utils/tauri", () => ({
  invokeTauri: vi.fn(),
  isTauriInvokeAvailable: vi.fn().mockReturnValue(true),
}));

describe("browse", () => {
  beforeEach(() => {
    // Reset state
    store.set(resetStateAtom);

    // Reset all mocks
    vi.clearAllMocks();

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

      await loadImageBatch(0);

      expect(consoleSpy).toHaveBeenCalled();
      expect(store.get(allImagePathsAtom)).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if allImagePaths is not an array (string)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, "not an array" as any);

      await loadImageBatch(0);

      expect(consoleSpy).toHaveBeenCalled();
      expect(store.get(allImagePathsAtom)).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if already loading", async () => {
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);
      store.set(isLoadingBatchAtom, true);

      await loadImageBatch(0);

      // We just verify it doesn't throw and resets loading state
      expect(store.get(isLoadingBatchAtom)).toBe(true); // Still true since it returns early
    });

    it("should return early if startIndex >= allImagePaths.length", async () => {
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(10);

      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should return early if imageGrid is null", async () => {
      // This test verifies it doesn't throw
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(0);

      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should load images successfully", async () => {
      // This test verifies the function completes without errors
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);

      await loadImageBatch(0);

      // Function is no-op, React component handles rendering
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should handle image loading errors", async () => {
      // This test verifies the function completes without errors
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(0);

      // Function is no-op, React component handles error states
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should handle out-of-range startIndex", async () => {
      // This test verifies the function completes correctly for out-of-range indices
      store.set(allImagePathsAtom, [{ path: "/test/image1.png" }]);

      await loadImageBatch(100);

      // Function is no-op, React component handles rendering
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });
  });

  describe("browseImages", () => {
    // Helper to setup mocks for browseImages flow
    const setupBrowseMocks = (
      listImagesResponse: DirectoryContents,
      dataFilePathResponse: string | null = null
    ) => {
      // Mock get_data_file_path call
      vi.mocked(invokeTauri).mockResolvedValueOnce(dataFilePathResponse);
      // Mock list_images call
      vi.mocked(invokeTauri).mockResolvedValueOnce(listImagesResponse);
      // Note: loadAppData and loadHitoConfig are mocked functions, so they don't call invokeTauri
    };

    it("should return early if required elements are missing", async () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg?.remove();
      // Mock invokeTauri to return a valid payload so browseImages can complete
      setupBrowseMocks({
        directories: [],
        images: [],
      });
      await browseImages("/test/path");
      // Should not throw
    });

    it("should handle invalid backend response (non-array directories)", async () => {
      setupBrowseMocks({
        directories: "not an array",
        images: [],
      } as any);

      await browseImages("/test/path");

      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(allImagePathsAtom)).toEqual([]);
    });

    it("should handle invalid backend response (non-array images)", async () => {
      setupBrowseMocks({
        directories: [],
        images: "not an array",
      } as any);

      await browseImages("/test/path");

      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(allImagePathsAtom)).toEqual([]);
    });

    it("should handle invalid backend response (null values)", async () => {
      setupBrowseMocks({
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
      setupBrowseMocks(contents);

      await browseImages("/test/path");

      expect(invokeTauri).toHaveBeenCalledWith("get_data_file_path", { directory: "/test/path" });
      expect(invokeTauri).toHaveBeenCalledWith("list_images", { path: "/test/path" });
      // loadAppData is no longer called - categories/hotkeys are loaded via loadHitoConfig
      expect(loadHitoConfig).toHaveBeenCalled();
      expect(store.get(allDirectoryPathsAtom)).toEqual(contents.directories);
      expect(store.get(allImagePathsAtom)).toEqual(contents.images);
    });

    it("should handle Tauri API unavailable", async () => {
      // Mock get_data_file_path to be called before the check
      vi.mocked(invokeTauri).mockResolvedValueOnce(null); // get_data_file_path
      vi.mocked(isTauriInvokeAvailable)
        .mockReturnValueOnce(true)  // allow get_data_file_path
        .mockReturnValueOnce(false); // fail the main list_images availability check

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
    });

    it("should handle backend errors", async () => {
      // Mock get_data_file_path to succeed, but list_images to fail
      vi.mocked(invokeTauri).mockResolvedValueOnce(null); // get_data_file_path
      vi.mocked(invokeTauri).mockRejectedValueOnce(new Error("Backend error")); // list_images

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
      expect(store.get(isLoadingAtom)).toBe(false);
    });

    it("should reset state before browsing", async () => {
      store.set(currentIndexAtom, 100);
      store.set(isLoadingBatchAtom, true);
      setupBrowseMocks({
        directories: [],
        images: [],
      });

      await browseImages("/test/path");

      expect(store.get(currentIndexAtom)).toBe(0); // Reset to 0 when empty
      expect(store.get(isLoadingBatchAtom)).toBe(false);
    });

    it("should show notification when no images or directories found", async () => {
      setupBrowseMocks({
        directories: [],
        images: [],
      });

      await browseImages("/test/path");

      expect(showNotification).toHaveBeenCalledWith(
        "No images or directories found in this directory."
      );
      // Should set currentIndexAtom to 0 when images.length === 0 (line 101)
      expect(store.get(currentIndexAtom)).toBe(0);
    });

    it("should set currentIndexAtom to 0 when images array is empty (branch: images.length === 0)", async () => {
      setupBrowseMocks({
        directories: [{ path: "/test/subdir", size: 0, created_at: undefined }],
        images: [], // Empty images array
      });

      await browseImages("/test/path");

      // When images.length === 0, currentIndexAtom should be set to 0 (line 101)
      expect(store.get(currentIndexAtom)).toBe(0);
      expect(store.get(allDirectoryPathsAtom)).toEqual([{ path: "/test/subdir", size: 0, created_at: undefined }]);
    });
  });
});
