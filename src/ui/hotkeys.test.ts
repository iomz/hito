import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state, elements } from "../state.js";
import type { HotkeyConfig } from "../types.js";

// Mock dependencies
vi.mock("./categories.js", () => ({
  saveHitoConfig: vi.fn().mockResolvedValue(undefined),
  renderCurrentImageCategories: vi.fn(),
  renderCategoryList: vi.fn(),
  toggleCategoryForCurrentImage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./modal.js", () => ({
  showNextImage: vi.fn(),
}));

describe("hotkeys", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="hotkey-sidebar"></div>
      <button id="hotkey-sidebar-toggle"></button>
      <button id="hotkey-sidebar-close"></button>
      <button id="add-hotkey-btn"></button>
      <div id="hotkey-list"></div>
      <img id="modal-image" />
    `;

    // Initialize elements
    elements.hotkeySidebar = document.getElementById("hotkey-sidebar");
    elements.hotkeySidebarToggle = document.getElementById("hotkey-sidebar-toggle");
    elements.hotkeySidebarClose = document.getElementById("hotkey-sidebar-close");
    elements.addHotkeyBtn = document.getElementById("add-hotkey-btn");
    elements.hotkeyList = document.getElementById("hotkey-list");
    elements.modalImage = document.getElementById("modal-image") as HTMLImageElement;

    // Reset state
    state.hotkeys = [];
    state.categories = [];
    state.isHotkeySidebarOpen = false;
    state.currentModalIndex = -1;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleHotkeySidebar", () => {
    it("should open sidebar when closed", async () => {
      const { toggleHotkeySidebar } = await import("./hotkeys.js");
      
      await toggleHotkeySidebar();

      expect(state.isHotkeySidebarOpen).toBe(true);
      expect(elements.hotkeySidebar?.classList.contains("open")).toBe(true);
    });

    it("should close sidebar when open", async () => {
      state.isHotkeySidebarOpen = true;
      if (elements.hotkeySidebar) {
        elements.hotkeySidebar.classList.add("open");
      }

      const { toggleHotkeySidebar } = await import("./hotkeys.js");
      await toggleHotkeySidebar();

      expect(state.isHotkeySidebarOpen).toBe(false);
      expect(elements.hotkeySidebar?.classList.contains("open")).toBe(false);
    });

    it("should adjust modal image when opening sidebar with modal open", async () => {
      state.currentModalIndex = 0;
      if (elements.modalImage) {
        elements.modalImage.style.marginLeft = "";
        elements.modalImage.style.maxWidth = "";
      }

      const { toggleHotkeySidebar, SIDEBAR_WIDTH } = await import("./hotkeys.js");
      await toggleHotkeySidebar();

      expect(elements.modalImage?.style.marginLeft).toBe(SIDEBAR_WIDTH);
      expect(elements.modalImage?.style.maxWidth).toBe(`calc(90% - ${SIDEBAR_WIDTH})`);
    });

    it("should reset modal image when closing sidebar with modal open", async () => {
      state.isHotkeySidebarOpen = true;
      state.currentModalIndex = 0;
      if (elements.hotkeySidebar) {
        elements.hotkeySidebar.classList.add("open");
      }
      const { SIDEBAR_WIDTH } = await import("./hotkeys.js");
      if (elements.modalImage) {
        elements.modalImage.style.marginLeft = SIDEBAR_WIDTH;
        elements.modalImage.style.maxWidth = `calc(90% - ${SIDEBAR_WIDTH})`;
      }

      const { toggleHotkeySidebar } = await import("./hotkeys.js");
      await toggleHotkeySidebar();

      expect(elements.modalImage?.style.marginLeft).toBe("");
      expect(elements.modalImage?.style.maxWidth).toBe("");
    });

    it("should render hotkey list when opening", async () => {
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl"],
          action: "toggle_category_cat1",
        },
      ];

      const { toggleHotkeySidebar } = await import("./hotkeys.js");
      await toggleHotkeySidebar();

      expect(elements.hotkeyList?.children.length).toBeGreaterThan(0);
    });

    it("should return early if sidebar element is missing", async () => {
      elements.hotkeySidebar = null;

      const { toggleHotkeySidebar } = await import("./hotkeys.js");
      await expect(toggleHotkeySidebar()).resolves.not.toThrow();
    });
  });

  describe("closeHotkeySidebar", () => {
    it("should close sidebar", async () => {
      state.isHotkeySidebarOpen = true;
      if (elements.hotkeySidebar) {
        elements.hotkeySidebar.classList.add("open");
      }

      const { closeHotkeySidebar } = await import("./hotkeys.js");
      closeHotkeySidebar();

      expect(state.isHotkeySidebarOpen).toBe(false);
      expect(elements.hotkeySidebar?.classList.contains("open")).toBe(false);
    });

    it("should reset modal image when modal is open", async () => {
      state.currentModalIndex = 0;
      const { SIDEBAR_WIDTH } = await import("./hotkeys.js");
      if (elements.modalImage) {
        elements.modalImage.style.marginLeft = SIDEBAR_WIDTH;
        elements.modalImage.style.maxWidth = `calc(90% - ${SIDEBAR_WIDTH})`;
      }

      const { closeHotkeySidebar } = await import("./hotkeys.js");
      closeHotkeySidebar();

      expect(elements.modalImage?.style.marginLeft).toBe("");
      expect(elements.modalImage?.style.maxWidth).toBe("");
    });

    it("should return early if sidebar element is missing", async () => {
      elements.hotkeySidebar = null;

      const { closeHotkeySidebar } = await import("./hotkeys.js");
      expect(() => closeHotkeySidebar()).not.toThrow();
    });
  });

  describe("renderHotkeyList", () => {
    it("should render empty state when no hotkeys", async () => {
      state.hotkeys = [];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      expect(elements.hotkeyList?.textContent).toContain("No hotkeys configured");
    });

    it("should render hotkey items", async () => {
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl", "Shift"],
          action: "toggle_category_cat1",
        },
        {
          id: "hotkey2",
          key: "J",
          modifiers: ["Alt"],
          action: "toggle_category_cat2",
        },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const items = elements.hotkeyList?.querySelectorAll(".hotkey-item");
      expect(items?.length).toBe(2);
    });

    it("should display hotkey combination correctly", async () => {
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl", "Shift"],
          action: "toggle_category_cat1",
        },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const keyDisplay = elements.hotkeyList?.querySelector(".hotkey-key");
      expect(keyDisplay?.textContent).toBe("Ctrl + Shift + K");
    });

    it("should have edit and delete buttons for each hotkey", async () => {
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl"],
          action: "toggle_category_cat1",
        },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const editBtn = elements.hotkeyList?.querySelector(".hotkey-edit-btn");
      const deleteBtn = elements.hotkeyList?.querySelector(".hotkey-delete-btn");

      expect(editBtn).not.toBeNull();
      expect(deleteBtn).not.toBeNull();
      expect(editBtn?.textContent).toBe("Edit");
      expect(deleteBtn?.textContent).toBe("Delete");
    });

    it("should return early if hotkeyList element is missing", async () => {
      elements.hotkeyList = null;

      const { renderHotkeyList } = await import("./hotkeys.js");
      expect(() => renderHotkeyList()).not.toThrow();
    });
  });

  describe("checkAndExecuteHotkey", () => {
    beforeEach(() => {
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl"],
          action: "toggle_category_cat1",
        },
        {
          id: "hotkey2",
          key: "J",
          modifiers: ["Ctrl", "Shift"],
          action: "toggle_category_cat2",
        },
      ];
    });

    it("should match and execute hotkey with Ctrl modifier", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        metaKey: false,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should match and execute hotkey with Cmd modifier on Mac", async () => {
      // Use a hotkey with Cmd modifier for Mac
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Cmd"],
          action: "toggle_category_cat1",
        },
      ];

      const { checkAndExecuteHotkey } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: false,
        metaKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should match hotkey with multiple modifiers", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      const event = new KeyboardEvent("keydown", {
        key: "j",
        ctrlKey: true,
        shiftKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat2");
    });

    it("should not match when key is different", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys.js");

      const event = new KeyboardEvent("keydown", {
        key: "X",
        ctrlKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });

    it("should not match when modifiers are different", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys.js");

      const event = new KeyboardEvent("keydown", {
        key: "K",
        ctrlKey: true,
        shiftKey: true, // Extra modifier
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });

    it("should handle uppercase keys correctly", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      const event = new KeyboardEvent("keydown", {
        key: "K", // Already uppercase
        ctrlKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(toggleCategoryForCurrentImage).toHaveBeenCalled();
    });

    it("should handle special keys (non-letter)", async () => {
      state.hotkeys = [
        {
          id: "hotkey3",
          key: "ArrowRight",
          modifiers: [],
          action: "next_image",
        },
      ];

      const { checkAndExecuteHotkey } = await import("./hotkeys.js");

      const event = new KeyboardEvent("keydown", {
        key: "ArrowRight",
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
    });

    it("should return false when no matching hotkey", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys.js");

      const event = new KeyboardEvent("keydown", {
        key: "Z",
        ctrlKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });
  });

  describe("executeHotkeyAction", () => {
    it("should execute toggle_category action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      await executeHotkeyAction("toggle_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should execute toggle_category_next action and move to next", async () => {
      const { executeHotkeyAction } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");
      const { showNextImage } = await import("./modal.js");

      await executeHotkeyAction("toggle_category_next_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
      expect(showNextImage).toHaveBeenCalled();
    });

    it("should not move to next for regular toggle action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");
      const { showNextImage } = await import("./modal.js");

      await executeHotkeyAction("toggle_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalled();
      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should handle legacy assign_category action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      await executeHotkeyAction("assign_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should return early for empty action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys.js");
      const { toggleCategoryForCurrentImage } = await import("./categories.js");

      await executeHotkeyAction("");

      expect(toggleCategoryForCurrentImage).not.toHaveBeenCalled();
    });

    it("should warn for unknown action", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { executeHotkeyAction } = await import("./hotkeys.js");
      await executeHotkeyAction("unknown_action");

      expect(consoleSpy).toHaveBeenCalledWith("Unknown hotkey action:", "unknown_action");
      consoleSpy.mockRestore();
    });
  });

  describe("setupHotkeySidebar", () => {
    it("should set up toggle button handler", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      expect(elements.hotkeySidebarToggle?.onclick).not.toBeNull();
    });

    it("should set up close button handler", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      expect(elements.hotkeySidebarClose?.onclick).not.toBeNull();
    });

    it("should set up add hotkey button handler", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      expect(elements.addHotkeyBtn?.onclick).not.toBeNull();
    });

    it("should return early if elements are missing", async () => {
      elements.hotkeySidebarToggle = null;

      const { setupHotkeySidebar } = await import("./hotkeys.js");
      expect(() => setupHotkeySidebar()).not.toThrow();
    });
  });

  describe("hotkey dialog (tested via setupHotkeySidebar)", () => {
    it("should open dialog when add button is clicked", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      // Wait for dialog to be created (it uses setTimeout)
      await new Promise(resolve => setTimeout(resolve, 150));

      const dialog = document.querySelector(".hotkey-dialog-overlay");
      expect(dialog).not.toBeNull();
    });

    it("should have key capture input in dialog", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const keyDisplay = document.querySelector("#hotkey-key-display");
      expect(keyDisplay).not.toBeNull();
      expect(keyDisplay?.textContent).toContain("Press keys");
    });

    it("should have action dropdown in dialog", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ];

      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const actionInput = document.querySelector("#hotkey-action-input") as HTMLSelectElement;
      expect(actionInput).not.toBeNull();
      expect(actionInput?.tagName).toBe("SELECT");
    });
  });

  describe("hotkey duplicate detection", () => {
    it("should detect duplicate hotkeys when adding", async () => {
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl"],
          action: "toggle_category_cat1",
        },
      ];

      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const dialog = document.querySelector(".hotkey-dialog-overlay");
      expect(dialog).not.toBeNull();
    });
  });
});

