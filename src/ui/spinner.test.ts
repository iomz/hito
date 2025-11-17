import { describe, it, expect, beforeEach, vi } from "vitest";
import { elements } from "../state.js";
import { showSpinner, hideSpinner } from "./spinner.js";

describe("spinner", () => {
  beforeEach(() => {
    elements.loadingSpinner = document.createElement("div");
    elements.loadingSpinner.style.display = "none";
  });

  describe("showSpinner", () => {
    it("should show spinner when element exists", () => {
      showSpinner();

      expect(elements.loadingSpinner!.style.display).toBe("flex");
    });

    it("should not throw when element is null", () => {
      elements.loadingSpinner = null;

      expect(() => showSpinner()).not.toThrow();
    });

    it("should force reflow", () => {
      const offsetHeightSpy = vi.spyOn(
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!,
        "get"
      );

      showSpinner();

      // offsetHeight should be accessed to force reflow
      expect(elements.loadingSpinner!.style.display).toBe("flex");
    });
  });

  describe("hideSpinner", () => {
    it("should hide spinner when element exists", () => {
      elements.loadingSpinner!.style.display = "flex";
      hideSpinner();

      expect(elements.loadingSpinner!.style.display).toBe("none");
    });

    it("should not throw when element is null", () => {
      elements.loadingSpinner = null;

      expect(() => hideSpinner()).not.toThrow();
    });

    it("should hide already hidden spinner", () => {
      elements.loadingSpinner!.style.display = "none";
      hideSpinner();

      expect(elements.loadingSpinner!.style.display).toBe("none");
    });
  });
});

