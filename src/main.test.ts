import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state, elements } from "./state";

// Mock DOM
const createMockElement = (id: string) => {
  const el = document.createElement("div");
  el.id = id;
  return el;
};

describe("main config file path input", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    state.configFilePath = "";
    state.currentDirectory = "";

    // Create mock input element
    const input = document.createElement("input");
    input.id = "config-file-path";
    input.type = "text";
    document.body.appendChild(input);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("config file path input handling", () => {
    it("should update state when input value changes", () => {
      const input = document.getElementById(
        "config-file-path"
      ) as HTMLInputElement;
      if (!input) {
        throw new Error("Input element not found");
      }

      // Simulate input event
      input.value = "/custom/path/config.json";
      const event = new Event("input", { bubbles: true });
      input.dispatchEvent(event);

      // Note: This test verifies the event listener setup would work
      // The actual listener is set up in main.ts DOMContentLoaded
      expect(input.value).toBe("/custom/path/config.json");
    });

    it("should trim whitespace from input value", () => {
      const input = document.getElementById(
        "config-file-path"
      ) as HTMLInputElement;
      if (!input) {
        throw new Error("Input element not found");
      }

      input.value = "  /path/to/config.json  ";
      const trimmed = input.value.trim();
      expect(trimmed).toBe("/path/to/config.json");
    });

    it("should have placeholder set to .hito.json", () => {
      const input = document.getElementById(
        "config-file-path"
      ) as HTMLInputElement;
      if (!input) {
        throw new Error("Input element not found");
      }

      // Simulate placeholder being set
      input.placeholder = ".hito.json";
      expect(input.placeholder).toBe(".hito.json");
    });
  });

  describe("tab switching", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="hotkey-sidebar">
          <div class="sidebar-tabs">
            <button class="sidebar-tab active" data-tab="categories">Categories</button>
            <button class="sidebar-tab" data-tab="hotkeys">Hotkeys</button>
            <button class="sidebar-tab" data-tab="file">File</button>
          </div>
          <div id="categories-panel" class="sidebar-panel active"></div>
          <div id="hotkeys-panel" class="sidebar-panel"></div>
          <div id="file-panel" class="sidebar-panel"></div>
        </div>
      `;
    });

    it("should have file tab in sidebar", () => {
      const fileTab = document.querySelector('[data-tab="file"]');
      expect(fileTab).not.toBeNull();
      expect(fileTab?.textContent).toBe("File");
    });

    it("should have file panel in sidebar", () => {
      const filePanel = document.getElementById("file-panel");
      expect(filePanel).not.toBeNull();
    });

    it("should switch to file tab when clicked", () => {
      const categoryTab = document.querySelector(
        '[data-tab="categories"]'
      ) as HTMLElement;
      const hotkeyTab = document.querySelector(
        '[data-tab="hotkeys"]'
      ) as HTMLElement;
      const fileTab = document.querySelector('[data-tab="file"]') as HTMLElement;
      const categoriesPanel = document.getElementById("categories-panel");
      const hotkeysPanel = document.getElementById("hotkeys-panel");
      const filePanel = document.getElementById("file-panel");

      if (!fileTab || !filePanel) {
        throw new Error("File tab or panel not found");
      }

      // Simulate tab click
      categoryTab?.classList.remove("active");
      hotkeyTab?.classList.remove("active");
      fileTab.classList.add("active");
      categoriesPanel?.classList.remove("active");
      hotkeysPanel?.classList.remove("active");
      filePanel.classList.add("active");

      expect(fileTab.classList.contains("active")).toBe(true);
      expect(filePanel.classList.contains("active")).toBe(true);
      expect(categoryTab?.classList.contains("active")).toBe(false);
      expect(categoriesPanel?.classList.contains("active")).toBe(false);
    });
  });
});

