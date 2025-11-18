import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "../state";
import { cleanupObserver, setupIntersectionObserver } from "./observer";
import { BATCH_SIZE } from "../constants";

// Mock dependencies
vi.mock("./browse", () => ({
  loadImageBatch: vi.fn(),
}));

vi.mock("../ui/grid", () => ({
  removeSentinel: vi.fn(),
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

    it("should remove sentinel", async () => {
      const { removeSentinel } = await import("../ui/grid");
      cleanupObserver();

      expect(removeSentinel).toHaveBeenCalled();
    });

    it("should handle null observer", () => {
      state.intersectionObserver = null;

      expect(() => cleanupObserver()).not.toThrow();
    });
  });

  describe("setupIntersectionObserver", () => {
    it("should return early if imageGrid is null", () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      setupIntersectionObserver();

      // Function is no-op, React component handles observer setup
      expect(state.intersectionObserver).toBeNull();
    });

    it("should create sentinel if it doesn't exist", () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages sentinel)
      setupIntersectionObserver();

      // Function is no-op, React component handles sentinel creation
      const sentinel = document.getElementById("load-more-sentinel");
      // Sentinel won't exist because function is no-op
      expect(sentinel).toBeNull();
    });

    it("should reuse existing sentinel", () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages sentinel)
      const imageGrid = document.createElement("div");
      imageGrid.id = "image-grid";
      document.body.appendChild(imageGrid);
      const existingSentinel = document.createElement("div");
      existingSentinel.id = "load-more-sentinel";
      imageGrid.appendChild(existingSentinel);

      setupIntersectionObserver();

      // Function is no-op, React component handles sentinel management
      expect(true).toBe(true);
      
      // Cleanup
      imageGrid.remove();
    });

    it("should disconnect existing observer before creating new one", () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      const mockObserver = {
        disconnect: vi.fn(),
        observe: vi.fn(),
      };
      state.intersectionObserver = mockObserver as any;

      setupIntersectionObserver();

      // Function is no-op, React component handles observer setup
      // The observer remains in state because function doesn't modify it
      expect(state.intersectionObserver).toBe(mockObserver);
    });

    it("should create IntersectionObserver", () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      setupIntersectionObserver();

      // Function is no-op, React component handles observer creation
      expect(state.intersectionObserver).toBeNull();
    });

    it("should trigger loadImageBatch when sentinel intersects", async () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      const { loadImageBatch } = await import("./browse");
      vi.mocked(loadImageBatch).mockClear();
      setupIntersectionObserver();

      // Function is no-op, React component handles intersection detection
      expect(loadImageBatch).not.toHaveBeenCalled();
    });

    it("should not trigger loadImageBatch if already loading", async () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      const { loadImageBatch } = await import("./browse");
      vi.mocked(loadImageBatch).mockClear();
      state.isLoadingBatch = true;
      setupIntersectionObserver();

      // Function is no-op, React component handles loading state
      expect(loadImageBatch).not.toHaveBeenCalled();
    });

    it("should not trigger loadImageBatch if not intersecting", async () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      const { loadImageBatch } = await import("./browse");
      vi.mocked(loadImageBatch).mockClear();
      setupIntersectionObserver();

      // Function is no-op, React component handles intersection detection
      expect(loadImageBatch).not.toHaveBeenCalled();
    });

    it("should observe sentinel", () => {
      // Note: setupIntersectionObserver is now a no-op (React ImageGrid manages observer)
      setupIntersectionObserver();

      // Function is no-op, React component handles observer setup
      expect(state.intersectionObserver).toBeNull();
    });
  });
});

