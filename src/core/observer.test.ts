import { describe, it, expect, beforeEach, vi } from "vitest";
import { state, elements } from "../state.js";
import { cleanupObserver, setupIntersectionObserver } from "./observer.js";
import { BATCH_SIZE } from "../constants.js";

// Mock dependencies
vi.mock("./browse.js", () => ({
  loadImageBatch: vi.fn(),
}));

vi.mock("../ui/grid.js", () => ({
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

    // Setup DOM
    elements.imageGrid = document.createElement("div");
    document.body.appendChild(elements.imageGrid);

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
      const { removeSentinel } = await import("../ui/grid.js");
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
      elements.imageGrid = null;

      setupIntersectionObserver();

      expect(state.intersectionObserver).toBeNull();
    });

    it("should create sentinel if it doesn't exist", () => {
      setupIntersectionObserver();

      const sentinel = document.getElementById("load-more-sentinel");
      expect(sentinel).not.toBeNull();
      expect(sentinel!.style.height).toBe("100px");
    });

    it("should reuse existing sentinel", () => {
      const existingSentinel = document.createElement("div");
      existingSentinel.id = "load-more-sentinel";
      elements.imageGrid!.appendChild(existingSentinel);

      setupIntersectionObserver();

      const sentinels = elements.imageGrid!.querySelectorAll("#load-more-sentinel");
      expect(sentinels.length).toBe(1);
    });

    it("should disconnect existing observer before creating new one", () => {
      const mockObserver = {
        disconnect: vi.fn(),
        observe: vi.fn(),
      };
      state.intersectionObserver = mockObserver as any;

      setupIntersectionObserver();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it("should create IntersectionObserver", () => {
      setupIntersectionObserver();

      expect(state.intersectionObserver).not.toBeNull();
      expect(state.intersectionObserver).toBeInstanceOf(IntersectionObserver);
    });

    it("should trigger loadImageBatch when sentinel intersects", async () => {
      const { loadImageBatch } = await import("./browse.js");
      vi.mocked(loadImageBatch).mockClear();
      setupIntersectionObserver();

      const observer = state.intersectionObserver as any;
      const sentinel = document.getElementById("load-more-sentinel")!;

      // Simulate intersection
      const mockEntry = {
        isIntersecting: true,
      };
      observer.callback([mockEntry]);

      expect(loadImageBatch).toHaveBeenCalledWith(0, BATCH_SIZE);
      expect(state.currentIndex).toBe(BATCH_SIZE);
    });

    it("should not trigger loadImageBatch if already loading", async () => {
      const { loadImageBatch } = await import("./browse.js");
      vi.mocked(loadImageBatch).mockClear();
      state.isLoadingBatch = true;
      setupIntersectionObserver();

      const observer = state.intersectionObserver as any;
      const mockEntry = {
        isIntersecting: true,
      };
      observer.callback([mockEntry]);

      expect(loadImageBatch).not.toHaveBeenCalled();
    });

    it("should not trigger loadImageBatch if not intersecting", async () => {
      const { loadImageBatch } = await import("./browse.js");
      vi.mocked(loadImageBatch).mockClear();
      setupIntersectionObserver();

      const observer = state.intersectionObserver as any;
      const mockEntry = {
        isIntersecting: false,
      };
      observer.callback([mockEntry]);

      expect(loadImageBatch).not.toHaveBeenCalled();
    });

    it("should observe sentinel", () => {
      setupIntersectionObserver();

      const observer = state.intersectionObserver as any;
      const sentinel = document.getElementById("load-more-sentinel")!;

      // The observer should have been created and should observe the sentinel
      expect(state.intersectionObserver).not.toBeNull();
      expect(sentinel).not.toBeNull();
      // Verify the sentinel was observed
      expect(observer.observedElement).toBe(sentinel);
    });
  });
});

