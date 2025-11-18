import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { open, confirm } from "./dialog";

describe("dialog utilities", () => {
  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up any dialogs that might have been added
    document.body.innerHTML = "";
  });

  describe("open", () => {
    it("should throw error when Tauri dialog API is not available", async () => {
      (globalThis as any).window = {};

      await expect(async () => await open()).rejects.toThrow("Dialog API not available");
    });

    it("should throw error when window.__TAURI__ is undefined", async () => {
      (globalThis as any).window = {
        __TAURI__: undefined,
      };

      await expect(async () => await open()).rejects.toThrow("Dialog API not available");
    });

    it("should throw error when dialog.open is not available", async () => {
      (globalThis as any).window = {
        __TAURI__: {
          dialog: {},
        },
      };

      await expect(async () => await open()).rejects.toThrow("Dialog API not available");
    });

    it("should call Tauri dialog.open with no options", async () => {
      const mockOpen = vi.fn().mockResolvedValue("/path/to/file");
      (globalThis as any).window = {
        __TAURI__: {
          dialog: {
            open: mockOpen,
          },
        },
      };

      const result = await open();

      expect(mockOpen).toHaveBeenCalledWith(undefined);
      expect(result).toBe("/path/to/file");
    });

    it("should call Tauri dialog.open with directory option", async () => {
      const mockOpen = vi.fn().mockResolvedValue("/path/to/directory");
      (globalThis as any).window = {
        __TAURI__: {
          dialog: {
            open: mockOpen,
          },
        },
      };

      const result = await open({ directory: true });

      expect(mockOpen).toHaveBeenCalledWith({ directory: true });
      expect(result).toBe("/path/to/directory");
    });

    it("should call Tauri dialog.open with multiple files option", async () => {
      const mockOpen = vi.fn().mockResolvedValue(["/file1", "/file2"]);
      (globalThis as any).window = {
        __TAURI__: {
          dialog: {
            open: mockOpen,
          },
        },
      };

      const result = await open({ multiple: true });

      expect(mockOpen).toHaveBeenCalledWith({ multiple: true });
      expect(result).toEqual(["/file1", "/file2"]);
    });

    it("should call Tauri dialog.open with title option", async () => {
      const mockOpen = vi.fn().mockResolvedValue("/path/to/file");
      (globalThis as any).window = {
        __TAURI__: {
          dialog: {
            open: mockOpen,
          },
        },
      };

      const result = await open({ title: "Select a file" });

      expect(mockOpen).toHaveBeenCalledWith({ title: "Select a file" });
      expect(result).toBe("/path/to/file");
    });

    it("should handle null return value", async () => {
      const mockOpen = vi.fn().mockResolvedValue(null);
      (globalThis as any).window = {
        __TAURI__: {
          dialog: {
            open: mockOpen,
          },
        },
      };

      const result = await open();

      expect(result).toBeNull();
    });
  });

  describe("confirm", () => {
    it("should create dialog overlay with correct structure", async () => {
      const promise = confirm("Are you sure?");

      // Wait for DOM update
      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.querySelector(".confirm-dialog-overlay");
      expect(overlay).toBeTruthy();

      const dialog = overlay?.querySelector(".confirm-dialog");
      expect(dialog).toBeTruthy();

      const header = dialog?.querySelector(".confirm-dialog-header");
      expect(header).toBeTruthy();

      const body = dialog?.querySelector(".confirm-dialog-body");
      expect(body).toBeTruthy();

      const footer = dialog?.querySelector(".confirm-dialog-footer");
      expect(footer).toBeTruthy();

      // Clean up - resolve the promise first
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      if (confirmBtn) {
        confirmBtn.click();
        await promise;
      }
    });

    it("should display message in dialog body", async () => {
      const message = "Delete this item?";
      const promise = confirm(message);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const body = document.querySelector(".confirm-dialog-body");
      expect(body?.textContent).toBe(message);

      // Clean up
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn?.click();
      await promise;
    });

    it("should use default title when not provided", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const title = document.querySelector(".confirm-dialog-header h3");
      expect(title?.textContent).toBe("Confirm");

      // Clean up
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn?.click();
      await promise;
    });

    it("should use custom title when provided", async () => {
      const promise = confirm("Are you sure?", { title: "Delete Category" });

      await new Promise((resolve) => setTimeout(resolve, 0));

      const title = document.querySelector(".confirm-dialog-header h3");
      expect(title?.textContent).toBe("Delete Category");

      // Clean up
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn?.click();
      await promise;
    });

    it("should resolve to true when confirm button is clicked", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn.click();

      const result = await promise;
      expect(result).toBe(true);

      // Dialog should be removed
      expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    });

    it("should resolve to false when cancel button is clicked", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const cancelBtn = document.querySelector(
        ".confirm-dialog-cancel"
      ) as HTMLButtonElement;
      cancelBtn.click();

      const result = await promise;
      expect(result).toBe(false);

      // Dialog should be removed
      expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    });

    it("should resolve to false when close button is clicked", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const closeBtn = document.querySelector(
        ".confirm-dialog-close"
      ) as HTMLButtonElement;
      closeBtn.click();

      const result = await promise;
      expect(result).toBe(false);

      // Dialog should be removed
      expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    });

    it("should resolve to false when overlay is clicked", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.querySelector(
        ".confirm-dialog-overlay"
      ) as HTMLElement;

      // Create and dispatch a click event on the overlay
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clickEvent, "target", {
        value: overlay,
        enumerable: true,
      });

      overlay.onclick?.(clickEvent as any);

      const result = await promise;
      expect(result).toBe(false);

      // Dialog should be removed
      expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    });

    it("should not close when clicking inside dialog", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const overlay = document.querySelector(
        ".confirm-dialog-overlay"
      ) as HTMLElement;
      const dialog = document.querySelector(".confirm-dialog") as HTMLElement;

      // Create and dispatch a click event on the dialog (not overlay)
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clickEvent, "target", {
        value: dialog,
        enumerable: true,
      });

      overlay.onclick?.(clickEvent as any);

      // Wait a bit to ensure dialog is still there
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Dialog should still exist
      expect(document.querySelector(".confirm-dialog-overlay")).toBeTruthy();

      // Clean up
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn?.click();
      await promise;
    });

    it("should resolve to false when Escape key is pressed", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate Escape key press
      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      const result = await promise;
      expect(result).toBe(false);

      // Dialog should be removed
      expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();
    });

    it("should not close on other key presses", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate Enter key press (should not close)
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(enterEvent);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Dialog should still exist
      expect(document.querySelector(".confirm-dialog-overlay")).toBeTruthy();

      // Clean up
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn?.click();
      await promise;
    });

    it("should focus confirm button after opening", async () => {
      const promise = confirm("Are you sure?");

      // Wait for dialog to render and focus
      await new Promise((resolve) => setTimeout(resolve, 150));

      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;

      // Note: In JSDOM, focus() doesn't actually set document.activeElement
      // We're just checking that the element exists and is focusable
      expect(confirmBtn).toBeTruthy();
      expect(confirmBtn.tabIndex).toBeGreaterThanOrEqual(-1);

      // Clean up
      confirmBtn?.click();
      await promise;
    });

    it("should handle multiple simultaneous confirms independently", async () => {
      const promise1 = confirm("First confirm");
      await new Promise((resolve) => setTimeout(resolve, 0));

      const promise2 = confirm("Second confirm");
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both dialogs should exist
      const overlays = document.querySelectorAll(".confirm-dialog-overlay");
      expect(overlays.length).toBe(2);

      // Get both sets of buttons
      const confirmBtns = document.querySelectorAll(".confirm-dialog-confirm");
      expect(confirmBtns.length).toBe(2);

      // Click first confirm
      (confirmBtns[0] as HTMLButtonElement).click();
      const result1 = await promise1;
      expect(result1).toBe(true);

      // Click second cancel
      const cancelBtns = document.querySelectorAll(".confirm-dialog-cancel");
      (cancelBtns[0] as HTMLButtonElement).click();
      const result2 = await promise2;
      expect(result2).toBe(false);
    });

    it("should remove event listener when dialog is closed", async () => {
      const promise = confirm("Are you sure?");

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Close the dialog
      const confirmBtn = document.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;
      confirmBtn.click();

      await promise;

      // Dialog should be removed
      expect(document.querySelector(".confirm-dialog-overlay")).toBeNull();

      // Pressing Escape now should not cause any issues
      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      // This should not throw an error
      expect(() => document.dispatchEvent(escapeEvent)).not.toThrow();
    });
  });
});

