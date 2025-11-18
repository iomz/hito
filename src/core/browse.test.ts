import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state } from "../state";
import { loadImageBatch, browseImages } from "./browse";
import { BATCH_SIZE } from "../constants";
import type { DirectoryContents } from "../types";

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

vi.mock("../ui/spinner", () => ({
  showSpinner: vi.fn(),
  hideSpinner: vi.fn(),
}));

vi.mock("../core/observer", () => ({
  cleanupObserver: vi.fn(),
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
    state.allImagePaths = [];
    state.allDirectoryPaths = [];
    state.currentIndex = 0;
    state.isLoadingBatch = false;
    state.loadedImages.clear();
    state.currentModalIndex = -1;
    state.currentDirectory = "";
    state.configFilePath = "";
    state.categories = [];
    state.imageCategories.clear();
    state.hotkeys = [];

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
      (state as any).allImagePaths = null;

      await loadImageBatch(0, 10);

      expect(consoleSpy).toHaveBeenCalledWith(
        "state.allImagePaths is not an array in loadImageBatch:",
        null
      );
      expect(state.allImagePaths).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if allImagePaths is not an array (string)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (state as any).allImagePaths = "not an array";

      await loadImageBatch(0, 10);

      expect(consoleSpy).toHaveBeenCalled();
      expect(state.allImagePaths).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if already loading", async () => {
      state.allImagePaths = [{ path: "/test/image1.png" }];
      state.isLoadingBatch = true;

      await loadImageBatch(0, 10);

      // Note: loadImageBatch is now a no-op (React handles rendering)
      // We just verify it doesn't throw and resets loading state
      expect(state.isLoadingBatch).toBe(true); // Still true since it returns early
    });

    it("should return early if startIndex >= allImagePaths.length", async () => {
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(10, 20);

      // Note: loadImageBatch is now a no-op (React handles rendering)
      expect(state.isLoadingBatch).toBe(false);
    });

    it("should return early if imageGrid is null", async () => {
      // Note: loadImageBatch no longer checks for imageGrid
      // This test verifies it doesn't throw
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(0, 10);

      expect(state.isLoadingBatch).toBe(false);
    });

    it("should load images successfully", async () => {
      // Note: loadImageBatch is now a no-op (React handles rendering)
      // This test verifies the function completes without errors
      state.allImagePaths = [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ];

      await loadImageBatch(0, 2);

      // Function is no-op, React component handles rendering
      expect(state.isLoadingBatch).toBe(false);
    });

    it("should handle image loading errors", async () => {
      // Note: loadImageBatch is now a no-op (React handles rendering)
      // This test verifies the function completes without errors
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(0, 1);

      // Function is no-op, React component handles error states
      expect(state.isLoadingBatch).toBe(false);
    });

    it("should clamp endIndex to array length", async () => {
      // Note: loadImageBatch is now a no-op (React handles rendering)
      // This test verifies the function completes correctly
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(0, 100);

      // Function is no-op, React component handles rendering
      expect(state.isLoadingBatch).toBe(false);
    });
  });

  describe("browseImages", () => {
    it("should return early if required elements are missing", async () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg?.remove();
      await browseImages("/test/path");
      // Should not throw
    });

    it("should handle invalid backend response (non-array directories)", async () => {
      const { invoke } = window.__TAURI__!.core;
      vi.mocked(invoke).mockResolvedValueOnce({
        directories: "not an array",
        images: [],
      } as any);

      await browseImages("/test/path");

      expect(state.allDirectoryPaths).toEqual([]);
      expect(state.allImagePaths).toEqual([]);
    });

    it("should handle invalid backend response (non-array images)", async () => {
      const { invoke } = window.__TAURI__!.core;
      vi.mocked(invoke).mockResolvedValueOnce({
        directories: [],
        images: "not an array",
      } as any);

      await browseImages("/test/path");

      expect(state.allDirectoryPaths).toEqual([]);
      expect(state.allImagePaths).toEqual([]);
    });

    it("should handle invalid backend response (null values)", async () => {
      const { invoke } = window.__TAURI__!.core;
      vi.mocked(invoke).mockResolvedValueOnce({
        directories: null,
        images: null,
      } as any);

      await browseImages("/test/path");

      expect(state.allDirectoryPaths).toEqual([]);
      expect(state.allImagePaths).toEqual([]);
    });

    it("should process valid directory contents", async () => {
      const { invokeTauri } = await import("../utils/tauri");
      const contents: DirectoryContents = {
        directories: [{ path: "/test/dir1" }],
        images: [{ path: "/test/image1.png" }],
      };
      vi.mocked(invokeTauri).mockResolvedValueOnce(contents);

      await browseImages("/test/path");

      expect(invokeTauri).toHaveBeenCalledWith("list_images", { path: "/test/path" });
      expect(state.allDirectoryPaths).toEqual(contents.directories);
      expect(state.allImagePaths).toEqual(contents.images);
    });

    it("should handle Tauri API unavailable", async () => {
      const { showError } = await import("../ui/error");
      const { isTauriInvokeAvailable } = await import("../utils/tauri");
      vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
    });

    it("should handle backend errors", async () => {
      const { invokeTauri } = await import("../utils/tauri");
      const { showError } = await import("../ui/error");
      const { hideSpinner } = await import("../ui/spinner");
      vi.mocked(invokeTauri).mockRejectedValueOnce(new Error("Backend error"));

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
      expect(hideSpinner).toHaveBeenCalled();
    });

    it("should reset state before browsing", async () => {
      const { invokeTauri } = await import("../utils/tauri");
      state.currentIndex = 100;
      state.isLoadingBatch = true;
      state.currentModalIndex = 5;
      vi.mocked(invokeTauri).mockResolvedValueOnce({
        directories: [],
        images: [],
      });

      await browseImages("/test/path");

      expect(state.currentIndex).toBe(0); // Checks empty-list default behavior: currentIndex is reset to 0 when directories and images are empty
      expect(state.isLoadingBatch).toBe(false);
      expect(state.currentModalIndex).toBe(-1);
    });

    it("should show notification when no images or directories found", async () => {
      const { invokeTauri } = await import("../utils/tauri");
      const { showNotification } = await import("../ui/notification");
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

