import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { showSpinner, hideSpinner } from "./spinner";

describe("spinner", () => {
  beforeEach(() => {
    // Create spinner element in DOM (code uses querySelector)
    const existing = document.getElementById("loading-spinner");
    if (existing) {
      existing.remove();
    }
    const loadingSpinner = document.createElement("div");
    loadingSpinner.id = "loading-spinner";
    loadingSpinner.style.display = "none";
    document.body.appendChild(loadingSpinner);
  });

  afterEach(() => {
    const loadingSpinner = document.getElementById("loading-spinner");
    if (loadingSpinner) {
      loadingSpinner.remove();
    }
  });

  describe("showSpinner", () => {
    it("should show spinner when element exists", () => {
      showSpinner();

      const loadingSpinner = document.getElementById("loading-spinner");
      expect(loadingSpinner!.style.display).toBe("flex");
    });

    it("should not throw when element is null", () => {
      const loadingSpinner = document.getElementById("loading-spinner");
      loadingSpinner?.remove();

      expect(() => showSpinner()).not.toThrow();
    });

    it("should force reflow", () => {
      const offsetHeightSpy = vi.spyOn(
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!,
        "get"
      );

      showSpinner();

      const loadingSpinner = document.getElementById("loading-spinner");
      // offsetHeight should be accessed to force reflow
      expect(loadingSpinner!.style.display).toBe("flex");
    });
  });

  describe("hideSpinner", () => {
    it("should hide spinner when element exists", () => {
      const loadingSpinner = document.getElementById("loading-spinner");
      loadingSpinner!.style.display = "flex";
      hideSpinner();

      expect(loadingSpinner!.style.display).toBe("none");
    });

    it("should not throw when element is null", () => {
      const loadingSpinner = document.getElementById("loading-spinner");
      loadingSpinner?.remove();

      expect(() => hideSpinner()).not.toThrow();
    });

    it("should hide already hidden spinner", () => {
      const loadingSpinner = document.getElementById("loading-spinner");
      loadingSpinner!.style.display = "none";
      hideSpinner();

      expect(loadingSpinner!.style.display).toBe("none");
    });
  });
});

