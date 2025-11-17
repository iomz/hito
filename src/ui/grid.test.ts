import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearImageGrid, removeSentinel, removeImageFromGrid } from './grid.js';
import { elements } from '../state.js';

describe('grid utilities', () => {
  beforeEach(() => {
    // Create a mock image grid element
    const mockGrid = document.createElement('div');
    mockGrid.id = 'image-grid';
    mockGrid.className = 'image-grid';
    document.body.appendChild(mockGrid);
    elements.imageGrid = mockGrid;
  });

  afterEach(() => {
    // Clean up
    const grid = document.getElementById('image-grid');
    if (grid) {
      document.body.removeChild(grid);
    }
    elements.imageGrid = null;
  });

  describe('clearImageGrid', () => {
    it('should clear all children from the grid', () => {
      if (!elements.imageGrid) return;

      // Add some children
      const child1 = document.createElement('div');
      const child2 = document.createElement('div');
      elements.imageGrid.appendChild(child1);
      elements.imageGrid.appendChild(child2);

      expect(elements.imageGrid.children.length).toBe(2);

      clearImageGrid();

      expect(elements.imageGrid.children.length).toBe(0);
    });

    it('should do nothing if imageGrid is null', () => {
      elements.imageGrid = null;
      // Should not throw
      expect(() => clearImageGrid()).not.toThrow();
    });
  });

  describe('removeSentinel', () => {
    it('should remove sentinel element if it exists', () => {
      if (!elements.imageGrid) return;

      const sentinel = document.createElement('div');
      sentinel.id = 'load-more-sentinel';
      elements.imageGrid.appendChild(sentinel);

      expect(document.getElementById('load-more-sentinel')).not.toBeNull();

      removeSentinel();

      expect(document.getElementById('load-more-sentinel')).toBeNull();
    });

    it('should do nothing if sentinel does not exist', () => {
      // Should not throw
      expect(() => removeSentinel()).not.toThrow();
    });
  });

  describe('removeImageFromGrid', () => {
    it('should remove image item with matching data-image-path', () => {
      if (!elements.imageGrid) return;

      const imageItem1 = document.createElement('div');
      imageItem1.className = 'image-item';
      imageItem1.setAttribute('data-image-path', '/path/to/image1.jpg');
      elements.imageGrid.appendChild(imageItem1);

      const imageItem2 = document.createElement('div');
      imageItem2.className = 'image-item';
      imageItem2.setAttribute('data-image-path', '/path/to/image2.jpg');
      elements.imageGrid.appendChild(imageItem2);

      expect(elements.imageGrid.children.length).toBe(2);

      removeImageFromGrid('/path/to/image1.jpg');

      expect(elements.imageGrid.children.length).toBe(1);
      expect(elements.imageGrid.children[0].getAttribute('data-image-path')).toBe('/path/to/image2.jpg');
    });

    it('should do nothing if no matching image path found', () => {
      if (!elements.imageGrid) return;

      const imageItem = document.createElement('div');
      imageItem.className = 'image-item';
      imageItem.setAttribute('data-image-path', '/path/to/image1.jpg');
      elements.imageGrid.appendChild(imageItem);

      expect(elements.imageGrid.children.length).toBe(1);

      removeImageFromGrid('/path/to/nonexistent.jpg');

      expect(elements.imageGrid.children.length).toBe(1);
    });

    it('should do nothing if imageGrid is null', () => {
      elements.imageGrid = null;
      // Should not throw
      expect(() => removeImageFromGrid('/path/to/image.jpg')).not.toThrow();
    });
  });
});

