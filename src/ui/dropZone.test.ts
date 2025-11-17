import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { collapseDropZone, expandDropZone } from './dropZone.js';

describe('dropZone utilities', () => {
  let container: HTMLElement;
  let dropZone: HTMLElement;

  beforeEach(() => {
    // Create mock DOM elements
    container = document.createElement('div');
    container.className = 'path-input-container';
    document.body.appendChild(container);

    dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    dropZone.className = 'drop-zone';
    container.appendChild(dropZone);
  });

  afterEach(() => {
    // Clean up
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('collapseDropZone', () => {
    it('should add collapsed class to container and drop zone', () => {
      collapseDropZone();

      const containerEl = document.querySelector('.path-input-container');
      const dropZoneEl = document.querySelector('#drop-zone');

      expect(containerEl?.classList.contains('collapsed')).toBe(true);
      expect(dropZoneEl?.classList.contains('collapsed')).toBe(true);
    });
  });

  describe('expandDropZone', () => {
    it('should remove collapsed class from container and drop zone', () => {
      // First collapse
      collapseDropZone();
      const containerEl = document.querySelector('.path-input-container');
      const dropZoneEl = document.querySelector('#drop-zone');
      expect(containerEl?.classList.contains('collapsed')).toBe(true);
      expect(dropZoneEl?.classList.contains('collapsed')).toBe(true);

      // Then expand
      expandDropZone();
      expect(containerEl?.classList.contains('collapsed')).toBe(false);
      expect(dropZoneEl?.classList.contains('collapsed')).toBe(false);
    });

    it('should handle elements that are already expanded', () => {
      expandDropZone();
      // Should not throw
      const containerEl = document.querySelector('.path-input-container');
      const dropZoneEl = document.querySelector('#drop-zone');
      expect(containerEl?.classList.contains('collapsed')).toBe(false);
      expect(dropZoneEl?.classList.contains('collapsed')).toBe(false);
    });
  });
});

