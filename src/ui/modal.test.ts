import { describe, it, expect, beforeEach, vi } from "vitest";
import { state, elements } from "../state.js";
import {
  openModal,
  closeModal,
  showNextImage,
  showPreviousImage,
  updateModalButtons,
  toggleShortcutsOverlay,
  deleteCurrentImage,
} from "./modal.js";

// Mock dependencies
vi.mock("../utils/images.js", () => ({
  loadImageData: vi.fn().mockResolvedValue("data:image/png;base64,test"),
}));

vi.mock("./error.js", () => ({
  showError: vi.fn(),
}));

vi.mock("./notification.js", () => ({
  showNotification: vi.fn(),
}));

vi.mock("./grid.js", () => ({
  removeImageFromGrid: vi.fn(),
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

    // Setup DOM elements
    elements.modal = document.createElement("div");
    elements.modalImage = document.createElement("img");
    elements.modalCaption = document.createElement("div");
    elements.modalPrevBtn = document.createElement("button");
    elements.modalNextBtn = document.createElement("button");
    elements.shortcutsOverlay = document.createElement("div");
    elements.modal.style.display = "none";
    elements.shortcutsOverlay.style.display = "none";

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

      expect(elements.modal!.style.display).toBe("none");
    });

    it("should return early if modal elements are missing", async () => {
      elements.modalImage = null;
      await openModal(0);

      expect(state.currentModalIndex).toBe(-1);
    });

    it("should open modal with cached image", async () => {
      state.loadedImages.set("/test/image1.png", "cached-data-url");

      await openModal(0);

      expect(elements.modalImage!.src).toContain("cached-data-url");
      expect(elements.modal!.style.display).toBe("flex");
      expect(state.currentModalIndex).toBe(0);
    });

    it("should load image if not cached", async () => {
      const { loadImageData } = await import("../utils/images.js");

      await openModal(0);

      expect(loadImageData).toHaveBeenCalledWith("/test/image1.png");
      expect(elements.modalImage!.src).toBe("data:image/png;base64,test");
    });

    it("should handle image loading errors", async () => {
      const { loadImageData } = await import("../utils/images.js");
      const { showError } = await import("./error.js");
      vi.mocked(loadImageData).mockRejectedValueOnce(new Error("Failed"));

      await openModal(0);

      expect(showError).toHaveBeenCalled();
      expect(elements.modal!.style.display).toBe("none");
    });

    it("should handle race conditions", async () => {
      const { loadImageData } = await import("../utils/images.js");
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

      // Should show image2, not image1
      expect(elements.modalImage!.src).toBe("data:image/png;base64,test");
      expect(state.currentModalIndex).toBe(1);
    });

    it("should hide shortcuts overlay when opening modal", async () => {
      elements.shortcutsOverlay!.style.display = "flex";
      state.loadedImages.set("/test/image1.png", "data-url");

      await openModal(0);

      expect(elements.shortcutsOverlay!.style.display).toBe("none");
    });
  });

  describe("closeModal", () => {
    it("should hide modal and reset index", () => {
      elements.modal!.style.display = "flex";
      state.currentModalIndex = 1;

      closeModal();

      expect(elements.modal!.style.display).toBe("none");
      expect(state.currentModalIndex).toBe(-1);
    });

    it("should hide shortcuts overlay", () => {
      elements.shortcutsOverlay!.style.display = "flex";

      closeModal();

      expect(elements.shortcutsOverlay!.style.display).toBe("none");
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

  describe("updateModalButtons", () => {
    it("should return early if buttons are missing", () => {
      elements.modalPrevBtn = null;
      updateModalButtons();
      // Should not throw
    });

    it("should hide buttons if allImagePaths is not an array", () => {
      (state as any).allImagePaths = null;
      state.currentModalIndex = 0;

      updateModalButtons();

      expect(elements.modalPrevBtn!.style.display).toBe("none");
      expect(elements.modalNextBtn!.style.display).toBe("none");
    });

    it("should show prev button when not at first image", () => {
      state.currentModalIndex = 1;

      updateModalButtons();

      expect(elements.modalPrevBtn!.style.display).toBe("block");
    });

    it("should hide prev button when at first image", () => {
      state.currentModalIndex = 0;

      updateModalButtons();

      expect(elements.modalPrevBtn!.style.display).toBe("none");
    });

    it("should show next button when not at last image", () => {
      state.currentModalIndex = 0;

      updateModalButtons();

      expect(elements.modalNextBtn!.style.display).toBe("block");
    });

    it("should hide next button when at last image", () => {
      state.currentModalIndex = 2;

      updateModalButtons();

      expect(elements.modalNextBtn!.style.display).toBe("none");
    });
  });

  describe("toggleShortcutsOverlay", () => {
    it("should toggle overlay visibility", () => {
      elements.shortcutsOverlay!.style.display = "none";

      toggleShortcutsOverlay();
      expect(elements.shortcutsOverlay!.style.display).toBe("flex");

      toggleShortcutsOverlay();
      expect(elements.shortcutsOverlay!.style.display).toBe("none");
    });

    it("should return early if overlay is missing", () => {
      elements.shortcutsOverlay = null;
      toggleShortcutsOverlay();
      // Should not throw
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
      const { invoke } = window.__TAURI__!.core;
      const { removeImageFromGrid } = await import("./grid.js");
      const { showNotification } = await import("./notification.js");
      state.currentModalIndex = 1;
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(invoke).toHaveBeenCalledWith("delete_image", {
        imagePath: "/test/image2.png",
      });
      expect(removeImageFromGrid).toHaveBeenCalledWith("/test/image2.png");
      expect(state.allImagePaths.length).toBe(2);
      expect(state.allImagePaths.find((img) => img.path === "/test/image2.png")).toBeUndefined();
      expect(showNotification).toHaveBeenCalledWith("Image deleted");
    });

    it("should close modal if only image", async () => {
      const { invoke } = window.__TAURI__!.core;
      const { showNotification } = await import("./notification.js");
      state.allImagePaths = [{ path: "/test/image1.png" }];
      state.currentModalIndex = 0;
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await deleteCurrentImage();

      expect(elements.modal!.style.display).toBe("none");
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
      const { showError } = await import("./error.js");
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

