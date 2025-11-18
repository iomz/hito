import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../state";
import { cleanupObserver } from "./observer";
import { BATCH_SIZE } from "../constants";

// Mock dependencies
vi.mock("./browse", () => ({
  loadImageBatch: vi.fn(),
}));


// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: (entries: IntersectionObserverEntry[]) => void;
  observedElement: Element | null = null;
  
  constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
    this.callback = callback;
  }
  
  observe(element: Element) {
    this.observedElement = element;
  }
  
  disconnect() {
    this.observedElement = null;
  }
  
  unobserve() {
    this.observedElement = null;
  }
}

(globalThis as any).IntersectionObserver = MockIntersectionObserver;

describe("observer", () => {
  beforeEach(() => {
    // Reset state
    state.intersectionObserver = null;
    state.currentIndex = 0;
    state.isLoadingBatch = false;

    // Clear any existing sentinel
    const existing = document.getElementById("load-more-sentinel");
    if (existing) {
      existing.remove();
    }
  });

  describe("cleanupObserver", () => {
    it("should disconnect existing observer", () => {
      const mockObserver = {
        disconnect: vi.fn(),
      };
      state.intersectionObserver = mockObserver as any;

      cleanupObserver();

      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(state.intersectionObserver).toBeNull();
    });


    it("should handle null observer", () => {
      state.intersectionObserver = null;

      expect(() => cleanupObserver()).not.toThrow();
    });
  });

});

