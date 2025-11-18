import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state } from "../state";

// Mock window.__TAURI__
const mockInvoke = vi.fn();

// Mock dependencies
vi.mock("./hotkeys", () => ({
  renderHotkeyList: vi.fn(),
}));

vi.mock("../utils/dialog", () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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
      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      state.currentDirectory = "/test/dir";
      delete (globalThis as any).window.__TAURI__;

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
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

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(state.imageCategories.get("/path/to/image1.jpg")).toEqual([
        "cat1",
        "cat2",
      ]);
    });

    it("should load hotkeys from config", async () => {
      state.currentDirectory = "/test/dir";
      
      // Mock renderHotkeyList to avoid import errors
      vi.doMock("./hotkeys", () => ({
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

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toBe("hotkey1");
      expect(state.hotkeys[0].key).toBe("K");
    });

    it("should handle errors gracefully", async () => {
      state.currentDirectory = "/test/dir";
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockInvoke.mockRejectedValue(new Error("Failed to load"));

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("saveHitoConfig", () => {
    it("should return early when currentDirectory is empty", async () => {
      state.currentDirectory = "";
      state.configFilePath = "";

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      state.currentDirectory = "/test/dir";
      delete (globalThis as any).window.__TAURI__;

      const { saveHitoConfig } = await import("./categories");
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

      const { saveHitoConfig } = await import("./categories");
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

      const { saveHitoConfig } = await import("./categories");
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

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe("categories UI and management", () => {
  beforeEach(() => {
    // Setup window mock
    (globalThis as any).window = {
      __TAURI__: {
        core: {
          invoke: mockInvoke,
        },
      },
      alert: vi.fn(),
      confirm: vi.fn(),
    };

    // Reset state
    state.categories = [];
    state.imageCategories.clear();
    state.currentModalIndex = -1;
    state.allImagePaths = [];
    state.currentDirectory = "/test/dir";
    state.configFilePath = "";
    state.categoryDialogVisible = false;
    state.categoryDialogCategory = undefined;

    // Note: DOM elements are now managed by React components
    // Tests that rely on DOM manipulation are removed or simplified

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("renderCategoryList", () => {
    it("should return early if categoryList element is missing", async () => {
      // Note: renderCategoryList is now a no-op (React CategoryList component handles rendering)
      const { renderCategoryList } = await import("./categories");
      
      // Should not throw
      expect(() => renderCategoryList()).not.toThrow();
    });
  });

  describe("renderModalCategories", () => {
    it("should return early if modalCategories element is missing", async () => {
      // Note: renderModalCategories is now a no-op (React ModalCategories component handles rendering)
      const { renderModalCategories } = await import("./categories");
      
      // Should not throw
      expect(() => renderModalCategories()).not.toThrow();
    });

    it("should return early if currentModalIndex is invalid", async () => {
      // Note: renderModalCategories is now a no-op (React ModalCategories component handles rendering)
      state.currentModalIndex = -1;
      state.allImagePaths = [];

      const { renderModalCategories } = await import("./categories");
      
      // Should not throw
      expect(() => renderModalCategories()).not.toThrow();
    });

    it("should return early if no categories assigned to current image", async () => {
      // Note: renderModalCategories is now a no-op (React ModalCategories component handles rendering)
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [{ id: "cat1", name: "Category 1", color: "#ff0000" }];
      state.imageCategories.clear();

      const { renderModalCategories } = await import("./categories");
      
      // Should not throw
      expect(() => renderModalCategories()).not.toThrow();
    });
  });

  describe("renderCurrentImageCategories", () => {
    it("should return early if currentImageCategories element is missing", async () => {
      // Note: renderCurrentImageCategories is now a no-op (React CurrentImageCategories component handles rendering)
      const { renderCurrentImageCategories } = await import("./categories");
      
      // Should not throw
      expect(() => renderCurrentImageCategories()).not.toThrow();
    });

    it("should return early if currentModalIndex is invalid", async () => {
      // Note: renderCurrentImageCategories is now a no-op (React CurrentImageCategories component handles rendering)
      state.currentModalIndex = -1;
      state.allImagePaths = [];

      const { renderCurrentImageCategories } = await import("./categories");
      
      // Should not throw
      expect(() => renderCurrentImageCategories()).not.toThrow();
    });
  });

  describe("toggleImageCategory", () => {
    it("should add category when not present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      await toggleCategoryForCurrentImage("cat2");

      expect(state.imageCategories.get("/image1.jpg")).toContain("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should remove category when present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1", "cat2"]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      await toggleCategoryForCurrentImage("cat1");

      expect(state.imageCategories.get("/image1.jpg")).not.toContain("cat1");
      expect(state.imageCategories.get("/image1.jpg")).toContain("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("assignImageCategory", () => {
    it("should add category when not present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockResolvedValue(undefined);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      expect(state.imageCategories.get("/image1.jpg")).toContain("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should not add category when already present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockClear();

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const categories = state.imageCategories.get("/image1.jpg");
      expect(categories).toEqual(["cat1"]);
      // assignImageCategory only saves if category was added, not if already present
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("assignCategoryToCurrentImage", () => {
    it("should assign category to current image", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);

      const { assignCategoryToCurrentImage } = await import("./categories");
      await assignCategoryToCurrentImage("cat1");

      expect(state.imageCategories.get("/image1.jpg")).toContain("cat1");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalIndex is invalid", async () => {
      state.currentModalIndex = -1;
      mockInvoke.mockClear();

      const { assignCategoryToCurrentImage } = await import("./categories");
      await assignCategoryToCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("toggleCategoryForCurrentImage", () => {
    it("should toggle category for current image", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      await toggleCategoryForCurrentImage("cat1");

      expect(state.imageCategories.get("/image1.jpg")).not.toContain("cat1");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalIndex is invalid", async () => {
      state.currentModalIndex = -1;
      mockInvoke.mockClear();

      const { toggleCategoryForCurrentImage } = await import("./categories");
      await toggleCategoryForCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("showCategoryDialog", () => {
    it("should set state to show dialog", async () => {
      // Note: showCategoryDialog is now React-managed (CategoryDialog component handles rendering)
      const { showCategoryDialog } = await import("./categories");
      
      showCategoryDialog();
      
      // Function sets state.categoryDialogVisible = true
      expect(state.categoryDialogVisible).toBe(true);
      expect(state.categoryDialogCategory).toBeUndefined();
    });

    it("should set state for editing existing category", async () => {
      // Note: showCategoryDialog is now React-managed (CategoryDialog component handles rendering)
      const category = { id: "cat1", name: "Category 1", color: "#ff0000" };
      const { showCategoryDialog } = await import("./categories");
      
      showCategoryDialog(category);
      
      // Function sets state for editing
      expect(state.categoryDialogVisible).toBe(true);
      expect(state.categoryDialogCategory).toEqual(category);
    });
  });

  describe("deleteCategory", () => {
    it("should delete category when called directly", async () => {
      // Note: deleteCategory function tests (not UI rendering)
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      mockInvoke.mockResolvedValue(undefined);
      
      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Category should be removed
      expect(state.categories).toHaveLength(1);
      expect(state.categories[0].id).toBe("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should remove category from all images when deleted", async () => {
      // Note: deleteCategory function tests (not UI rendering)
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.imageCategories.set("/img1.jpg", ["cat1", "cat2"]);
      state.imageCategories.set("/img2.jpg", ["cat1"]);
      state.imageCategories.set("/img3.jpg", ["cat2"]);
      mockInvoke.mockResolvedValue(undefined);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Check image categories
      expect(state.imageCategories.get("/img1.jpg")).toEqual(["cat2"]);
      expect(state.imageCategories.has("/img2.jpg")).toBe(false);
      expect(state.imageCategories.get("/img3.jpg")).toEqual(["cat2"]);
    });
  });

  describe("setupCategories", () => {
    it("should handle missing addCategoryBtn gracefully", async () => {
      // Note: setupCategories calls renderCategoryList (no-op) and sets up button handler
      // React CategoryDialog component handles dialog visibility
      const { setupCategories } = await import("./categories");
      await setupCategories();

      // Should not throw
      expect(() => setupCategories()).not.toThrow();
    });
  });

  describe("loadHitoConfig hotkey handling", () => {
    it("should handle hotkeys with missing fields", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [
          {
            id: undefined,
            key: undefined,
            modifiers: undefined,
            action: undefined,
          },
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toContain("hotkey_");
      expect(state.hotkeys[0].key).toBe("");
      expect(state.hotkeys[0].modifiers).toEqual([]);
      expect(state.hotkeys[0].action).toBe("");
    });

    it("should handle hotkeys with non-array modifiers", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [
          {
            id: "hotkey1",
            key: "K",
            modifiers: "Ctrl" as any,
            action: "toggle_category_cat1",
          },
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(state.hotkeys[0].modifiers).toEqual([]);
    });
  });
});

