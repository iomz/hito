import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "../utils/jotaiStore";
import {
  allImagePathsAtom,
  imageCategoriesAtom,
  categoriesAtom,
  sortOptionAtom,
  sortDirectionAtom,
  filterOptionsAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
  resetStateAtom,
} from "../state";
import { getFilteredAndSortedImages, getFilteredAndSortedImagesSync, getSortedDirectoriesAndImages } from "./filteredImages";
import type { ImagePath, CategoryAssignment, DirectoryPath } from "../types";

// Mock the tauri module
vi.mock("./tauri", () => ({
  invokeTauri: vi.fn(),
  isTauriInvokeAvailable: vi.fn().mockReturnValue(false),
}));

describe("filteredImages", () => {
  beforeEach(() => {
    // Reset state
    store.set(resetStateAtom);
    store.set(allImagePathsAtom, []);
    store.set(imageCategoriesAtom, new Map());
    store.set(categoriesAtom, []);
    store.set(sortOptionAtom, "name");
    store.set(sortDirectionAtom, "ascending");
    store.set(filterOptionsAtom, {
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    });
    store.set(suppressCategoryRefilterAtom, false);
    store.set(cachedImageCategoriesForRefilterAtom, null);
    vi.clearAllMocks();
  });

  describe("getFilteredAndSortedImagesSync", () => {
    describe("empty arrays", () => {
      it("should return empty array when allImagePaths is empty", () => {
        store.set(allImagePathsAtom, []);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toEqual([]);
      });

      it("should return empty array when allImagePaths is not an array", () => {
        store.set(allImagePathsAtom, null as any);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toEqual([]);
      });
    });

    describe("sorting", () => {
      beforeEach(() => {
        store.set(allImagePathsAtom, [
          { path: "/test/zebra.jpg", size: 5000, created_at: "2023-01-03T00:00:00Z" },
          { path: "/test/apple.png", size: 10000, created_at: "2023-01-01T00:00:00Z" },
          { path: "/test/banana.gif", size: 2000, created_at: "2023-01-02T00:00:00Z" },
        ]);
      });

      it("should sort by name ascending", () => {
        store.set(sortOptionAtom, "name");
        store.set(sortDirectionAtom, "ascending");
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/apple.png",
          "/test/banana.gif",
          "/test/zebra.jpg",
        ]);
      });

      it("should sort by name descending", () => {
        store.set(sortOptionAtom, "name");
        store.set(sortDirectionAtom, "descending");
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/zebra.jpg",
          "/test/banana.gif",
          "/test/apple.png",
        ]);
      });

      it("should sort by size ascending", () => {
        store.set(sortOptionAtom, "size");
        store.set(sortDirectionAtom, "ascending");
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/banana.gif",
          "/test/zebra.jpg",
          "/test/apple.png",
        ]);
      });

      it("should sort by size descending", () => {
        store.set(sortOptionAtom, "size");
        store.set(sortDirectionAtom, "descending");
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/apple.png",
          "/test/zebra.jpg",
          "/test/banana.gif",
        ]);
      });

      it("should sort by dateCreated ascending", () => {
        store.set(sortOptionAtom, "dateCreated");
        store.set(sortDirectionAtom, "ascending");
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/apple.png",
          "/test/banana.gif",
          "/test/zebra.jpg",
        ]);
      });

      it("should sort by dateCreated descending", () => {
        store.set(sortOptionAtom, "dateCreated");
        store.set(sortDirectionAtom, "descending");
        const result = getFilteredAndSortedImagesSync();
        expect(result.map((img) => img.path)).toEqual([
          "/test/zebra.jpg",
          "/test/banana.gif",
          "/test/apple.png",
        ]);
      });

      it("should sort by lastCategorized ascending", () => {
        store.set(sortOptionAtom, "lastCategorized");
        store.set(sortDirectionAtom, "ascending");
        const now = new Date().toISOString();
        const later = new Date(Date.now() + 1000).toISOString();
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/apple.png", assignments1);
        updatedImageCategories.set("/test/zebra.jpg", assignments2);
        store.set(imageCategoriesAtom, updatedImageCategories);
        // banana.gif has no categories, so it should be first (timestamp 0)

        const result = getFilteredAndSortedImagesSync();
        expect(result[0].path).toBe("/test/banana.gif");
        expect(result[1].path).toBe("/test/apple.png");
        expect(result[2].path).toBe("/test/zebra.jpg");
      });

      it("should sort by lastCategorized descending", () => {
        store.set(sortOptionAtom, "lastCategorized");
        store.set(sortDirectionAtom, "descending");
        const now = new Date().toISOString();
        const later = new Date(Date.now() + 1000).toISOString();
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/apple.png", assignments1);
        updatedImageCategories.set("/test/zebra.jpg", assignments2);
        store.set(imageCategoriesAtom, updatedImageCategories);

        const result = getFilteredAndSortedImagesSync();
        expect(result[0].path).toBe("/test/zebra.jpg");
        expect(result[1].path).toBe("/test/apple.png");
        expect(result[2].path).toBe("/test/banana.gif");
      });

      it("should use cached imageCategories when suppressCategoryRefilter is true", () => {
        store.set(sortOptionAtom, "lastCategorized");
        store.set(sortDirectionAtom, "ascending");
        const now = new Date().toISOString();
        const later = new Date(Date.now() + 1000).toISOString();
        
        // Set up state categories
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/apple.png", assignments1);
        updatedImageCategories.set("/test/zebra.jpg", assignments2);
        store.set(imageCategoriesAtom, updatedImageCategories);

        // Create cached snapshot with different order
        const cachedCategories = new Map<string, CategoryAssignment[]>();
        const cachedAssignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: later }];
        const cachedAssignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: now }];
        cachedCategories.set("/test/apple.png", cachedAssignments1);
        cachedCategories.set("/test/zebra.jpg", cachedAssignments2);
        store.set(cachedImageCategoriesForRefilterAtom, cachedCategories);
        store.set(suppressCategoryRefilterAtom, true);
        store.set(imageCategoriesAtom, updatedImageCategories);

        const result = getFilteredAndSortedImagesSync();
        // Should use cached order (apple has later timestamp in cache)
        expect(result[0].path).toBe("/test/banana.gif");
        expect(result[1].path).toBe("/test/zebra.jpg");
        expect(result[2].path).toBe("/test/apple.png");
      });
    });

    describe("category filtering", () => {
      beforeEach(() => {
        store.set(allImagePathsAtom, [
          { path: "/test/image1.jpg" },
          { path: "/test/image2.jpg" },
          { path: "/test/image3.jpg" },
        ]);
        store.set(categoriesAtom, [
          { id: "cat1", name: "Category 1", color: "#ff0000" },
          { id: "cat2", name: "Category 2", color: "#00ff00" },
        ]);
      });

      it("should filter by category", () => {
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        const assignments2: CategoryAssignment[] = [{ category_id: "cat2", assigned_at: new Date().toISOString() }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/image1.jpg", assignments1);
        updatedImageCategories.set("/test/image2.jpg", assignments2);
        store.set(imageCategoriesAtom, updatedImageCategories);
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/image1.jpg");
      });

      it("should filter uncategorized images", () => {
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/image1.jpg", assignments1);
        store.set(imageCategoriesAtom, updatedImageCategories);
        // image2 and image3 have no categories
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "uncategorized" });

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(2);
        expect(result.map((img) => img.path)).toEqual(["/test/image2.jpg", "/test/image3.jpg"]);
      });

      it("should use cached imageCategories when suppressCategoryRefilter is true", () => {
        const assignments1: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/image1.jpg", assignments1);
        store.set(imageCategoriesAtom, updatedImageCategories);
        
        // Create cached snapshot
        const cachedCategories = new Map<string, CategoryAssignment[]>();
        const cachedAssignments2: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        cachedCategories.set("/test/image2.jpg", cachedAssignments2);
        store.set(cachedImageCategoriesForRefilterAtom, cachedCategories);
        store.set(suppressCategoryRefilterAtom, true);
        store.set(imageCategoriesAtom, updatedImageCategories);
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, { ...filterOptions, categoryId: "cat1" });

        const result = getFilteredAndSortedImagesSync();
        // Should use cached snapshot (image2 has category in cache, not in state)
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/image2.jpg");
      });
    });

    describe("name filtering", () => {
      beforeEach(() => {
        store.set(allImagePathsAtom, [
          { path: "/test/apple.jpg" },
          { path: "/test/banana.png" },
          { path: "/test/cherry.gif" },
        ]);
      });

      it("should filter by name contains", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: "e", nameOperator: "contains" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(2);
        expect(result.map((img) => img.path)).toEqual(["/test/apple.jpg", "/test/cherry.gif"]);
      });

      it("should filter by name startsWith", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: "ba", nameOperator: "startsWith" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/banana.png");
      });

      it("should filter by name endsWith", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: ".gif", nameOperator: "endsWith" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/cherry.gif");
      });

      it("should filter by name exact", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: "banana.png", nameOperator: "exact" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/banana.png");
      });

      it("should be case-insensitive", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: "APPLE", nameOperator: "contains" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple.jpg");
      });
    });

    describe("size filtering", () => {
      beforeEach(() => {
        // Sizes: 2KB, 5KB, 10KB (in bytes: 2048, 5120, 10240)
        store.set(allImagePathsAtom, [
          { path: "/test/small.jpg", size: 2 * 1024 },
          { path: "/test/medium.png", size: 5 * 1024 },
          { path: "/test/large.gif", size: 10 * 1024 },
        ]);
      });

      it("should filter by size largerThan", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "5", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/large.gif");
      });

      it("should filter by size lessThan", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "5", sizeOperator: "lessThan" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/small.jpg");
      });

      it("should filter by size between", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "3", sizeValue2: "7", sizeOperator: "between" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/medium.png");
      });

      it("should handle between with reversed values", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "7", sizeValue2: "3", sizeOperator: "between" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/medium.png");
      });

      it("should not apply size filter when sizeValue is empty", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(3);
      });

      it("should not apply size filter when sizeValue is invalid", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "invalid", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(3);
      });

      it("should not apply between filter when sizeValue2 is invalid", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "5", sizeValue2: "invalid", sizeOperator: "between" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(3);
      });

      it("should handle images without size", () => {
        store.set(allImagePathsAtom, [
          { path: "/test/nosize.jpg" },
          { path: "/test/withsize.jpg", size: 5 * 1024 },
        ]);
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, sizeValue: "3", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);
        const result = getFilteredAndSortedImagesSync();
        // Image without size has size 0, so it should be filtered out for largerThan
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/withsize.jpg");
      });
    });

    describe("combined filters", () => {
      beforeEach(() => {
        store.set(allImagePathsAtom, [
          { path: "/test/apple1.jpg", size: 2 * 1024 },
          { path: "/test/apple2.png", size: 5 * 1024 },
          { path: "/test/banana.jpg", size: 10 * 1024 },
        ]);
      });

      it("should apply category and name filters together", () => {
        const assignments: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/apple1.jpg", assignments);
        updatedImageCategories.set("/test/apple2.png", assignments);
        store.set(imageCategoriesAtom, updatedImageCategories);
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, categoryId: "cat1", namePattern: "apple", nameOperator: "contains" };
        store.set(filterOptionsAtom, filterOptions);

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(2);
        expect(result.map((img) => img.path)).toEqual(["/test/apple1.jpg", "/test/apple2.png"]);
      });

      it("should apply name and size filters together", () => {
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: "apple", nameOperator: "contains", sizeValue: "3", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);

        const result = getFilteredAndSortedImagesSync();
        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple2.png");
      });

      it("should apply all filters together", () => {
        const assignments: CategoryAssignment[] = [{ category_id: "cat1", assigned_at: new Date().toISOString() }];
        const imageCategories = store.get(imageCategoriesAtom);
        const updatedImageCategories = new Map(imageCategories);
        updatedImageCategories.set("/test/apple2.png", assignments);
        store.set(imageCategoriesAtom, updatedImageCategories);
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, categoryId: "cat1", namePattern: "apple", nameOperator: "contains", sizeValue: "3", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);

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

        store.set(allImagePathsAtom, [
          { path: "/test/unsorted1.jpg" },
          { path: "/test/unsorted2.jpg" },
        ]);

        const result = await getFilteredAndSortedImages();

        expect(invokeTauri).toHaveBeenCalledWith("sort_images", expect.objectContaining({
          images: store.get(allImagePathsAtom),
          sortOption: store.get(sortOptionAtom),
          sortDirection: store.get(sortDirectionAtom),
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

        store.set(allImagePathsAtom, [{ path: "/test/image.jpg" }]);
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, categoryId: "cat1", namePattern: "test", nameOperator: "contains", sizeValue: "100", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);

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

        store.set(allImagePathsAtom, [{ path: "/test/image.jpg" }]);
        const filterOptions = store.get(filterOptionsAtom);
        store.set(filterOptionsAtom, {
          ...filterOptions,
          sizeValue: "100",
          sizeValue2: "200",
          sizeOperator: "between",
        });

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

        store.set(allImagePathsAtom, [
          { path: "/test/zebra.jpg" },
          { path: "/test/apple.png" },
        ]);
        store.set(sortOptionAtom, "name");
        store.set(sortDirectionAtom, "ascending");

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

        store.set(allImagePathsAtom, [
          { path: "/test/zebra.jpg" },
          { path: "/test/apple.png" },
        ]);
        store.set(sortOptionAtom, "name");
        store.set(sortDirectionAtom, "ascending");

        const result = await getFilteredAndSortedImages();

        expect(result.map((img) => img.path)).toEqual(["/test/apple.png", "/test/zebra.jpg"]);
      });

      it("should return empty array when allImagePaths is empty", async () => {
        const { isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

        store.set(allImagePathsAtom, []);
        const result = await getFilteredAndSortedImages();
        expect(result).toEqual([]);
      });

      it("should apply JS filters in fallback path", async () => {
        const { isTauriInvokeAvailable } = await import("./tauri");
        vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

        store.set(allImagePathsAtom, [
          { path: "/test/apple1.jpg", size: 2 * 1024 },
          { path: "/test/apple2.png", size: 5 * 1024 },
          { path: "/test/banana.jpg", size: 10 * 1024 },
        ]);
        let filterOptions = store.get(filterOptionsAtom);
        filterOptions = { ...filterOptions, namePattern: "apple", nameOperator: "contains", sizeValue: "3", sizeOperator: "largerThan" };
        store.set(filterOptionsAtom, filterOptions);

        const result = await getFilteredAndSortedImages();

        expect(result).toHaveLength(1);
        expect(result[0].path).toBe("/test/apple2.png");
      });
    });
  });

  describe("getSortedDirectoriesAndImages", () => {
    it("should sort directories by name when sortOption is name", () => {
      store.set(sortOptionAtom, "name");
      store.set(sortDirectionAtom, "ascending");
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png", size: 1000 },
        { path: "/test/image2.png", size: 2000 },
      ]);

      const directories: DirectoryPath[] = [
        { path: "/test/zebra" },
        { path: "/test/apple" },
        { path: "/test/banana" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories should be sorted by name (apple, banana, zebra)
      expect(result.directories).toEqual([
        { path: "/test/apple" },
        { path: "/test/banana" },
        { path: "/test/zebra" },
      ]);
      expect(result.images).toHaveLength(2);
    });

    it("should sort directories by name descending when sortDirection is descending", () => {
      store.set(sortOptionAtom, "name");
      store.set(sortDirectionAtom, "descending");
      store.set(allImagePathsAtom, []);

      const directories: DirectoryPath[] = [
        { path: "/test/apple" },
        { path: "/test/zebra" },
        { path: "/test/banana" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories should be sorted by name descending (zebra, banana, apple)
      expect(result.directories).toEqual([
        { path: "/test/zebra" },
        { path: "/test/banana" },
        { path: "/test/apple" },
      ]);
    });

    it("should sort directories by name when sortOption is lastCategorized", () => {
      store.set(sortOptionAtom, "lastCategorized");
      store.set(sortDirectionAtom, "ascending");
      store.set(allImagePathsAtom, []);

      const directories: DirectoryPath[] = [
        { path: "/test/zebra" },
        { path: "/test/apple" },
        { path: "/test/banana" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories should be sorted by name (not by lastCategorized)
      expect(result.directories).toEqual([
        { path: "/test/apple" },
        { path: "/test/banana" },
        { path: "/test/zebra" },
      ]);
    });

    it("should sort directories by name when sortOption is size", () => {
      store.set(sortOptionAtom, "size");
      store.set(sortDirectionAtom, "ascending");
      store.set(allImagePathsAtom, []);

      const directories: DirectoryPath[] = [
        { path: "/test/zebra" },
        { path: "/test/apple" },
        { path: "/test/banana" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories should be sorted by name (not by size)
      expect(result.directories).toEqual([
        { path: "/test/apple" },
        { path: "/test/banana" },
        { path: "/test/zebra" },
      ]);
    });

    it("should sort directories by dateCreated when sortOption is dateCreated", () => {
      store.set(sortOptionAtom, "dateCreated");
      store.set(sortDirectionAtom, "ascending");
      store.set(allImagePathsAtom, []);

      const directories: DirectoryPath[] = [
        { path: "/test/dir1", created_at: "2023-03-01T00:00:00Z" },
        { path: "/test/dir2", created_at: "2023-01-01T00:00:00Z" },
        { path: "/test/dir3", created_at: "2023-02-01T00:00:00Z" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories should be sorted by dateCreated (oldest first)
      expect(result.directories).toEqual([
        { path: "/test/dir2", created_at: "2023-01-01T00:00:00Z" },
        { path: "/test/dir3", created_at: "2023-02-01T00:00:00Z" },
        { path: "/test/dir1", created_at: "2023-03-01T00:00:00Z" },
      ]);
    });

    it("should handle directories without created_at", () => {
      store.set(sortOptionAtom, "dateCreated");
      store.set(sortDirectionAtom, "ascending");
      store.set(allImagePathsAtom, []);

      const directories: DirectoryPath[] = [
        { path: "/test/dir1", created_at: "2023-01-01T00:00:00Z" },
        { path: "/test/dir2" }, // no created_at (treated as 0)
        { path: "/test/dir3", created_at: "2023-02-01T00:00:00Z" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories without created_at (treated as 0) should be sorted first in ascending order
      // dir2 (0), dir1 (2023-01-01), dir3 (2023-02-01)
      expect(result.directories[0].path).toBe("/test/dir2"); // no created_at = 0
      expect(result.directories[1].path).toBe("/test/dir1"); // oldest date
      expect(result.directories[2].path).toBe("/test/dir3"); // newest date
    });

    it("should place directories before images", () => {
      store.set(sortOptionAtom, "name");
      store.set(sortDirectionAtom, "ascending");
      store.set(allImagePathsAtom, [
        { path: "/test/image1.png" },
        { path: "/test/image2.png" },
      ]);

      const directories: DirectoryPath[] = [
        { path: "/test/folder" },
      ];

      const result = getSortedDirectoriesAndImages(directories);

      // Directories should be first, then images
      expect(result.directories).toHaveLength(1);
      expect(result.images).toHaveLength(2);
      expect(result.directories[0].path).toBe("/test/folder");
    });
  });
});

