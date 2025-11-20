import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { store } from "../utils/jotaiStore";
import { currentModalImagePathAtom, shortcutsOverlayVisibleAtom, resetStateAtom } from "../state";

// Mock dependencies
vi.mock("../ui/modal", async () => {
  const actual = await vi.importActual<typeof import("../ui/modal")>("../ui/modal");
  return {
    ...actual,
    closeModal: vi.fn(),
    showPreviousImage: vi.fn(),
    showNextImage: vi.fn(),
    deleteCurrentImage: vi.fn(),
    // Keep the real implementations for toggleShortcutsOverlay and hideShortcutsOverlay
    // since they update state which the tests check
  };
});

vi.mock("../ui/hotkeys", () => ({
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

    // Reset state (keyboard handler checks currentModalImagePath instead of DOM styles)
    store.set(resetStateAtom);

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
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { showPreviousImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      document.dispatchEvent(event);

      expect(showPreviousImage).toHaveBeenCalled();
    });

    it("should call showNextImage on ArrowRight", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { showNextImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).toHaveBeenCalled();
    });

    it("should close shortcuts overlay on Escape when overlay is visible", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { closeModal } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open and overlay as visible (state-based checks)
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(shortcutsOverlayVisibleAtom, true);

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);

      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
      expect(closeModal).not.toHaveBeenCalled();
    });

    it("should close modal on Escape when overlay is not visible", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { closeModal } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open but overlay not visible (state-based checks)
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(shortcutsOverlayVisibleAtom, false);

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(event);

      expect(closeModal).toHaveBeenCalled();
    });

    it("should toggle shortcuts overlay on ? key", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(shortcutsOverlayVisibleAtom, false);

      const event = new KeyboardEvent("keydown", { key: "?" });
      document.dispatchEvent(event);

      // Check that state was toggled
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(true);
    });

    it("should toggle shortcuts overlay on Shift+/", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");
      store.set(shortcutsOverlayVisibleAtom, false);

      const event = new KeyboardEvent("keydown", {
        key: "/",
        shiftKey: true,
      });
      document.dispatchEvent(event);

      // Check that state was toggled
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(true);
    });

    it("should delete current image on Delete key", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { deleteCurrentImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "Delete" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should delete current image on Backspace key", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { deleteCurrentImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "Backspace" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should delete current image on Delete code", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { deleteCurrentImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { code: "Delete" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should delete current image on Backspace code", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { deleteCurrentImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { code: "Backspace" });
      document.dispatchEvent(event);

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should not handle modal shortcuts when modal is not visible", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { showNextImage } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Modal is closed (state-based check)
      store.set(currentModalImagePathAtom, "");

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should check hotkeys first before modal shortcuts", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");
      const { showNextImage } = await import("../ui/modal");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(true);

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(checkAndExecuteHotkey).toHaveBeenCalled();
      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should prevent default and stop propagation when hotkey is executed", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

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
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { closeModal } = await import("../ui/modal");

      setupKeyboardHandlers();

      const modal = document.getElementById("image-modal");
      if (modal) {
        const clickEvent = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(clickEvent, "target", {
          value: modal,
          enumerable: true,
        });
        window.dispatchEvent(clickEvent);
      }

      expect(closeModal).toHaveBeenCalled();
    });

    it("should not close modal when clicking inside modal content", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { closeModal } = await import("../ui/modal");

      setupKeyboardHandlers();

      // Create a child element inside modal
      const modal = document.getElementById("image-modal");
      const modalContent = document.createElement("div");
      if (modal) {
        modal.appendChild(modalContent);

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
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on ArrowRight", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on Escape", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "Escape" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on ?", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "?" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should prevent default on Delete", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

      const event = new KeyboardEvent("keydown", { key: "Delete" });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should skip hotkey handling when typing in INPUT element", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

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

    it("should skip hotkey handling when typing in TEXTAREA element (tagName check)", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

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
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

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
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

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

    it("should skip hotkey handling when typing in INPUT element using nodeName (branch: nodeName check)", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      // Create a lightweight fake target object with nodeName but no tagName to test nodeName branch
      // This avoids mutating DOM element properties which could be brittle
      const fakeInputTarget = {
        nodeName: "INPUT",
        // tagName is intentionally omitted to force nodeName check
      };

      const event = new KeyboardEvent("keydown", { key: "j", bubbles: true });
      // Set fake target on event to test nodeName branch (line 33)
      Object.defineProperty(event, "target", {
        value: fakeInputTarget,
        enumerable: true,
        configurable: true,
      });

      document.dispatchEvent(event);

      // Should not execute hotkey when typing in input (nodeName branch, line 33)
      expect(checkAndExecuteHotkey).not.toHaveBeenCalled();
    });

    it("should still check hotkeys when typing in regular elements", async () => {
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

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
      const { setupKeyboardHandlers } = await import("./keyboard");
      const { closeModal } = await import("../ui/modal");
      const { checkAndExecuteHotkey } = await import("../ui/hotkeys");

      vi.mocked(checkAndExecuteHotkey).mockReturnValue(false);
      vi.mocked(checkAndExecuteHotkey).mockClear();

      setupKeyboardHandlers();

      // Set modal as open (state-based check)
      store.set(currentModalImagePathAtom, "/test/image1.png");

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


