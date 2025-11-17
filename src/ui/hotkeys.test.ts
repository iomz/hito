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
  updateShortcutsOverlay: vi.fn(),
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

  describe("deleteHotkey", () => {
    it("should render delete button for each hotkey", async () => {
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "h2", key: "B", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const deleteBtns = elements.hotkeyList?.querySelectorAll(".hotkey-delete-btn");
      expect(deleteBtns).toHaveLength(2);
      expect(deleteBtns?.[0]?.textContent).toBe("Delete");
      expect(deleteBtns?.[1]?.textContent).toBe("Delete");
    });

    it("should show custom confirmation dialog when delete button is clicked", async () => {
      state.hotkeys = [{ id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" }];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const deleteBtn = elements.hotkeyList?.querySelector(".hotkey-delete-btn") as HTMLButtonElement;

      // Click delete button
      deleteBtn.click();

      // Wait for dialog to appear
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Check that confirm dialog was created
      const confirmDialog = document.querySelector(".confirm-dialog-overlay");
      expect(confirmDialog).toBeTruthy();

      // Check dialog message
      const body = document.querySelector(".confirm-dialog-body");
      expect(body?.textContent).toContain("Are you sure you want to delete this hotkey");

      // Clean up - click cancel
      const cancelBtn = document.querySelector(".confirm-dialog-cancel") as HTMLButtonElement;
      cancelBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("should not delete hotkey when user cancels confirmation", async () => {
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "h2", key: "B", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const deleteBtn = elements.hotkeyList?.querySelector(".hotkey-delete-btn") as HTMLButtonElement;

      // Click delete button
      deleteBtn.click();

      // Wait for dialog
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Click cancel
      const cancelBtn = document.querySelector(".confirm-dialog-cancel") as HTMLButtonElement;
      cancelBtn.click();

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Hotkey should still exist
      expect(state.hotkeys).toHaveLength(2);
      expect(state.hotkeys[0].id).toBe("h1");
    });

    it("should delete hotkey when user confirms", async () => {
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "h2", key: "B", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      const deleteBtn = elements.hotkeyList?.querySelector(".hotkey-delete-btn") as HTMLButtonElement;

      // Click delete button
      deleteBtn.click();

      // Wait for dialog
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Click confirm
      const confirmBtn = document.querySelector(".confirm-dialog-confirm") as HTMLButtonElement;
      confirmBtn.click();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Hotkey should be removed
      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toBe("h2");
    });
  });

  describe("populateActionDropdown", () => {
    it("should populate dropdown with category toggle actions", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const actionInput = document.querySelector("#hotkey-action-input") as HTMLSelectElement;
      expect(actionInput).not.toBeNull();

      // Check for toggle category options
      const toggleOptions = Array.from(actionInput.options).filter(
        opt => opt.value.startsWith("toggle_category_") && !opt.value.includes("_next_")
      );
      expect(toggleOptions).toHaveLength(2);
      expect(toggleOptions[0].value).toBe("toggle_category_cat1");
      expect(toggleOptions[0].textContent).toContain("Toggle Category 1");
      expect(toggleOptions[1].value).toBe("toggle_category_cat2");
      expect(toggleOptions[1].textContent).toContain("Toggle Category 2");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should populate dropdown with toggle and move to next actions", async () => {
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

      // Check for toggle and next options
      const toggleNextOptions = Array.from(actionInput.options).filter(
        opt => opt.value.startsWith("toggle_category_next_")
      );
      expect(toggleNextOptions).toHaveLength(1);
      expect(toggleNextOptions[0].value).toBe("toggle_category_next_cat1");
      expect(toggleNextOptions[0].textContent).toContain("Toggle Category 1 and move to next");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should show message when no categories available", async () => {
      state.categories = [];

      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const actionInput = document.querySelector("#hotkey-action-input") as HTMLSelectElement;
      expect(actionInput).not.toBeNull();

      // Check for "no categories" message
      const noCategoriesOption = Array.from(actionInput.options).find(
        opt => opt.textContent?.includes("No categories available")
      );
      expect(noCategoriesOption).toBeTruthy();
      expect(noCategoriesOption?.disabled).toBe(true);

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should select existing action when editing hotkey", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ];
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      // Click edit button
      const editBtn = elements.hotkeyList?.querySelector(".hotkey-edit-btn") as HTMLButtonElement;
      editBtn.click();

      await new Promise(resolve => setTimeout(resolve, 150));

      const actionInput = document.querySelector("#hotkey-action-input") as HTMLSelectElement;
      expect(actionInput).not.toBeNull();
      expect(actionInput.value).toBe("toggle_category_cat1");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should show disabled option for missing action", async () => {
      state.categories = [
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.hotkeys = [
        { id: "h1", key: "A", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
      ];

      const { renderHotkeyList } = await import("./hotkeys.js");
      renderHotkeyList();

      // Click edit button
      const editBtn = elements.hotkeyList?.querySelector(".hotkey-edit-btn") as HTMLButtonElement;
      editBtn.click();

      await new Promise(resolve => setTimeout(resolve, 150));

      const actionInput = document.querySelector("#hotkey-action-input") as HTMLSelectElement;
      expect(actionInput).not.toBeNull();

      // Check for missing action option
      const missingOption = Array.from(actionInput.options).find(
        opt => opt.value === "toggle_category_cat1"
      );
      expect(missingOption).toBeTruthy();
      expect(missingOption?.disabled).toBe(true);
      expect(missingOption?.textContent).toContain("category not found");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });
  });

  describe("hotkey dialog interactions", () => {
    it("should capture key press in dialog", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const keyDisplay = document.querySelector("#hotkey-key-display") as HTMLElement;
      expect(keyDisplay).not.toBeNull();

      // Simulate key press
      const keyEvent = new KeyboardEvent("keydown", {
        key: "K",
        ctrlKey: true,
        bubbles: true,
      });

      keyDisplay.dispatchEvent(keyEvent);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Key should be captured
      expect(keyDisplay.textContent).toContain("K");
      expect(keyDisplay.textContent).toContain("Ctrl");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should not capture modifier keys alone", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const keyDisplay = document.querySelector("#hotkey-key-display") as HTMLElement;

      // Simulate pressing only Ctrl
      const keyEvent = new KeyboardEvent("keydown", {
        key: "Control",
        ctrlKey: true,
        bubbles: true,
      });

      keyDisplay.dispatchEvent(keyEvent);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still say "Press keys..."
      expect(keyDisplay.textContent).toContain("Press keys");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should show error when trying to save without capturing a key", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      // Try to save without capturing a key
      const saveBtn = document.querySelector(".hotkey-dialog-save") as HTMLButtonElement;
      saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Error message should appear
      const errorMsg = document.querySelector(".hotkey-error-message") as HTMLElement;
      expect(errorMsg).not.toBeNull();
      expect(errorMsg.style.display).not.toBe("none");
      expect(errorMsg.textContent).toContain("Please capture a key combination");

      // Clean up
      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn?.click();
    });

    it("should close dialog when close button is clicked", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const dialog = document.querySelector(".hotkey-dialog-overlay");
      expect(dialog).not.toBeNull();

      const closeBtn = document.querySelector(".hotkey-dialog-close") as HTMLButtonElement;
      closeBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Dialog should be removed
      expect(document.querySelector(".hotkey-dialog-overlay")).toBeNull();
    });

    it("should close dialog when cancel button is clicked", async () => {
      const { setupHotkeySidebar } = await import("./hotkeys.js");
      setupHotkeySidebar();

      if (elements.addHotkeyBtn) {
        elements.addHotkeyBtn.click();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const dialog = document.querySelector(".hotkey-dialog-overlay");
      expect(dialog).not.toBeNull();

      const cancelBtn = document.querySelector(".hotkey-dialog-cancel") as HTMLButtonElement;
      cancelBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Dialog should be removed
      expect(document.querySelector(".hotkey-dialog-overlay")).toBeNull();
    });
  });
});

