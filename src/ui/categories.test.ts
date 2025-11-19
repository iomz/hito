import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  currentDirectoryAtom,
  configFilePathAtom,
  categoriesAtom,
  imageCategoriesAtom,
  hotkeysAtom,
  currentModalImagePathAtom,
  allImagePathsAtom,
  categoryDialogVisibleAtom,
  categoryDialogCategoryAtom,
  filterOptionsAtom,
  sortOptionAtom,
  sortDirectionAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
  resetStateAtom,
} from "../state";

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
    
    store.set(resetStateAtom);
    store.set(currentDirectoryAtom, "/test/directory");
    store.set(configFilePathAtom, "");
    store.set(categoriesAtom, []);
    store.set(imageCategoriesAtom, new Map());
    store.set(hotkeysAtom, []);
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigFileDirectory (tested via loadHitoConfig)", () => {
    it("should use currentDirectory when configFilePath is empty", async () => {
      store.set(configFilePathAtom, "");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "/custom/path/config.json");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "C:\\Users\\test\\config.json");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "config.json");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "/config.json");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "/custom/path/my-config.json");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "custom.json");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(configFilePathAtom, "/custom/path/");
      store.set(currentDirectoryAtom, "/test/dir");

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
      store.set(currentDirectoryAtom, "");
      store.set(configFilePathAtom, "");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      delete (globalThis as any).window.__TAURI__;

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should load categories from config", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
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

      expect(store.get(categoriesAtom)).toEqual(mockData.categories);
    });

    it("should load image categories from config", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
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

      const assignments = store.get(imageCategoriesAtom).get("/path/to/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toEqual(["cat1", "cat2"]);
    });

    it("should load hotkeys from config", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      
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

      expect(store.get(hotkeysAtom)).toHaveLength(1);
      expect(store.get(hotkeysAtom)[0].id).toBe("hotkey1");
      expect(store.get(hotkeysAtom)[0].key).toBe("K");
    });

    it("should handle errors gracefully", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
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
      store.set(currentDirectoryAtom, "");
      store.set(configFilePathAtom, "");

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      delete (globalThis as any).window.__TAURI__;

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should save categories with default filename", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ]);
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/path/to/image.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      store.set(hotkeysAtom, []);

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const assignments = store.get(imageCategoriesAtom).get("/path/to/image.jpg") || [];
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        categories: store.get(categoriesAtom),
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
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "/custom/path/my-config.json");
      store.set(categoriesAtom, []);
      store.set(imageCategoriesAtom, new Map());
      store.set(hotkeysAtom, []);

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
      store.set(currentDirectoryAtom, "/test/dir");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Set up some data so saveHitoConfig doesn't return early
      store.set(categoriesAtom, []);
      store.set(imageCategoriesAtom, new Map());
      store.set(hotkeysAtom, []);

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
      store.set(categoriesAtom, []);
    store.set(resetStateAtom);
    store.set(imageCategoriesAtom, new Map());
    store.set(currentModalImagePathAtom, "");
    store.set(allImagePathsAtom, []);
    store.set(currentDirectoryAtom, "/test/dir");
    store.set(configFilePathAtom, "");
    store.set(categoryDialogVisibleAtom, false);
    store.set(categoryDialogCategoryAtom, undefined);
    store.set(filterOptionsAtom, {
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    });
    store.set(sortOptionAtom, "name");
    store.set(sortDirectionAtom, "ascending");
    store.set(suppressCategoryRefilterAtom, false);
    store.set(cachedImageCategoriesForRefilterAtom, null);

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });


  describe("toggleImageCategory", () => {
    it("should add category when not present", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      store.set(currentModalImagePathAtom, "/image1.jpg");
      store.set(allImagePathsAtom, [{ path: "/image1.jpg" }]);
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);

      await toggleCategoryForCurrentImage("cat2");

      const assignments1 = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments1.some((a) => a.category_id === "cat2")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should remove category when present", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      store.set(currentModalImagePathAtom, "/image1.jpg");
      store.set(allImagePathsAtom, [{ path: "/image1.jpg" }]);
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);

      await toggleCategoryForCurrentImage("cat1");

      const assignments1 = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments1.some((a) => a.category_id === "cat1")).toBe(false);
      expect(assignments1.some((a) => a.category_id === "cat2")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("assignImageCategory", () => {
    it("should add category when not present", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockResolvedValue(undefined);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      const assignments1 = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments1.some((a) => a.category_id === "cat2")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should not add category when already present", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockClear();

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const categories = store.get(imageCategoriesAtom).get("/image1.jpg");
      expect(categories).toHaveLength(1);
      expect(categories?.[0].category_id).toBe("cat1");
      // assignImageCategory only saves if category was added, not if already present
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("assignCategoryToCurrentImage", () => {
    it("should assign category to current image", async () => {
      store.set(currentModalImagePathAtom, "/image1.jpg");
      store.set(allImagePathsAtom, [{ path: "/image1.jpg" }]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);

      const { assignCategoryToCurrentImage } = await import("./categories");
      await assignCategoryToCurrentImage("cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments.some((a) => a.category_id === "cat1")).toBe(true);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalImagePath is empty", async () => {
      store.set(currentModalImagePathAtom, "");
      mockInvoke.mockClear();

      const { assignCategoryToCurrentImage } = await import("./categories");
      await assignCategoryToCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    describe("with category filter active", () => {
      it("should cache imageCategories snapshot and set suppressCategoryRefilter when assigning category in modal", async () => {
        // Setup: filter by "uncategorized", viewing an uncategorized image
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
        store.set(currentModalImagePathAtom, "/uncategorized.jpg");
        store.set(allImagePathsAtom, [
          { path: "/uncategorized.jpg" },
          { path: "/categorized.jpg" },
        ]);
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/categorized.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        store.set(imageCategoriesAtom, updatedImageCategories);
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
        expect(store.get(cachedImageCategoriesForRefilterAtom)).not.toBeNull();
        expect(store.get(cachedImageCategoriesForRefilterAtom)?.has("/uncategorized.jpg")).toBe(false);
        expect(store.get(suppressCategoryRefilterAtom)).toBe(true);
        
        // Category should be assigned in state
        const assignments = store.get(imageCategoriesAtom).get("/uncategorized.jpg") || [];
        expect(assignments.some((a: any) => a.category_id === "cat1")).toBe(true);
        
        // Should save config
        expect(mockInvoke).toHaveBeenCalled();
      });

      it("should NOT navigate away when assigning category that would remove image from filter", async () => {
        // Setup: filter by "uncategorized", viewing an uncategorized image
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
        store.set(currentModalImagePathAtom, "/uncategorized.jpg");
        store.set(allImagePathsAtom, [
          { path: "/uncategorized.jpg" },
          { path: "/categorized.jpg" },
        ]);
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/categorized.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        store.set(imageCategoriesAtom, updatedImageCategories);
        // /uncategorized.jpg has no categories

        const { assignCategoryToCurrentImage } = await import("./categories");
        
        // Track state before assignment
        const modalPathBefore = store.get(currentModalImagePathAtom);
        
        await assignCategoryToCurrentImage("cat1");

        // Should still be viewing the same image (no navigation occurred)
        expect(store.get(currentModalImagePathAtom)).toBe(modalPathBefore);
        expect(store.get(currentModalImagePathAtom)).toBe("/uncategorized.jpg");
        
        // Suppress flag should be set to defer refiltering
        expect(store.get(suppressCategoryRefilterAtom)).toBe(true);
        expect(store.get(cachedImageCategoriesForRefilterAtom)).not.toBeNull();
      });

      it("should use cached snapshot for filtering while suppressCategoryRefilter is true", async () => {
        // Setup: filter by "cat1", viewing an image with cat1
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
        store.set(currentModalImagePathAtom, "/image1.jpg");
        store.set(allImagePathsAtom, [
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ]);
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/image1.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        updatedImageCategories.set("/image2.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]);
        store.set(imageCategoriesAtom, updatedImageCategories);

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
        expect(store.get(cachedImageCategoriesForRefilterAtom)).not.toBeNull();
        const cachedSnapshot = store.get(cachedImageCategoriesForRefilterAtom)!;
        
        // Cached snapshot should NOT have cat2 for image1
        const cachedAssignments = cachedSnapshot.get("/image1.jpg") || [];
        expect(cachedAssignments.some((a: any) => a.category_id === "cat2")).toBe(false);
        
        // But current state should have cat2
        const currentAssignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
        expect(currentAssignments.some((a: any) => a.category_id === "cat2")).toBe(true);
      });

      it("should clear suppress flag and cached snapshot on navigation", async () => {
        // Setup: filter active, suppress flag set
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
        store.set(currentModalImagePathAtom, "/image1.jpg");
        store.set(allImagePathsAtom, [
          { path: "/image1.jpg" },
          { path: "/image2.jpg" },
        ]);
        store.set(suppressCategoryRefilterAtom, true);
        store.set(cachedImageCategoriesForRefilterAtom, new Map([
          ["/image1.jpg", []],
        ]));

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
          expect(store.get(suppressCategoryRefilterAtom)).toBe(false);
          expect(store.get(cachedImageCategoriesForRefilterAtom)).toBeNull();
        } finally {
          // Restore the mock to ensure test isolation
          originalMock.mockReset();
        }
      });

      it("should NOT update grid filter immediately when assigning in modal", async () => {
        // This test verifies that ImageGrid's sortFilterKey is not updated
        // Setup: filter by "uncategorized", viewing an uncategorized image
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
        store.set(currentModalImagePathAtom, "/uncategorized.jpg");
        store.set(allImagePathsAtom, [
          { path: "/uncategorized.jpg" },
        ]);
        // /uncategorized.jpg has no categories initially

        const { assignCategoryToCurrentImage } = await import("./categories");

        await assignCategoryToCurrentImage("cat1");

        // State should be updated (category assigned)
        const assignments = store.get(imageCategoriesAtom).get("/uncategorized.jpg") || [];
        expect(assignments.some((a) => a.category_id === "cat1")).toBe(true);
        
        // suppressCategoryRefilter should be set to prevent grid update
        expect(store.get(suppressCategoryRefilterAtom)).toBe(true);
        expect(store.get(cachedImageCategoriesForRefilterAtom)).not.toBeNull();
      });
    });
  });

  describe("toggleCategoryForCurrentImage", () => {
    it("should toggle category for current image", async () => {
      store.set(currentModalImagePathAtom, "/image1.jpg");
      store.set(allImagePathsAtom, [{ path: "/image1.jpg" }]);
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      await toggleCategoryForCurrentImage("cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments.some((a) => a.category_id === "cat1")).toBe(false);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalImagePath is empty", async () => {
      store.set(currentModalImagePathAtom, "");
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
      expect(store.get(categoryDialogVisibleAtom)).toBe(true);
      expect(store.get(categoryDialogCategoryAtom)).toBeUndefined();
    });

    it("should set state for editing existing category", async () => {
      const category = { id: "cat1", name: "Category 1", color: "#ff0000" };
      const { showCategoryDialog } = await import("./categories");
      
      showCategoryDialog(category);
      
      // Function sets state for editing
      expect(store.get(categoryDialogVisibleAtom)).toBe(true);
      expect(store.get(categoryDialogCategoryAtom)).toEqual(category);
    });
  });

  describe("deleteCategory", () => {
    it("should delete category when called directly", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);
      mockInvoke.mockResolvedValue(undefined);
      
      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Category should be removed
      expect(store.get(categoriesAtom)).toHaveLength(1);
      expect(store.get(categoriesAtom)[0].id).toBe("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should remove category from all images when deleted", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/img1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/img2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/img3.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockResolvedValue(undefined);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Check image categories
      const assignments1 = store.get(imageCategoriesAtom).get("/img1.jpg") || [];
      const categoryIds1 = assignments1.map((a: any) => a.category_id);
      expect(categoryIds1).toEqual(["cat2"]);
      expect(store.get(imageCategoriesAtom).has("/img2.jpg")).toBe(false);
      const assignments3 = store.get(imageCategoriesAtom).get("/img3.jpg") || [];
      const categoryIds3 = assignments3.map((a: any) => a.category_id);
      expect(categoryIds3).toEqual(["cat2"]);
    });

    it("should clean up hotkeys that reference the deleted category", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);
      store.set(hotkeysAtom, [
        { id: "hotkey1", key: "K", modifiers: ["Ctrl"], action: "toggle_category_cat1" },
        { id: "hotkey2", key: "L", modifiers: ["Ctrl"], action: "toggle_category_next_cat1" },
        { id: "hotkey3", key: "M", modifiers: ["Ctrl"], action: "assign_category_cat1" },
        { id: "hotkey4", key: "N", modifiers: ["Ctrl"], action: "assign_category_cat1_image" },
        { id: "hotkey5", key: "O", modifiers: ["Ctrl"], action: "toggle_category_cat2" },
        { id: "hotkey6", key: "P", modifiers: ["Ctrl"], action: "" },
      ]);
      mockInvoke.mockResolvedValue(undefined);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Hotkeys referencing cat1 should have their actions cleared
      expect(store.get(hotkeysAtom)[0].action).toBe("");
      expect(store.get(hotkeysAtom)[1].action).toBe("");
      expect(store.get(hotkeysAtom)[2].action).toBe("");
      expect(store.get(hotkeysAtom)[3].action).toBe("");
      // Hotkey referencing cat2 should remain unchanged
      expect(store.get(hotkeysAtom)[4].action).toBe("toggle_category_cat2");
      // Hotkey with no action should remain unchanged
      expect(store.get(hotkeysAtom)[5].action).toBe("");
    });

    it("should return early if user cancels deletion", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ]);
      mockInvoke.mockClear();

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(false);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Category should not be removed
      expect(store.get(categoriesAtom)).toHaveLength(1);
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

      expect(store.get(categoryDialogVisibleAtom)).toBe(true);
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
      store.set(currentDirectoryAtom, "/test/dir");
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

      expect(store.get(hotkeysAtom)).toHaveLength(1);
      expect(store.get(hotkeysAtom)[0].id).toContain("hotkey_");
      expect(store.get(hotkeysAtom)[0].key).toBe("");
      expect(store.get(hotkeysAtom)[0].modifiers).toEqual([]);
      expect(store.get(hotkeysAtom)[0].action).toBe("");
    });

    it("should handle hotkeys with non-array modifiers", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
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

      expect(store.get(hotkeysAtom)[0].modifiers).toEqual([]);
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
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
        { id: "cat3", name: "Unique Name", color: "#0000ff" },
      ]);
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
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
        { path: "/image3.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate when assigning category removes image from filter", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      // image1 has no categories, so it matches "uncategorized" filter
      // image2 has no categories, so it also matches "uncategorized" filter
      // image3 has categories, so it doesn't match
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image3.jpg", [
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
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      store.set(suppressCategoryRefilterAtom, true);
      
      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await assignImageCategory("/image1.jpg", "cat1");

      // Should not navigate when suppress flag is set
      expect(openModal).not.toHaveBeenCalled();
    });

    it("should not navigate when no category filter is active", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      
      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await assignImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });

    it("should not navigate when image still matches filter after assignment", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      // image1 already has cat1
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
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
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate when toggling removes image from filter", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      // image2 also needs cat1 so it remains in the filtered list after image1 is removed
      updatedImageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle removes cat1 from image1
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should navigate to next image (image2) since image1 no longer matches filter
      // navigateToNextFilteredImage uses getFilteredImages which filters by category
      expect(openModal).toHaveBeenCalled();
    });

    it("should not navigate when suppressCategoryRefilter is true", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      store.set(suppressCategoryRefilterAtom, true);
      
      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await toggleImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe("toggleCategoryForCurrentImage with category filter", () => {
    beforeEach(() => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should cache snapshot and set suppressCategoryRefilter when toggling", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      // image1 has no categories initially

      const { toggleCategoryForCurrentImage } = await import("./categories");

      await toggleCategoryForCurrentImage("cat1");

      expect(store.get(cachedImageCategoriesForRefilterAtom)).not.toBeNull();
      expect(store.get(cachedImageCategoriesForRefilterAtom)?.has("/image1.jpg")).toBe(false);
      expect(store.get(suppressCategoryRefilterAtom)).toBe(true);
    });

    it("should NOT navigate when toggling removes image from filter", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleCategoryForCurrentImage } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle removes cat1 from image1 (which would remove it from filter)
      await toggleCategoryForCurrentImage("cat1");

      // Should not navigate immediately due to suppress flag
      expect(openModal).not.toHaveBeenCalled();
      expect(store.get(currentModalImagePathAtom)).toBe("/image1.jpg");
    });
  });

  describe("saveHitoConfig error handling", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
      store.set(categoriesAtom, [{ id: "cat1", name: "Category 1", color: "#ff0000" }]);
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(hotkeysAtom, [{ id: "hotkey1", key: "K", modifiers: [], action: "next_image" }]);
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
        categories: store.get(categoriesAtom),
        imageCategories: Array.from(store.get(imageCategoriesAtom).entries()),
        hotkeys: store.get(hotkeysAtom),
      });
    });

    it("should handle empty categories and imageCategories", async () => {
      store.set(categoriesAtom, []);
      store.set(imageCategoriesAtom, new Map());
      store.set(hotkeysAtom, []);
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
      store.set(configFilePathAtom, "/custom/path/my-config.json");
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
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
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

      expect(store.get(categoriesAtom)).toEqual(mockData.categories);
      expect(store.get(imageCategoriesAtom).size).toBe(0);
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

      expect(store.get(categoriesAtom)).toEqual([]);
      expect(store.get(imageCategoriesAtom).has("/image1.jpg")).toBe(true);
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
      expect(store.get(hotkeysAtom).length).toBe(2);
      expect(store.get(hotkeysAtom)[0].key).toBe("J");
      expect(store.get(hotkeysAtom)[0].action).toBe("next_image");
      expect(store.get(hotkeysAtom)[1].key).toBe("K");
      expect(store.get(hotkeysAtom)[1].action).toBe("previous_image");
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
      expect(store.get(hotkeysAtom).length).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save default hotkeys"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should create default hotkeys in error handler when load fails and no hotkeys exist", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(hotkeysAtom, []);
      
      // Error message must include "not found" to trigger file-not-found handling
      mockInvoke.mockRejectedValueOnce(new Error("File not found"));
      mockInvoke.mockResolvedValueOnce(undefined); // Save call

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should create default hotkeys in error handler
      expect(store.get(hotkeysAtom).length).toBe(2);
      expect(store.get(hotkeysAtom)[0].key).toBe("J");
      expect(store.get(hotkeysAtom)[1].key).toBe("K");
      consoleSpy.mockRestore();
    });

    it("should not create default hotkeys in error handler when hotkeys already exist", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(hotkeysAtom, [
        { id: "existing", key: "X", modifiers: [], action: "custom_action" },
      ]);
      
      // Error message must include "not found" to trigger file-not-found handling
      mockInvoke.mockRejectedValueOnce(new Error("File not found"));

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should not override existing hotkeys
      expect(store.get(hotkeysAtom).length).toBe(1);
      expect(store.get(hotkeysAtom)[0].key).toBe("X");
      consoleSpy.mockRestore();
    });
  });

  describe("toggleImageCategory edge cases", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle images with multiple category assignments", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
        { category_id: "cat2", assigned_at: new Date().toISOString() },
        { category_id: "cat3", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      
      // Toggle cat2 should remove only cat2
      await toggleImageCategory("/image1.jpg", "cat2");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const categoryIds = assignments.map((a) => a.category_id);
      expect(categoryIds).toEqual(["cat1", "cat3"]);
    });

    it("should assign datetime when adding category", async () => {
      const beforeTime = new Date().toISOString();
      
      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      const afterTime = new Date().toISOString();
      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
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

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
    });

    it("should delete entry when removing last category", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      // Entry should be deleted when last category is removed, consistent with deleteCategory
      expect(store.get(imageCategoriesAtom).has("/image1.jpg")).toBe(false);
      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments).toHaveLength(0);
    });

    it("should not navigate when no filter is active and modal is not open", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "" });
      store.set(currentModalImagePathAtom, "");
      
      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await toggleImageCategory("/image1.jpg", "cat1");

      expect(openModal).not.toHaveBeenCalled();
    });

    it("should not navigate when filter is active but image path doesn't match current modal", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image2.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
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
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should assign datetime when adding category", async () => {
      const beforeTime = new Date().toISOString();
      
      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const afterTime = new Date().toISOString();
      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
      expect(assignments[0].assigned_at).toBeDefined();
      const assignedTime = assignments[0].assigned_at;
      expect(assignedTime >= beforeTime && assignedTime <= afterTime).toBe(true);
    });

    it("should handle multiple categories on same image", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments).toHaveLength(2);
      const categoryIds = assignments.map((a) => a.category_id);
      expect(categoryIds).toContain("cat1");
      expect(categoryIds).toContain("cat2");
    });

    it("should not save when category already exists", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      mockInvoke.mockClear();

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      // Should not save since category already exists
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should save after adding new category", async () => {
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      // Should save since new category was added
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("getConfigFileDirectory edge cases", () => {
    beforeEach(() => {
      // Setup window mock
      (globalThis as any).window = {
        __TAURI__: {
          core: {
            invoke: mockInvoke,
          },
        },
      };
      store.set(currentDirectoryAtom, "/test/dir");
      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });
      mockInvoke.mockClear();
    });

    it("should handle path with trailing slash", async () => {
      store.set(configFilePathAtom, "/custom/path/config.json/");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path/config.json",
        filename: undefined,
      });
    });

    it("should handle path with multiple slashes", async () => {
      store.set(configFilePathAtom, "/custom///path//config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // normalizePath only converts backslashes, doesn't collapse multiple slashes
      // lastIndexOf("/") finds the last slash before "config.json"
      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom///path/",
        filename: "config.json",
      });
    });

    it("should handle relative path starting with dot", async () => {
      store.set(configFilePathAtom, "./config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // When path has no slash (after normalizePath), it uses currentDirectory
      // But "./config.json" has a slash, so it extracts directory as "."
      // Actually, let's check: "./config.json" normalized is "./config.json"
      // lastIndexOf("/") finds index 1, so directory is "." and filename is "config.json"
      // But the function checks if lastSlash >= 0, and if the directory part is empty or just ".", 
      // it should use currentDirectory. Let me check the actual behavior.
      // Based on the test output, it's calling with directory: "." and filename: "config.json"
      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: ".",
        filename: "config.json",
      });
    });
  });

  describe("generateCategoryColor", () => {
    it("should return different colors on multiple calls (statistical test)", async () => {
      const { generateCategoryColor } = await import("./categories");
      const colors = new Set<string>();
      
      // Generate many colors to check randomness
      for (let i = 0; i < 100; i++) {
        colors.add(generateCategoryColor());
      }
      
      // Should have some variety (at least 3 different colors)
      expect(colors.size).toBeGreaterThanOrEqual(3);
    });

    it("should only return colors from predefined list", async () => {
      const { generateCategoryColor } = await import("./categories");
      const validColors = [
        "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444",
        "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
      ];
      
      for (let i = 0; i < 50; i++) {
        const color = generateCategoryColor();
        expect(validColors).toContain(color);
      }
    });
  });

  describe("isCategoryNameDuplicate edge cases", () => {
    beforeEach(() => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "  Category 2  ", color: "#00ff00" },
        { id: "cat3", name: "Category\n3", color: "#0000ff" },
      ]);
    });

    it("should handle names with leading/trailing whitespace", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      // "  Category 1  " trimmed and lowercased to "category 1" matches "Category 1" lowercased to "category 1"
      expect(isCategoryNameDuplicate("  Category 1  ")).toBe(true);
      // "Category 2" trimmed and lowercased to "category 2" does NOT match "  Category 2  " lowercased to "  category 2  "
      // because isCategoryNameDuplicate only trims the input, not the stored category names
      expect(isCategoryNameDuplicate("Category 2")).toBe(false);
      // "  Category 2  " trimmed to "Category 2" then lowercased to "category 2" 
      // does NOT match stored "  Category 2  " lowercased to "  category 2  " (not trimmed)
      expect(isCategoryNameDuplicate("  Category 2  ")).toBe(false);
    });

    it("should handle names with newlines and special characters", async () => {
      const { isCategoryNameDuplicate } = await import("./categories");
      
      expect(isCategoryNameDuplicate("Category\n3")).toBe(true);
      expect(isCategoryNameDuplicate("category\n3")).toBe(true);
    });

    it("should handle empty string", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "", color: "#ff0000" },
      ]);
      const { isCategoryNameDuplicate } = await import("./categories");
      
      expect(isCategoryNameDuplicate("")).toBe(true);
      expect(isCategoryNameDuplicate("   ")).toBe(true);
    });

    it("should handle very long category names", async () => {
      const longName = "A".repeat(1000);
      store.set(categoriesAtom, [
        { id: "cat1", name: longName, color: "#ff0000" },
      ]);
      const { isCategoryNameDuplicate } = await import("./categories");
      
      expect(isCategoryNameDuplicate(longName)).toBe(true);
      expect(isCategoryNameDuplicate(longName.toLowerCase())).toBe(true);
    });
  });

  describe("saveHitoConfig with large datasets", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle saving many categories", async () => {
      const manyCategories = Array.from({ length: 100 }, (_, i) => ({
        id: `cat${i}`,
        name: `Category ${i}`,
        color: "#ff0000",
      }));
      store.set(categoriesAtom, manyCategories);
      store.set(imageCategoriesAtom, new Map());
      store.set(hotkeysAtom, []);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", expect.objectContaining({
        categories: manyCategories,
      }));
    });

    it("should handle saving many image categories", async () => {
      const manyImageCategories = new Map<string, any[]>();
      for (let i = 0; i < 100; i++) {
        manyImageCategories.set(`/image${i}.jpg`, [
          { category_id: "cat1", assigned_at: new Date().toISOString() },
        ]);
      }
      store.set(categoriesAtom, []);
      store.set(imageCategoriesAtom, manyImageCategories);
      store.set(hotkeysAtom, []);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const callArgs = mockInvoke.mock.calls[0][1];
      expect(callArgs.imageCategories).toHaveLength(100);
    });
  });

  describe("loadHitoConfig with malformed data", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
    });

    it("should handle null categories", async () => {
      mockInvoke.mockResolvedValue({
        categories: null,
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(store.get(categoriesAtom)).toEqual([]);
    });

    it("should handle null image_categories", async () => {
      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: null,
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(store.get(imageCategoriesAtom).size).toBe(0);
    });

    it("should handle invalid image_categories structure", async () => {
      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [
          ["/image1.jpg", "invalid"], // Should be array of assignments
          ["/image2.jpg", [{ category_id: "cat1", assigned_at: "2023-01-01" }]],
        ],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should handle gracefully
      const imageCategories = store.get(imageCategoriesAtom);
      expect(imageCategories.has("/image2.jpg")).toBe(true);
    });
  });

  describe("navigateToNextFilteredImage integration", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
        { path: "/image3.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate to first image when current image not in filtered list", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      // Setup: image1 has cat1 (matches filter), image2 and image3 also have cat1
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image3.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Remove cat1 from image1, so it no longer matches filter
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should navigate to first image in filtered list (image2)
      expect(openModal).toHaveBeenCalled();
    });

    it("should close modal when no images in filtered list", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      // No images have cat1, so filtered list is empty

      const { toggleImageCategory } = await import("./categories");
      const { closeModal } = await import("./modal");

      await toggleImageCategory("/image1.jpg", "cat2");

      // Should close modal when no images match filter
      expect(closeModal).toHaveBeenCalled();
    });

    it("should navigate to previous image when at last position", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });
      store.set(currentModalImagePathAtom, "/image3.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image3.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle removes cat1 from image3, which is last in filtered list
      await toggleImageCategory("/image3.jpg", "cat1");

      // Should navigate to previous image (image2)
      expect(openModal).toHaveBeenCalled();
    });
  });

  describe("concurrent operations", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle multiple simultaneous category assignments", async () => {
      const { assignImageCategory } = await import("./categories");

      // Assign multiple categories simultaneously
      await Promise.all([
        assignImageCategory("/image1.jpg", "cat1"),
        assignImageCategory("/image1.jpg", "cat2"),
        assignImageCategory("/image1.jpg", "cat3"),
      ]);

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments).toHaveLength(3);
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toContain("cat1");
      expect(categoryIds).toContain("cat2");
      expect(categoryIds).toContain("cat3");
    });

    it("should handle rapid toggle operations", async () => {
      const { toggleImageCategory } = await import("./categories");

      // Rapidly toggle the same category
      await toggleImageCategory("/image1.jpg", "cat1");
      await toggleImageCategory("/image1.jpg", "cat1");
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should end up with category assigned (odd number of toggles)
      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
    });
  });

  describe("saveHitoConfig data integrity", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should preserve category assignment order", async () => {
      const imageCategories = new Map<string, any[]>();
      const assignments = [
        { category_id: "cat1", assigned_at: "2023-01-01T00:00:00Z" },
        { category_id: "cat2", assigned_at: "2023-01-02T00:00:00Z" },
        { category_id: "cat3", assigned_at: "2023-01-03T00:00:00Z" },
      ];
      imageCategories.set("/image1.jpg", assignments);
      store.set(imageCategoriesAtom, imageCategories);
      store.set(categoriesAtom, []);
      store.set(hotkeysAtom, []);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const callArgs = mockInvoke.mock.calls[0][1];
      const savedAssignments = callArgs.imageCategories[0][1];
      expect(savedAssignments).toEqual(assignments);
      expect(savedAssignments[0].category_id).toBe("cat1");
      expect(savedAssignments[1].category_id).toBe("cat2");
      expect(savedAssignments[2].category_id).toBe("cat3");
    });

    it("should preserve assigned_at timestamps", async () => {
      const beforeTime = new Date("2023-01-01T00:00:00Z").toISOString();
      const imageCategories = new Map<string, any[]>();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: beforeTime }
      ]);
      store.set(imageCategoriesAtom, imageCategories);
      store.set(categoriesAtom, []);
      store.set(hotkeysAtom, []);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const callArgs = mockInvoke.mock.calls[0][1];
      const savedAssignments = callArgs.imageCategories[0][1];
      expect(savedAssignments[0].assigned_at).toBe(beforeTime);
    });
  });

  describe("loadHitoConfig data validation", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(configFilePathAtom, "");
    });

    it("should handle categories with missing required fields", async () => {
      mockInvoke.mockResolvedValue({
        categories: [
          { id: "cat1" }, // Missing name and color
          { id: "cat2", name: "Category 2" }, // Missing color
          { id: "cat3", name: "Category 3", color: "#ff0000" }, // Complete
        ],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should load all categories, even with missing fields
      const categories = store.get(categoriesAtom);
      expect(categories).toHaveLength(3);
    });

    it("should handle image categories with invalid assignment structure", async () => {
      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [
          ["/image1.jpg", null], // Invalid: null instead of array
          ["/image2.jpg", []], // Valid: empty array
          ["/image3.jpg", [{ category_id: "cat1" }]], // Missing assigned_at
        ],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should handle gracefully
      const imageCategories = store.get(imageCategoriesAtom);
      expect(imageCategories.has("/image2.jpg")).toBe(true);
      expect(imageCategories.has("/image3.jpg")).toBe(true);
    });

    it("should handle duplicate category IDs", async () => {
      mockInvoke.mockResolvedValue({
        categories: [
          { id: "cat1", name: "Category 1", color: "#ff0000" },
          { id: "cat1", name: "Category 1 Duplicate", color: "#00ff00" }, // Duplicate ID
        ],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Should load both (no deduplication)
      const categories = store.get(categoriesAtom);
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe("Category 1");
      expect(categories[1].name).toBe("Category 1 Duplicate");
    });
  });

  describe("deleteCategory edge cases", () => {
    beforeEach(() => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle deleting category that doesn't exist", async () => {
      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("nonexistent");

      // Should not throw, categories should remain unchanged
      expect(store.get(categoriesAtom)).toHaveLength(2);
    });

    it("should handle deleting last category", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ]);
      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      expect(store.get(categoriesAtom)).toHaveLength(0);
    });

    it("should handle deleting category with many image assignments", async () => {
      const imageCategories = new Map<string, any[]>();
      for (let i = 0; i < 100; i++) {
        imageCategories.set(`/image${i}.jpg`, [
          { category_id: "cat1", assigned_at: new Date().toISOString() },
          { category_id: "cat2", assigned_at: new Date().toISOString() },
        ]);
      }
      store.set(imageCategoriesAtom, imageCategories);
      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // All images should have cat1 removed
      const updatedImageCategories = store.get(imageCategoriesAtom);
      updatedImageCategories.forEach((assignments) => {
        const hasCat1 = assignments.some((a: any) => a.category_id === "cat1");
        expect(hasCat1).toBe(false);
        // cat2 should remain
        const hasCat2 = assignments.some((a: any) => a.category_id === "cat2");
        expect(hasCat2).toBe(true);
      });
    });
  });

  describe("filter edge cases", () => {
    beforeEach(() => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
        { path: "/image3.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle filtering by category that doesn't exist", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "nonexistent" });
      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      await assignImageCategory("/image1.jpg", "cat1");

      // Should not navigate since filter doesn't match any images anyway
      expect(openModal).not.toHaveBeenCalled();
    });

    it("should handle uncategorized filter with all images categorized", async () => {
      const filterOptions = store.get(filterOptionsAtom);
      store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      // All images have categories
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image3.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      const { closeModal } = await import("./modal");

      // Removing category from image1 makes it uncategorized
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should navigate or close modal since image1 now matches filter
      // But with suppressCategoryRefilter, it won't navigate immediately
      expect(store.get(suppressCategoryRefilterAtom)).toBe(false); // Not set because not called from modal
    });
  });

  describe("setupCategories edge cases", () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it("should handle multiple setupCategories calls", async () => {
      const addCategoryBtn = document.createElement('button');
      addCategoryBtn.id = 'add-category-btn';
      document.body.appendChild(addCategoryBtn);

      const { setupCategories } = await import("./categories");
      await setupCategories();
      await setupCategories(); // Call again

      // Should not throw and should still work
      expect(addCategoryBtn.onclick).toBeDefined();
      if (addCategoryBtn.onclick) {
        (addCategoryBtn.onclick as () => void)();
      }
      expect(store.get(categoryDialogVisibleAtom)).toBe(true);
    });

    it("should handle button being removed after setup", async () => {
      const addCategoryBtn = document.createElement('button');
      addCategoryBtn.id = 'add-category-btn';
      document.body.appendChild(addCategoryBtn);

      const { setupCategories } = await import("./categories");
      await setupCategories();

      // Remove button
      addCategoryBtn.remove();

      // Should not throw on subsequent calls
      await expect(setupCategories()).resolves.not.toThrow();
    });
  });

  describe("category assignment timestamp consistency", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should use ISO 8601 format for timestamps", async () => {
      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const timestamp = assignments[0].assigned_at;
      
      // Should be valid ISO 8601 format
      expect(() => new Date(timestamp)).not.toThrow();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should have unique timestamps for rapid assignments", async () => {
      // Use fake timers to ensure deterministic timestamp generation
      vi.useFakeTimers();
      
      try {
        const { assignImageCategory } = await import("./categories");
        
        // First assignment
        await assignImageCategory("/image1.jpg", "cat1");
        
        // Advance timer by 1ms to ensure different timestamp
        vi.advanceTimersByTime(1);
        await assignImageCategory("/image1.jpg", "cat2");
        
        // Advance timer by another 1ms
        vi.advanceTimersByTime(1);
        await assignImageCategory("/image1.jpg", "cat3");

        const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
        expect(assignments).toHaveLength(3);
        
        const timestamps = assignments.map((a: any) => a.assigned_at);
        
        // Verify all timestamps are valid ISO strings
        timestamps.forEach(timestamp => {
          expect(() => new Date(timestamp)).not.toThrow();
          expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
        
        // Timestamps should be non-decreasing (each >= previous)
        // This is more realistic than requiring strict uniqueness
        for (let i = 1; i < timestamps.length; i++) {
          const prev = new Date(timestamps[i - 1]).getTime();
          const curr = new Date(timestamps[i]).getTime();
          expect(curr).toBeGreaterThanOrEqual(prev);
        }
        
        // With fake timers advancing by 1ms, timestamps should be unique
        const uniqueTimestamps = new Set(timestamps).size;
        expect(uniqueTimestamps).toBe(3);
      } finally {
        // Always restore real timers
        vi.useRealTimers();
      }
    });
  });

  describe("getConfigFileDirectory edge cases - no slash in path", () => {
    beforeEach(() => {
      (globalThis as any).window = {
        __TAURI__: {
          core: {
            invoke: mockInvoke,
          },
        },
      };
      store.set(currentDirectoryAtom, "/test/dir");
      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });
      mockInvoke.mockClear();
    });

    it("should return currentDirectory when configFilePath has no slash", async () => {
      // Path with no slash (e.g., just filename or Windows path without slashes)
      store.set(configFilePathAtom, "config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "config.json",
      });
    });
  });

  describe("getConfigFileName edge cases - no slash in path", () => {
    beforeEach(() => {
      (globalThis as any).window = {
        __TAURI__: {
          core: {
            invoke: mockInvoke,
          },
        },
      };
      store.set(currentDirectoryAtom, "/test/dir");
      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });
      mockInvoke.mockClear();
    });

    it("should return path when configFilePath has no slash", async () => {
      store.set(configFilePathAtom, "config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "config.json",
      });
    });

    it("should return undefined when configFilePath is empty string with no slash", async () => {
      store.set(configFilePathAtom, "");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });
  });

  describe("navigateToNextFilteredImage - all branches", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
        { path: "/image3.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      store.set(filterOptionsAtom, {
        categoryId: "cat1",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate to next image when not at last position (branch: currentIndex < length - 1)", async () => {
      store.set(currentModalImagePathAtom, "/image1.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      updatedImageCategories.set("/image3.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Remove cat1 from image1 (first in filtered list, not last)
      // This should trigger: currentIndex < filteredPaths.length - 1, so go to next
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should navigate to next image (image2)
      expect(openModal).toHaveBeenCalledWith("/image2.jpg");
    });

    it("should close modal when at first position and no other images (branch: currentIndex === 0, length === 1)", async () => {
      store.set(currentModalImagePathAtom, "/image1.jpg");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      const { toggleImageCategory } = await import("./categories");
      const { closeModal } = await import("./modal");

      // Remove cat1 from image1, which is the only image in filtered list
      // This should trigger: currentIndex === 0, filteredPaths.length === 1
      // So it goes to line 377: close modal
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should close modal when no other filtered images
      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe("getFilteredImages - default case in switch", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "invalid_operator" as any, // Invalid operator to trigger default case
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should handle invalid nameOperator by returning all images (default case)", async () => {
      // This tests the default case in the switch statement (line 330-331)
      const { toggleImageCategory } = await import("./categories");
      
      // This will trigger getFilteredImages internally via navigateToNextFilteredImage
      // The default case should return true for all images
      await toggleImageCategory("/image1.jpg", "cat1");
      
      // Should not throw and should complete successfully
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("navigateToNextFilteredImage - branch coverage via assignImageCategory", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
        { path: "/image3.jpg" },
      ]);
      store.set(imageCategoriesAtom, new Map());
      store.set(filterOptionsAtom, {
        categoryId: "cat1",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should navigate to next when assigning removes image from filter (branch: currentIndex < length - 1)", async () => {
      // Setup: Filter by "uncategorized", all images are uncategorized initially
      store.set(filterOptionsAtom, {
        categoryId: "uncategorized",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/image1.jpg");
      // All images are uncategorized (empty imageCategories)

      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Assign cat1 to image1, which removes it from "uncategorized" filter
      // image1 is first in filtered list, so should navigate to next (image2)
      await assignImageCategory("/image1.jpg", "cat1");

      // Should navigate to next image
      expect(openModal).toHaveBeenCalled();
    });

    it("should go to previous when at last position (branch: currentIndex > 0 at last)", async () => {
      // Setup: Filter by "uncategorized", all images are uncategorized initially
      store.set(filterOptionsAtom, {
        categoryId: "uncategorized",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/image3.jpg");
      // All images are uncategorized (empty imageCategories)

      const { assignImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Assign cat1 to image3, which removes it from "uncategorized" filter
      // image3 is last in filtered list, so should go to previous (image2)
      await assignImageCategory("/image3.jpg", "cat1");

      // Should navigate to previous image
      expect(openModal).toHaveBeenCalled();
    });
  });
});
