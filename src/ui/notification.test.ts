import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { showNotification, hideNotification } from "../components/NotificationBar";

describe("notification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset notification state
    hideNotification();
  });

  describe("showNotification", () => {
    it("should not throw when called", () => {
      expect(() => showNotification("Test message")).not.toThrow();
    });

    it("should not throw with custom duration", () => {
      expect(() => showNotification("Test message", 5000)).not.toThrow();
    });

    it("should not throw when notification bar is missing", () => {
      expect(() => showNotification("Test")).not.toThrow();
    });
  });

  describe("hideNotification", () => {
    it("should not throw when called", () => {
      expect(() => hideNotification()).not.toThrow();
    });

    it("should not throw when notification bar is missing", () => {
      expect(() => hideNotification()).not.toThrow();
    });
  });
});

