import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPlaceholder, createErrorPlaceholder, createImageElement, loadImageData } from './images.js';
import { state } from '../state';

// Mock the modal module
vi.mock('../ui/modal.js', () => ({
  openModal: vi.fn(),
}));

describe('image utilities', () => {
  beforeEach(() => {
    // Reset state
    state.allImagePaths = [];
    vi.clearAllMocks();
  });

  describe('createPlaceholder', () => {
    it('should create a placeholder div with Loading text', () => {
      const placeholder = createPlaceholder();

      expect(placeholder.tagName).toBe('DIV');
      expect(placeholder.className).toBe('image-placeholder');
      expect(placeholder.textContent).toBe('Loading...');
      expect(placeholder.style.color).toBe('rgb(153, 153, 153)');
      expect(placeholder.style.fontSize).toBe('0.9em');
    });
  });

  describe('createErrorPlaceholder', () => {
    it('should create an error placeholder div', () => {
      const errorDiv = createErrorPlaceholder();

      expect(errorDiv.tagName).toBe('DIV');
      expect(errorDiv.textContent).toBe('Failed to load');
      expect(errorDiv.style.backgroundColor).toBe('rgb(255, 238, 238)');
      expect(errorDiv.style.color).toBe('rgb(204, 51, 51)');
      expect(errorDiv.style.fontSize).toBe('0.9em');
      expect(errorDiv.style.padding).toBe('10px');
      expect(errorDiv.style.textAlign).toBe('center');
    });
  });

  describe('createImageElement', () => {
    it('should create an image element with correct attributes', () => {
      const imagePath = '/path/to/image.jpg';
      const dataUrl = 'data:image/jpeg;base64,testdata';
      
      state.allImagePaths = [{ path: imagePath }];

      const img = createImageElement(imagePath, dataUrl);

      expect(img.tagName).toBe('IMG');
      expect(img.src).toBe(dataUrl);
      expect(img.alt).toBe('image.jpg');
      expect(img.loading).toBe('lazy');
    });

    it('should extract filename from Unix path', () => {
      const imagePath = '/Users/iomz/Pictures/photo.png';
      const dataUrl = 'data:image/png;base64,test';
      
      state.allImagePaths = [{ path: imagePath }];

      const img = createImageElement(imagePath, dataUrl);
      expect(img.alt).toBe('photo.png');
    });

    it('should extract filename from Windows path', () => {
      const imagePath = 'C:\\Users\\iomz\\Pictures\\photo.png';
      const dataUrl = 'data:image/png;base64,test';
      
      state.allImagePaths = [{ path: imagePath }];

      const img = createImageElement(imagePath, dataUrl);
      expect(img.alt).toBe('photo.png');
    });

    it('should use full path as alt if no filename found', () => {
      const imagePath = 'image';
      const dataUrl = 'data:image/jpeg;base64,test';
      
      state.allImagePaths = [{ path: imagePath }];

      const img = createImageElement(imagePath, dataUrl);
      expect(img.alt).toBe('image');
    });

    it('should have error handler that sets fallback image', () => {
      const imagePath = '/path/to/image.jpg';
      const dataUrl = 'data:image/jpeg;base64,test';
      
      state.allImagePaths = [{ path: imagePath }];

      const img = createImageElement(imagePath, dataUrl);
      
      expect(img.onerror).toBeDefined();
      expect(typeof img.onerror).toBe('function');

      // Trigger error handler
      if (img.onerror) {
        img.onerror(new Event('error'));
      }

      expect(img.src).toContain('data:image/svg+xml');
    });

    it('should return early if allImagePaths is not an array', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (state as any).allImagePaths = null;
      const imagePath = '/path/to/image.jpg';
      const dataUrl = 'data:image/jpeg;base64,test';

      const img = createImageElement(imagePath, dataUrl);
      if (img.onclick) {
        img.onclick({} as any);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not open modal if image not found in allImagePaths', async () => {
      const { openModal } = await import('../ui/modal.js');
      state.allImagePaths = [{ path: '/other/image.jpg' }];
      const imagePath = '/path/to/image.jpg';
      const dataUrl = 'data:image/jpeg;base64,test';

      const img = createImageElement(imagePath, dataUrl);
      if (img.onclick) {
        img.onclick({} as any);
      }

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe('loadImageData', () => {
    beforeEach(() => {
      (window as any).__TAURI__ = {
        core: {
          invoke: vi.fn(),
        },
      };
      state.loadedImages.clear();
    });

    it('should load image data successfully', async () => {
      const { invoke } = window.__TAURI__!.core;
      const dataUrl = 'data:image/png;base64,testdata';
      vi.mocked(invoke).mockResolvedValueOnce(dataUrl);

      const result = await loadImageData('/test/image.png');

      expect(invoke).toHaveBeenCalledWith('load_image', { imagePath: '/test/image.png' });
      expect(result).toBe(dataUrl);
      expect(state.loadedImages.get('/test/image.png')).toBe(dataUrl);
    });

    it('should throw error when Tauri API is unavailable', async () => {
      (window as any).__TAURI__ = null;

      await expect(loadImageData('/test/image.png')).rejects.toThrow('Tauri invoke API not available');
    });

    it('should throw error when invalid data URL is returned', async () => {
      const { invoke } = window.__TAURI__!.core;
      vi.mocked(invoke).mockResolvedValueOnce(null);

      await expect(loadImageData('/test/image.png')).rejects.toThrow('Invalid data URL');
    });

    it('should throw error when non-string data URL is returned', async () => {
      const { invoke } = window.__TAURI__!.core;
      vi.mocked(invoke).mockResolvedValueOnce(123);

      await expect(loadImageData('/test/image.png')).rejects.toThrow('Invalid data URL');
    });

    it('should throw error when backend fails', async () => {
      const { invoke } = window.__TAURI__!.core;
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Backend error'));

      await expect(loadImageData('/test/image.png')).rejects.toThrow('Failed to load image');
    });

    it('should cache loaded images', async () => {
      const { invoke } = window.__TAURI__!.core;
      const dataUrl = 'data:image/png;base64,testdata';
      vi.mocked(invoke).mockResolvedValue(dataUrl);

      const result1 = await loadImageData('/test/image.png');
      const result2 = await loadImageData('/test/image.png');

      // loadImageData always calls invoke, but caches the result
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(result1).toBe(dataUrl);
      expect(result2).toBe(dataUrl);
      expect(state.loadedImages.get('/test/image.png')).toBe(dataUrl);
    });
  });
});

