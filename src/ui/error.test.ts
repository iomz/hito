import { describe, it, expect, beforeEach } from "vitest";
import { elements } from "../state.js";
import { showError, clearError } from "./error.js";

describe("error", () => {
  beforeEach(() => {
    elements.errorMsg = document.createElement("div");
  });

  describe("showError", () => {
    it("should display error message when element exists", () => {
      showError("Test error message");

      expect(elements.errorMsg!.textContent).toBe("Test error message");
    });

    it("should not throw when element is null", () => {
      elements.errorMsg = null;

      expect(() => showError("Test error")).not.toThrow();
    });

    it("should handle empty string", () => {
      showError("");

      expect(elements.errorMsg!.textContent).toBe("");
    });

    it("should overwrite previous error", () => {
      showError("First error");
      showError("Second error");

      expect(elements.errorMsg!.textContent).toBe("Second error");
    });
  });

  describe("clearError", () => {
    it("should clear error message when element exists", () => {
      elements.errorMsg!.textContent = "Some error";
      clearError();

      expect(elements.errorMsg!.textContent).toBe("");
    });

    it("should not throw when element is null", () => {
      elements.errorMsg = null;

      expect(() => clearError()).not.toThrow();
    });

    it("should clear already empty error", () => {
      elements.errorMsg!.textContent = "";
      clearError();

      expect(elements.errorMsg!.textContent).toBe("");
    });
  });
});

