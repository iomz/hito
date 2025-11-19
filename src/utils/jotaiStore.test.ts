import { describe, it, expect, beforeEach } from "vitest";
import { store, updateAtomMap, deleteFromAtomMap } from "./jotaiStore";
import { loadedImagesAtom, imageCategoriesAtom } from "../state";

describe("jotaiStore helpers", () => {
  beforeEach(() => {
    // Reset atoms before each test
    store.set(loadedImagesAtom, new Map());
    store.set(imageCategoriesAtom, new Map());
  });

  describe("updateAtomMap", () => {
    it("should update a Map atom with a new key-value pair", () => {
      const initialMap = new Map([["key1", "value1"]]);
      store.set(loadedImagesAtom, initialMap);

      updateAtomMap(loadedImagesAtom, "key2", "value2");

      const updatedMap = store.get(loadedImagesAtom);
      expect(updatedMap.get("key1")).toBe("value1");
      expect(updatedMap.get("key2")).toBe("value2");
      expect(updatedMap.size).toBe(2);
      // Should be a new Map instance (immutability)
      expect(updatedMap).not.toBe(initialMap);
    });

    it("should overwrite existing key-value pair", () => {
      const initialMap = new Map([["key1", "value1"]]);
      store.set(loadedImagesAtom, initialMap);

      updateAtomMap(loadedImagesAtom, "key1", "updated_value");

      const updatedMap = store.get(loadedImagesAtom);
      expect(updatedMap.get("key1")).toBe("updated_value");
      expect(updatedMap.size).toBe(1);
    });

    it("should work with empty Map", () => {
      store.set(loadedImagesAtom, new Map());

      updateAtomMap(loadedImagesAtom, "key1", "value1");

      const updatedMap = store.get(loadedImagesAtom);
      expect(updatedMap.get("key1")).toBe("value1");
      expect(updatedMap.size).toBe(1);
    });

    it("should work with different Map types", () => {
      const initialMap = new Map([["/image1.jpg", [{ category_id: "cat1", assigned_at: "2024-01-01" }]]]);
      store.set(imageCategoriesAtom, initialMap);

      const newAssignments = [{ category_id: "cat2", assigned_at: "2024-01-02" }];
      updateAtomMap(imageCategoriesAtom, "/image2.jpg", newAssignments);

      const updatedMap = store.get(imageCategoriesAtom);
      expect(updatedMap.get("/image1.jpg")).toEqual([{ category_id: "cat1", assigned_at: "2024-01-01" }]);
      expect(updatedMap.get("/image2.jpg")).toEqual(newAssignments);
      expect(updatedMap.size).toBe(2);
    });
  });

  describe("deleteFromAtomMap", () => {
    it("should delete a key from a Map atom", () => {
      const initialMap = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      store.set(loadedImagesAtom, initialMap);

      deleteFromAtomMap(loadedImagesAtom, "key1");

      const updatedMap = store.get(loadedImagesAtom);
      expect(updatedMap.has("key1")).toBe(false);
      expect(updatedMap.get("key2")).toBe("value2");
      expect(updatedMap.size).toBe(1);
      // Should be a new Map instance (immutability)
      expect(updatedMap).not.toBe(initialMap);
    });

    it("should handle deleting non-existent key gracefully", () => {
      const initialMap = new Map([["key1", "value1"]]);
      store.set(loadedImagesAtom, initialMap);

      deleteFromAtomMap(loadedImagesAtom, "nonexistent");

      const updatedMap = store.get(loadedImagesAtom);
      expect(updatedMap.get("key1")).toBe("value1");
      expect(updatedMap.size).toBe(1);
    });

    it("should work with empty Map", () => {
      store.set(loadedImagesAtom, new Map());

      deleteFromAtomMap(loadedImagesAtom, "key1");

      const updatedMap = store.get(loadedImagesAtom);
      expect(updatedMap.size).toBe(0);
    });

    it("should work with different Map types", () => {
      const initialMap = new Map([
        ["/image1.jpg", [{ category_id: "cat1", assigned_at: "2024-01-01" }]],
        ["/image2.jpg", [{ category_id: "cat2", assigned_at: "2024-01-02" }]],
      ]);
      store.set(imageCategoriesAtom, initialMap);

      deleteFromAtomMap(imageCategoriesAtom, "/image1.jpg");

      const updatedMap = store.get(imageCategoriesAtom);
      expect(updatedMap.has("/image1.jpg")).toBe(false);
      expect(updatedMap.get("/image2.jpg")).toEqual([{ category_id: "cat2", assigned_at: "2024-01-02" }]);
      expect(updatedMap.size).toBe(1);
    });
  });
});

