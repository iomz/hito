import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state } from "../state";
import type { HotkeyConfig } from "../types";

// Mock dependencies
vi.mock("./categories", () => ({
  saveHitoConfig: vi.fn().mockResolvedValue(undefined),
  toggleCategoryForCurrentImage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./modal", () => ({
  showNextImage: vi.fn(),
}));

vi.mock("../utils/dialog", () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

describe("hotkeys", () => {
  beforeEach(() => {
    // Reset DOM - create minimal elements needed for querySelector
    document.body.innerHTML = `
      <div id="hotkeys-panel"></div>
      <img id="modal-image" />
    `;

    // Reset state
    state.hotkeys = [];
    state.categories = [];
    state.isHotkeySidebarOpen = false;
    state.currentModalIndex = -1;
    state.hotkeyDialogVisible = false;
    state.hotkeyDialogHotkey = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleHotkeySidebar", () => {
    it("should open sidebar when closed", async () => {
      // Note: toggleHotkeySidebar now just toggles state (React HotkeySidebar component handles rendering)
      const { toggleHotkeySidebar } = await import("./hotkeys");
      
      await toggleHotkeySidebar();

      expect(state.isHotkeySidebarOpen).toBe(true);
    });

    it("should close sidebar when open", async () => {
      // Note: toggleHotkeySidebar now just toggles state (React HotkeySidebar component handles rendering)
      state.isHotkeySidebarOpen = true;

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      expect(state.isHotkeySidebarOpen).toBe(false);
    });

    it("should not adjust modal image when opening sidebar with modal open", async () => {
      // Note: Image position remains centered - sidebar overlays on top
      state.currentModalIndex = 0;

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      const modalImage = document.querySelector("#modal-image") as HTMLImageElement | null;
      // Image styles should remain unchanged (empty or default)
      expect(modalImage?.style.marginLeft).toBe("");
      expect(modalImage?.style.maxWidth).toBe("");
    });

    it("should not adjust modal image when closing sidebar with modal open", async () => {
      // Note: Image position remains centered - sidebar overlays on top
      state.isHotkeySidebarOpen = true;
      state.currentModalIndex = 0;

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      const modalImage = document.querySelector("#modal-image") as HTMLImageElement | null;
      // Image styles should remain unchanged (empty or default)
      expect(modalImage?.style.marginLeft).toBe("");
      expect(modalImage?.style.maxWidth).toBe("");
    });

    it("should render hotkey list when opening", async () => {
      // Note: React HotkeySidebar component handles rendering
      state.hotkeys = [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl"],
          action: "toggle_category_cat1",
        },
      ];

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      // Function just toggles state, React component handles rendering
      expect(state.isHotkeySidebarOpen).toBe(true);
    });

    it("should handle missing sidebar element gracefully", async () => {
      // Note: toggleHotkeySidebar checks for sidebar element and returns early if missing
      const { toggleHotkeySidebar } = await import("./hotkeys");
      await expect(toggleHotkeySidebar()).resolves.not.toThrow();
    });
  });

  describe("closeHotkeySidebar", () => {
    it("should close sidebar", async () => {
      // Note: closeHotkeySidebar now just updates state (React HotkeySidebar component handles rendering)
      state.isHotkeySidebarOpen = true;

      const { closeHotkeySidebar } = await import("./hotkeys");
      closeHotkeySidebar();

      expect(state.isHotkeySidebarOpen).toBe(false);
    });

    it("should not adjust modal image when modal is open", async () => {
      // Note: Image position remains centered - sidebar overlays on top
      state.currentModalIndex = 0;

      const { closeHotkeySidebar } = await import("./hotkeys");
      closeHotkeySidebar();

      const modalImage = document.querySelector("#modal-image") as HTMLImageElement | null;
      // Image styles should remain unchanged (empty or default)
      expect(modalImage?.style.marginLeft).toBe("");
      expect(modalImage?.style.maxWidth).toBe("");
    });

    it("should handle missing sidebar element gracefully", async () => {
      // Note: closeHotkeySidebar checks for sidebar element and returns early if missing
      const { closeHotkeySidebar } = await import("./hotkeys");
      expect(() => closeHotkeySidebar()).not.toThrow();
    });
  });

  // Note: renderHotkeyList tests removed - function no longer exists
  // React HotkeyList component handles rendering

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
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

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

      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

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
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

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
      const { checkAndExecuteHotkey } = await import("./hotkeys");

      const event = new KeyboardEvent("keydown", {
        key: "X",
        ctrlKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });

    it("should not match when modifiers are different", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");

      const event = new KeyboardEvent("keydown", {
        key: "K",
        ctrlKey: true,
        shiftKey: true, // Extra modifier
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });

    it("should handle uppercase keys correctly", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

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

      const { checkAndExecuteHotkey } = await import("./hotkeys");

      const event = new KeyboardEvent("keydown", {
        key: "ArrowRight",
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
    });

    it("should return false when no matching hotkey", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");

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
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

      await executeHotkeyAction("toggle_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should execute toggle_category_next action and move to next", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");
      const { showNextImage } = await import("./modal");

      await executeHotkeyAction("toggle_category_next_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
      expect(showNextImage).toHaveBeenCalled();
    });

    it("should not move to next for regular toggle action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");
      const { showNextImage } = await import("./modal");

      await executeHotkeyAction("toggle_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalled();
      expect(showNextImage).not.toHaveBeenCalled();
    });

    it("should handle legacy assign_category action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

      await executeHotkeyAction("assign_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should return early for empty action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

      await executeHotkeyAction("");

      expect(toggleCategoryForCurrentImage).not.toHaveBeenCalled();
    });

    it("should warn for unknown action", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { executeHotkeyAction } = await import("./hotkeys");
      await executeHotkeyAction("unknown_action");

      expect(consoleSpy).toHaveBeenCalledWith("Unknown hotkey action:", "unknown_action");
      consoleSpy.mockRestore();
    });
  });

  describe("setupHotkeySidebar", () => {
    it("should handle missing elements gracefully", async () => {
      // Note: setupHotkeySidebar sets up button handlers, but React HotkeyDialog component handles dialog visibility
      const { setupHotkeySidebar } = await import("./hotkeys");
      expect(() => setupHotkeySidebar()).not.toThrow();
    });
  });

  describe("showHotkeyDialog", () => {
    it("should set state to show dialog", async () => {
      // Note: showHotkeyDialog is now React-managed (HotkeyDialog component handles rendering)
      const { showHotkeyDialog } = await import("./hotkeys");
      
      showHotkeyDialog();
      
      // Function sets state.hotkeyDialogVisible = true
      expect(state.hotkeyDialogVisible).toBe(true);
      expect(state.hotkeyDialogHotkey).toBeUndefined();
    });

    it("should set state for editing existing hotkey", async () => {
      // Note: showHotkeyDialog is now React-managed (HotkeyDialog component handles rendering)
      const hotkey: HotkeyConfig = {
        id: "h1",
        key: "K",
        modifiers: ["Ctrl"],
        action: "toggle_category_cat1",
      };
      const { showHotkeyDialog } = await import("./hotkeys");
      
      showHotkeyDialog(hotkey);
      
      // Function sets state for editing
      expect(state.hotkeyDialogVisible).toBe(true);
      expect(state.hotkeyDialogHotkey).toEqual(hotkey);
    });
  });

  describe("deleteHotkey", () => {
    it("should delete hotkey when called directly", async () => {
      // Note: deleteHotkey function tests (not UI rendering)
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "h2", key: "B", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
      ];

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteHotkey } = await import("./hotkeys");
      await deleteHotkey("h1");

      // Hotkey should be removed
      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toBe("h2");
    });
  });

  describe("populateActionDropdown", () => {
    it("should populate dropdown when called with select element", async () => {
      // Note: populateActionDropdown still exists and works, but React HotkeyDialog uses it
      const select = document.createElement("select");
      // Add a placeholder option
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);
      
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      // Check that dropdown has options
      expect(select.options.length).toBeGreaterThan(1);
      // Check for navigation actions
      const nextImageOption = Array.from(select.options).find(opt => opt.value === "next_image");
      expect(nextImageOption).toBeTruthy();
    });
  });
});

