import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state } from "../state";

// Mock window.__TAURI__
const mockInvoke = vi.fn();

// Mock dependencies

vi.mock("../utils/dialog", () => ({
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock("./modal", () => ({
  openModal: vi.fn(),
  closeModal: vi.fn(),
  showNextImage: vi.fn(),
  showPreviousImage: vi.fn(),
}));

vi.mock("../utils/filteredImages", () => ({
  getFilteredAndSortedImagesSync: vi.fn(),
  getFilteredImages: vi.fn(),
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
          [
            "/path/to/image1.jpg",
            [
              { category_id: "cat1", assigned_at: new Date().toISOString() },
              { category_id: "cat2", assigned_at: new Date().toISOString() }
            ]
          ],
        ],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      const assignments = state.imageCategories.get("/path/to/image1.jpg") || [];
      const categoryIds = assignments.map((a) => a.category_id);
      expect(categoryIds).toEqual(["cat1", "cat2"]);
    });

    it("should load hotkeys from config", async () => {
      state.currentDirectory = "/test/dir";
      
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
      state.imageCategories.set("/path/to/image.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      state.hotkeys = [];

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const assignments = state.imageCategories.get("/path/to/image.jpg") || [];
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        categories: state.categories,
        imageCategories: [["/path/to/image.jpg", assignments]],
        hotkeys: [],
        filename: undefined,
      });
      // Verify the assignment has the correct structure
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
      expect(assignments[0].assigned_at).toBeDefined();
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

      // Set up some data so saveHitoConfig doesn't return early
      state.categories = [];
      state.imageCategories.clear();
      state.hotkeys = [];

      const error = new Error("Failed to save");
      mockInvoke.mockRejectedValue(error);

      const { saveHitoConfig } = await import("./categories");
      
      // saveHitoConfig catches errors, logs them, and re-throws
      try {
        await saveHitoConfig();
      } catch (e) {
        // Expected - saveHitoConfig re-throws errors
      }

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalled();
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
    state.currentModalImagePath = "";
    state.allImagePaths = [];
    state.currentDirectory = "/test/dir";
    state.configFilePath = "";
    state.categoryDialogVisible = false;
    state.categoryDialogCategory = undefined;
    state.filterOptions = {
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    };
    state.sortOption = "name";
    state.sortDirection = "ascending";
    state.suppressCategoryRefilter = false;
    state.cachedImageCategoriesForRefilter = null;

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });


  describe("toggleImageCategory", () => {
    it("should add category when not present", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      state.currentModalImagePath = "/image1.jpg";
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      await toggleCategoryForCurrentImage("cat2");

      const assignments1 = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments1.some((a) => a.category_id === "cat2")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should remove category when present", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      state.currentModalImagePath = "/image1.jpg";
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      await toggleCategoryForCurrentImage("cat1");

      const assignments1 = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments1.some((a) => a.category_id === "cat1")).toBe(false);
      expect(assignments1.some((a) => a.category_id === "cat2")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("assignImageCategory", () => {
    it("should add category when not present", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      mockInvoke.mockResolvedValue(undefined);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      const assignments1 = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments1.some((a) => a.category_id === "cat2")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should not add category when already present", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      mockInvoke.mockClear();

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const categories = state.imageCategories.get("/image1.jpg");
      expect(categories).toHaveLength(1);
      expect(categories?.[0].category_id).toBe("cat1");
      // assignImageCategory only saves if category was added, not if already present
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("assignCategoryToCurrentImage", () => {
    it("should assign category to current image", async () => {
      state.currentModalImagePath = "/image1.jpg";
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);

      const { assignCategoryToCurrentImage } = await import("./categories");
      await assignCategoryToCurrentImage("cat1");

      const assignments = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments.some((a) => a.category_id === "cat1")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalImagePath is empty", async () => {
      state.currentModalImagePath = "";
      mockInvoke.mockClear();

      const { assignCategoryToCurrentImage } = await import("./categories");
      await assignCategoryToCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    describe("with category filter active", () => {
      it("should cache imageCategories snapshot and set suppressCategoryRefilter when assigning category in modal", async () => {
        // Setup: filter by "uncategorized", viewing an uncategorized image
        state.filterOptions.categoryId = "uncategorized";
        state.currentModalImagePath = "/uncategorized.jpg";
        state.allImagePaths = [
          { path: "/uncategorized.jpg" },
          { path: "/categorized.jpg" },
        ];
        state.imageCategories.set("/categorized.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        // /uncategorized.jpg has no categories

        const { assignCategoryToCurrentImage } = await import("./categories");
        const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
        
        // Mock getFilteredAndSortedImagesSync to track calls
        const mockFiltered = vi.fn().mockReturnValue([
          { path: "/uncategorized.jpg" },
        ]);
        vi.mocked(getFilteredAndSortedImagesSync).mockImplementation(mockFiltered);

        await assignCategoryToCurrentImage("cat1");

        // Should cache snapshot before change
        expect(state.cachedImageCategoriesForRefilter).not.toBeNull();
        expect(state.cachedImageCategoriesForRefilter?.has("/uncategorized.jpg")).toBe(false);
        expect(state.suppressCategoryRefilter).toBe(true);
        
        // Category should be assigned in state
        const assignments = state.imageCategories.get("/uncategorized.jpg") || [];
        expect(assignments.some((a) => a.category_id === "cat1")).toBe(true);
        
        // Should save config
        expect(mockInvoke).toHaveBeenCalled();
      });

      it("should NOT navigate away when assigning category that would remove image from filter", async () => {
        // Setup: filter by "uncategorized", viewing an uncategorized image
        state.filterOptions.categoryId = "uncategorized";
        state.currentModalImagePath = "/uncategorized.jpg";
        state.allImagePaths = [
          { path: "/uncategorized.jpg" },
          { path: "/categorized.jpg" },
        ];
        state.imageCategories.set("/categorized.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        // /uncategorized.jpg has no categories

        const { assignCategoryToCurrentImage } = await import("./categories");
        
        // Track state before assignment
        const modalPathBefore = state.currentModalImagePath;
        
        await assignCategoryToCurrentImage("cat1");

        // Should still be viewing the same image (no navigation occurred)
        expect(state.currentModalImagePath).toBe(modalPathBefore);
        expect(state.currentModalImagePath).toBe("/uncategorized.jpg");
        
        // Suppress flag should be set to defer refiltering
        expect(state.suppressCategoryRefilter).toBe(true);
        expect(state.cachedImageCategoriesForRefilter).not.toBeNull();
      });

      it("should use cached snapshot for filtering while suppressCategoryRefilter is true", async () => {
        // Setup: filter by "cat1", viewing an image with cat1
        state.filterOptions.categoryId = "cat1";
        state.currentModalImagePath = "/image1.jpg";
        state.allImagePaths = [
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ];
        state.imageCategories.set("/image1.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        state.imageCategories.set("/image2.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);

        const { assignCategoryToCurrentImage } = await import("./categories");
        const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
        
        // Mock getFilteredAndSortedImagesSync - it should use cached snapshot
        const mockFiltered = vi.fn().mockReturnValue([
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ]);
        vi.mocked(getFilteredAndSortedImagesSync).mockImplementation(mockFiltered);

        // Assign cat2 to image1 (but image1 should still appear in filtered list due to cached snapshot)
        await assignCategoryToCurrentImage("cat2");

        // Verify cached snapshot was created
        expect(state.cachedImageCategoriesForRefilter).not.toBeNull();
        const cachedSnapshot = state.cachedImageCategoriesForRefilter!;
        
        // Cached snapshot should NOT have cat2 for image1
        const cachedAssignments = cachedSnapshot.get("/image1.jpg") || [];
        expect(cachedAssignments.some((a) => a.category_id === "cat2")).toBe(false);
        
        // But current state should have cat2
        const currentAssignments = state.imageCategories.get("/image1.jpg") || [];
        expect(currentAssignments.some((a) => a.category_id === "cat2")).toBe(true);
      });

      it("should clear suppress flag and cached snapshot on navigation", async () => {
        // Setup: filter active, suppress flag set
        state.filterOptions.categoryId = "uncategorized";
        state.currentModalImagePath = "/image1.jpg";
        state.allImagePaths = [
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ];
        state.suppressCategoryRefilter = true;
        state.cachedImageCategoriesForRefilter = new Map([
          ["/image1.jpg", []],
        ]);

        // Import showNextImage directly (not through mock)
        // The mock is defined at the top but we can import the actual module
        vi.unmock("./modal");
        const { showNextImage } = await import("./modal");
        const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
        
        // Mock getFilteredAndSortedImagesSync to return filtered list
        vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ]);

        // Call the actual showNextImage function
        showNextImage();

        // Should clear suppress flag and cache
        expect(state.suppressCategoryRefilter).toBe(false);
        expect(state.cachedImageCategoriesForRefilter).toBeNull();
        
        // Re-mock for other tests
        vi.doMock("./modal", () => ({
          openModal: vi.fn(),
          closeModal: vi.fn(),
          showNextImage: vi.fn(),
          showPreviousImage: vi.fn(),
        }));
      });

      it("should NOT update grid filter immediately when assigning in modal", async () => {
        // This test verifies that ImageGrid's sortFilterKey is not updated
        // Setup: filter by "uncategorized", viewing an uncategorized image
        state.filterOptions.categoryId = "uncategorized";
        state.currentModalImagePath = "/uncategorized.jpg";
        state.allImagePaths = [
          { path: "/uncategorized.jpg" },
        ];
        // /uncategorized.jpg has no categories initially

        const { assignCategoryToCurrentImage } = await import("./categories");
        
        // Track if state.notify was called (which would trigger ImageGrid updates)
        const originalNotify = state.notify;
        let notifyCallCount = 0;
        state.notify = () => {
          notifyCallCount++;
          originalNotify.call(state);
        };

        await assignCategoryToCurrentImage("cat1");

        // State should be updated (category assigned)
        const assignments = state.imageCategories.get("/uncategorized.jpg") || [];
        expect(assignments.some((a) => a.category_id === "cat1")).toBe(true);
        
        // suppressCategoryRefilter should be set to prevent grid update
        expect(state.suppressCategoryRefilter).toBe(true);
        expect(state.cachedImageCategoriesForRefilter).not.toBeNull();
        
        // Restore original notify
        state.notify = originalNotify;
      });
    });
  });

  describe("toggleCategoryForCurrentImage", () => {
    it("should toggle category for current image", async () => {
      state.currentModalImagePath = "/image1.jpg";
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      await toggleCategoryForCurrentImage("cat1");

      const assignments = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments.some((a) => a.category_id === "cat1")).toBe(false);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalImagePath is empty", async () => {
      state.currentModalImagePath = "";
      mockInvoke.mockClear();

      const { toggleCategoryForCurrentImage } = await import("./categories");
      await toggleCategoryForCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("showCategoryDialog", () => {
    it("should set state to show dialog", async () => {
      const { showCategoryDialog } = await import("./categories");
      
      showCategoryDialog();
      
      // Function sets state.categoryDialogVisible = true
      expect(state.categoryDialogVisible).toBe(true);
      expect(state.categoryDialogCategory).toBeUndefined();
    });

    it("should set state for editing existing category", async () => {
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
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.imageCategories.set("/img1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      state.imageCategories.set("/img2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      state.imageCategories.set("/img3.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      mockInvoke.mockResolvedValue(undefined);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Check image categories
      const assignments1 = state.imageCategories.get("/img1.jpg") || [];
      const categoryIds1 = assignments1.map((a) => a.category_id);
      expect(categoryIds1).toEqual(["cat2"]);
      expect(state.imageCategories.has("/img2.jpg")).toBe(false);
      const assignments3 = state.imageCategories.get("/img3.jpg") || [];
      const categoryIds3 = assignments3.map((a) => a.category_id);
      expect(categoryIds3).toEqual(["cat2"]);
    });

    it("should clean up hotkeys that reference the deleted category", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.hotkeys = [
        { id: "hotkey1", key: "K", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "hotkey2", key: "L", modifiers: ["Ctrl"], action: "toggle_category_next_cat1" },
        { id: "hotkey3", key: "M", modifiers: ["Ctrl"], action: "assign_category_cat1" },
        { id: "hotkey4", key: "N", modifiers: ["Ctrl"], action: "assign_category_cat1_image" },
        { id: "hotkey5", key: "O", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
        { id: "hotkey6", key: "P", modifiers: ["Ctrl"], action: "" },
      ];
      mockInvoke.mockResolvedValue(undefined);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Hotkeys referencing cat1 should have their actions cleared
      expect(state.hotkeys[0].action).toBe("");
      expect(state.hotkeys[1].action).toBe("");
      expect(state.hotkeys[2].action).toBe("");
      expect(state.hotkeys[3].action).toBe("");
      // Hotkey referencing cat2 should remain unchanged
      expect(state.hotkeys[4].action).toBe("toggle_category_cat2");
      // Hotkey with no action should remain unchanged
      expect(state.hotkeys[5].action).toBe("");
    });

    it("should return early if user cancels deletion", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ];
      mockInvoke.mockClear();

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(false);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Category should not be removed
      expect(state.categories).toHaveLength(1);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("setupCategories", () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it("should set up onclick handler for add category button when element exists", async () => {
      const addCategoryBtn = document.createElement('button');
      addCategoryBtn.id = 'add-category-btn';
      document.body.appendChild(addCategoryBtn);

      const { setupCategories } = await import("./categories");
      await setupCategories();

      expect(addCategoryBtn.onclick).toBeDefined();
      
      // Trigger the click handler
      if (addCategoryBtn.onclick) {
        (addCategoryBtn.onclick as () => void)();
      }

      expect(state.categoryDialogVisible).toBe(true);
    });

    it("should handle missing add category button gracefully", async () => {
      // No element in DOM
      const { setupCategories } = await import("./categories");
      
      // Should not throw
      await expect(setupCategories()).resolves.not.toThrow();
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
