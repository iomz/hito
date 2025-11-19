import { describe, it, expect, beforeEach } from "vitest";
import { showError, clearError } from "./error";
import { state } from "../state";

describe("error", () => {
  beforeEach(() => {
    state.errorMessage = "";
  });

  describe("showError", () => {
    it("should update state with error message", () => {
      showError("Test error message");

      expect(state.errorMessage).toBe("Test error message");
    });

    it("should not throw", () => {
      expect(() => showError("Test error")).not.toThrow();
    });

    it("should handle empty string", () => {
      showError("");

      expect(state.errorMessage).toBe("");
    });

    it("should overwrite previous error", () => {
      showError("First error");
      showError("Second error");

      expect(state.errorMessage).toBe("Second error");
    });
  });

  describe("clearError", () => {
    it("should clear error message in state", () => {
      state.errorMessage = "Some error";
      clearError();

      expect(state.errorMessage).toBe("");
    });

    it("should not throw", () => {
      expect(() => clearError()).not.toThrow();
    });

    it("should clear already empty error", () => {
      state.errorMessage = "";
      clearError();

      expect(state.errorMessage).toBe("");
    });
  });
});

