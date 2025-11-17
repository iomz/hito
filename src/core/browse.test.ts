import { describe, it, expect, beforeEach, vi } from "vitest";
import { state, elements } from "../state.js";
import { loadImageBatch, browseImages } from "./browse.js";
import { BATCH_SIZE } from "../constants.js";
import type { DirectoryContents } from "../types.js";

// Mock dependencies
vi.mock("../utils/images.js", () => ({
  loadImageData: vi.fn().mockResolvedValue("data:image/png;base64,test"),
  createImageElement: vi.fn().mockReturnValue(document.createElement("img")),
  createPlaceholder: vi.fn().mockReturnValue(document.createElement("div")),
  createErrorPlaceholder: vi.fn().mockReturnValue(document.createElement("div")),
}));

vi.mock("../ui/error.js", () => ({
  showError: vi.fn(),
  clearError: vi.fn(),
}));

vi.mock("../ui/spinner.js", () => ({
  showSpinner: vi.fn(),
  hideSpinner: vi.fn(),
}));

vi.mock("../ui/grid.js", () => ({
  clearImageGrid: vi.fn(),
  removeSentinel: vi.fn(),
}));

vi.mock("../ui/dropZone.js", () => ({
  collapseDropZone: vi.fn(),
}));

vi.mock("../core/observer.js", () => ({
  cleanupObserver: vi.fn(),
  setupIntersectionObserver: vi.fn(),
}));

vi.mock("../ui/notification.js", () => ({
  showNotification: vi.fn(),
}));

vi.mock("../handlers/dragDrop.js", () => ({
  handleFolder: vi.fn(),
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

    // Setup DOM elements
    elements.imageGrid = document.createElement("div");
    elements.errorMsg = document.createElement("div");
    elements.loadingSpinner = document.createElement("div");
    document.body.appendChild(elements.imageGrid);

    // Mock window.__TAURI__
    (window as any).__TAURI__ = {
      core: {
        invoke: vi.fn(),
      },
    };
  });

  describe("loadImageBatch", () => {
    it("should return early if allImagePaths is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (state as any).allImagePaths = null;

      await loadImageBatch(0, 10);

      expect(consoleSpy).toHaveBeenCalledWith(
        "state.allImagePaths is not an array:",
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

      expect(elements.imageGrid?.children.length).toBe(0);
    });

    it("should return early if startIndex >= allImagePaths.length", async () => {
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(10, 20);

      expect(elements.imageGrid?.children.length).toBe(0);
    });

    it("should return early if imageGrid is null", async () => {
      state.allImagePaths = [{ path: "/test/image1.png" }];
      elements.imageGrid = null;

      await loadImageBatch(0, 10);

      expect(state.isLoadingBatch).toBe(false);
    });

    it("should load images successfully", async () => {
      const { loadImageData, createImageElement } = await import("../utils/images.js");
      state.allImagePaths = [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ];

      await loadImageBatch(0, 2);

      expect(loadImageData).toHaveBeenCalledTimes(2);
      expect(createImageElement).toHaveBeenCalledTimes(2);
      expect(elements.imageGrid?.children.length).toBe(2);
      expect(state.isLoadingBatch).toBe(false);
    });

    it("should handle image loading errors", async () => {
      const { loadImageData, createErrorPlaceholder } = await import("../utils/images.js");
      vi.mocked(loadImageData).mockRejectedValueOnce(new Error("Failed to load"));
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(0, 1);

      expect(createErrorPlaceholder).toHaveBeenCalled();
      expect(elements.imageGrid?.children.length).toBe(1);
    });

    it("should clamp endIndex to array length", async () => {
      const { loadImageData } = await import("../utils/images.js");
      vi.clearAllMocks();
      state.allImagePaths = [{ path: "/test/image1.png" }];

      await loadImageBatch(0, 100);

      expect(loadImageData).toHaveBeenCalledTimes(1);
    });
  });

  describe("browseImages", () => {
    it("should return early if required elements are missing", async () => {
      elements.errorMsg = null;
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
      const { invoke } = window.__TAURI__!.core;
      const contents: DirectoryContents = {
        directories: [{ path: "/test/dir1" }],
        images: [{ path: "/test/image1.png" }],
      };
      vi.mocked(invoke).mockResolvedValueOnce(contents);

      await browseImages("/test/path");

      expect(state.allDirectoryPaths).toEqual(contents.directories);
      expect(state.allImagePaths).toEqual(contents.images);
    });

    it("should handle Tauri API unavailable", async () => {
      const { showError } = await import("../ui/error.js");
      (window as any).__TAURI__ = null;

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
    });

    it("should handle backend errors", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { showError } = await import("../ui/error.js");
      const { hideSpinner } = await import("../ui/spinner.js");
      vi.mocked(invoke).mockRejectedValueOnce(new Error("Backend error"));

      await browseImages("/test/path");

      expect(showError).toHaveBeenCalled();
      expect(hideSpinner).toHaveBeenCalled();
    });

    it("should reset state before browsing", async () => {
      const { invoke } = window.__TAURI__!.core;
      state.currentIndex = 100;
      state.isLoadingBatch = true;
      state.currentModalIndex = 5;
      vi.mocked(invoke).mockResolvedValueOnce({
        directories: [],
        images: [],
      });

      await browseImages("/test/path");

      expect(state.currentIndex).toBe(0);
      expect(state.isLoadingBatch).toBe(false);
      expect(state.currentModalIndex).toBe(-1);
    });

    it("should show notification when no images or directories found", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { showNotification } = await import("../ui/notification.js");
      vi.mocked(invoke).mockResolvedValueOnce({
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

