import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("notification", () => {
  beforeEach(() => {
    // Clear any existing notification bar
    const existing = document.getElementById("notification-bar");
    if (existing) {
      existing.remove();
    }

    // Create notification bar element BEFORE importing the module
    // This ensures querySelector finds it when the module initializes
    const bar = document.createElement("div");
    bar.id = "notification-bar";
    document.body.appendChild(bar);

    // Reset the module's cached reference by re-importing
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    const bar = document.getElementById("notification-bar");
    if (bar) {
      bar.remove();
    }
  });

  describe("showNotification", () => {
    it("should show notification with default duration", async () => {
      const { showNotification } = await import("./notification.js");
      showNotification("Test message");

      const bar = document.getElementById("notification-bar");
      expect(bar!.textContent).toBe("Test message");
      expect(bar!.classList.contains("show")).toBe(true);
    });

    it("should show notification with custom duration", async () => {
      const { showNotification } = await import("./notification.js");
      showNotification("Test message", 5000);

      const bar = document.getElementById("notification-bar");
      expect(bar!.textContent).toBe("Test message");
      expect(bar!.classList.contains("show")).toBe(true);
    });

    it("should auto-hide after duration", async () => {
      const { showNotification } = await import("./notification.js");
      showNotification("Test message", 3000);

      const bar = document.getElementById("notification-bar");
      expect(bar!.classList.contains("show")).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(bar!.classList.contains("show")).toBe(false);
    });

    it("should clear previous timeout when showing new notification", async () => {
      const { showNotification } = await import("./notification.js");
      showNotification("First message", 5000);
      vi.advanceTimersByTime(2000);
      showNotification("Second message", 5000);

      const bar = document.getElementById("notification-bar");
      if (!bar) {
        throw new Error("Notification bar not found");
      }
      expect(bar.textContent).toBe("Second message");

      vi.advanceTimersByTime(3000);
      // Should still be visible because new timeout is 5000ms
      expect(bar.classList.contains("show")).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(bar.classList.contains("show")).toBe(false);
    });

    it("should not throw when notification bar is missing", async () => {
      const { showNotification } = await import("./notification.js");
      const bar = document.getElementById("notification-bar");
      bar?.remove();

      expect(() => showNotification("Test")).not.toThrow();
    });
  });

  describe("hideNotification", () => {
    it("should hide visible notification", async () => {
      const { showNotification, hideNotification } = await import("./notification.js");
      showNotification("Test message");
      const bar = document.getElementById("notification-bar");
      if (!bar) {
        throw new Error("Notification bar not found");
      }
      expect(bar.classList.contains("show")).toBe(true);

      hideNotification();

      expect(bar.classList.contains("show")).toBe(false);
    });

    it("should clear timeout when hiding", async () => {
      const { showNotification, hideNotification } = await import("./notification.js");
      showNotification("Test message", 5000);
      hideNotification();

      vi.advanceTimersByTime(5000);

      const bar = document.getElementById("notification-bar");
      if (!bar) {
        throw new Error("Notification bar not found");
      }
      // Should remain hidden
      expect(bar.classList.contains("show")).toBe(false);
    });

    it("should not throw when notification bar is missing", async () => {
      const { hideNotification } = await import("./notification.js");
      const bar = document.getElementById("notification-bar");
      bar?.remove();

      expect(() => hideNotification()).not.toThrow();
    });

    it("should hide already hidden notification", async () => {
      const { hideNotification } = await import("./notification.js");
      const bar = document.getElementById("notification-bar");
      if (!bar) {
        throw new Error("Notification bar not found");
      }
      bar.classList.remove("show");

      hideNotification();

      expect(bar.classList.contains("show")).toBe(false);
    });
  });
});

