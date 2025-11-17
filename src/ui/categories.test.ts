import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state } from "../state.js";

// Mock window.__TAURI__
const mockInvoke = vi.fn();

describe("categories config file location", () => {
  beforeEach(() => {
    // Setup window mock
    (globalThis as any).window = {
      __TAURI__: {
        core: {
          invoke: mockInvoke,
        },
      },
    };
    
    state.currentDirectory = "/test/directory";
    state.configFilePath = "";
    state.categories = [];
    state.imageCategories.clear();
    state.hotkeys = [];
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigFileDirectory (tested via loadHitoConfig)", () => {
    it("should use currentDirectory when configFilePath is empty", async () => {
      state.configFilePath = "";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });

    it("should extract directory from full path", async () => {
      state.configFilePath = "/custom/path/config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: "config.json",
      });
    });

    it("should handle Windows paths", async () => {
      state.configFilePath = "C:\\Users\\test\\config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "C:/Users/test",
        filename: "config.json",
      });
    });

    it("should use currentDirectory when path has no slash", async () => {
      state.configFilePath = "config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "config.json",
      });
    });

    it("should handle root path", async () => {
      state.configFilePath = "/config.json";
      state.currentDirectory = "/test/dir";

      // When directory is empty string, loadHitoConfig returns early
      // So we expect it not to be called
      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      // Empty directory causes early return, so invoke should not be called
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("getConfigFileName (tested via loadHitoConfig)", () => {
    it("should return undefined when configFilePath is empty", async () => {
      state.configFilePath = "";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });

    it("should extract filename from full path", async () => {
      state.configFilePath = "/custom/path/my-config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: "my-config.json",
      });
    });

    it("should return filename when path has no slash", async () => {
      state.configFilePath = "custom.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "custom.json",
      });
    });

    it("should handle empty filename after slash", async () => {
      state.configFilePath = "/custom/path/";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: undefined,
      });
    });
  });

  describe("loadHitoConfig", () => {
    it("should return early when currentDirectory is empty", async () => {
      state.currentDirectory = "";
      state.configFilePath = "";

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      state.currentDirectory = "/test/dir";
      delete (globalThis as any).window.__TAURI__;

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should load categories from config", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [
          { id: "cat1", name: "Category 1", color: "#ff0000" },
        ],
        image_categories: [],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.categories).toEqual(mockData.categories);
    });

    it("should load image categories from config", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [],
        image_categories: [
          ["/path/to/image1.jpg", ["cat1", "cat2"]],
        ],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.imageCategories.get("/path/to/image1.jpg")).toEqual([
        "cat1",
        "cat2",
      ]);
    });

    it("should load hotkeys from config", async () => {
      state.currentDirectory = "/test/dir";
      
      // Mock renderHotkeyList to avoid import errors
      vi.doMock("./hotkeys.js", () => ({
        renderHotkeyList: vi.fn(),
      }));

      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [
          {
            id: "hotkey1",
            key: "K",
            modifiers: ["Ctrl"],
            action: "toggle_category_cat1",
          },
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toBe("hotkey1");
      expect(state.hotkeys[0].key).toBe("K");
    });

    it("should handle errors gracefully", async () => {
      state.currentDirectory = "/test/dir";
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockInvoke.mockRejectedValue(new Error("Failed to load"));

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("saveHitoConfig", () => {
    it("should return early when currentDirectory is empty", async () => {
      state.currentDirectory = "";
      state.configFilePath = "";

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      state.currentDirectory = "/test/dir";
      delete (globalThis as any).window.__TAURI__;

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should save categories with default filename", async () => {
      state.currentDirectory = "/test/dir";
      state.configFilePath = "";
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ];
      state.imageCategories.set("/path/to/image.jpg", ["cat1"]);
      state.hotkeys = [];

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        categories: state.categories,
        imageCategories: [["/path/to/image.jpg", ["cat1"]]],
        hotkeys: [],
        filename: undefined,
      });
    });

    it("should save with custom filename", async () => {
      state.currentDirectory = "/test/dir";
      state.configFilePath = "/custom/path/my-config.json";
      state.categories = [];
      state.imageCategories.clear();
      state.hotkeys = [];

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/custom/path",
        categories: [],
        imageCategories: [],
        hotkeys: [],
        filename: "my-config.json",
      });
    });

    it("should handle errors gracefully", async () => {
      state.currentDirectory = "/test/dir";
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockInvoke.mockRejectedValue(new Error("Failed to save"));

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

