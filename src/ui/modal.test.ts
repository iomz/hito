import { describe, it, expect, beforeEach, vi } from "vitest";
import { state, elements } from "../state";
import {
  openModal,
  closeModal,
  showNextImage,
  showPreviousImage,
  updateModalButtons,
  toggleShortcutsOverlay,
  deleteCurrentImage,
  updateShortcutsOverlay,
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

vi.mock("./categories.js", () => ({
  renderCurrentImageCategories: vi.fn(),
  renderModalCategories: vi.fn(),
}));

vi.mock("./hotkeys.js", () => ({
  closeHotkeySidebar: vi.fn(),
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

    // Setup DOM elements
    elements.modal = document.createElement("div");
    elements.modalImage = document.createElement("img");
    elements.modalCaption = document.createElement("div");
    elements.modalCaptionText = document.createElement("span");
    elements.modalCaption.appendChild(elements.modalCaptionText);
    elements.modalPrevBtn = document.createElement("button");
    elements.modalNextBtn = document.createElement("button");
    elements.shortcutsOverlay = document.createElement("div");
    elements.shortcutsList = document.createElement("div");
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

    it("should update modal caption text with image index and filename", async () => {
      state.loadedImages.set("/test/image1.png", "data-url");
      state.allImagePaths = [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ];

      await openModal(0);

      expect(elements.modalCaptionText?.textContent).toBe("1 / 2 - image1.png");
    });

    it("should handle paths with backslashes in modal caption", async () => {
      state.loadedImages.set("C:\\test\\image1.png", "data-url");
      state.allImagePaths = [
        { path: "C:\\test\\image1.png" },
      ];

      await openModal(0);

      expect(elements.modalCaptionText?.textContent).toBe("1 / 1 - image1.png");
    });

    it("should call renderCurrentImageCategories and renderModalCategories", async () => {
      const { renderCurrentImageCategories, renderModalCategories } = await import("./categories.js");
      state.loadedImages.set("/test/image1.png", "data-url");

      await openModal(0);

      expect(renderCurrentImageCategories).toHaveBeenCalled();
      expect(renderModalCategories).toHaveBeenCalled();
    });

    it("should call updateModalButtons when opening modal", async () => {
      state.loadedImages.set("/test/image1.png", "data-url");

      await openModal(0);

      // updateModalButtons should have been called, which sets button visibility
      // Let's verify the buttons are in the expected state
      expect(elements.modalPrevBtn?.style.display).toBe("none"); // First image, no prev
      expect(elements.modalNextBtn?.style.display).toBe("block"); // Not last image, show next
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

  describe("updateShortcutsOverlay", () => {
    beforeEach(() => {
      elements.shortcutsList = document.createElement("div");
    });

    it("should return early if shortcutsList is missing", () => {
      elements.shortcutsList = null;
      updateShortcutsOverlay();
      // Should not throw
    });

    it("should create 2-column layout structure", () => {
      updateShortcutsOverlay();

      const columnsContainer = elements.shortcutsList?.querySelector(".shortcuts-columns");
      expect(columnsContainer).toBeTruthy();

      const leftColumn = columnsContainer?.querySelector(".shortcuts-column-left");
      expect(leftColumn).toBeTruthy();

      const rightColumn = columnsContainer?.querySelector(".shortcuts-column-right");
      expect(rightColumn).toBeTruthy();
    });

    it("should display default shortcuts in left column", () => {
      updateShortcutsOverlay();

      const leftColumn = elements.shortcutsList?.querySelector(".shortcuts-column-left");
      const heading = leftColumn?.querySelector(".shortcuts-heading");
      expect(heading?.textContent).toBe("Default Shortcuts");

      const defaultShortcuts = [
        { key: "←", desc: "Previous image" },
        { key: "→", desc: "Next image" },
        { key: "Esc", desc: "Close modal" },
        { key: "?", desc: "Show/hide this help" },
        { key: "Delete", desc: "Delete image and move to next" },
      ];

      const shortcutItems = leftColumn?.querySelectorAll(".shortcut-item");
      expect(shortcutItems?.length).toBe(5);

      defaultShortcuts.forEach(({ key, desc }, index) => {
        const item = shortcutItems?.[index];
        const keySpan = item?.querySelector(".shortcut-key");
        const descSpan = item?.querySelector(".shortcut-desc");
        expect(keySpan?.textContent).toBe(key);
        expect(descSpan?.textContent).toBe(desc);
      });
    });

    it("should show empty state when no custom hotkeys", () => {
      state.hotkeys = [];
      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const emptyState = rightColumn?.querySelector(".shortcuts-empty");
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toBe("No custom hotkeys");
    });

    it("should display custom hotkeys in right column", () => {
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "next_image" },
        { id: "h2", key: "B", modifiers: ["Cmd"], action: "previous_image" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const heading = rightColumn?.querySelector(".shortcuts-heading");
      expect(heading?.textContent).toBe("Custom Hotkeys");

      const shortcutItems = rightColumn?.querySelectorAll(".shortcut-item");
      expect(shortcutItems?.length).toBe(2);

      // Check first hotkey
      const firstKey = shortcutItems?.[0]?.querySelector(".shortcut-key");
      const firstDesc = shortcutItems?.[0]?.querySelector(".shortcut-desc");
      expect(firstKey?.textContent).toBe("Ctrl + A");
      expect(firstDesc?.textContent).toBe("Next Image");

      // Check second hotkey
      const secondKey = shortcutItems?.[1]?.querySelector(".shortcut-key");
      const secondDesc = shortcutItems?.[1]?.querySelector(".shortcut-desc");
      expect(secondKey?.textContent).toBe("Cmd + B");
      expect(secondDesc?.textContent).toBe("Previous Image");
    });

    it("should display delete image action correctly", () => {
      state.hotkeys = [
        { id: "h1", key: "Delete", modifiers: ["Shift"], action: "delete_image_and_next" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const descSpan = rightColumn?.querySelector(".shortcut-desc");
      expect(descSpan?.textContent).toBe("Delete Image and move to next");
    });

    it("should display category toggle actions correctly", () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.hotkeys = [
        { id: "h1", key: "T", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "h2", key: "N", modifiers: ["Ctrl"], action: "toggle_category_next_cat2" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const shortcutItems = rightColumn?.querySelectorAll(".shortcut-item");

      expect(shortcutItems?.[0]?.querySelector(".shortcut-desc")?.textContent).toBe('Toggle "Category 1"');
      expect(shortcutItems?.[1]?.querySelector(".shortcut-desc")?.textContent).toBe('Toggle "Category 2" and move to next');
    });

    it("should handle missing categories for category actions", () => {
      state.categories = [];
      state.hotkeys = [
        { id: "h1", key: "T", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const descSpan = rightColumn?.querySelector(".shortcut-desc");
      expect(descSpan?.textContent).toBe("Toggle category");
    });

    it("should handle assign_category actions (legacy)", () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ];
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "assign_category_cat1" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const descSpan = rightColumn?.querySelector(".shortcut-desc");
      expect(descSpan?.textContent).toBe('Assign "Category 1"');
    });

    it("should filter out hotkeys without actions", () => {
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "next_image" },
        { id: "h2", key: "B", modifiers: ["Ctrl"], action: "" },
        { id: "h3", key: "C", modifiers: ["Ctrl"], action: "previous_image" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const shortcutItems = rightColumn?.querySelectorAll(".shortcut-item");
      expect(shortcutItems?.length).toBe(2); // Should only show h1 and h3
    });

    it("should handle unknown action types", () => {
      state.hotkeys = [
        { id: "h1", key: "X", modifiers: ["Ctrl"], action: "unknown_action" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const descSpan = rightColumn?.querySelector(".shortcut-desc");
      expect(descSpan?.textContent).toBe("Unknown action");
    });

    it("should clear existing content before updating", () => {
      elements.shortcutsList!.innerHTML = "<div class='old-content'>Old content</div>";
      updateShortcutsOverlay();

      // Old content should be removed
      expect(elements.shortcutsList?.querySelector(".old-content")).toBeFalsy();
      // New content should be present
      expect(elements.shortcutsList?.querySelector(".shortcuts-columns")).toBeTruthy();
    });

    it("should handle multiple modifier keys in hotkey display", () => {
      state.hotkeys = [
        { id: "h1", key: "K", modifiers: ["Ctrl", "Shift", "Alt"], action: "next_image" },
      ];

      updateShortcutsOverlay();

      const rightColumn = elements.shortcutsList?.querySelector(".shortcuts-column-right");
      const keySpan = rightColumn?.querySelector(".shortcut-key");
      expect(keySpan?.textContent).toContain("Ctrl");
      expect(keySpan?.textContent).toContain("Shift");
      expect(keySpan?.textContent).toContain("Alt");
      expect(keySpan?.textContent).toContain("K");
    });
  });
});

