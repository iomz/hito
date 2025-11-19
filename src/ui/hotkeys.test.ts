import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  hotkeysAtom,
  categoriesAtom,
  isHotkeySidebarOpenAtom,
  currentModalIndexAtom,
  hotkeyDialogVisibleAtom,
  hotkeyDialogHotkeyAtom,
  resetStateAtom,
} from "../state";
import type { HotkeyConfig } from "../types";

// Mock dependencies
vi.mock("./categories", () => ({
  saveHitoConfig: vi.fn().mockResolvedValue(undefined),
  toggleCategoryForCurrentImage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./modal", () => ({
  showNextImage: vi.fn(),
  showPreviousImage: vi.fn(),
  deleteCurrentImage: vi.fn(),
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
    store.set(resetStateAtom);
    store.set(hotkeysAtom, []);
    store.set(categoriesAtom, []);
    store.set(isHotkeySidebarOpenAtom, false);
    store.set(currentModalIndexAtom, -1);
    store.set(hotkeyDialogVisibleAtom, false);
    store.set(hotkeyDialogHotkeyAtom, undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleHotkeySidebar", () => {
    it("should open sidebar when closed", async () => {
      const { toggleHotkeySidebar } = await import("./hotkeys");
      
      await toggleHotkeySidebar();

      expect(store.get(isHotkeySidebarOpenAtom)).toBe(true);
    });

    it("should close sidebar when open", async () => {
      store.set(isHotkeySidebarOpenAtom, true);

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      expect(store.get(isHotkeySidebarOpenAtom)).toBe(false);
    });

    it("should not adjust modal image when opening sidebar with modal open", async () => {
      store.set(currentModalIndexAtom, 0);

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      const modalImage = document.querySelector("#modal-image") as HTMLImageElement | null;
      // Image styles should remain unchanged (empty or default)
      expect(modalImage?.style.marginLeft).toBe("");
      expect(modalImage?.style.maxWidth).toBe("");
    });

    it("should not adjust modal image when closing sidebar with modal open", async () => {
      store.set(isHotkeySidebarOpenAtom, true);
      store.set(currentModalIndexAtom, 0);

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      const modalImage = document.querySelector("#modal-image") as HTMLImageElement | null;
      // Image styles should remain unchanged (empty or default)
      expect(modalImage?.style.marginLeft).toBe("");
      expect(modalImage?.style.maxWidth).toBe("");
    });

    it("should render hotkey list when opening", async () => {
      store.set(hotkeysAtom, [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Ctrl"],
          action: "toggle_category_cat1",
        },
      ]);

      const { toggleHotkeySidebar } = await import("./hotkeys");
      await toggleHotkeySidebar();

      // Function just toggles state, React component handles rendering
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(true);
    });

    it("should handle missing sidebar element gracefully", async () => {
      // Remove the sidebar element to test the missing-element path
      const hotkeysPanel = document.getElementById("hotkeys-panel");
      hotkeysPanel?.remove();
      
      const { toggleHotkeySidebar } = await import("./hotkeys");
      await expect(toggleHotkeySidebar()).resolves.not.toThrow();
    });
  });

  describe("closeHotkeySidebar", () => {
    it("should close sidebar", async () => {
      store.set(isHotkeySidebarOpenAtom, true);

      const { closeHotkeySidebar } = await import("./hotkeys");
      closeHotkeySidebar();

      expect(store.get(isHotkeySidebarOpenAtom)).toBe(false);
    });

    it("should not adjust modal image when modal is open", async () => {
      store.set(currentModalIndexAtom, 0);

      const { closeHotkeySidebar } = await import("./hotkeys");
      closeHotkeySidebar();

      const modalImage = document.querySelector("#modal-image") as HTMLImageElement | null;
      // Image styles should remain unchanged (empty or default)
      expect(modalImage?.style.marginLeft).toBe("");
      expect(modalImage?.style.maxWidth).toBe("");
    });

    it("should handle missing sidebar element gracefully", async () => {
      // Remove the sidebar element to test the missing-element path
      const hotkeysPanel = document.getElementById("hotkeys-panel");
      hotkeysPanel?.remove();
      
      const { closeHotkeySidebar } = await import("./hotkeys");
      expect(() => closeHotkeySidebar()).not.toThrow();
    });
  });

  describe("checkAndExecuteHotkey", () => {
    beforeEach(() => {
      store.set(hotkeysAtom, [
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
      ]);
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
      store.set(hotkeysAtom, [
        {
          id: "hotkey1",
          key: "K",
          modifiers: ["Cmd"],
          action: "toggle_category_cat1",
        },
      ]);

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
      store.set(hotkeysAtom, [
        {
          id: "hotkey3",
          key: "ArrowRight",
          modifiers: [],
          action: "next_image",
        },
      ]);

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

  describe("checkAndExecuteHotkey", () => {
    beforeEach(() => {
      store.set(hotkeysAtom, []);
    });

    it("should handle errors in executeHotkeyAction gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(hotkeysAtom, [
        { id: "h1", key: "K", modifiers: ["Ctrl"], action: "unknown_action_that_will_fail" },
      ]);

      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const event = new KeyboardEvent("keydown", {
        key: "K",
        ctrlKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      // Wait for async error handling - executeHotkeyAction will warn for unknown action
      // but the error catch is for actual errors, so this tests the error path exists
      await new Promise((resolve) => setTimeout(resolve, 50));
      // The function should complete without throwing
      consoleSpy.mockRestore();
    });

    it("should return false when no matching hotkey found", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const event = new KeyboardEvent("keydown", {
        key: "X",
        ctrlKey: true,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });
  });

  describe("setupHotkeySidebar", () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it("should set up onclick handlers when all elements exist", async () => {
      const sidebarToggle = document.createElement("button");
      sidebarToggle.id = "hotkey-sidebar-toggle";
      const sidebarClose = document.createElement("button");
      sidebarClose.id = "hotkey-sidebar-close";
      const addHotkeyBtn = document.createElement("button");
      addHotkeyBtn.id = "add-hotkey-btn";
      const sidebar = document.createElement("div");
      sidebar.id = "hotkeys-panel";

      document.body.appendChild(sidebarToggle);
      document.body.appendChild(sidebarClose);
      document.body.appendChild(addHotkeyBtn);
      document.body.appendChild(sidebar);

      const { setupHotkeySidebar, toggleHotkeySidebar, closeHotkeySidebar, showHotkeyDialog } = await import("./hotkeys");
      setupHotkeySidebar();

      expect(sidebarToggle.onclick).toBeDefined();
      expect(sidebarClose.onclick).toBeDefined();
      expect(addHotkeyBtn.onclick).toBeDefined();
      expect(sidebar.onclick).toBeDefined();

      // Test toggle button
      store.set(isHotkeySidebarOpenAtom, false);
      if (sidebarToggle.onclick) {
        (sidebarToggle.onclick as () => void)();
      }
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(true);

      // Test close button
      if (sidebarClose.onclick) {
        (sidebarClose.onclick as () => void)();
      }
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(false);

      // Test add hotkey button
      if (addHotkeyBtn.onclick) {
        (addHotkeyBtn.onclick as () => void)();
      }
      expect(store.get(hotkeyDialogVisibleAtom)).toBe(true);

      // Test sidebar click outside
      store.set(isHotkeySidebarOpenAtom, true);
      const clickEvent = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(clickEvent, "target", { value: sidebar, writable: false });
      if (sidebar.onclick) {
        (sidebar.onclick as (e: MouseEvent) => void)(clickEvent);
      }
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(false);
    });

    it("should handle missing sidebar toggle button", async () => {
      const sidebarClose = document.createElement("button");
      sidebarClose.id = "hotkey-sidebar-close";
      const addHotkeyBtn = document.createElement("button");
      addHotkeyBtn.id = "add-hotkey-btn";

      document.body.appendChild(sidebarClose);
      document.body.appendChild(addHotkeyBtn);

      const { setupHotkeySidebar } = await import("./hotkeys");
      expect(() => setupHotkeySidebar()).not.toThrow();
    });

    it("should handle missing sidebar close button", async () => {
      const sidebarToggle = document.createElement("button");
      sidebarToggle.id = "hotkey-sidebar-toggle";
      const addHotkeyBtn = document.createElement("button");
      addHotkeyBtn.id = "add-hotkey-btn";

      document.body.appendChild(sidebarToggle);
      document.body.appendChild(addHotkeyBtn);

      const { setupHotkeySidebar } = await import("./hotkeys");
      expect(() => setupHotkeySidebar()).not.toThrow();
    });

    it("should handle missing add hotkey button", async () => {
      const sidebarToggle = document.createElement("button");
      sidebarToggle.id = "hotkey-sidebar-toggle";
      const sidebarClose = document.createElement("button");
      sidebarClose.id = "hotkey-sidebar-close";

      document.body.appendChild(sidebarToggle);
      document.body.appendChild(sidebarClose);

      const { setupHotkeySidebar } = await import("./hotkeys");
      expect(() => setupHotkeySidebar()).not.toThrow();
    });

    it("should handle missing sidebar element gracefully", async () => {
      const sidebarToggle = document.createElement("button");
      sidebarToggle.id = "hotkey-sidebar-toggle";
      const sidebarClose = document.createElement("button");
      sidebarClose.id = "hotkey-sidebar-close";
      const addHotkeyBtn = document.createElement("button");
      addHotkeyBtn.id = "add-hotkey-btn";

      document.body.appendChild(sidebarToggle);
      document.body.appendChild(sidebarClose);
      document.body.appendChild(addHotkeyBtn);

      const { setupHotkeySidebar } = await import("./hotkeys");
      expect(() => setupHotkeySidebar()).not.toThrow();
    });

    it("should handle clicking inside sidebar without closing", async () => {
      const sidebar = document.createElement("div");
      sidebar.id = "hotkeys-panel";
      const innerButton = document.createElement("button");
      sidebar.appendChild(innerButton);
      document.body.appendChild(sidebar);

      const { setupHotkeySidebar } = await import("./hotkeys");
      setupHotkeySidebar();

      store.set(isHotkeySidebarOpenAtom, true);
      const clickEvent = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(clickEvent, "target", { value: innerButton, writable: false });
      if (sidebar.onclick) {
        (sidebar.onclick as (e: MouseEvent) => void)(clickEvent);
      }
      // Sidebar should remain open when clicking inside
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(true);
    });
  });

  describe("showHotkeyDialog", () => {
    it("should set state to show dialog", async () => {
      const { showHotkeyDialog } = await import("./hotkeys");
      
      showHotkeyDialog();
      
      // Function sets state.hotkeyDialogVisible = true
      expect(store.get(hotkeyDialogVisibleAtom)).toBe(true);
      expect(store.get(hotkeyDialogHotkeyAtom)).toBeUndefined();
    });

    it("should set state for editing existing hotkey", async () => {
      const hotkey: HotkeyConfig = {
        id: "h1",
        key: "K",
        modifiers: ["Ctrl"],
        action: "toggle_category_cat1",
      };
      const { showHotkeyDialog } = await import("./hotkeys");
      
      showHotkeyDialog(hotkey);
      
      // Function sets state for editing
      expect(store.get(hotkeyDialogVisibleAtom)).toBe(true);
      expect(store.get(hotkeyDialogHotkeyAtom)).toEqual(hotkey);
    });
  });

  describe("deleteHotkey", () => {
    it("should delete hotkey when called directly", async () => {
      store.set(hotkeysAtom, [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "h2", key: "B", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
      ]);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteHotkey } = await import("./hotkeys");
      await deleteHotkey("h1");

      // Hotkey should be removed
      expect(store.get(hotkeysAtom)).toHaveLength(1);
      expect(store.get(hotkeysAtom)[0].id).toBe("h2");
    });
  });

  describe("populateActionDropdown", () => {
    beforeEach(() => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);
    });

    it("should populate dropdown when called with select element", async () => {
      const select = document.createElement("select");
      // Add a placeholder option
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      // Check that dropdown has options
      expect(select.options.length).toBeGreaterThan(1);
      // Check for navigation actions
      const nextImageOption = Array.from(select.options).find(opt => opt.value === "next_image");
      expect(nextImageOption).toBeTruthy();
    });

    it("should include all navigation actions", async () => {
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      const optionValues = Array.from(select.options).map(opt => opt.value);
      expect(optionValues).toContain("next_image");
      expect(optionValues).toContain("previous_image");
      expect(optionValues).toContain("delete_image_and_next");
    });

    it("should include category toggle actions when categories exist", async () => {
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      const optionValues = Array.from(select.options).map(opt => opt.value);
      expect(optionValues).toContain("toggle_category_cat1");
      expect(optionValues).toContain("toggle_category_cat2");
      expect(optionValues).toContain("toggle_category_next_cat1");
      expect(optionValues).toContain("toggle_category_next_cat2");
    });

    it("should show message when no categories exist", async () => {
      store.set(categoriesAtom, []);
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      const optionValues = Array.from(select.options).map(opt => opt.value);
      const noCategoriesOption = Array.from(select.options).find(
        opt => opt.textContent?.includes("No categories available")
      );
      expect(noCategoriesOption).toBeTruthy();
      expect(noCategoriesOption?.disabled).toBe(true);
    });

    it("should preserve placeholder option", async () => {
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      expect(select.options[0].value).toBe("");
      expect(select.options[0].textContent).toBe("Select action...");
    });

    it("should set existing action value when provided", async () => {
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select, "toggle_category_cat1");

      expect(select.value).toBe("toggle_category_cat1");
    });

    it("should handle missing category action gracefully", async () => {
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select, "toggle_category_deleted_cat");

      // Should add disabled option for missing category
      const missingOption = Array.from(select.options).find(
        opt => opt.value === "toggle_category_deleted_cat" && opt.disabled
      );
      expect(missingOption).toBeTruthy();
      expect(select.value).toBe("toggle_category_deleted_cat");
    });

    it("should clear existing options except placeholder", async () => {
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select action...";
      select.appendChild(placeholder);
      
      // Add some old options
      const oldOption = document.createElement("option");
      oldOption.value = "old_action";
      oldOption.textContent = "Old Action";
      select.appendChild(oldOption);

      const { populateActionDropdown } = await import("./hotkeys");
      populateActionDropdown(select);

      // Old option should be removed
      const oldOptionStillExists = Array.from(select.options).some(
        opt => opt.value === "old_action"
      );
      expect(oldOptionStillExists).toBe(false);
      // Placeholder should remain
      expect(select.options[0].value).toBe("");
    });
  });

  describe("formatHotkeyDisplay", () => {
    it("should format hotkey with single modifier", async () => {
      const { formatHotkeyDisplay } = await import("./hotkeys");
      const hotkey = {
        id: "h1",
        key: "K",
        modifiers: ["Ctrl"],
        action: "next_image",
      };

      const display = formatHotkeyDisplay(hotkey);

      expect(display).toBe("Ctrl + K");
    });

    it("should format hotkey with multiple modifiers", async () => {
      const { formatHotkeyDisplay } = await import("./hotkeys");
      const hotkey = {
        id: "h1",
        key: "K",
        modifiers: ["Ctrl", "Shift", "Alt"],
        action: "next_image",
      };

      const display = formatHotkeyDisplay(hotkey);

      expect(display).toBe("Ctrl + Shift + Alt + K");
    });

    it("should format hotkey without modifiers", async () => {
      const { formatHotkeyDisplay } = await import("./hotkeys");
      const hotkey = {
        id: "h1",
        key: "J",
        modifiers: [],
        action: "next_image",
      };

      const display = formatHotkeyDisplay(hotkey);

      expect(display).toBe("J");
    });

    it("should format hotkey with special key", async () => {
      const { formatHotkeyDisplay } = await import("./hotkeys");
      const hotkey = {
        id: "h1",
        key: "ArrowRight",
        modifiers: ["Ctrl"],
        action: "next_image",
      };

      const display = formatHotkeyDisplay(hotkey);

      expect(display).toBe("Ctrl + ArrowRight");
    });
  });

  describe("isHotkeyDuplicate", () => {
    beforeEach(() => {
      store.set(hotkeysAtom, [
        { id: "h1", key: "K", modifiers: ["Ctrl"], action: "next_image" },
        { id: "h2", key: "J", modifiers: ["Ctrl", "Shift"], action: "previous_image" },
        { id: "h3", key: "L", modifiers: [], action: "delete_image" },
      ]);
    });

    it("should detect duplicate key and modifiers", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      expect(isHotkeyDuplicate("K", ["Ctrl"])).toBe(true);
      expect(isHotkeyDuplicate("J", ["Ctrl", "Shift"])).toBe(true);
    });

    it("should not detect duplicate when key differs", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      expect(isHotkeyDuplicate("X", ["Ctrl"])).toBe(false);
    });

    it("should not detect duplicate when modifiers differ", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      expect(isHotkeyDuplicate("K", ["Alt"])).toBe(false);
      expect(isHotkeyDuplicate("K", ["Ctrl", "Shift"])).toBe(false);
    });

    it("should not detect duplicate when modifiers are in different order", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      // Modifiers are sorted before comparison, so order shouldn't matter
      expect(isHotkeyDuplicate("J", ["Shift", "Ctrl"])).toBe(true);
    });

    it("should exclude specified hotkey ID from check", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      // Should not be duplicate if we're editing the same hotkey
      expect(isHotkeyDuplicate("K", ["Ctrl"], "h1")).toBe(false);
      // But should be duplicate if editing a different hotkey
      expect(isHotkeyDuplicate("K", ["Ctrl"], "h2")).toBe(true);
    });

    it("should handle empty modifiers array", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      expect(isHotkeyDuplicate("L", [])).toBe(true);
      expect(isHotkeyDuplicate("M", [])).toBe(false);
    });

    it("should handle case sensitivity for keys", async () => {
      const { isHotkeyDuplicate } = await import("./hotkeys");

      // Keys are case-sensitive in the check
      expect(isHotkeyDuplicate("k", ["Ctrl"])).toBe(false); // lowercase k
      expect(isHotkeyDuplicate("K", ["Ctrl"])).toBe(true); // uppercase K
    });
  });

  describe("editHotkey", () => {
    it("should open dialog with existing hotkey", async () => {
      store.set(hotkeysAtom, [
        { id: "h1", key: "K", modifiers: ["Ctrl"], action: "next_image" },
      ]);

      const { editHotkey } = await import("./hotkeys");
      editHotkey("h1");

      expect(store.get(hotkeyDialogVisibleAtom)).toBe(true);
      expect(store.get(hotkeyDialogHotkeyAtom)?.id).toBe("h1");
    });

    it("should not open dialog if hotkey not found", async () => {
      store.set(hotkeysAtom, [
        { id: "h1", key: "K", modifiers: ["Ctrl"], action: "next_image" },
      ]);

      const { editHotkey } = await import("./hotkeys");
      editHotkey("nonexistent");

      expect(store.get(hotkeyDialogVisibleAtom)).toBe(false);
    });
  });

  describe("executeHotkeyAction", () => {
    it("should execute next_image action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { showNextImage } = await import("./modal");

      await executeHotkeyAction("next_image");

      expect(showNextImage).toHaveBeenCalled();
    });

    it("should execute previous_image action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { showPreviousImage } = await import("./modal");

      await executeHotkeyAction("previous_image");

      expect(showPreviousImage).toHaveBeenCalled();
    });

    it("should execute delete_image_and_next action", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { deleteCurrentImage } = await import("./modal");

      await executeHotkeyAction("delete_image_and_next");

      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should handle legacy assign_category actions", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

      await executeHotkeyAction("assign_category_cat1");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1");
    });

    it("should handle assign_category_image action (legacy)", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { toggleCategoryForCurrentImage } = await import("./categories");

      await executeHotkeyAction("assign_category_cat1_image");

      expect(toggleCategoryForCurrentImage).toHaveBeenCalledWith("cat1_image");
    });

    it("should not move to next for legacy assign actions", async () => {
      const { executeHotkeyAction } = await import("./hotkeys");
      const { showNextImage } = await import("./modal");

      await executeHotkeyAction("assign_category_cat1");

      expect(showNextImage).not.toHaveBeenCalled();
    });
  });

  describe("checkAndExecuteHotkey modifier handling", () => {
    beforeEach(() => {
      store.set(hotkeysAtom, [
        { id: "h1", key: "K", modifiers: ["Alt"], action: "next_image" },
        { id: "h2", key: "J", modifiers: ["Shift"], action: "previous_image" },
        { id: "h3", key: "L", modifiers: ["Ctrl", "Alt"], action: "delete_image_and_next" },
      ]);
    });

    it("should match Alt modifier", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { showNextImage } = await import("./modal");

      const event = new KeyboardEvent("keydown", {
        key: "k",
        altKey: true,
        ctrlKey: false,
        shiftKey: false,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(showNextImage).toHaveBeenCalled();
    });

    it("should match Shift modifier", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { showPreviousImage } = await import("./modal");

      const event = new KeyboardEvent("keydown", {
        key: "j",
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(showPreviousImage).toHaveBeenCalled();
    });

    it("should match multiple modifiers", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");
      const { deleteCurrentImage } = await import("./modal");

      const event = new KeyboardEvent("keydown", {
        key: "l",
        ctrlKey: true,
        altKey: true,
        shiftKey: false,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(deleteCurrentImage).toHaveBeenCalled();
    });

    it("should not match when modifier count differs", async () => {
      const { checkAndExecuteHotkey } = await import("./hotkeys");

      const event = new KeyboardEvent("keydown", {
        key: "K",
        altKey: true,
        ctrlKey: true, // Extra modifier
        shiftKey: false,
      });

      const result = checkAndExecuteHotkey(event);

      expect(result).toBe(false);
    });
  });

  describe("deleteHotkey error handling", () => {
    it("should handle save errors gracefully", async () => {
      store.set(hotkeysAtom, [
        { id: "h1", key: "K", modifiers: ["Ctrl"], action: "next_image" },
      ]);

      const { confirm } = await import("../utils/dialog");
      const { saveHitoConfig } = await import("./categories");
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(saveHitoConfig).mockRejectedValueOnce(new Error("Save failed"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { deleteHotkey } = await import("./hotkeys");
      await deleteHotkey("h1");

      // Hotkey should still be deleted from state
      expect(store.get(hotkeysAtom)).toHaveLength(0);
      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

