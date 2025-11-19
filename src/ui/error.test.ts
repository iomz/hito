import { describe, it, expect, beforeEach } from "vitest";
import { showError, clearError } from "./error";
import { store } from "../utils/jotaiStore";
import { errorMessageAtom, resetStateAtom } from "../state";

describe("error", () => {
  beforeEach(() => {
    store.set(resetStateAtom);
  });

  describe("showError", () => {
    it("should update state with error message", () => {
      showError("Test error message");

      expect(store.get(errorMessageAtom)).toBe("Test error message");
    });

    it("should not throw", () => {
      expect(() => showError("Test error")).not.toThrow();
    });

    it("should handle empty string", () => {
      showError("");

      expect(store.get(errorMessageAtom)).toBe("");
    });

    it("should overwrite previous error", () => {
      showError("First error");
      showError("Second error");

      expect(store.get(errorMessageAtom)).toBe("Second error");
    });
  });

  describe("clearError", () => {
    it("should clear error message in state", () => {
      store.set(errorMessageAtom, "Some error");
      clearError();

      expect(store.get(errorMessageAtom)).toBe("");
    });

    it("should not throw", () => {
      expect(() => clearError()).not.toThrow();
    });

    it("should clear already empty error", () => {
      store.set(errorMessageAtom, "");
      clearError();

      expect(store.get(errorMessageAtom)).toBe("");
    });
  });
});

