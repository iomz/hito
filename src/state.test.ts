import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './utils/jotaiStore';
import {
  allImagePathsAtom,
  allDirectoryPathsAtom,
  currentIndexAtom,
  isLoadingBatchAtom,
  loadedImagesAtom,
  currentModalImagePathAtom,
  isDeletingImageAtom,
  hotkeysAtom,
  isHotkeySidebarOpenAtom,
  categoriesAtom,
  imageCategoriesAtom,
  currentDirectoryAtom,
  configFilePathAtom,
  resetCounterAtom,
  shortcutsOverlayVisibleAtom,
  categoryDialogVisibleAtom,
  categoryDialogCategoryAtom,
  hotkeyDialogVisibleAtom,
  hotkeyDialogHotkeyAtom,
  isLoadingAtom,
  errorMessageAtom,
  sortOptionAtom,
  sortDirectionAtom,
  filterOptionsAtom,
  selectionModeAtom,
  selectedImagesAtom,
  toggleImageSelectionAtom,
  suppressCategoryRefilterAtom,
  cachedImageCategoriesForRefilterAtom,
  resetStateAtom,
} from './state';

describe('state', () => {
  beforeEach(() => {
    // Reset state before each test using resetStateAtom
    store.set(resetStateAtom);
  });

  describe('atoms', () => {
    it('should have initial values', () => {
      expect(store.get(allImagePathsAtom)).toEqual([]);
      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(currentIndexAtom)).toBe(0);
      expect(store.get(isLoadingBatchAtom)).toBe(false);
      expect(store.get(loadedImagesAtom).size).toBe(0);
      expect(store.get(currentModalImagePathAtom)).toBe('');
      expect(store.get(isDeletingImageAtom)).toBe(false);
      expect(store.get(hotkeysAtom)).toEqual([]);
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(false);
      expect(store.get(categoriesAtom)).toEqual([]);
      expect(store.get(imageCategoriesAtom).size).toBe(0);
      expect(store.get(currentDirectoryAtom)).toBe('');
      expect(store.get(configFilePathAtom)).toBe('');
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
      expect(store.get(categoryDialogVisibleAtom)).toBe(false);
      expect(store.get(categoryDialogCategoryAtom)).toBeUndefined();
      expect(store.get(hotkeyDialogVisibleAtom)).toBe(false);
      expect(store.get(hotkeyDialogHotkeyAtom)).toBeUndefined();
      expect(store.get(isLoadingAtom)).toBe(false);
      expect(store.get(errorMessageAtom)).toBe('');
      expect(store.get(sortOptionAtom)).toBe('name');
      expect(store.get(sortDirectionAtom)).toBe('ascending');
      expect(store.get(filterOptionsAtom)).toEqual({
        categoryId: '',
        namePattern: '',
        nameOperator: 'contains',
        sizeOperator: 'largerThan',
        sizeValue: '',
        sizeValue2: '',
      });
      expect(store.get(selectionModeAtom)).toBe(false);
      expect(store.get(selectedImagesAtom).size).toBe(0);
      expect(store.get(toggleImageSelectionAtom)).toBeUndefined();
      expect(store.get(suppressCategoryRefilterAtom)).toBe(false);
      expect(store.get(cachedImageCategoriesForRefilterAtom)).toBeNull();
    });

    it('should allow setting and getting values', () => {
      const testImage = { path: '/test/image.png' };
      store.set(allImagePathsAtom, [testImage]);
      expect(store.get(allImagePathsAtom)).toEqual([testImage]);

      store.set(currentIndexAtom, 5);
      expect(store.get(currentIndexAtom)).toBe(5);

      const testMap = new Map([['/test/image.png', 'data-url']]);
      store.set(loadedImagesAtom, testMap);
      expect(store.get(loadedImagesAtom).get('/test/image.png')).toBe('data-url');
    });
  });

  describe('resetStateAtom', () => {
    it('should reset all state properties to initial values', () => {
      // Set some state
      store.set(allImagePathsAtom, [{ path: '/test/image.png' }]);
      store.set(allDirectoryPathsAtom, [{ path: '/test' }]);
      store.set(currentIndexAtom, 5);
      store.set(isLoadingBatchAtom, true);
      const loadedImages = new Map([['/test/image.png', 'data-url']]);
      store.set(loadedImagesAtom, loadedImages);
      store.set(currentModalImagePathAtom, '/test/image.png');
      store.set(isDeletingImageAtom, true);
      store.set(hotkeysAtom, [{ id: '1', key: 'A', modifiers: [], action: 'test' }]);
      store.set(isHotkeySidebarOpenAtom, true);
      store.set(categoriesAtom, [{ id: '1', name: 'Test', color: '#000' }]);
      const imageCategories = new Map([['/test/image.png', [
        { category_id: 'cat1', assigned_at: new Date().toISOString() }
      ]]]);
      store.set(imageCategoriesAtom, imageCategories);
      store.set(currentDirectoryAtom, '/test/dir');
      store.set(configFilePathAtom, '/test/config.json');
      store.set(shortcutsOverlayVisibleAtom, true);
      store.set(categoryDialogVisibleAtom, true);
      store.set(categoryDialogCategoryAtom, { id: '1', name: 'Test', color: '#000' });
      store.set(hotkeyDialogVisibleAtom, true);
      store.set(hotkeyDialogHotkeyAtom, { id: '1', key: 'A', modifiers: [], action: 'test' });
      store.set(isLoadingAtom, true);
      store.set(errorMessageAtom, 'Test error');
      store.set(sortOptionAtom, 'dateCreated');
      store.set(sortDirectionAtom, 'descending');
      store.set(filterOptionsAtom, {
        categoryId: 'cat1',
        namePattern: 'test',
        nameOperator: 'startsWith',
        sizeOperator: 'between',
        sizeValue: '100',
        sizeValue2: '200',
      });
      store.set(selectionModeAtom, true);
      store.set(selectedImagesAtom, new Set(['/test/image1.png', '/test/image2.png']));
      store.set(toggleImageSelectionAtom, () => {});
      store.set(suppressCategoryRefilterAtom, true);
      store.set(cachedImageCategoriesForRefilterAtom, new Map([['/test/image.png', []]]));
      const resetCounterBefore = store.get(resetCounterAtom);

      store.set(resetStateAtom);

      expect(store.get(allImagePathsAtom)).toEqual([]);
      expect(store.get(allDirectoryPathsAtom)).toEqual([]);
      expect(store.get(currentIndexAtom)).toBe(0);
      expect(store.get(isLoadingBatchAtom)).toBe(false);
      expect(store.get(loadedImagesAtom).size).toBe(0);
      expect(store.get(currentModalImagePathAtom)).toBe('');
      expect(store.get(isDeletingImageAtom)).toBe(false);
      expect(store.get(hotkeysAtom)).toEqual([]);
      expect(store.get(isHotkeySidebarOpenAtom)).toBe(false);
      expect(store.get(categoriesAtom)).toEqual([]);
      expect(store.get(imageCategoriesAtom).size).toBe(0);
      expect(store.get(currentDirectoryAtom)).toBe('');
      expect(store.get(configFilePathAtom)).toBe('');
      expect(store.get(resetCounterAtom)).toBe(resetCounterBefore + 1);
      expect(store.get(shortcutsOverlayVisibleAtom)).toBe(false);
      expect(store.get(categoryDialogVisibleAtom)).toBe(false);
      expect(store.get(categoryDialogCategoryAtom)).toBeUndefined();
      expect(store.get(hotkeyDialogVisibleAtom)).toBe(false);
      expect(store.get(hotkeyDialogHotkeyAtom)).toBeUndefined();
      expect(store.get(isLoadingAtom)).toBe(false);
      expect(store.get(errorMessageAtom)).toBe('');
      expect(store.get(sortOptionAtom)).toBe('name');
      expect(store.get(sortDirectionAtom)).toBe('ascending');
      expect(store.get(filterOptionsAtom)).toEqual({
        categoryId: '',
        namePattern: '',
        nameOperator: 'contains',
        sizeOperator: 'largerThan',
        sizeValue: '',
        sizeValue2: '',
      });
      expect(store.get(selectionModeAtom)).toBe(false);
      expect(store.get(selectedImagesAtom).size).toBe(0);
      expect(store.get(toggleImageSelectionAtom)).toBeUndefined();
      expect(store.get(suppressCategoryRefilterAtom)).toBe(false);
      expect(store.get(cachedImageCategoriesForRefilterAtom)).toBeNull();
    });

    it('should increment resetCounter on each reset', () => {
      const initialCounter = store.get(resetCounterAtom);

      store.set(resetStateAtom);
      expect(store.get(resetCounterAtom)).toBe(initialCounter + 1);

      store.set(resetStateAtom);
      expect(store.get(resetCounterAtom)).toBe(initialCounter + 2);

      store.set(resetStateAtom);
      expect(store.get(resetCounterAtom)).toBe(initialCounter + 3);
    });
  });
});

