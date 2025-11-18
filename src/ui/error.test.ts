import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { showError, clearError } from "./error";

describe("error", () => {
  beforeEach(() => {
    // Create error element in DOM (code uses querySelector)
    const existing = document.getElementById("error-msg");
    if (existing) {
      existing.remove();
    }
    const errorMsg = document.createElement("div");
    errorMsg.id = "error-msg";
    document.body.appendChild(errorMsg);
  });

  afterEach(() => {
    const errorMsg = document.getElementById("error-msg");
    if (errorMsg) {
      errorMsg.remove();
    }
  });

  describe("showError", () => {
    it("should display error message when element exists", () => {
      showError("Test error message");

      const errorMsg = document.getElementById("error-msg");
      expect(errorMsg!.textContent).toBe("Test error message");
    });

    it("should not throw when element is null", () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg?.remove();

      expect(() => showError("Test error")).not.toThrow();
    });

    it("should handle empty string", () => {
      showError("");

      const errorMsg = document.getElementById("error-msg");
      expect(errorMsg!.textContent).toBe("");
    });

    it("should overwrite previous error", () => {
      showError("First error");
      showError("Second error");

      const errorMsg = document.getElementById("error-msg");
      expect(errorMsg!.textContent).toBe("Second error");
    });
  });

  describe("clearError", () => {
    it("should clear error message when element exists", () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg!.textContent = "Some error";
      clearError();

      expect(errorMsg!.textContent).toBe("");
    });

    it("should not throw when element is null", () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg?.remove();

      expect(() => clearError()).not.toThrow();
    });

    it("should clear already empty error", () => {
      const errorMsg = document.getElementById("error-msg");
      errorMsg!.textContent = "";
      clearError();

      expect(errorMsg!.textContent).toBe("");
    });
  });
});

