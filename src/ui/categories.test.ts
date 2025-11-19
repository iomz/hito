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
      
      // Error is rethrown for non-file-not-found errors
      await expect(loadHitoConfig()).rejects.toThrow("Failed to load");
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

        const { getFilteredAndSortedImagesSync } = await import("../utils/filteredImages");
        
        // Mock getFilteredAndSortedImagesSync to return filtered list
        vi.mocked(getFilteredAndSortedImagesSync).mockReturnValue([
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ]);

        // Get the real implementation and set it as the mock implementation
        const { showNextImage: realShowNextImage } = await vi.importActual<typeof import("./modal")>("./modal");
        const { showNextImage } = await import("./modal");
        const originalMock = vi.mocked(showNextImage);
        originalMock.mockImplementation(realShowNextImage);

        try {
          // Call showNextImage (which will call through to the real implementation)
          showNextImage();

          // Should clear suppress flag and cache
          expect(state.suppressCategoryRefilter).toBe(false);
          expect(state.cachedImageCategoriesForRefilter).toBeNull();
        } finally {
          // Restore the mock to ensure test isolation
          originalMock.mockReset();
        }
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

  describe("generateCategoryColor", () => {
    it("should return a valid hex color", async () => {
      const { generateCategoryColor } = await import("./categories");
      const color = generateCategoryColor();
      
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should return a color from the predefined list", async () => {
      const { generateCategoryColor } = await import("./categories");
      const validColors = [
        "#22c55e",
        "#3b82f6",
        "#a855f7",
        "#f59e0b",
        "#ef4444",
        "#06b6d4",
        "#ec4899",
        "#84cc16",
        "#f97316",
        "#6366f1",
      ];
      
      // Test multiple times to ensure randomness but valid colors
      for (let i = 0; i < 50; i++) {
        const color = generateCategoryColor();
        expect(validColors).toContain(color);
      }
    });
  });

  describe("isCategoryNameDuplicate", () => {
    beforeEach(() => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
        { id: "cat3", name: "Unique Name", color: "#0000ff" },
      ];
    });

    it("should return true for duplicate name (case-insensitive)", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      expect(isCategoryNameDuplicate("category 1")).toBe(true);
      expect(isCategoryNameDuplicate("CATEGORY 1")).toBe(true);
      expect(isCategoryNameDuplicate("Category 1")).toBe(true);
    });

    it("should return false for unique name", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      expect(isCategoryNameDuplicate("New Category")).toBe(false);
      expect(isCategoryNameDuplicate("Another Category")).toBe(false);
    });

    it("should exclude the specified category ID when checking", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      // Should not be duplicate if we're editing the same category
      expect(isCategoryNameDuplicate("Category 1", "cat1")).toBe(false);
      expect(isCategoryNameDuplicate("category 1", "cat1")).toBe(false);
    });

    it("should still detect duplicates for other categories when excluding one", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      // Excluding cat1, but cat2 still has "Category 2" so it's a duplicate
      expect(isCategoryNameDuplicate("Category 2", "cat1")).toBe(true);
    });

    it("should handle whitespace in names", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      // Whitespace is trimmed, so "  Category 1  " matches "Category 1"
      expect(isCategoryNameDuplicate("  Category 1  ")).toBe(true);
      // "  Unique Name  " (trimmed to "Unique Name") matches existing "Unique Name"
      expect(isCategoryNameDuplicate("  Unique Name  ")).toBe(true);
      // Test with a truly unique name
      expect(isCategoryNameDuplicate("  Completely New Name  ")).toBe(false);
    });
  });

  describe("assignImageCategory with category filter", () => {
    beforeEach(() => {
      state.allImagePaths = [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
        { path: "/image3.jpg" },
      ];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate when assigning category removes image from filter", async () => {
      state.filterOptions.categoryId = "uncategorized";
      state.currentModalImagePath = "/image1.jpg";
      // image1 has no categories, so it matches "uncategorized" filter
      // image2 has no categories, so it also matches "uncategorized" filter
      // image3 has categories, so it doesn't match
      state.imageCategories.set("/image3.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);

      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await assignImageCategory("/image1.jpg", "cat1");

      // Should navigate to next image (image2) since image1 no longer matches filter
      // navigateToNextFilteredImage will use getFilteredImages which filters by category
      // After assigning cat1, image1 no longer matches "uncategorized", so it should navigate
      expect(openModal).toHaveBeenCalled();
    });

    it("should not navigate when suppressCategoryRefilter is true", async () => {
      state.filterOptions.categoryId = "uncategorized";
      state.currentModalImagePath = "/image1.jpg";
      state.suppressCategoryRefilter = true;
      
      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await assignImageCategory("/image1.jpg", "cat1");

      // Should not navigate when suppress flag is set
      expect(openModal).not.toHaveBeenCalled();
    });

    it("should not navigate when no category filter is active", async () => {
      state.filterOptions.categoryId = "";
      state.currentModalImagePath = "/image1.jpg";
      
      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await assignImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });

    it("should not navigate when image still matches filter after assignment", async () => {
      state.filterOptions.categoryId = "cat1";
      state.currentModalImagePath = "/image1.jpg";
      // image1 already has cat1
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      
      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Assigning cat1 again (no-op, but should not navigate)
      await assignImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe("toggleImageCategory with category filter", () => {
    beforeEach(() => {
      state.allImagePaths = [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate when toggling removes image from filter", async () => {
      state.filterOptions.categoryId = "cat1";
      state.currentModalImagePath = "/image1.jpg";
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      state.imageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle removes cat1 from image1
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should navigate to next image (image2) since image1 no longer matches filter
      // navigateToNextFilteredImage uses getFilteredImages which filters by category
      expect(openModal).toHaveBeenCalled();
    });

    it("should not navigate when suppressCategoryRefilter is true", async () => {
      state.filterOptions.categoryId = "cat1";
      state.currentModalImagePath = "/image1.jpg";
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      state.suppressCategoryRefilter = true;
      
      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await toggleImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe("toggleCategoryForCurrentImage with category filter", () => {
    beforeEach(() => {
      state.allImagePaths = [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should cache snapshot and set suppressCategoryRefilter when toggling", async () => {
      state.filterOptions.categoryId = "uncategorized";
      state.currentModalImagePath = "/image1.jpg";
      // image1 has no categories initially

      const { toggleCategoryForCurrentImage } = await import("./categories");

      await toggleCategoryForCurrentImage("cat1");

      expect(state.cachedImageCategoriesForRefilter).not.toBeNull();
      expect(state.cachedImageCategoriesForRefilter?.has("/image1.jpg")).toBe(false);
      expect(state.suppressCategoryRefilter).toBe(true);
    });

    it("should NOT navigate when toggling removes image from filter", async () => {
      state.filterOptions.categoryId = "cat1";
      state.currentModalImagePath = "/image1.jpg";
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle removes cat1 from image1 (which would remove it from filter)
      await toggleCategoryForCurrentImage("cat1");

      // Should not navigate immediately due to suppress flag
      expect(openModal).not.toHaveBeenCalled();
      expect(state.currentModalImagePath).toBe("/image1.jpg");
    });
  });

  describe("saveHitoConfig error handling", () => {
    beforeEach(() => {
      state.currentDirectory = "/test/dir";
      state.configFilePath = "";
      state.categories = [{ id: "cat1", name: "Category 1", color: "#ff0000" }];
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      state.hotkeys = [{ id: "hotkey1", key: "K", modifiers: [], action: "next_image" }];
    });

    it("should throw error when save fails", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      const { saveHitoConfig } = await import("./categories");

      await expect(saveHitoConfig()).rejects.toThrow("Save failed");
    });

    it("should pass correct data structure to Rust", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        filename: undefined,
        categories: state.categories,
        imageCategories: Array.from(state.imageCategories.entries()),
        hotkeys: state.hotkeys,
      });
    });

    it("should handle empty categories and imageCategories", async () => {
      state.categories = [];
      state.imageCategories.clear();
      state.hotkeys = [];
      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        filename: undefined,
        categories: [],
        imageCategories: [],
        hotkeys: [],
      });
    });

    it("should save with custom filename", async () => {
      state.configFilePath = "/custom/path/my-config.json";
      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", expect.objectContaining({
        directory: "/custom/path",
        filename: "my-config.json",
      }));
    });
  });

  describe("loadHitoConfig edge cases", () => {
    beforeEach(() => {
      state.currentDirectory = "/test/dir";
      state.configFilePath = "";
    });

    it("should handle config with only categories", async () => {
      const mockData = {
        categories: [
          { id: "cat1", name: "Category 1", color: "#ff0000" },
        ],
        image_categories: undefined,
        hotkeys: undefined,
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(state.categories).toEqual(mockData.categories);
      expect(state.imageCategories.size).toBe(0);
    });

    it("should handle config with only image categories", async () => {
      const mockData = {
        categories: undefined,
        image_categories: [
          ["/image1.jpg", [{ category_id: "cat1", assigned_at: new Date().toISOString() }]],
        ],
        hotkeys: undefined,
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(state.categories).toEqual([]);
      expect(state.imageCategories.has("/image1.jpg")).toBe(true);
    });

    it("should create default hotkeys when file doesn't exist and no hotkeys in config", async () => {
      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValue(mockData);
      mockInvoke.mockResolvedValueOnce(mockData); // First call for load
      mockInvoke.mockResolvedValueOnce(undefined); // Second call for save

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should create default hotkeys
      expect(state.hotkeys.length).toBe(2);
      expect(state.hotkeys[0].key).toBe("J");
      expect(state.hotkeys[0].action).toBe("next_image");
      expect(state.hotkeys[1].key).toBe("K");
      expect(state.hotkeys[1].action).toBe("previous_image");
    });

    it("should handle error when saving default hotkeys fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValueOnce(mockData); // Load call
      mockInvoke.mockRejectedValueOnce(new Error("Save failed")); // Save call

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should still have default hotkeys even if save fails
      expect(state.hotkeys.length).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save default hotkeys"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should create default hotkeys in error handler when load fails and no hotkeys exist", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      state.currentDirectory = "/test/dir";
      state.hotkeys = [];
      
      // Error message must include "not found" to trigger file-not-found handling
      mockInvoke.mockRejectedValueOnce(new Error("File not found"));
      mockInvoke.mockResolvedValueOnce(undefined); // Save call

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should create default hotkeys in error handler
      expect(state.hotkeys.length).toBe(2);
      expect(state.hotkeys[0].key).toBe("J");
      expect(state.hotkeys[1].key).toBe("K");
      consoleSpy.mockRestore();
    });

    it("should not create default hotkeys in error handler when hotkeys already exist", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      state.currentDirectory = "/test/dir";
      state.hotkeys = [
        { id: "existing", key: "X", modifiers: [], action: "custom_action" },
      ];
      
      // Error message must include "not found" to trigger file-not-found handling
      mockInvoke.mockRejectedValueOnce(new Error("File not found"));

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should not override existing hotkeys
      expect(state.hotkeys.length).toBe(1);
      expect(state.hotkeys[0].key).toBe("X");
      consoleSpy.mockRestore();
    });
  });

  describe("toggleImageCategory edge cases", () => {
    beforeEach(() => {
      state.currentDirectory = "/test/dir";
      state.allImagePaths = [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle images with multiple category assignments", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
        { category_id: "cat2", assigned_at: new Date().toISOString() },
        { category_id: "cat3", assigned_at: new Date().toISOString() },
      ]);

      const { toggleImageCategory } = await import("./categories");
      
      // Toggle cat2 should remove only cat2
      await toggleImageCategory("/image1.jpg", "cat2");

      const assignments = state.imageCategories.get("/image1.jpg") || [];
      const categoryIds = assignments.map((a) => a.category_id);
      expect(categoryIds).toEqual(["cat1", "cat3"]);
    });

    it("should assign datetime when adding category", async () => {
      const beforeTime = new Date().toISOString();
      
      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      const afterTime = new Date().toISOString();
      const assignments = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
      expect(assignments[0].assigned_at).toBeDefined();
      const assignedTime = assignments[0].assigned_at;
      expect(assignedTime >= beforeTime && assignedTime <= afterTime).toBe(true);
    });

    it("should handle empty assignments array", async () => {
      // Image with no categories
      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      const assignments = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
    });

    it("should not navigate when no filter is active and modal is not open", async () => {
      state.filterOptions.categoryId = "";
      state.currentModalImagePath = "";
      
      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await toggleImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });

    it("should not navigate when filter is active but image path doesn't match current modal", async () => {
      state.filterOptions.categoryId = "cat1";
      state.currentModalImagePath = "/image2.jpg";
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      
      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await toggleImageCategory("/image1.jpg", "cat1");

      // Should not navigate because current modal is on image2, not image1
      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe("assignImageCategory edge cases", () => {
    beforeEach(() => {
      state.allImagePaths = [
        { path: "/image1.jpg" },
      ];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should assign datetime when adding category", async () => {
      const beforeTime = new Date().toISOString();
      
      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const afterTime = new Date().toISOString();
      const assignments = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
      expect(assignments[0].assigned_at).toBeDefined();
      const assignedTime = assignments[0].assigned_at;
      expect(assignedTime >= beforeTime && assignedTime <= afterTime).toBe(true);
    });

    it("should handle multiple categories on same image", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      const assignments = state.imageCategories.get("/image1.jpg") || [];
      expect(assignments).toHaveLength(2);
      const categoryIds = assignments.map((a) => a.category_id);
      expect(categoryIds).toContain("cat1");
      expect(categoryIds).toContain("cat2");
    });

    it("should not save when category already exists", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);
      mockInvoke.mockClear();

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      // Should not save since category already exists
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should save after adding new category", async () => {
      state.imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      // Should save since new category was added
      expect(mockInvoke).toHaveBeenCalled();
    });
  });
});
