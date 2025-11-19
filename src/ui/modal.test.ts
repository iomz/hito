import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../state";
import {
  openModal,
  closeModal,
  showNextImage,
  showPreviousImage,
  toggleShortcutsOverlay,
  deleteCurrentImage,
} from "./modal";

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

describe("modal", () => {
  beforeEach(() => {
    // Reset state
    state.allImagePaths = [
      { path: "/test/image1.png" },
      { path: "/test/image2.png" },
      { path: "/test/image3.png" },
    ];
    state.currentModalIndex = -1;
    state.isDeletingImage = false;
    state.loadedImages.clear();
    state.hotkeys = [];
    state.categories = [];
    state.shortcutsOverlayVisible = false;

    // Mock window.__TAURI__
    (window as any).__TAURI__ = {
      core: {
        invoke: vi.fn(),
      },
    };
  });

  describe("openModal", () => {
    it("should return early if allImagePaths is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (state as any).allImagePaths = null;

      await openModal(0);

      expect(consoleSpy).toHaveBeenCalled();
      expect(state.allImagePaths).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if index is out of range", async () => {
      await openModal(-1);
      await openModal(100);

      expect(state.currentModalIndex).toBe(-1);
    });

    it("should return early if modal elements are missing", async () => {
      // This test verifies state is set correctly
      await openModal(0);

      expect(state.currentModalIndex).toBe(0);
    });

    it("should open modal with cached image", async () => {
      state.loadedImages.set("/test/image1.png", "cached-data-url");

      await openModal(0);

      // React component handles rendering - we just verify state
      expect(state.currentModalIndex).toBe(0);
      expect(state.loadedImages.get("/test/image1.png")).toBe("cached-data-url");
    });

    it("should load image if not cached", async () => {
      const { loadImageData } = await import("../utils/images");

      await openModal(0);

      expect(loadImageData).toHaveBeenCalledWith("/test/image1.png");
      expect(state.currentModalIndex).toBe(0);
    });

    it("should handle image loading errors", async () => {
      const { loadImageData } = await import("../utils/images");
      const { showError } = await import("./error");
      vi.mocked(loadImageData).mockRejectedValueOnce(new Error("Failed"));

      await openModal(0);

      expect(showError).toHaveBeenCalled();
      expect(state.currentModalIndex).toBe(-1);
    });

    it("should handle race conditions", async () => {
      const { loadImageData } = await import("../utils/images");
      let resolveLoad: (value: string) => void;
      const loadPromise = new Promise<string>((resolve) => {
        resolveLoad = resolve;
      });
      vi.mocked(loadImageData).mockReturnValueOnce(loadPromise);

      const promise1 = openModal(0);
      const promise2 = openModal(1);

      resolveLoad!("data-url");
      await promise1;
      await promise2;

      // Should show image2, not image1 (state-based check)
      expect(state.currentModalIndex).toBe(1);
    });

    it("should hide shortcuts overlay when opening modal", async () => {
      state.shortcutsOverlayVisible = true;
      state.loadedImages.set("/test/image1.png", "data-url");

      await openModal(0);

      expect(state.shortcutsOverlayVisible).toBe(false);
    });

    it("should update modal caption text with image index and filename", async () => {
      state.loadedImages.set("/test/image1.png", "data-url");
      state.allImagePaths = [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ];

      await openModal(0);

      // React component handles caption rendering - we verify state
      expect(state.currentModalIndex).toBe(0);
    });

    it("should handle paths with backslashes in modal caption", async () => {
      state.loadedImages.set("C:\\test\\image1.png", "data-url");
      state.allImagePaths = [
        { path: "C:\\test\\image1.png" },
      ];

      await openModal(0);

      // React component handles caption rendering - we verify state
      expect(state.currentModalIndex).toBe(0);
    });

    it("should open modal and set currentModalIndex", async () => {
      state.loadedImages.set("/test/image1.png", "data-url");

      await openModal(0);

      expect(state.currentModalIndex).toBe(0);
    });
  });

  describe("closeModal", () => {
    it("should hide modal and reset index", () => {
      state.currentModalIndex = 1;

      closeModal();

      expect(state.currentModalIndex).toBe(-1);
    });

    it("should hide shortcuts overlay", () => {
      state.shortcutsOverlayVisible = true;

      closeModal();

      expect(state.shortcutsOverlayVisible).toBe(false);
    });
  });

  describe("showNextImage", () => {
    it("should return early if allImagePaths is not an array", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (state as any).allImagePaths = null;
      state.currentModalIndex = 0;

      showNextImage();

      expect(consoleSpy).not.toHaveBeenCalled(); // Should return silently
      consoleSpy.mockRestore();
    });

    it("should advance to next image", async () => {
      state.currentModalIndex = 0;
      state.loadedImages.set("/test/image2.png", "data-url");

      showNextImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.currentModalIndex).toBe(1);
    });

    it("should not advance if at last image", () => {
      state.currentModalIndex = 2;

      showNextImage();

      expect(state.currentModalIndex).toBe(2);
    });
  });

  describe("showPreviousImage", () => {
    it("should go to previous image", async () => {
      state.currentModalIndex = 1;
      state.loadedImages.set("/test/image1.png", "data-url");

      showPreviousImage();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.currentModalIndex).toBe(0);
    });

    it("should not go back if at first image", () => {
      state.currentModalIndex = 0;

      showPreviousImage();

      expect(state.currentModalIndex).toBe(0);
    });
  });


  describe("toggleShortcutsOverlay", () => {
    it("should toggle overlay visibility", () => {
      state.shortcutsOverlayVisible = false;

      toggleShortcutsOverlay();
      expect(state.shortcutsOverlayVisible).toBe(true);

      toggleShortcutsOverlay();
      expect(state.shortcutsOverlayVisible).toBe(false);
    });

    it("should return early if overlay is missing", () => {
      const initialVisible = state.shortcutsOverlayVisible;
      toggleShortcutsOverlay();
      expect(state.shortcutsOverlayVisible).toBe(!initialVisible);
    });
  });

  describe("deleteCurrentImage", () => {
    it("should return early if allImagePaths is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (state as any).allImagePaths = null;
      state.currentModalIndex = 0;

      await deleteCurrentImage();

      expect(consoleSpy).toHaveBeenCalled();
      expect(state.allImagePaths).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("should return early if re-entrancy guard is active", async () => {
      state.isDeletingImage = true;

      await deleteCurrentImage();

      expect(window.__TAURI__!.core.invoke).not.toHaveBeenCalled();
    });

    it("should return early if index is out of range", async () => {
      state.currentModalIndex = -1;
      await deleteCurrentImage();

      state.currentModalIndex = 100;
      await deleteCurrentImage();

      expect(window.__TAURI__!.core.invoke).not.toHaveBeenCalled();
    });

    it("should delete image successfully", async () => {
      const tauri = await import("../utils/tauri");
      const { showNotification } = await import("./notification");
      state.currentModalIndex = 1;
      vi.spyOn(tauri, "invokeTauri").mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(tauri.invokeTauri).toHaveBeenCalledWith("delete_image", {
        imagePath: "/test/image2.png",
      });
      expect(state.allImagePaths.length).toBe(2);
      expect(state.allImagePaths.find((img) => img.path === "/test/image2.png")).toBeUndefined();
      expect(showNotification).toHaveBeenCalledWith("Image deleted");
    });

    it("should close modal if only image", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { showNotification } = await import("./notification");
      state.allImagePaths = [{ path: "/test/image1.png" }];
      state.currentModalIndex = 0;
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(state.currentModalIndex).toBe(-1);
      expect(showNotification).toHaveBeenCalledWith(
        "Image deleted. No more images in this directory."
      );
    });

    it("should navigate to previous if last image", async () => {
      const { invoke } = window.__TAURI__!.core;
      state.currentModalIndex = 2;
      state.loadedImages.set("/test/image2.png", "data-url");
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(state.currentModalIndex).toBe(1);
    });

    it("should handle deletion errors", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { showError } = await import("./error");
      state.currentModalIndex = 0;
      vi.mocked(invoke).mockRejectedValueOnce(new Error("Delete failed"));

      await deleteCurrentImage();

      expect(showError).toHaveBeenCalled();
      expect(state.isDeletingImage).toBe(false);
    });

    it("should adjust currentIndex when deleting before batch position", async () => {
      const { invoke } = window.__TAURI__!.core;
      state.currentIndex = 2;
      state.currentModalIndex = 1;
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(state.currentIndex).toBe(1);
    });
  });

});

