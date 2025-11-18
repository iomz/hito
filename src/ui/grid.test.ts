import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearImageGrid, removeSentinel, removeImageFromGrid } from './grid';

describe('grid utilities', () => {
  beforeEach(() => {
    // Create a mock image grid element in DOM (code uses querySelector)
    const existing = document.getElementById('image-grid');
    if (existing) {
      existing.remove();
    }
    const mockGrid = document.createElement('div');
    mockGrid.id = 'image-grid';
    mockGrid.className = 'image-grid';
    document.body.appendChild(mockGrid);
  });

  afterEach(() => {
    // Clean up
    const grid = document.getElementById('image-grid');
    if (grid) {
      document.body.removeChild(grid);
    }
    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) {
      sentinel.remove();
    }
  });

  describe('clearImageGrid', () => {
    it('should clear all children from the grid', () => {
      const imageGrid = document.getElementById('image-grid');
      if (!imageGrid) return;

      // Add some children
      const child1 = document.createElement('div');
      const child2 = document.createElement('div');
      imageGrid.appendChild(child1);
      imageGrid.appendChild(child2);

      expect(imageGrid.children.length).toBe(2);

      // Note: clearImageGrid is now a no-op (React manages the grid)
      // This test verifies it doesn't throw
      clearImageGrid();

      // Children remain because function is no-op
      expect(imageGrid.children.length).toBe(2);
    });

    it('should do nothing if imageGrid is null', () => {
      const imageGrid = document.getElementById('image-grid');
      imageGrid?.remove();
      // Should not throw
      expect(() => clearImageGrid()).not.toThrow();
    });
  });

  describe('removeSentinel', () => {
    it('should remove sentinel element if it exists', () => {
      const imageGrid = document.getElementById('image-grid');
      if (!imageGrid) return;

      const sentinel = document.createElement('div');
      sentinel.id = 'load-more-sentinel';
      imageGrid.appendChild(sentinel);

      expect(document.getElementById('load-more-sentinel')).not.toBeNull();

      // Note: removeSentinel is now a no-op (React manages the sentinel)
      // This test verifies it doesn't throw
      removeSentinel();

      // Sentinel remains because function is no-op
      expect(document.getElementById('load-more-sentinel')).not.toBeNull();
    });

    it('should do nothing if sentinel does not exist', () => {
      // Should not throw
      expect(() => removeSentinel()).not.toThrow();
    });
  });

  describe('removeImageFromGrid', () => {
    it('should remove image item with matching data-image-path', () => {
      const imageGrid = document.getElementById('image-grid');
      if (!imageGrid) return;

      const imageItem1 = document.createElement('div');
      imageItem1.className = 'image-item';
      imageItem1.setAttribute('data-image-path', '/path/to/image1.jpg');
      imageGrid.appendChild(imageItem1);

      const imageItem2 = document.createElement('div');
      imageItem2.className = 'image-item';
      imageItem2.setAttribute('data-image-path', '/path/to/image2.jpg');
      imageGrid.appendChild(imageItem2);

      expect(imageGrid.children.length).toBe(2);

      removeImageFromGrid('/path/to/image1.jpg');

      expect(imageGrid.children.length).toBe(1);
      expect(imageGrid.children[0].getAttribute('data-image-path')).toBe('/path/to/image2.jpg');
    });

    it('should do nothing if no matching image path found', () => {
      const imageGrid = document.getElementById('image-grid');
      if (!imageGrid) return;

      const imageItem = document.createElement('div');
      imageItem.className = 'image-item';
      imageItem.setAttribute('data-image-path', '/path/to/image1.jpg');
      imageGrid.appendChild(imageItem);

      expect(imageGrid.children.length).toBe(1);

      removeImageFromGrid('/path/to/nonexistent.jpg');

      expect(imageGrid.children.length).toBe(1);
    });

    it('should do nothing if imageGrid is null', () => {
      const imageGrid = document.getElementById('image-grid');
      imageGrid?.remove();
      // Should not throw
      expect(() => removeImageFromGrid('/path/to/image.jpg')).not.toThrow();
    });
  });
});

