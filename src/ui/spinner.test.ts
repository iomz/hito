import { describe, it, expect, beforeEach } from "vitest";
import { showSpinner, hideSpinner } from "./spinner";
import { state } from "../state";

describe("spinner", () => {
  beforeEach(() => {
    // Reset state
    state.isLoading = false;
  });

  describe("showSpinner", () => {
    it("should set isLoading state to true", () => {
      showSpinner();
      expect(state.isLoading).toBe(true);
    });

    it("should not throw when called", () => {
      expect(() => showSpinner()).not.toThrow();
    });

    it("should set isLoading to true even if already true", () => {
      state.isLoading = true;
      showSpinner();
      expect(state.isLoading).toBe(true);
    });
  });

  describe("hideSpinner", () => {
    it("should set isLoading state to false", () => {
      state.isLoading = true;
      hideSpinner();
      expect(state.isLoading).toBe(false);
    });

    it("should not throw when called", () => {
      expect(() => hideSpinner()).not.toThrow();
    });

    it("should set isLoading to false even if already false", () => {
      state.isLoading = false;
      hideSpinner();
      expect(state.isLoading).toBe(false);
    });
  });
});

