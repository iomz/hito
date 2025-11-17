import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { elements } from "../state.js";

// Mock dependencies
vi.mock("../ui/modal.js", () => ({
  closeModal: vi.fn(),
  showPreviousImage: vi.fn(),
  showNextImage: vi.fn(),
  toggleShortcutsOverlay: vi.fn(),
  deleteCurrentImage: vi.fn(),
}));

vi.mock("../ui/hotkeys.js", () => ({
  checkAndExecuteHotkey: vi.fn().mockReturnValue(false),
}));

describe("keyboard handlers", () => {
  let keydownHandlers: Array<(e: KeyboardEvent) => void> = [];
  let clickHandlers: Array<(e: MouseEvent) => void> = [];

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="image-modal"></div>
      <div id="keyboard-shortcuts-overlay"></div>
    `;

    // Initialize elements
    elements.modal = document.getElementById("image-modal");
    elements.shortcutsOverlay = document.getElementById("keyboard-shortcuts-overlay");

    // Reset mocks
    vi.clearAllMocks();

    // Track event listeners
    keydownHandlers = [];
    clickHandlers = [];

    // Intercept addEventListener to track handlers
    const originalAddEventListener = document.addEventListener.bind(document);
    vi.spyOn(document, "addEventListener").mockImplementation((type, handler, options) => {
      if (type === "keydown" && typeof handler === "function") {
        keydownHandlers.push(handler as (e: KeyboardEvent) => void);
      }
      return originalAddEventListener(type, handler, options);
    });

    const originalWindowAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type, handler, options) => {
      if (type === "click" && typeof handler === "function") {
        clickHandlers.push(handler as (e: MouseEvent) => void);
      }
      return originalWindowAddEventListener(type, handler, options);
    });
  });

  afterEach(() => {
    // Clean up all tracked event listeners
    keydownHandlers.forEach((handler) => {
      document.removeEventListener("keydown", handler);
    });
    clickHandlers.forEach((handler) => {
      window.removeEventListener("click", handler);
    });
    keydownHandlers = [];
    clickHandlers = [];

    // Restore original addEventListener
    vi.restoreAllMocks();
  });

  describe("setupKeyboardHandlers", () => {
    it("should call showPreviousImage on ArrowLeft", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { showPreviousImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      document.dispatchEvent(event);

      expect(showPreviousImage).toHaveBeenCalled();
    });

    it("should call showNextImage on ArrowRight", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { showNextImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).toHaveBeenCalled();
    });

    it("should close shortcuts overlay on Escape when overlay is visible", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { closeModal } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }
      if (elements.shortcutsOverlay) {
        elements.shortcutsOverlay.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);

      expect(elements.shortcutsOverlay?.style.display).toBe("none");
      expect(closeModal).not.toHaveBeenCalled();
    });

    it("should close modal on Escape when overlay is not visible", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { closeModal } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }
      if (elements.shortcutsOverlay) {
        elements.shortcutsOverlay.style.display = "none";
      }

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);

      expect(closeModal).toHaveBeenCalled();
    });

    it("should toggle shortcuts overlay on ? key", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { toggleShortcutsOverlay } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "?" });
      document.dispatchEvent(event);

      expect(toggleShortcutsOverlay).toHaveBeenCalled();
    });

    it("should toggle shortcuts overlay on Shift+/", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { toggleShortcutsOverlay } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", {
        key: "/",
        shiftKey: true,
      });
      document.dispatchEvent(event);

      expect(toggleShortcutsOverlay).toHaveBeenCalled();
    });

    it("should delete current image on Delete key", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { deleteCurrentImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "Delete" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should delete current image on Backspace key", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { deleteCurrentImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "Backspace" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should delete current image on Delete code", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { deleteCurrentImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { code: "Delete" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should delete current image on Backspace code", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { deleteCurrentImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { code: "Backspace" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should not handle modal shortcuts when modal is not visible", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { showNextImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "none";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should not handle modal shortcuts when modal element is missing", async () => {
      elements.modal = null;

      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { showNextImage } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should check hotkeys first before modal shortcuts", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");
      const { showNextImage } = await import("../ui/modal.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(true);

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(checkAndExecuteHotkey).toHaveBeenCalled();
      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should prevent default and stop propagation when hotkey is executed", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(true);

      setupKeyboardHandlers();

      const event = new KeyboardEvent("keydown", { key: "K", ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it("should close modal when clicking on modal backdrop", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { closeModal } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        const clickEvent = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(clickEvent, "target", {
          value: elements.modal,
          enumerable: true,
        });
        window.dispatchEvent(clickEvent);
      }

      expect(closeModal).toHaveBeenCalled();
    });

    it("should hide shortcuts overlay when clicking on overlay", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");

      setupKeyboardHandlers();

      if (elements.shortcutsOverlay) {
        elements.shortcutsOverlay.style.display = "flex";

        const clickEvent = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(clickEvent, "target", {
          value: elements.shortcutsOverlay,
          enumerable: true,
        });
        window.dispatchEvent(clickEvent);
      }

      expect(elements.shortcutsOverlay?.style.display).toBe("none");
    });

    it("should not close modal when clicking inside modal content", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { closeModal } = await import("../ui/modal.js");

      setupKeyboardHandlers();

      // Create a child element inside modal
      const modalContent = document.createElement("div");
      if (elements.modal) {
        elements.modal.appendChild(modalContent);

        const clickEvent = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(clickEvent, "target", {
          value: modalContent,
          enumerable: true,
        });
        window.dispatchEvent(clickEvent);
      }

      expect(closeModal).not.toHaveBeenCalled();
    });

    it("should prevent default on ArrowLeft", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on ArrowRight", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on Escape", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on ?", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "?" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on Delete", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "Delete" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should handle modal visibility check using computed style", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { showNextImage } = await import("../ui/modal.js");

      // Mock getComputedStyle to return display: none
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn(() => ({
        display: "none",
        visibility: "visible",
      })) as any;

      setupKeyboardHandlers();

      if (elements.modal) {
        // Set inline style but computed style will be none
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).not.toHaveBeenCalled();

      // Restore
      window.getComputedStyle = originalGetComputedStyle;
    });

    it("should handle modal visibility check using visibility hidden", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { showNextImage } = await import("../ui/modal.js");

      // Mock getComputedStyle to return visibility: hidden
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn(() => ({
        display: "flex",
        visibility: "hidden",
      })) as any;

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).not.toHaveBeenCalled();

      // Restore
      window.getComputedStyle = originalGetComputedStyle;
    });
  });
});


