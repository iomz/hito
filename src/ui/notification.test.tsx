import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, act, cleanup, screen } from "@testing-library/react";
import { showNotification, hideNotification, NotificationBar } from "../components/NotificationBar";

describe("notification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<NotificationBar />);
  });

  afterEach(() => {
    cleanup();
    hideNotification();
    vi.useRealTimers();
  });

  describe("showNotification", () => {
    it("should insert notification element and set textContent correctly", () => {
      const message = "Test message";
      act(() => {
        showNotification(message);
      });

      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.textContent).toBe(message);
    });

    it("should make notification visible by adding show class", () => {
      act(() => {
        showNotification("Test message");
      });

      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.classList.contains("show")).toBe(true);
    });

    it("should update notification message when called multiple times", () => {
      act(() => {
        showNotification("First message");
      });
      let notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.textContent).toBe("First message");

      act(() => {
        showNotification("Second message");
      });
      notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.textContent).toBe("Second message");
      expect(notificationBar.classList.contains("show")).toBe(true);
    });

    it("should auto-hide after default duration (3000ms)", () => {
      act(() => {
        showNotification("Test message");
      });
      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Advance timers by default duration
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Notification should be hidden
      expect(notificationBar.classList.contains("show")).toBe(false);
    });

    it("should auto-hide after custom duration", () => {
      const customDuration = 5000;
      act(() => {
        showNotification("Test message", customDuration);
      });
      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Advance timers by less than duration - should still be visible
      act(() => {
        vi.advanceTimersByTime(customDuration - 1000);
      });
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Advance timers to complete duration - should be hidden
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(notificationBar.classList.contains("show")).toBe(false);
    });

    it("should reset auto-hide timer when called multiple times", () => {
      act(() => {
        showNotification("First message", 5000);
      });
      let notificationBar = screen.getByTestId("notification-bar");

      // Advance timers by 4000ms
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Show new notification - should reset timer
      act(() => {
        showNotification("Second message", 5000);
      });
      notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.textContent).toBe("Second message");
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Advance by another 4000ms (total 8000ms from first, but only 4000ms from second)
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Advance by remaining 1000ms to complete second notification's duration
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(notificationBar.classList.contains("show")).toBe(false);
    });
  });

  describe("hideNotification", () => {
    it("should hide notification element by removing show class", () => {
      act(() => {
        showNotification("Test message");
      });
      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.classList.contains("show")).toBe(true);

      act(() => {
        hideNotification();
      });

      expect(notificationBar.classList.contains("show")).toBe(false);
    });

    it("should cancel auto-hide timer when called", () => {
      act(() => {
        showNotification("Test message", 5000);
      });
      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.classList.contains("show")).toBe(true);

      // Hide notification manually
      act(() => {
        hideNotification();
      });
      expect(notificationBar.classList.contains("show")).toBe(false);

      // Advance timers - notification should remain hidden
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(notificationBar.classList.contains("show")).toBe(false);
    });

    it("should not throw when called without showing notification first", () => {
      expect(() => {
        act(() => {
          hideNotification();
        });
      }).not.toThrow();
      const notificationBar = screen.getByTestId("notification-bar");
      expect(notificationBar.classList.contains("show")).toBe(false);
    });
  });
});

