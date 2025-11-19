import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from './state';

describe('state', () => {
  beforeEach(() => {
    // Reset state before each test
    state.reset();
  });

  describe('subscribe', () => {
    it('should add a listener and return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = state.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');

      // Test notification
      state.notify();
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      state.notify();
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should allow multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state.subscribe(listener1);
      state.subscribe(listener2);

      state.notify();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should allow unsubscribing multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = state.subscribe(listener1);
      const unsubscribe2 = state.subscribe(listener2);

      unsubscribe1();
      unsubscribe2();

      state.notify();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('notify', () => {
    it('should call all subscribed listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      state.subscribe(listener1);
      state.subscribe(listener2);
      state.subscribe(listener3);

      state.notify();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should not call unsubscribed listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = state.subscribe(listener1);
      state.subscribe(listener2);

      unsubscribe1();
      state.notify();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle no listeners gracefully', () => {
      expect(() => state.notify()).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset all state properties to initial values', () => {
      // Set some state
      state.allImagePaths = [{ path: '/test/image.png' }];
      state.allDirectoryPaths = [{ path: '/test' }];
      state.currentIndex = 5;
      state.isLoadingBatch = true;
      state.loadedImages.set('/test/image.png', 'data-url');
      state.currentModalIndex = 2;
      state.isDeletingImage = true;
      state.hotkeys = [{ id: '1', key: 'A', modifiers: [], action: 'test' }];
      state.isHotkeySidebarOpen = true;
      state.categories = [{ id: '1', name: 'Test', color: '#000' }];
      state.imageCategories.set('/test/image.png', ['cat1']);
      state.currentDirectory = '/test/dir';
      state.configFilePath = '/test/config.json';
      state.shortcutsOverlayVisible = true;
      state.categoryDialogVisible = true;
      state.categoryDialogCategory = { id: '1', name: 'Test', color: '#000' };
      state.hotkeyDialogVisible = true;
      state.hotkeyDialogHotkey = { id: '1', key: 'A', modifiers: [], action: 'test' };
      state.isLoading = true;
      state.errorMessage = 'Test error';
      const resetCounterBefore = state.resetCounter;

      state.reset();

      expect(state.allImagePaths).toEqual([]);
      expect(state.allDirectoryPaths).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.isLoadingBatch).toBe(false);
      expect(state.loadedImages.size).toBe(0);
      expect(state.currentModalIndex).toBe(-1);
      expect(state.isDeletingImage).toBe(false);
      expect(state.hotkeys).toEqual([]);
      expect(state.isHotkeySidebarOpen).toBe(false);
      expect(state.categories).toEqual([]);
      expect(state.imageCategories.size).toBe(0);
      expect(state.currentDirectory).toBe('');
      expect(state.configFilePath).toBe('');
      expect(state.resetCounter).toBe(resetCounterBefore + 1);
      expect(state.shortcutsOverlayVisible).toBe(false);
      expect(state.categoryDialogVisible).toBe(false);
      expect(state.categoryDialogCategory).toBeUndefined();
      expect(state.hotkeyDialogVisible).toBe(false);
      expect(state.hotkeyDialogHotkey).toBeUndefined();
      expect(state.isLoading).toBe(false);
      expect(state.errorMessage).toBe('');
    });

    it('should notify listeners after reset', () => {
      const listener = vi.fn();

      state.subscribe(listener);
      state.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should increment resetCounter on each reset', () => {
      const initialCounter = state.resetCounter;

      state.reset();
      expect(state.resetCounter).toBe(initialCounter + 1);

      state.reset();
      expect(state.resetCounter).toBe(initialCounter + 2);

      state.reset();
      expect(state.resetCounter).toBe(initialCounter + 3);
    });
  });
});

