import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../state";
import { getFilteredAndSortedImages, getFilteredAndSortedImagesSync } from "./filteredImages";
import type { ImagePath, CategoryAssignment } from "../types";

// Mock the tauri module
vi.mock("./tauri", () => ({
  invokeTauri: vi.fn(),
  isTauriInvokeAvailable: vi.fn().mockReturnValue(false),
}));

describe("filteredImages", () => {
  beforeEach(() => {
    // Reset state
    state.allImagePaths = [];
    state.imageCategories.clear();
    state.categories = [];
    state.sortOption = "name";
    state.sortDirection = "ascending";
    state.filterOptions = {
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    };
    state.suppressCategoryRefilter = false;
    state.cachedImageCategoriesForRefilter = null;
    vi.clearAllMocks();
  });

  describe("getFilteredAndSortedImagesSync", () => {
    describe("empty arrays", () => {
      it("should return empty array when allImagePaths is empty", () => {
        state.allImagePaths = [];
        const result = getFilteredAndSortedImagesSync();
        expect(result).toEqual([]);
      });

      it("should return empty array when allImagePaths is not an array", () => {
        (state as any).allImagePaths = null;
        const result = getFilteredAndSortedImagesSync();
        expect(result).toEqual([]);
      });
    });

    describe("sorting", () => {
      beforeEach(() => {
        state.allImagePaths = [
          { path: "/test/zebra.jpg", size: 5000, created_at: "2023-01-03T00:00:00Z" },
          { path: "/test/apple.png", size: 10000, created_at: "2023-01-01T00:00:00Z" },
          { path: "/test/banana.gif", size: 2000, created_at: "2023-01-02T00:00:00Z" },
        ];
      });

      it("should sort by name ascending", () => {
        state.sortOption = "name";
        state.sortDirection = "ascending";
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/apple.png",
          "/test/banana.gif",
          "/test/zebra.jpg",
        ]);
      });

      it("should sort by name descending", () => {
        state.sortOption = "name";
        state.sortDirection = "descending";
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/zebra.jpg",
          "/test/banana.gif",
          "/test/apple.png",
        ]);
      });

      it("should sort by size ascending", () => {
        state.sortOption = "size";
        state.sortDirection = "ascending";
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/banana.gif",
          "/test/zebra.jpg",
          "/test/apple.png",
        ]);
      });

      it("should sort by size descending", () => {
        state.sortOption = "size";
        state.sortDirection = "descending";
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/apple.png",
          "/test/zebra.jpg",
          "/test/banana.gif",
        ]);
      });

      it("should sort by dateCreated ascending", () => {
        state.sortOption = "dateCreated";
        state.sortDirection = "ascending";
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/apple.png",
          "/test/banana.gif",
          "/test/zebra.jpg",
        ]);
      });

      it("should sort by dateCreated descending", () => {
        state.sortOption = "dateCreated";
        state.sortDirection = "descending";
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/zebra.jpg",
          "/test/banana.gif",
          "/test/apple.png",
        ]);
      });

      it("should sort by lastCategorized ascending", () => {
        state.sortOption = "lastCategorized";
        state.sortDirection = "ascending";
        const now = new Date().toISOString();
        const later = new Date(Date.now() + 1000).toISOString();
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        state.imageCategories.set("/test/apple.png", assignments1);
        state.imageCategories.set("/test/zebra.jpg", assignments2);
        // banana.gif has no categories, so it should be first (timestamp 0)

        const result = getFilteredAndSortedImagesSync();
        expect(result[0].path).toBe("/test/banana.gif");
        expect(result[1].path).toBe("/test/apple.png");
        expect(result[2].path).toBe("/test/zebra.jpg");
      });

      it("should sort by lastCategorized descending", () => {
        state.sortOption = "lastCategorized";
        state.sortDirection = "descending";
        const now = new Date().toISOString();
        const later = new Date(Date.now() + 1000).toISOString();
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        state.imageCategories.set("/test/apple.png", assignments1);
        state.imageCategories.set("/test/zebra.jpg", assignments2);

        const result = getFilteredAndSortedImagesSync();
        expect(result[0].path).toBe("/test/zebra.jpg");
        expect(result[1].path).toBe("/test/apple.png");
        expect(result[2].path).toBe("/test/banana.gif");
      });

      it("should use cached imageCategories when suppressCategoryRefilter is true", () => {
        state.sortOption = "lastCategorized";
        state.sortDirection = "ascending";
        const now = new Date().toISOString();
        const later = new Date(Date.now() + 1000).toISOString();
        
        // Set up state categories
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        state.imageCategories.set("/test/apple.png", assignments1);
        state.imageCategories.set("/test/zebra.jpg", assignments2);

        // Create cached snapshot with different order
        const cachedCategories = new Map<string, CategoryAssignment[]>();
        const cachedAssignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        const cachedAssignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        cachedCategories.set("/test/apple.png", cachedAssignments1);
        cachedCategories.set("/test/zebra.jpg", cachedAssignments2);
        state.cachedImageCategoriesForRefilter = cachedCategories;
        state.suppressCategoryRefilter = true;

        const result = getFilteredAndSortedImagesSync();
        // Should use cached order (apple has later timestamp in cache)
        expect(result[0].path).toBe("/test/banana.gif");
        expect(result[1].path).toBe("/test/zebra.jpg");
        expect(result[2].path).toBe("/test/apple.png");
      });
    });

    describe("category filtering", () => {
      beforeEach(() => {
        state.allImagePaths = [
          { path: "/test/image1.jpg" },
          { path: "/test/image2.jpg" },
          { path: "/test/image3.jpg" },
        ];
        state.categories = [
          { id: "cat1", name: "Category 1", color: "#ff0000" },
          { id: "cat2", name: "Category 2", color: "#00ff00" },
        ];
      });

      it("should filter by category", () => {
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat2", assigned_at: new Date().toISOString() }];
        state.imageCategories.set("/test/image1.jpg", assignments1);
        state.imageCategories.set("/test/image2.jpg", assignments2);
        state.filterOptions.categoryId = "cat1";

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/image1.jpg");
      });

      it("should filter uncategorized images", () => {
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        state.imageCategories.set("/test/image1.jpg", assignments1);
        // image2 and image3 have no categories
        state.filterOptions.categoryId = "uncategorized";

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(2);
        expect(result.map((img) => img.path)).toEqual(["/test/image2.jpg", "/test/image3.jpg"]);
      });

      it("should use cached imageCategories when suppressCategoryRefilter is true", () => {
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        state.imageCategories.set("/test/image1.jpg", assignments1);
        
        // Create cached snapshot
        const cachedCategories = new Map<string, CategoryAssignment[]>();
        const cachedAssignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        cachedCategories.set("/test/image2.jpg", cachedAssignments2);
        state.cachedImageCategoriesForRefilter = cachedCategories;
        state.suppressCategoryRefilter = true;
        state.filterOptions.categoryId = "cat1";

        const result = getFilteredAndSortedImagesSync();
        // Should use cached snapshot (image2 has category in cache, not in state)
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/image2.jpg");
      });
    });

    describe("name filtering", () => {
      beforeEach(() => {
        state.allImagePaths = [
          { path: "/test/apple.jpg" },
          { path: "/test/banana.png" },
          { path: "/test/cherry.gif" },
        ];
      });

      it("should filter by name contains", () => {
        state.filterOptions.namePattern = "e";
        state.filterOptions.nameOperator = "contains";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(2);
        expect(result.map((img) => img.path)).toEqual(["/test/apple.jpg", "/test/cherry.gif"]);
      });

      it("should filter by name startsWith", () => {
        state.filterOptions.namePattern = "ba";
        state.filterOptions.nameOperator = "startsWith";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/banana.png");
      });

      it("should filter by name endsWith", () => {
        state.filterOptions.namePattern = ".gif";
        state.filterOptions.nameOperator = "endsWith";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/cherry.gif");
      });

      it("should filter by name exact", () => {
        state.filterOptions.namePattern = "banana.png";
        state.filterOptions.nameOperator = "exact";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/banana.png");
      });

      it("should be case-insensitive", () => {
        state.filterOptions.namePattern = "APPLE";
        state.filterOptions.nameOperator = "contains";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple.jpg");
      });
    });

    describe("size filtering", () => {
      beforeEach(() => {
        // Sizes: 2KB, 5KB, 10KB (in bytes: 2048, 5120, 10240)
        state.allImagePaths = [
          { path: "/test/small.jpg", size: 2 * 1024 },
          { path: "/test/medium.png", size: 5 * 1024 },
          { path: "/test/large.gif", size: 10 * 1024 },
        ];
      });

      it("should filter by size largerThan", () => {
        state.filterOptions.sizeValue = "5";
        state.filterOptions.sizeOperator = "largerThan";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/large.gif");
      });

      it("should filter by size lessThan", () => {
        state.filterOptions.sizeValue = "5";
        state.filterOptions.sizeOperator = "lessThan";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/small.jpg");
      });

      it("should filter by size between", () => {
        state.filterOptions.sizeValue = "3";
        state.filterOptions.sizeValue2 = "7";
        state.filterOptions.sizeOperator = "between";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/medium.png");
      });

      it("should handle between with reversed values", () => {
        state.filterOptions.sizeValue = "7";
        state.filterOptions.sizeValue2 = "3";
        state.filterOptions.sizeOperator = "between";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/medium.png");
      });

      it("should not apply size filter when sizeValue is empty", () => {
        state.filterOptions.sizeValue = "";
        state.filterOptions.sizeOperator = "largerThan";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(3);
      });

      it("should not apply size filter when sizeValue is invalid", () => {
        state.filterOptions.sizeValue = "invalid";
        state.filterOptions.sizeOperator = "largerThan";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(3);
      });

      it("should not apply between filter when sizeValue2 is invalid", () => {
        state.filterOptions.sizeValue = "5";
        state.filterOptions.sizeValue2 = "invalid";
        state.filterOptions.sizeOperator = "between";
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(3);
      });

      it("should handle images without size", () => {
        state.allImagePaths = [
          { path: "/test/nosize.jpg" },
          { path: "/test/withsize.jpg", size: 5 * 1024 },
        ];
        state.filterOptions.sizeValue = "3";
        state.filterOptions.sizeOperator = "largerThan";
        const result = getFilteredAndSortedImagesSync();
        // Image without size has size 0, so it should be filtered out for largerThan
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/withsize.jpg");
      });
    });

    describe("combined filters", () => {
      beforeEach(() => {
        state.allImagePaths = [
          { path: "/test/apple1.jpg", size: 2 * 1024 },
          { path: "/test/apple2.png", size: 5 * 1024 },
          { path: "/test/banana.jpg", size: 10 * 1024 },
        ];
      });

      it("should apply category and name filters together", () => {
        const assignments: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        state.imageCategories.set("/test/apple1.jpg", assignments);
        state.imageCategories.set("/test/apple2.png", assignments);
        state.filterOptions.categoryId = "cat1";
        state.filterOptions.namePattern = "apple";
        state.filterOptions.nameOperator = "contains";

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(2);
        expect(result.map((img) => img.path)).toEqual(["/test/apple1.jpg", "/test/apple2.png"]);
      });

      it("should apply name and size filters together", () => {
        state.filterOptions.namePattern = "apple";
        state.filterOptions.nameOperator = "contains";
        state.filterOptions.sizeValue = "3";
        state.filterOptions.sizeOperator = "largerThan";

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple2.png");
      });

      it("should apply all filters together", () => {
        const assignments: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        state.imageCategories.set("/test/apple2.png", assignments);
        state.filterOptions.categoryId = "cat1";
        state.filterOptions.namePattern = "apple";
        state.filterOptions.nameOperator = "contains";
        state.filterOptions.sizeValue = "3";
        state.filterOptions.sizeOperator = "largerThan";

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple2.png");
      });
    });
  });

  describe("getFilteredAndSortedImages", () => {
    beforeEach(() => {
      (window as any).__TAURI__ = {
        core: {
          invoke: vi.fn(),
        },
      };
    });

    describe("Rust path", () => {
      it("should use Rust sorting when Tauri is available", async () => {
        const { invokeTauri, isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(true);
        vi.mocked(invokeTauri).mockResolvedValueOnce([
          { path: "/test/sorted1.jpg" },
          { path: "/test/sorted2.jpg" },
        ]);

        state.allImagePaths = [
          { path: "/test/unsorted1.jpg" },
          { path: "/test/unsorted2.jpg" },
        ];

        const result = await getFilteredAndSortedImages();

        expect(invokeTauri).toHaveBeenCalledWith("sort_images", expect.objectContaining({
          images: state.allImagePaths,
          sortOption: state.sortOption,
          sortDirection: state.sortDirection,
        }));
        expect(result).toEqual([
          { path: "/test/sorted1.jpg" },
          { path: "/test/sorted2.jpg" },
        ]);
      });

      it("should pass filter options to Rust", async () => {
        const { invokeTauri, isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(true);
        vi.mocked(invokeTauri).mockResolvedValueOnce([]);

        state.allImagePaths = [{ path: "/test/image.jpg" }];
        state.filterOptions.categoryId = "cat1";
        state.filterOptions.namePattern = "test";
        state.filterOptions.nameOperator = "contains";
        state.filterOptions.sizeValue = "100";
        state.filterOptions.sizeOperator = "largerThan";

        await getFilteredAndSortedImages();

        expect(invokeTauri).toHaveBeenCalledWith("sort_images", expect.objectContaining({
          filterOptions: {
            category_id: "cat1",
            name_pattern: "test",
            name_operator: "contains",
            size_operator: "largerThan",
            size_value: "100",
            size_value2: null,
          },
        }));
      });

      it("should pass sizeValue2 when operator is between", async () => {
        const { invokeTauri, isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(true);
        vi.mocked(invokeTauri).mockResolvedValueOnce([]);

        state.allImagePaths = [{ path: "/test/image.jpg" }];
        state.filterOptions.sizeValue = "100";
        state.filterOptions.sizeValue2 = "200";
        state.filterOptions.sizeOperator = "between";

        await getFilteredAndSortedImages();

        expect(invokeTauri).toHaveBeenCalledWith("sort_images", expect.objectContaining({
          filterOptions: expect.objectContaining({
            size_value2: "200",
          }),
        }));
      });

      it("should fallback to JS when Rust fails", async () => {
        const { invokeTauri, isTauriInvokeAvailable } = await import("./tauri");
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(true);
        vi.mocked(invokeTauri).mockRejectedValueOnce(new Error("Rust error"));

        state.allImagePaths = [
          { path: "/test/zebra.jpg" },
          { path: "/test/apple.png" },
        ];
        state.sortOption = "name";
        state.sortDirection = "ascending";

        const result = await getFilteredAndSortedImages();

        expect(consoleSpy).toHaveBeenCalled();
        expect(result.map((img) => img.path)).toEqual(["/test/apple.png", "/test/zebra.jpg"]);
        consoleSpy.mockRestore();
      });
    });

    describe("JS fallback path", () => {
      it("should use JS sorting when Tauri is not available", async () => {
        const { isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

        state.allImagePaths = [
          { path: "/test/zebra.jpg" },
          { path: "/test/apple.png" },
        ];
        state.sortOption = "name";
        state.sortDirection = "ascending";

        const result = await getFilteredAndSortedImages();

        expect(result.map((img) => img.path)).toEqual(["/test/apple.png", "/test/zebra.jpg"]);
      });

      it("should return empty array when allImagePaths is empty", async () => {
        const { isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

        state.allImagePaths = [];
        const result = await getFilteredAndSortedImages();
        expect(result).toEqual([]);
      });

      it("should apply JS filters in fallback path", async () => {
        const { isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

        state.allImagePaths = [
          { path: "/test/apple1.jpg", size: 2 * 1024 },
          { path: "/test/apple2.png", size: 5 * 1024 },
          { path: "/test/banana.jpg", size: 10 * 1024 },
        ];
        state.filterOptions.namePattern = "apple";
        state.filterOptions.nameOperator = "contains";
        state.filterOptions.sizeValue = "3";
        state.filterOptions.sizeOperator = "largerThan";

        const result = await getFilteredAndSortedImages();

        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple2.png");
      });
    });
  });
});

