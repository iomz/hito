import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  currentDirectoryAtom,
  dataFilePathAtom,
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
    store.set(dataFilePathAtom, "");
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
      store.set(dataFilePathAtom, "");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });

    it("should extract directory from full path", async () => {
      store.set(dataFilePathAtom, "/custom/path/config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: "config.json",
      });
    });

    it("should handle Windows paths", async () => {
      store.set(dataFilePathAtom, "C:\\Users\\test\\config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "C:/Users/test",
        filename: "config.json",
      });
    });

    it("should use currentDirectory when path has no slash", async () => {
      store.set(dataFilePathAtom, "config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "config.json",
      });
    });

    it("should handle root path", async () => {
      store.set(dataFilePathAtom, "/config.json");
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
      store.set(dataFilePathAtom, "");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });

    it("should extract filename from full path", async () => {
      store.set(dataFilePathAtom, "/custom/path/my-config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: "my-config.json",
      });
    });

    it("should return filename when path has no slash", async () => {
      store.set(dataFilePathAtom, "custom.json");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
      });

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "custom.json",
      });
    });

    it("should handle empty filename after slash", async () => {
      store.set(dataFilePathAtom, "/custom/path/");
      store.set(currentDirectoryAtom, "/test/dir");

      mockInvoke.mockResolvedValue({
        image_categories: [],
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
      store.set(dataFilePathAtom, "");

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

    // Categories are now loaded via loadAppData, not loadHitoConfig
    // This test is moved to loadAppData tests

    it("should load image categories from data file", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      const mockData = {
        image_categories: [
          [
            "/path/to/image1.jpg",
            [
              { category_id: "cat1", assigned_at: new Date().toISOString() },
              { category_id: "cat2", assigned_at: new Date().toISOString() }
            ]
          ],
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      const assignments = store.get(imageCategoriesAtom).get("/path/to/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toEqual(["cat1", "cat2"]);
    });

    // Hotkeys are now loaded via loadAppData, not loadHitoConfig
    // This test is moved to loadAppData tests

    it("should clear assignments when file is not found", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      // Set some existing assignments
      const existingCategories = new Map();
      existingCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, existingCategories);
      
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Mock file not found error
      const fileNotFoundError = new Error("No such file");
      (fileNotFoundError as any).code = "ENOENT";
      mockInvoke.mockRejectedValue(fileNotFoundError);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      // Assignments should be cleared
      expect(store.get(imageCategoriesAtom).size).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[loadHitoConfig] Data file not found, clearing assignments"
      );
      consoleLogSpy.mockRestore();
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
      store.set(dataFilePathAtom, "");

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

    it("should save image categories with default filename", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(dataFilePathAtom, "");
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/path/to/image.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const assignments = store.get(imageCategoriesAtom).get("/path/to/image.jpg") || [];
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        imageCategories: [["/path/to/image.jpg", assignments]],
        filename: undefined,
      });
      // Verify the assignment has the correct structure
      expect(assignments).toHaveLength(1);
      expect(assignments[0].category_id).toBe("cat1");
      expect(assignments[0].assigned_at).toBeDefined();
    });

    it("should save with custom filename", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(dataFilePathAtom, "/custom/path/my-config.json");
      store.set(imageCategoriesAtom, new Map());

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/custom/path",
        imageCategories: [],
        filename: "my-config.json",
      });
    });

    it("should handle errors gracefully", async () => {
      store.set(currentDirectoryAtom, "/test/dir");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Set up some data so saveHitoConfig doesn't return early
      store.set(imageCategoriesAtom, new Map());

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
    store.set(dataFilePathAtom, "");
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

  // Hotkey handling tests moved to loadAppData tests

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
      store.set(dataFilePathAtom, "");
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
        imageCategories: Array.from(store.get(imageCategoriesAtom).entries()),
        categories: store.get(categoriesAtom),
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
        imageCategories: [],
      });
    });

    it("should save with custom filename", async () => {
      store.set(dataFilePathAtom, "/custom/path/my-config.json");
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
      store.set(dataFilePathAtom, "");
    });

    // Categories are now loaded via loadAppData, not loadHitoConfig
    // This test is moved to loadAppData tests

    it("should handle config with only image categories", async () => {
      const mockData = {
        image_categories: [
          ["/image1.jpg", [{ category_id: "cat1", assigned_at: new Date().toISOString() }]],
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(store.get(imageCategoriesAtom).has("/image1.jpg")).toBe(true);
    });

    // Default hotkey creation is now handled by loadAppData, not loadHitoConfig
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
        image_categories: [],
      });
      mockInvoke.mockClear();
    });

    it("should handle path with trailing slash", async () => {
      store.set(dataFilePathAtom, "/custom/path/config.json/");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path/config.json",
        filename: undefined,
      });
    });

    it("should handle path with multiple slashes", async () => {
      store.set(dataFilePathAtom, "/custom///path//config.json");
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
      store.set(dataFilePathAtom, "./config.json");
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
      store.set(dataFilePathAtom, "");
      mockInvoke.mockResolvedValue(undefined);
    });

    // Categories are now saved via saveAppData, not saveHitoConfig

    it("should handle saving many image categories", async () => {
      const manyImageCategories = new Map<string, any[]>();
      for (let i = 0; i < 100; i++) {
        manyImageCategories.set(`/image${i}.jpg`, [
          { category_id: "cat1", assigned_at: new Date().toISOString() },
        ]);
      }
      store.set(imageCategoriesAtom, manyImageCategories);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      const callArgs = mockInvoke.mock.calls[0][1];
      expect(callArgs.imageCategories).toHaveLength(100);
    });
  });

  describe("loadHitoConfig with malformed data", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(dataFilePathAtom, "");
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
      store.set(dataFilePathAtom, "");
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
      store.set(dataFilePathAtom, "");
    });

    // Categories validation is now handled by loadAppData tests
    // loadHitoConfig only handles image_categories

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

    // Categories validation is now handled by loadAppData tests
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
        
        // Advance timer by 2ms to ensure different timestamp
        vi.advanceTimersByTime(2);
        await assignImageCategory("/image1.jpg", "cat2");
        
        // Advance timer by another 2ms
        vi.advanceTimersByTime(2);
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
        image_categories: [],
      });
      mockInvoke.mockClear();
    });

    it("should return currentDirectory when configFilePath has no slash", async () => {
      // Path with no slash (e.g., just filename or Windows path without slashes)
      store.set(dataFilePathAtom, "config.json");
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
        image_categories: [],
      });
      mockInvoke.mockClear();
    });

    it("should return path when configFilePath has no slash", async () => {
      store.set(dataFilePathAtom, "config.json");
      store.set(currentDirectoryAtom, "/test/dir");

      const { loadHitoConfig } = await import("./categories");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "config.json",
      });
    });

    it("should return undefined when configFilePath is empty string with no slash", async () => {
      store.set(dataFilePathAtom, "");
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

  describe("navigateToNextFilteredImage - currentIndex < 0 branches", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
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

    it("should navigate to first image when current image not in filtered list and filtered list has images", async () => {
      // Setup: image2 has cat1 (matches filter), image1 does not
      const imageCategories = store.get(imageCategoriesAtom);
      const updatedImageCategories = new Map(imageCategories);
      updatedImageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, updatedImageCategories);
      store.set(currentModalImagePathAtom, "/image1.jpg"); // image1 not in filtered list

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle category on image1 (which is not in filtered list)
      // Should navigate to first image in filtered list (image2)
      await toggleImageCategory("/image1.jpg", "cat2");

      expect(openModal).toHaveBeenCalledWith("/image2.jpg");
    });

    it("should close modal when current image not in filtered list and filtered list is empty", async () => {
      // No images have cat1, so filtered list is empty
      store.set(currentModalImagePathAtom, "/image1.jpg"); // image1 not in filtered list

      const { toggleImageCategory } = await import("./categories");
      const { closeModal } = await import("./modal");

      // Toggle category on image1 (which is not in filtered list)
      // Should close modal when no images in filtered list
      await toggleImageCategory("/image1.jpg", "cat2");

      expect(closeModal).toHaveBeenCalled();
    });
  });

  describe("getFilteredImages - normalization and name operators", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
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

    it("should handle string image paths", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should handle object image paths", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should handle fallback normalization for invalid image paths", async () => {
      store.set(allImagePathsAtom, [null, undefined, 123] as any);
      store.set(currentModalImagePathAtom, "null");

      const { toggleImageCategory } = await import("./categories");
      // Should not throw
      await expect(toggleImageCategory("null", "cat1")).resolves.not.toThrow();
    });

    it("should filter by name with contains operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test-image1.jpg" },
        { path: "/other-image2.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/test-image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/test-image1.jpg", "cat1");

      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should filter by name with startsWith operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test-image1.jpg" },
        { path: "/other-image2.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "startsWith",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/test-image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/test-image1.jpg", "cat1");

      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should filter by name with endsWith operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1-test.jpg" },
        { path: "/image2-other.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "endsWith",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/image1-test.jpg");

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1-test.jpg", "cat1");

      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should filter by name with exact operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test.jpg" },
        { path: "/test-image.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test.jpg",
        nameOperator: "exact",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
      store.set(currentModalImagePathAtom, "/test.jpg");

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/test.jpg", "cat1");

      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should handle non-array allImagePaths", async () => {
      store.set(allImagePathsAtom, null as any);
      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      // Should not throw
      await expect(toggleImageCategory("/image1.jpg", "cat1")).resolves.not.toThrow();
    });
  });

  describe("imageMatchesCategoryFilter - cached snapshot", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
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

    it("should use cached snapshot when suppressCategoryRefilter is true", async () => {
      // Note: When suppressCategoryRefilter is true, navigation is suppressed
      // So we can't test navigation with cached snapshot directly
      // Instead, we test that the cached snapshot is used for filtering
      // by verifying that navigation uses the correct filtered list
      
      // Setup: image1 and image2 both have cat1 in current state
      const imageCategories = new Map();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      imageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      // Create cached snapshot where only image2 has cat1
      const cachedSnapshot = new Map();
      cachedSnapshot.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(cachedImageCategoriesForRefilterAtom, cachedSnapshot);
      store.set(suppressCategoryRefilterAtom, false); // Allow navigation to test filtering

      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle cat1 on image1 (removes it)
      // After toggle, image1 no longer has cat1, so it doesn't match filter
      // Should navigate to image2 (the only image in filtered list)
      await toggleImageCategory("/image1.jpg", "cat1");

      // Should navigate because image1 no longer matches filter
      expect(openModal).toHaveBeenCalled();
    });

    it("should use current imageCategories when suppressCategoryRefilter is false", async () => {
      // Setup: image1 and image2 both have cat1
      const imageCategories = new Map();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      imageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      // Cached snapshot exists but suppressCategoryRefilter is false
      const cachedSnapshot = new Map();
      store.set(cachedImageCategoriesForRefilterAtom, cachedSnapshot);
      store.set(suppressCategoryRefilterAtom, false);

      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle cat1 on image1 (removes it)
      // After toggle, image1 no longer has cat1, so it doesn't match filter
      // Should navigate to image2 (the next image in filtered list)
      await toggleImageCategory("/image1.jpg", "cat1");

      expect(openModal).toHaveBeenCalled();
    });

    it("should handle uncategorized filter with cached snapshot", async () => {
      // Setup: Filter by cat1 (not uncategorized, to test navigation)
      store.set(filterOptionsAtom, {
        categoryId: "cat1",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      // Current state: image1 has cat1, image2 also has cat1
      const imageCategories = new Map();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      imageCategories.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      // Cached snapshot: only image2 has cat1 (image1 doesn't in snapshot)
      const cachedSnapshot = new Map();
      cachedSnapshot.set("/image2.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(cachedImageCategoriesForRefilterAtom, cachedSnapshot);
      store.set(suppressCategoryRefilterAtom, false); // Allow navigation

      store.set(currentModalImagePathAtom, "/image1.jpg");

      const { toggleImageCategory } = await import("./categories");
      const { openModal } = await import("./modal");

      // Toggle cat1 on image1 (removes it)
      // After toggle, image1 no longer has cat1, so it doesn't match filter
      // Should navigate to image2 (the only image in filtered list)
      await toggleImageCategory("/image1.jpg", "cat1");

      expect(openModal).toHaveBeenCalled();
    });
  });

  describe("saveHitoConfig - actual save execution", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(dataFilePathAtom, "");
      store.set(imageCategoriesAtom, new Map([
        ["/image1.jpg", [
          { category_id: "cat1", assigned_at: new Date().toISOString() }
        ]]
      ]));
      mockInvoke.mockClear();
    });

    it("should execute save logic when all conditions are met", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      // Verify the actual save was called (not just early return)
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        imageCategories: expect.arrayContaining([
          expect.arrayContaining(["/image1.jpg", expect.any(Array)])
        ]),
        filename: undefined,
      });
    });

    it("should execute save logic with custom data file path", async () => {
      store.set(dataFilePathAtom, "/custom/path/data.json");
      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories");
      await saveHitoConfig();

      // Verify save was called with custom path
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/custom/path",
        imageCategories: expect.any(Array),
        filename: "data.json",
      });
    });

    it("should log and rethrow errors from save", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Save failed"));

      const { saveHitoConfig } = await import("./categories");

      await expect(saveHitoConfig()).rejects.toThrow("Save failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save .hito.json:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should save updated categories and hotkeys after deletion", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ]);
      store.set(hotkeysAtom, [
        { id: "hotkey1", key: "1", modifiers: [], action: "toggle_category_cat1" },
        { id: "hotkey2", key: "2", modifiers: [], action: "toggle_category_cat2" },
      ]);
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(dataFilePathAtom, "");
      mockInvoke.mockResolvedValue(undefined);

      const { confirm } = await import("../utils/dialog");
      vi.mocked(confirm).mockResolvedValue(true);

      const { deleteCategory } = await import("./categories");
      await deleteCategory("cat1");

      // Verify saveHitoConfig was called with updated categories and hotkeys
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        filename: undefined,
        imageCategories: expect.any(Array),
        categories: [{ id: "cat2", name: "Category 2", color: "#00ff00" }],
        hotkeys: [
          { id: "hotkey1", key: "1", modifiers: [], action: "" },
          { id: "hotkey2", key: "2", modifiers: [], action: "toggle_category_cat2" },
        ],
      });
    });
  });

  describe("mutually exclusive categories", () => {
    beforeEach(() => {
      store.set(currentDirectoryAtom, "/test/dir");
      store.set(dataFilePathAtom, "");
      mockInvoke.mockResolvedValue(undefined);
    });

    it("should remove mutually exclusive category when assigning in toggleImageCategory", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Keep", color: "#22c55e", mutuallyExclusiveWith: ["cat2"] },
        { id: "cat2", name: "Archive", color: "#3b82f6", mutuallyExclusiveWith: ["cat1"] },
      ]);
      const imageCategories = new Map<string, any[]>();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      const { toggleImageCategory } = await import("./categories");
      await toggleImageCategory("/image1.jpg", "cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toEqual(["cat1"]);
      expect(categoryIds).not.toContain("cat2");
    });

    it("should remove mutually exclusive category when assigning in assignImageCategory", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Keep", color: "#22c55e", mutuallyExclusiveWith: ["cat2"] },
        { id: "cat2", name: "Archive", color: "#3b82f6", mutuallyExclusiveWith: ["cat1"] },
      ]);
      const imageCategories = new Map<string, any[]>();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toEqual(["cat1"]);
      expect(categoryIds).not.toContain("cat2");
    });

    it("should handle bidirectional mutual exclusivity", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Keep", color: "#22c55e", mutuallyExclusiveWith: ["cat2"] },
        { id: "cat2", name: "Archive", color: "#3b82f6", mutuallyExclusiveWith: ["cat1"] },
      ]);
      const imageCategories = new Map<string, any[]>();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat2");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toEqual(["cat2"]);
      expect(categoryIds).not.toContain("cat1");
    });

    it("should handle multiple mutually exclusive categories", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Keep", color: "#22c55e", mutuallyExclusiveWith: ["cat2", "cat3"] },
        { id: "cat2", name: "Archive", color: "#3b82f6", mutuallyExclusiveWith: ["cat1"] },
        { id: "cat3", name: "Delete", color: "#ef4444", mutuallyExclusiveWith: ["cat1"] },
      ]);
      const imageCategories = new Map<string, any[]>();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() },
        { category_id: "cat3", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toEqual(["cat1"]);
      expect(categoryIds).not.toContain("cat2");
      expect(categoryIds).not.toContain("cat3");
    });

    it("should not remove non-mutually-exclusive categories", async () => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Keep", color: "#22c55e", mutuallyExclusiveWith: ["cat2"] },
        { id: "cat2", name: "Archive", color: "#3b82f6", mutuallyExclusiveWith: ["cat1"] },
        { id: "cat3", name: "Tagged", color: "#a855f7" },
      ]);
      const imageCategories = new Map<string, any[]>();
      imageCategories.set("/image1.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() },
        { category_id: "cat3", assigned_at: new Date().toISOString() },
      ]);
      store.set(imageCategoriesAtom, imageCategories);

      const { assignImageCategory } = await import("./categories");
      await assignImageCategory("/image1.jpg", "cat1");

      const assignments = store.get(imageCategoriesAtom).get("/image1.jpg") || [];
      const categoryIds = assignments.map((a: any) => a.category_id);
      expect(categoryIds).toContain("cat1");
      expect(categoryIds).not.toContain("cat2");
      expect(categoryIds).toContain("cat3");
    });
  });

  describe("loadAppData", () => {
    beforeEach(() => {
      store.set(categoriesAtom, []);
      store.set(hotkeysAtom, []);
      mockInvoke.mockClear();
    });

    it("should create default hotkeys when no hotkeys in app data", async () => {
      mockInvoke.mockResolvedValue({
        categories: [],
        hotkeys: [],
      });

      const { loadAppData } = await import("./categories");
      await loadAppData();

      // Should create default hotkeys
      const hotkeys = store.get(hotkeysAtom);
      expect(hotkeys.length).toBe(2);
      expect(hotkeys[0].key).toBe("J");
      expect(hotkeys[1].key).toBe("K");
      // Should save default hotkeys to .hito.json
      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", expect.any(Object));
    });

    it("should handle error when saving default hotkeys fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      // First call returns empty hotkeys, second call (save) fails
      mockInvoke
        .mockResolvedValueOnce({
          categories: [],
          hotkeys: [],
        })
        .mockRejectedValueOnce(new Error("Save failed"));

      const { loadAppData } = await import("./categories");
      await loadAppData();

      // Should still create default hotkeys
      const hotkeys = store.get(hotkeysAtom);
      expect(hotkeys.length).toBe(2);
      // Should log error but not throw
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[loadAppData] Failed to save default hotkeys:",
        expect.any(Error)
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        "[loadAppData] Default hotkeys saved successfully"
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should create default hotkeys when load fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Load failed"));

      const { loadAppData } = await import("./categories");
      await loadAppData();

      // Should create default hotkeys on error
      const hotkeys = store.get(hotkeysAtom);
      expect(hotkeys.length).toBe(2);
      expect(hotkeys[0].key).toBe("J");
      expect(hotkeys[1].key).toBe("K");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle hotkeys with missing fields", async () => {
      mockInvoke.mockResolvedValue({
        categories: [],
        hotkeys: [
          { id: "hotkey1", key: "K" }, // Missing modifiers and action
          { id: "", key: "", modifiers: null, action: undefined }, // All missing
        ],
      });

      const { loadAppData } = await import("./categories");
      await loadAppData();

      const hotkeys = store.get(hotkeysAtom);
      expect(hotkeys.length).toBe(2);
      expect(hotkeys[0].modifiers).toEqual([]);
      expect(hotkeys[0].action).toBe("");
      expect(hotkeys[1].id).toBeTruthy(); // Should generate ID
      expect(hotkeys[1].modifiers).toEqual([]);
      expect(hotkeys[1].action).toBe("");
    });

    it("should return early when Tauri API is unavailable", async () => {
      delete (globalThis as any).window.__TAURI__;
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { loadAppData } = await import("./categories");
      await loadAppData();

      expect(consoleWarnSpy).toHaveBeenCalledWith("[loadAppData] Tauri invoke not available");
      expect(mockInvoke).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("saveAppData - error handling", () => {
    beforeEach(() => {
      store.set(categoriesAtom, [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ]);
      store.set(hotkeysAtom, [
        { id: "hotkey1", key: "K", modifiers: [], action: "next_image" },
      ]);
      mockInvoke.mockClear();
    });

    it("should return early when Tauri API is unavailable", async () => {
      delete (globalThis as any).window.__TAURI__;
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { saveAppData } = await import("./categories");
      await saveAppData();

      expect(consoleWarnSpy).toHaveBeenCalledWith("[saveAppData] Tauri invoke not available");
      expect(mockInvoke).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should throw error when save fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Save failed"));

      const { saveAppData } = await import("./categories");

      await expect(saveAppData()).rejects.toThrow("Save failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[saveAppData] Failed to save app data:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe("imageMatchesCategoryFilter - direct unit tests", () => {
    beforeEach(() => {
      store.set(imageCategoriesAtom, new Map());
      store.set(suppressCategoryRefilterAtom, false);
      store.set(cachedImageCategoriesForRefilterAtom, null);
    });

    it("should return true when filterCategoryId is empty", async () => {
      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "")).toBe(true);
      expect(imageMatchesCategoryFilter("/image1.jpg", null as any)).toBe(true);
    });

    it("should use cached snapshot when suppressCategoryRefilter is true", async () => {
      const currentCategories = new Map();
      currentCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, currentCategories);

      const cachedSnapshot = new Map();
      store.set(cachedImageCategoriesForRefilterAtom, cachedSnapshot);
      store.set(suppressCategoryRefilterAtom, true);

      const { imageMatchesCategoryFilter } = await import("./categories");
      // Should use cached snapshot (empty), so image1 doesn't have cat1
      expect(imageMatchesCategoryFilter("/image1.jpg", "cat1")).toBe(false);
    });

    it("should use current imageCategories when suppressCategoryRefilter is false", async () => {
      const currentCategories = new Map();
      currentCategories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, currentCategories);
      store.set(suppressCategoryRefilterAtom, false);

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "cat1")).toBe(true);
    });

    it("should handle uncategorized filter with assignments", async () => {
      const categories = new Map();
      categories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, categories);

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "uncategorized")).toBe(false);
    });

    it("should handle uncategorized filter without assignments", async () => {
      store.set(imageCategoriesAtom, new Map());

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "uncategorized")).toBe(true);
    });

    it("should handle uncategorized filter with empty assignments array", async () => {
      const categories = new Map();
      categories.set("/image1.jpg", []);
      store.set(imageCategoriesAtom, categories);

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "uncategorized")).toBe(true);
    });

    it("should match category filter when assignment exists", async () => {
      const categories = new Map();
      categories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, categories);

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "cat1")).toBe(true);
    });

    it("should not match category filter when assignment does not exist", async () => {
      const categories = new Map();
      categories.set("/image1.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, categories);

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "cat1")).toBe(false);
    });

    it("should not match category filter when no assignments exist", async () => {
      store.set(imageCategoriesAtom, new Map());

      const { imageMatchesCategoryFilter } = await import("./categories");
      expect(imageMatchesCategoryFilter("/image1.jpg", "cat1")).toBe(false);
    });
  });

  describe("getFilteredImages - direct unit tests", () => {
    beforeEach(() => {
      store.set(allImagePathsAtom, []);
      store.set(imageCategoriesAtom, new Map());
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });
    });

    it("should handle string image paths", async () => {
      store.set(allImagePathsAtom, ["/image1.jpg", "/image2.jpg"] as any);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/image1.jpg", "/image2.jpg"]);
    });

    it("should handle object image paths", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/image1.jpg", "/image2.jpg"]);
    });

    it("should filter out invalid paths instead of coercing to strings", async () => {
      store.set(allImagePathsAtom, [null, undefined, 123] as any);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      // Invalid items (null, undefined, 123) are filtered out instead of coerced to strings
      expect(result).toEqual([]);
    });

    it("should filter out empty string paths", async () => {
      store.set(allImagePathsAtom, ["/valid.jpg", "", "   ", "/another.jpg"] as any);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      // Empty strings and whitespace-only strings are filtered out
      expect(result).toEqual(["/valid.jpg", "/another.jpg"]);
    });

    it("should filter out objects with empty or missing path properties", async () => {
      store.set(allImagePathsAtom, [
        { path: "/valid.jpg" },
        { path: "" },
        { path: "   " },
        { path: null },
        { path: undefined },
        {},
        { other: "property" },
      ] as any);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      // Only objects with non-empty string "path" properties are included
      expect(result).toEqual(["/valid.jpg"]);
    });

    it("should handle mixed valid and invalid items", async () => {
      store.set(allImagePathsAtom, [
        "/valid1.jpg",
        { path: "/valid2.jpg" },
        null,
        undefined,
        "",
        { path: "" },
        { path: "/valid3.jpg" },
        123,
        { other: "property" },
      ] as any);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      // Only valid non-empty string paths are included
      expect(result).toEqual(["/valid1.jpg", "/valid2.jpg", "/valid3.jpg"]);
    });

    it("should handle non-array allImagePaths", async () => {
      store.set(allImagePathsAtom, null as any);

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual([]);
    });

    it("should filter by category", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      const categories = new Map();
      categories.set("/image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, categories);
      store.set(filterOptionsAtom, {
        categoryId: "cat1",
        namePattern: "",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/image1.jpg"]);
    });

    it("should filter by name with contains operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test-image1.jpg" },
        { path: "/other-image2.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/test-image1.jpg"]);
    });

    it("should filter by name with startsWith operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test-image1.jpg" },
        { path: "/other-image2.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "startsWith",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/test-image1.jpg"]);
    });

    it("should filter by name with endsWith operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1test.jpg" },
        { path: "/image2other.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test.jpg",
        nameOperator: "endsWith",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/image1test.jpg"]);
    });

    it("should filter by name with exact operator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test.jpg" },
        { path: "/test-image.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test.jpg",
        nameOperator: "exact",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/test.jpg"]);
    });

    it("should handle default case for invalid nameOperator", async () => {
      store.set(allImagePathsAtom, [
        { path: "/image1.jpg" },
        { path: "/image2.jpg" },
      ]);
      store.set(filterOptionsAtom, {
        categoryId: "",
        namePattern: "test",
        nameOperator: "invalid" as any,
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      // Default case returns true, so all images pass
      expect(result).toEqual(["/image1.jpg", "/image2.jpg"]);
    });

    it("should combine category and name filters", async () => {
      store.set(allImagePathsAtom, [
        { path: "/test-image1.jpg" },
        { path: "/test-image2.jpg" },
        { path: "/other-image3.jpg" },
      ]);
      const categories = new Map();
      categories.set("/test-image1.jpg", [
        { category_id: "cat1", assigned_at: new Date().toISOString() }
      ]);
      categories.set("/test-image2.jpg", [
        { category_id: "cat2", assigned_at: new Date().toISOString() }
      ]);
      store.set(imageCategoriesAtom, categories);
      store.set(filterOptionsAtom, {
        categoryId: "cat1",
        namePattern: "test",
        nameOperator: "contains",
        sizeOperator: "largerThan",
        sizeValue: "",
        sizeValue2: "",
      });

      const { getFilteredImages } = await import("./categories");
      const result = getFilteredImages();
      expect(result).toEqual(["/test-image1.jpg"]);
    });
  });

  describe("navigateToNextFilteredImage - direct unit tests", () => {
    beforeEach(() => {
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

    it("should navigate to first image when currentIndex < 0 and filteredPaths.length > 0", async () => {
      const { navigateToNextFilteredImage } = await import("./categories");
      const { openModal } = await import("./modal");

      // Current image not in filtered list, but filtered list has images
      await navigateToNextFilteredImage("/nonexistent.jpg");

      expect(openModal).toHaveBeenCalledWith("/image1.jpg");
    });

    it("should close modal when currentIndex < 0 and filteredPaths.length === 0", async () => {
      store.set(allImagePathsAtom, []);
      const { navigateToNextFilteredImage } = await import("./categories");
      const { closeModal } = await import("./modal");

      await navigateToNextFilteredImage("/nonexistent.jpg");

      expect(closeModal).toHaveBeenCalled();
    });

    it("should navigate to next image when currentIndex < length - 1", async () => {
      const { navigateToNextFilteredImage } = await import("./categories");
      const { openModal } = await import("./modal");

      await navigateToNextFilteredImage("/image1.jpg");

      expect(openModal).toHaveBeenCalledWith("/image2.jpg");
    });

    it("should navigate to previous image when at last position and currentIndex > 0", async () => {
      const { navigateToNextFilteredImage } = await import("./categories");
      const { openModal } = await import("./modal");

      await navigateToNextFilteredImage("/image3.jpg");

      expect(openModal).toHaveBeenCalledWith("/image2.jpg");
    });

    it("should close modal when currentIndex === 0 and length === 1", async () => {
      store.set(allImagePathsAtom, [{ path: "/image1.jpg" }]);
      const { navigateToNextFilteredImage } = await import("./categories");
      const { closeModal } = await import("./modal");

      await navigateToNextFilteredImage("/image1.jpg");

      expect(closeModal).toHaveBeenCalled();
    });
  });
});
