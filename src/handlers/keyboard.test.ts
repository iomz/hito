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

    it("should skip hotkey handling when typing in INPUT element", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);
      input.focus();

      // Verify input is in DOM and has correct tagName and instanceof check
      expect(input.tagName).toBe("INPUT");
      expect(input instanceof HTMLInputElement).toBe(true);

      // Create event and dispatch on input - the event will bubble to document listener
      // and e.target should naturally be the input element
      const event = new KeyboardEvent("keydown", { 
        key: "K", 
        ctrlKey: true,
        bubbles: true 
      });
      
      // Dispatch on input - the event will bubble to document listener
      // and e.target should be the input element
      input.dispatchEvent(event);

      // Verify the event target was the input when it reached the document listener
      // The checkAndExecuteHotkey should NOT be called because target is INPUT
      expect(checkAndExecuteHotkey).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("should skip hotkey handling when typing in TEXTAREA element", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.focus();

      // Dispatch event on textarea - it will bubble to document listener
      const event = new KeyboardEvent("keydown", { 
        key: "K", 
        ctrlKey: true,
        bubbles: true 
      });
      
      textarea.dispatchEvent(event);

      expect(checkAndExecuteHotkey).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it("should skip hotkey handling when typing in contenteditable element", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      const editable = document.createElement("div");
      editable.setAttribute("contenteditable", "true");
      document.body.appendChild(editable);
      editable.focus();

      // Dispatch event on editable element - it will bubble to document listener
      const event = new KeyboardEvent("keydown", { 
        key: "K", 
        ctrlKey: true,
        bubbles: true 
      });
      
      editable.dispatchEvent(event);

      expect(checkAndExecuteHotkey).not.toHaveBeenCalled();

      document.body.removeChild(editable);
    });

    it("should skip hotkey handling when typing in element with isContentEditable", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      const editable = document.createElement("div");
      Object.defineProperty(editable, "isContentEditable", {
        value: true,
        enumerable: true,
      });
      document.body.appendChild(editable);
      editable.focus();

      // Dispatch event on editable element - it will bubble to document listener
      const event = new KeyboardEvent("keydown", { 
        key: "K", 
        ctrlKey: true,
        bubbles: true 
      });
      
      editable.dispatchEvent(event);

      expect(checkAndExecuteHotkey).not.toHaveBeenCalled();

      document.body.removeChild(editable);
    });

    it("should still check hotkeys when typing in regular elements", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);

      setupKeyboardHandlers();

      const div = document.createElement("div");
      document.body.appendChild(div);
      div.focus();

      const event = new KeyboardEvent("keydown", { key: "K", ctrlKey: true });
      Object.defineProperty(event, "target", {
        value: div,
        enumerable: true,
      });
      document.dispatchEvent(event);

      expect(checkAndExecuteHotkey).toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it("should still allow modal shortcuts when typing in INPUT", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard.js");
      const { closeModal } = await import("../ui/modal.js");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys.js");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      if (elements.modal) {
        elements.modal.style.display = "flex";
      }

      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      // Dispatch event on input - it will bubble to document listener
      const event = new KeyboardEvent("keydown", { 
        key: "Escape",
        bubbles: true 
      });
      
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      input.dispatchEvent(event);

      // Hotkey should not be checked
      expect(checkAndExecuteHotkey).not.toHaveBeenCalled();
      // But modal shortcut should still work
      expect(closeModal).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });
});


