import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "./jotaiStore";
import { allImagePathsAtom, resetStateAtom } from "../state";
import { ensureImagePathsArray, normalizePath, getFilename } from "./state";

describe("state utilities", () => {
  beforeEach(() => {
    store.set(resetStateAtom);
  });

  describe("ensureImagePathsArray", () => {
    it("should return true when allImagePathsAtom is a valid array", () => {
      store.set(allImagePathsAtom, [{ path: "/test/image1.jpg" }]);

      const result = ensureImagePathsArray("testContext");

      expect(result).toBe(true);
      expect(store.get(allImagePathsAtom)).toEqual([{ path: "/test/image1.jpg" }]);
    });

    it("should return true when allImagePathsAtom is an empty array", () => {
      store.set(allImagePathsAtom, []);

      const result = ensureImagePathsArray("testContext");

      expect(result).toBe(true);
      expect(store.get(allImagePathsAtom)).toEqual([]);
    });

    it("should reset and return false when allImagePathsAtom is not an array", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, "not an array" as any);

      const result = ensureImagePathsArray("testContext");

      expect(result).toBe(false);
      expect(store.get(allImagePathsAtom)).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "allImagePathsAtom is not an array in testContext:",
        "not an array"
      );
      consoleSpy.mockRestore();
    });

    it("should reset and return false when allImagePathsAtom is null", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, null as any);

      const result = ensureImagePathsArray("testContext");

      expect(result).toBe(false);
      expect(store.get(allImagePathsAtom)).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reset and return false when allImagePathsAtom is undefined", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      store.set(allImagePathsAtom, undefined as any);

      const result = ensureImagePathsArray("testContext");

      expect(result).toBe(false);
      expect(store.get(allImagePathsAtom)).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("normalizePath", () => {
    it("should convert backslashes to forward slashes", () => {
      expect(normalizePath("C:\\Users\\test\\image.jpg")).toBe("C:/Users/test/image.jpg");
      expect(normalizePath("path\\to\\file")).toBe("path/to/file");
    });

    it("should leave forward slashes unchanged", () => {
      expect(normalizePath("/path/to/file")).toBe("/path/to/file");
      expect(normalizePath("path/to/file")).toBe("path/to/file");
    });

    it("should handle mixed slashes", () => {
      expect(normalizePath("C:\\Users/test\\image.jpg")).toBe("C:/Users/test/image.jpg");
    });

    it("should handle paths with no slashes", () => {
      expect(normalizePath("filename.jpg")).toBe("filename.jpg");
    });

    it("should handle empty string", () => {
      expect(normalizePath("")).toBe("");
    });

    it("should handle multiple consecutive backslashes", () => {
      expect(normalizePath("C:\\\\Users\\\\test")).toBe("C://Users//test");
    });
  });

  describe("getFilename", () => {
    it("should extract filename from Unix-style path", () => {
      expect(getFilename("/path/to/image.jpg")).toBe("image.jpg");
      expect(getFilename("/home/user/photos/picture.png")).toBe("picture.png");
    });

    it("should extract filename from Windows-style path", () => {
      expect(getFilename("C:\\Users\\test\\image.jpg")).toBe("image.jpg");
      expect(getFilename("C:\\Program Files\\app\\file.txt")).toBe("file.txt");
    });

    it("should extract filename from path with no directory", () => {
      expect(getFilename("image.jpg")).toBe("image.jpg");
      expect(getFilename("file.txt")).toBe("file.txt");
    });

    it("should handle path ending with slash", () => {
      // split("/").pop() returns empty string for paths ending with /
      // Since "" is falsy, || path fallback returns the original path (not normalized)
      expect(getFilename("/path/to/")).toBe("/path/to/");
      expect(getFilename("C:\\Users\\")).toBe("C:\\Users\\");
    });

    it("should handle root path", () => {
      // For "/", split("/") returns ["", ""], pop() returns "", but || path returns "/"
      // Actually, split("/").pop() on "/" returns "" (the last element), so || path fallback doesn't trigger
      // But the function returns path if pop() is falsy, so "/" returns "/"
      expect(getFilename("/")).toBe("/");
    });

    it("should return original path if extraction fails", () => {
      // This shouldn't happen in practice, but test the fallback
      expect(getFilename("")).toBe("");
    });

    it("should handle paths with special characters", () => {
      expect(getFilename("/path/to/file with spaces.jpg")).toBe("file with spaces.jpg");
      expect(getFilename("/path/to/file-name_123.jpg")).toBe("file-name_123.jpg");
    });

    it("should handle mixed path separators", () => {
      expect(getFilename("C:\\Users/test\\image.jpg")).toBe("image.jpg");
    });
  });
});

