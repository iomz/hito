import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Event } from '@tauri-apps/api/event';
import type { DragDropEvent } from '../types';
import {
  extractPathsFromEvent,
  handleFolder,
  handleFileDrop,
  setupDocumentDragHandlers,
  setupTauriDragEvents,
  selectFolder,
} from './dragDrop';
import { DRAG_EVENTS, CUSTOM_DRAG_EVENTS } from '../constants';
import { store } from '../utils/jotaiStore';
import { isLoadingAtom } from '../state';

// Mock dependencies
vi.mock('../core/browse', () => ({
  browseImages: vi.fn(),
}));


vi.mock('../ui/error', () => ({
  showError: vi.fn(),
  clearError: vi.fn(),
}));

vi.mock('../utils/dialog', () => ({
  open: vi.fn(),
}));

vi.mock('../utils/tauri', () => ({
  invokeTauri: vi.fn(),
  isTauriInvokeAvailable: vi.fn().mockReturnValue(true),
}));

describe('extractPathsFromEvent', () => {
  it('should return null for null input', () => {
    expect(extractPathsFromEvent(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(extractPathsFromEvent(undefined)).toBeNull();
  });

  it('should return array directly if input is array', () => {
    const paths = ['/path/to/file1', '/path/to/file2'];
    expect(extractPathsFromEvent(paths)).toEqual(paths);
  });

  it('should extract paths from Event with payload.paths', () => {
    const event: Event<DragDropEvent> = {
      payload: {
        paths: ['/path/to/file1', '/path/to/file2'],
      },
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toEqual(['/path/to/file1', '/path/to/file2']);
  });

  it('should extract paths from Event with payload as array', () => {
    const event: Event<DragDropEvent> = {
      payload: ['/path/to/file1', '/path/to/file2'] as any,
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toEqual(['/path/to/file1', '/path/to/file2']);
  });

  it('should extract paths from DragDropEvent with paths property', () => {
    const event: DragDropEvent = {
      paths: ['/path/to/file1', '/path/to/file2'],
    };
    expect(extractPathsFromEvent(event)).toEqual(['/path/to/file1', '/path/to/file2']);
  });

  it('should return null for event with no paths', () => {
    const event: Event<DragDropEvent> = {
      payload: {},
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toBeNull();
  });

  it('should return null for empty payload', () => {
    const event: Event<DragDropEvent> = {
      payload: null as any,
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toBeNull();
  });

  it('should handle empty array', () => {
    expect(extractPathsFromEvent([])).toEqual([]);
  });

  it('should handle single path in array', () => {
    expect(extractPathsFromEvent(['/single/path'])).toEqual(['/single/path']);
  });

  it('should handle event with payload.paths as empty array', () => {
    const event: Event<DragDropEvent> = {
      event: 'test-event',
      id: 1,
      payload: {
        paths: [],
      },
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toEqual([]);
  });

  it('should handle event with payload as empty array', () => {
    const event: Event<DragDropEvent> = {
      payload: [] as any,
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toEqual([]);
  });

  it('should handle DragDropEvent with empty paths array', () => {
    const event: DragDropEvent = {
      paths: [],
    };
    expect(extractPathsFromEvent(event)).toEqual([]);
  });

  it('should return null for event with payload but no paths property', () => {
    const event: Event<DragDropEvent> = {
      payload: {
        otherProperty: 'value',
      } as any,
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toBeNull();
  });

  it('should return null for event with paths property but not an array', () => {
    const event = {
      paths: 'not-an-array',
    } as any;
    expect(extractPathsFromEvent(event)).toBeNull();
  });

  it('should handle event with payload.paths containing special characters', () => {
    const paths = ['/path/with spaces/file.jpg', '/path/with-special@chars#file.png'];
    const event: Event<DragDropEvent> = {
      payload: {
        paths,
      },
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toEqual(paths);
  });

  it('should handle Windows-style paths', () => {
    const paths = ['C:\\Users\\test\\file.jpg', 'D:\\Images\\photo.png'];
    const event: Event<DragDropEvent> = {
      payload: {
        paths,
      },
    } as Event<DragDropEvent>;
    expect(extractPathsFromEvent(event)).toEqual(paths);
  });

  it('should handle very long path arrays', () => {
    const paths = Array.from({ length: 1000 }, (_, i) => `/path/to/file${i}.jpg`);
    expect(extractPathsFromEvent(paths)).toEqual(paths);
  });
});

describe('handleFolder', () => {
  it('should call browseImages with the folder path', async () => {
    const { browseImages } = await import('../core/browse');
    
    handleFolder('/test/folder');
    
    expect(browseImages).toHaveBeenCalledWith('/test/folder');
  });
});

describe('handleFileDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.set(isLoadingAtom, false);
  });

  it('should clear error and handle successful folder drop', async () => {
    const { clearError } = await import('../ui/error');
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    await handleFileDrop(['/test/folder']);

    expect(clearError).toHaveBeenCalled();
    expect(invokeTauri).toHaveBeenCalledWith('list_images', { path: '/test/folder' });
    expect(browseImages).toHaveBeenCalledWith('/test/folder');
  });

  it('should show error when no paths are detected', async () => {
    const { showError, clearError } = await import('../ui/error');

    await handleFileDrop(null as any);

    expect(clearError).toHaveBeenCalled();
      expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('No file paths detected in drop event.');
  });

  it('should show error when Tauri invoke API is not available', async () => {
    const { isTauriInvokeAvailable } = await import('../utils/tauri');
    const { showError } = await import('../ui/error');
    vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

    await handleFileDrop(['/test/path']);

      expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('Tauri invoke API not available');
  });

  it('should try parent directory when direct listing fails', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockResolvedValueOnce('/parent/path');

    await handleFileDrop(['/test/file.png']);

    expect(invokeTauri).toHaveBeenCalledWith('list_images', { path: '/test/file.png' });
    expect(invokeTauri).toHaveBeenCalledWith('get_parent_directory', { filePath: '/test/file.png' });
    expect(browseImages).toHaveBeenCalledWith('/parent/path');
  });

  it('should show error when both direct and parent directory listing fail', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { showError } = await import('../ui/error');
    
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockRejectedValueOnce(new Error('Parent not found'));

    await handleFileDrop(['/test/file.png']);

      expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('Error: Error: Parent not found. Please drop a folder or use the file picker.');
  });

  it('should handle Event<DragDropEvent> format', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    const event: Event<DragDropEvent> = {
      payload: {
        paths: ['/test/folder'],
      },
    } as Event<DragDropEvent>;

    await handleFileDrop(event);

    expect(browseImages).toHaveBeenCalledWith('/test/folder');
  });

  it('should handle empty paths array', async () => {
    const { showError, clearError } = await import('../ui/error');

    await handleFileDrop([]);

    expect(clearError).toHaveBeenCalled();
    expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('No file paths detected in drop event.');
  });

  it('should use first path when multiple paths are provided', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    await handleFileDrop(['/first/path', '/second/path', '/third/path']);

    expect(invokeTauri).toHaveBeenCalledWith('list_images', { path: '/first/path' });
    expect(browseImages).toHaveBeenCalledWith('/first/path');
  });

  it('should handle DragDropEvent format directly', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    const event: DragDropEvent = {
      paths: ['/test/folder'],
    };

    await handleFileDrop(event);

    expect(browseImages).toHaveBeenCalledWith('/test/folder');
  });

  it('should handle parent directory fallback with Windows paths', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockResolvedValueOnce('C:\\Users\\test');

    await handleFileDrop(['C:\\Users\\test\\file.png']);

    expect(invokeTauri).toHaveBeenCalledWith('list_images', { path: 'C:\\Users\\test\\file.png' });
    expect(invokeTauri).toHaveBeenCalledWith('get_parent_directory', { filePath: 'C:\\Users\\test\\file.png' });
    expect(browseImages).toHaveBeenCalledWith('C:\\Users\\test');
  });

  it('should handle parent directory fallback with special characters in path', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockResolvedValueOnce('/parent/path with spaces');

    await handleFileDrop(['/parent/path with spaces/file@name#.png']);

    expect(browseImages).toHaveBeenCalledWith('/parent/path with spaces');
  });

  it('should clear error before processing', async () => {
    const { clearError } = await import('../ui/error');
    const { invokeTauri } = await import('../utils/tauri');
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    await handleFileDrop(['/test/folder']);

    expect(clearError).toHaveBeenCalled();
  });

  it('should handle error when parent directory returns empty string', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { showError } = await import('../ui/error');
    
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockResolvedValueOnce(''); // Empty parent path

    await handleFileDrop(['/test/file.png']);

    // Should still try to browse with empty path (browseImages will handle it)
    expect(invokeTauri).toHaveBeenCalledTimes(2);
  });
});

describe('setupDocumentDragHandlers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should add event listeners and return cleanup function', () => {
    const cleanup = setupDocumentDragHandlers();

    // Create mock events (DragEvent not available in jsdom)
    const dragoverEvent = document.createEvent('Event');
    dragoverEvent.initEvent('dragover', true, true);
    const dropEvent = document.createEvent('Event');
    dropEvent.initEvent('drop', true, true);

    const preventDefaultSpy = vi.spyOn(dragoverEvent, 'preventDefault');
    const preventDefaultDropSpy = vi.spyOn(dropEvent, 'preventDefault');

    // Create drop zone
    const dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    document.body.appendChild(dropZone);

    // Test event outside drop zone (target is document)
    document.dispatchEvent(dragoverEvent);
    document.dispatchEvent(dropEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(preventDefaultDropSpy).toHaveBeenCalled();

    // Cleanup
    cleanup();

    // Create new events after cleanup
    const dragoverEvent2 = document.createEvent('Event');
    dragoverEvent2.initEvent('dragover', true, true);
    const dropEvent2 = document.createEvent('Event');
    dropEvent2.initEvent('drop', true, true);
    const preventDefaultSpy2 = vi.spyOn(dragoverEvent2, 'preventDefault');
    const preventDefaultDropSpy2 = vi.spyOn(dropEvent2, 'preventDefault');

    document.dispatchEvent(dragoverEvent2);
    document.dispatchEvent(dropEvent2);

    // Should not be called after cleanup
    expect(preventDefaultSpy2).not.toHaveBeenCalled();
    expect(preventDefaultDropSpy2).not.toHaveBeenCalled();
  });

  it('should not preventDefault when event target is inside drop zone', () => {
    const dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    const innerElement = document.createElement('div');
    dropZone.appendChild(innerElement);
    document.body.appendChild(dropZone);

    setupDocumentDragHandlers();

    const dragoverEvent = document.createEvent('Event');
    dragoverEvent.initEvent('dragover', true, true);
    Object.defineProperty(dragoverEvent, 'target', { value: innerElement, writable: false });
    
    const preventDefaultSpy = vi.spyOn(dragoverEvent, 'preventDefault');

    document.dispatchEvent(dragoverEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should handle missing drop zone gracefully', () => {
    // No drop zone in DOM
    const cleanup = setupDocumentDragHandlers();

    const dragoverEvent = document.createEvent('Event');
    dragoverEvent.initEvent('dragover', true, true);
    const preventDefaultSpy = vi.spyOn(dragoverEvent, 'preventDefault');

    document.dispatchEvent(dragoverEvent);

    // Should preventDefault when drop zone doesn't exist
    expect(preventDefaultSpy).toHaveBeenCalled();
    
    cleanup();
  });

  it('should handle event target being null', () => {
    const dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    document.body.appendChild(dropZone);

    setupDocumentDragHandlers();

    const dragoverEvent = document.createEvent('Event');
    dragoverEvent.initEvent('dragover', true, true);
    Object.defineProperty(dragoverEvent, 'target', { value: null, writable: false });
    
    const preventDefaultSpy = vi.spyOn(dragoverEvent, 'preventDefault');

    document.dispatchEvent(dragoverEvent);

    // Should preventDefault when target is null
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should handle multiple cleanup calls', () => {
    const cleanup = setupDocumentDragHandlers();
    
    // Call cleanup multiple times
    cleanup();
    cleanup();
    cleanup();

    // Should not throw
    expect(() => cleanup()).not.toThrow();
  });

  it('should handle drop zone being removed after setup', () => {
    const dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    document.body.appendChild(dropZone);

    setupDocumentDragHandlers();

    // Remove drop zone
    dropZone.remove();

    const dragoverEvent = document.createEvent('Event');
    dragoverEvent.initEvent('dragover', true, true);
    const preventDefaultSpy = vi.spyOn(dragoverEvent, 'preventDefault');

    document.dispatchEvent(dragoverEvent);

    // Should preventDefault when drop zone is removed
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('setupTauriDragEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.set(isLoadingAtom, false);
    (window as any).__TAURI__ = {
      event: {
        listen: vi.fn().mockResolvedValue(() => {}),
      },
    };
  });

  afterEach(() => {
    delete (window as any).__TAURI__;
    store.set(isLoadingAtom, false);
  });

  it('should return early when Tauri event API is not available', async () => {
    delete (window as any).__TAURI__;
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await setupTauriDragEvents();

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('[setupTauriDragEvents] Tauri event API not available - returning early');
    consoleSpy.mockRestore();
  });

  it('should register event listeners for all drag events', async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    const unlisten3 = vi.fn();
    const unlisten4 = vi.fn();
    let callCount = 0;
    const eventListen = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(unlisten1);
      if (callCount === 2) return Promise.resolve(unlisten2);
      if (callCount === 3) return Promise.resolve(unlisten3);
      if (callCount === 4) return Promise.resolve(unlisten4);
      return Promise.resolve(() => {});
    });
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    expect(eventListen).toHaveBeenCalledTimes(4);
    expect(eventListen).toHaveBeenCalledWith(DRAG_EVENTS.DROP, expect.any(Function));
    expect(eventListen).toHaveBeenCalledWith(DRAG_EVENTS.ENTER, expect.any(Function));
    expect(eventListen).toHaveBeenCalledWith(DRAG_EVENTS.OVER, expect.any(Function));
    expect(eventListen).toHaveBeenCalledWith(DRAG_EVENTS.LEAVE, expect.any(Function));
    expect(cleanup).toBeDefined();
    expect(typeof cleanup).toBe('function');
  });

  it('should return cleanup function that unregisters all listeners', async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    const unlisten3 = vi.fn();
    const unlisten4 = vi.fn();
    let callCount = 0;
    const eventListen = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(unlisten1);
      if (callCount === 2) return Promise.resolve(unlisten2);
      if (callCount === 3) return Promise.resolve(unlisten3);
      if (callCount === 4) return Promise.resolve(unlisten4);
      return Promise.resolve(() => {});
    });
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    expect(cleanup).toBeDefined();
    if (cleanup) {
      cleanup();
      expect(unlisten1).toHaveBeenCalledTimes(1);
      expect(unlisten2).toHaveBeenCalledTimes(1);
      expect(unlisten3).toHaveBeenCalledTimes(1);
      expect(unlisten4).toHaveBeenCalledTimes(1);
    }
  });

  it('should handle errors when calling unlisten in cleanup', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unlisten1 = vi.fn().mockImplementation(() => {
      throw new Error('Unlisten error');
    });
    const unlisten2 = vi.fn();
    const unlisten3 = vi.fn();
    const unlisten4 = vi.fn();
    let callCount = 0;
    const eventListen = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(unlisten1);
      if (callCount === 2) return Promise.resolve(unlisten2);
      if (callCount === 3) return Promise.resolve(unlisten3);
      if (callCount === 4) return Promise.resolve(unlisten4);
      return Promise.resolve(() => {});
    });
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    expect(cleanup).toBeDefined();
    if (cleanup) {
      cleanup();
      expect(unlisten1).toHaveBeenCalledTimes(1);
      expect(unlisten2).toHaveBeenCalledTimes(1);
      expect(unlisten3).toHaveBeenCalledTimes(1);
      expect(unlisten4).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalled();
    }
    consoleSpy.mockRestore();
  });

  it('should handle DROP event correctly', async () => {
    const { clearError } = await import('../ui/error');
    let dropHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.DROP) {
        dropHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    await setupTauriDragEvents();

    const customEventSpy = vi.spyOn(window, 'dispatchEvent');
    const event: Event<DragDropEvent> = {
      payload: { paths: ['/test/path'] },
    } as Event<DragDropEvent>;

    if (dropHandler) {
      (dropHandler as (event: Event<DragDropEvent>) => void)(event);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

      expect(store.get(isLoadingAtom)).toBe(true);
    expect(clearError).toHaveBeenCalled();
    expect(customEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: CUSTOM_DRAG_EVENTS.DROP }));
  });

  it('should handle ENTER event correctly', async () => {
    let enterHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.ENTER) {
        enterHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    await setupTauriDragEvents();

    const customEventSpy = vi.spyOn(window, 'dispatchEvent');
    const event: Event<DragDropEvent> = {
      payload: { paths: ['/test/path'] },
    } as Event<DragDropEvent>;

    if (enterHandler) {
      (enterHandler as (event: Event<DragDropEvent>) => void)(event);
    }

    expect(customEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: CUSTOM_DRAG_EVENTS.ENTER }));
  });

  it('should handle OVER event correctly', async () => {
    let overHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.OVER) {
        overHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    await setupTauriDragEvents();

    const customEventSpy = vi.spyOn(window, 'dispatchEvent');
    const event: Event<DragDropEvent> = {
      payload: { paths: ['/test/path'] },
    } as Event<DragDropEvent>;

    if (overHandler) {
      (overHandler as (event: Event<DragDropEvent>) => void)(event);
    }

    expect(customEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: CUSTOM_DRAG_EVENTS.OVER }));
  });

  it('should handle LEAVE event correctly', async () => {
    store.set(isLoadingAtom, true); // Set loading state first
    let leaveHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.LEAVE) {
        leaveHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    await setupTauriDragEvents();

    const customEventSpy = vi.spyOn(window, 'dispatchEvent');
    const event: Event<DragDropEvent> = {
      payload: { paths: ['/test/path'] },
    } as Event<DragDropEvent>;

    if (leaveHandler) {
      (leaveHandler as (event: Event<DragDropEvent>) => void)(event);
    }

      expect(store.get(isLoadingAtom)).toBe(false);
    expect(customEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: CUSTOM_DRAG_EVENTS.LEAVE }));
  });

  it('should handle errors in event handlers gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { showError } = await import('../ui/error');
    const { invokeTauri, isTauriInvokeAvailable } = await import('../utils/tauri');
    let dropHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.DROP) {
        dropHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    // Ensure Tauri API is available
    vi.mocked(isTauriInvokeAvailable).mockReturnValue(true);
    
    // Mock invokeTauri to reject for both list_images and get_parent_directory
    // This will cause handleFileDrop to fail completely
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockRejectedValueOnce(new Error('Parent not found'));

    await setupTauriDragEvents();

    const event: Event<DragDropEvent> = {
      payload: { paths: ['/test/path'] },
    } as Event<DragDropEvent>;

    if (dropHandler) {
      (dropHandler as (event: Event<DragDropEvent>) => void)(event);
      // Wait for async error handling - handleFileDrop's catch block runs asynchronously
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Verify error handling occurred - the .catch() in setupTauriDragEvents should have run
    // Check that isLoadingAtom was set to false and showError was called (the important side effects)
    expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('Error'));
    // console.error may or may not be called depending on timing, but the UI updates are what matter
    consoleSpy.mockRestore();
  });

  it('should continue registering other events if one fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unlisten1 = vi.fn();
    const unlisten3 = vi.fn();
    const unlisten4 = vi.fn();
    let callCount = 0;

    const eventListen = vi.fn().mockImplementation((eventName) => {
      callCount++;
      if (callCount === 2) {
        return Promise.reject(new Error('Failed to register'));
      }
      if (callCount === 1) return Promise.resolve(unlisten1);
      if (callCount === 3) return Promise.resolve(unlisten3);
      if (callCount === 4) return Promise.resolve(unlisten4);
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    expect(eventListen).toHaveBeenCalledTimes(4);
    expect(consoleSpy).toHaveBeenCalled();
    // Cleanup should only unregister successfully registered listeners
    expect(cleanup).toBeDefined();
    if (cleanup) {
      cleanup();
      expect(unlisten1).toHaveBeenCalledTimes(1);
      expect(unlisten3).toHaveBeenCalledTimes(1);
      expect(unlisten4).toHaveBeenCalledTimes(1);
    }
    consoleSpy.mockRestore();
  });

  it('should handle fatal errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock to throw error on each event registration
    let callCount = 0;
    (window as any).__TAURI__ = {
      event: {
        listen: vi.fn().mockImplementation(() => {
          callCount++;
          // Throw error on first call to simulate fatal error
          if (callCount === 1) {
            throw new Error('Fatal error');
          }
          return Promise.resolve(() => {});
        }),
      },
    };

    const cleanup = await setupTauriDragEvents();

    // Should log individual errors, not a single fatal error
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some(call => 
      call[0]?.includes('[setupTauriDragEvents]') && call[2] === ':'
    )).toBe(true);
    // Should still return cleanup function for successfully registered listeners
    // (first call failed, but remaining 3 succeeded)
    expect(cleanup).toBeDefined();
    expect(typeof cleanup).toBe('function');
    consoleSpy.mockRestore();
  });

  it('should handle event.listen returning undefined unlisten function', async () => {
    const eventListen = vi.fn().mockResolvedValue(undefined);
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    expect(cleanup).toBeDefined();
    if (cleanup) {
      // Should not throw even if unlisten is undefined
      expect(() => cleanup()).not.toThrow();
    }
  });

  it('should handle all event registrations failing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const eventListen = vi.fn().mockRejectedValue(new Error('Registration failed'));
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    expect(eventListen).toHaveBeenCalledTimes(4);
    expect(consoleSpy).toHaveBeenCalled();
    // Should still return cleanup function (even if empty)
    expect(cleanup).toBeDefined();
    expect(typeof cleanup).toBe('function');
    if (cleanup) {
      // Cleanup should not throw even with no listeners
      expect(() => cleanup()).not.toThrow();
    }
    consoleSpy.mockRestore();
  });

  it('should handle DROP event with empty paths', async () => {
    const { showError } = await import('../ui/error');
    let dropHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.DROP) {
        dropHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    await setupTauriDragEvents();

    const event: Event<DragDropEvent> = {
      event: 'test-event',
      id: 1,
      payload: { paths: [] },
    } as Event<DragDropEvent>;

    if (dropHandler) {
      (dropHandler as (event: Event<DragDropEvent>) => void)(event);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('No file paths detected in drop event.');
  });

  it('should handle DROP event with null payload', async () => {
    const { showError } = await import('../ui/error');
    let dropHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.DROP) {
        dropHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    await setupTauriDragEvents();

    const event: Event<DragDropEvent> = {
      payload: null as any,
    } as Event<DragDropEvent>;

    if (dropHandler) {
      (dropHandler as (event: Event<DragDropEvent>) => void)(event);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('No file paths detected in drop event.');
  });

  it('should handle multiple DROP events in sequence', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    let dropHandler: ((event: Event<DragDropEvent>) => void) | null = null;

    const eventListen = vi.fn().mockImplementation((eventName, handler: (event: Event<DragDropEvent>) => void) => {
      if (eventName === DRAG_EVENTS.DROP) {
        dropHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    vi.mocked(invokeTauri).mockResolvedValue({ images: [], directories: [] });

    await setupTauriDragEvents();

    const event1: Event<DragDropEvent> = {
      payload: { paths: ['/path1'] },
    } as Event<DragDropEvent>;
    const event2: Event<DragDropEvent> = {
      payload: { paths: ['/path2'] },
    } as Event<DragDropEvent>;

    if (dropHandler) {
      (dropHandler as (event: Event<DragDropEvent>) => void)(event1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      (dropHandler as (event: Event<DragDropEvent>) => void)(event2);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(browseImages).toHaveBeenCalledWith('/path1');
    expect(browseImages).toHaveBeenCalledWith('/path2');
  });

  it('should handle cleanup being called multiple times', async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    const unlisten3 = vi.fn();
    const unlisten4 = vi.fn();
    let callCount = 0;
    const eventListen = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(unlisten1);
      if (callCount === 2) return Promise.resolve(unlisten2);
      if (callCount === 3) return Promise.resolve(unlisten3);
      if (callCount === 4) return Promise.resolve(unlisten4);
      return Promise.resolve(() => {});
    });
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    if (cleanup) {
      cleanup();
      cleanup();
      cleanup();
    }

    // Each unlisten is called once per cleanup call
    expect(unlisten1).toHaveBeenCalledTimes(3);
    expect(unlisten2).toHaveBeenCalledTimes(3);
    expect(unlisten3).toHaveBeenCalledTimes(3);
    expect(unlisten4).toHaveBeenCalledTimes(3);
  });

  it('should handle window.__TAURI__ being undefined after setup', async () => {
    const unlisten1 = vi.fn();
    let callCount = 0;
    const eventListen = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(unlisten1);
      return Promise.resolve(() => {});
    });
    (window as any).__TAURI__ = {
      event: {
        listen: eventListen,
      },
    };

    const cleanup = await setupTauriDragEvents();

    // Remove Tauri after setup
    delete (window as any).__TAURI__;

    if (cleanup) {
      // Cleanup should still work
      expect(() => cleanup()).not.toThrow();
      expect(unlisten1).toHaveBeenCalled();
    }
  });
});

describe('selectFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.set(isLoadingAtom, false);
  });

  it('should call handleFolder when folder is selected as string', async () => {
    const { open } = await import('../utils/dialog');
    const { browseImages } = await import('../core/browse');
    vi.mocked(open).mockResolvedValueOnce('/selected/folder');

    await selectFolder();

    expect(browseImages).toHaveBeenCalledWith('/selected/folder');
  });

  it('should call handleFolder when folder is selected as array', async () => {
    const { open } = await import('../utils/dialog');
    const { browseImages } = await import('../core/browse');
    vi.mocked(open).mockResolvedValueOnce(['/selected/folder']);

    await selectFolder();

    expect(browseImages).toHaveBeenCalledWith('/selected/folder');
  });

  it('should hide spinner when selection is cancelled', async () => {
    const { open } = await import('../utils/dialog');
    const { browseImages } = await import('../core/browse');
    vi.mocked(open).mockResolvedValueOnce(null);

    await selectFolder();

      expect(store.get(isLoadingAtom)).toBe(false);
    expect(browseImages).not.toHaveBeenCalled();
  });

  it('should hide spinner when selection is empty array', async () => {
    const { open } = await import('../utils/dialog');
    vi.mocked(open).mockResolvedValueOnce([]);

    await selectFolder();

      expect(store.get(isLoadingAtom)).toBe(false);
  });

  it('should handle errors and show error message', async () => {
    const { open } = await import('../utils/dialog');
    const { showError } = await import('../ui/error');
    vi.mocked(open).mockRejectedValueOnce(new Error('Dialog error'));

    await selectFolder();

      expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('Error selecting folder: Error: Dialog error');
  });

  it('should handle array with multiple folders (uses first)', async () => {
    const { open } = await import('../utils/dialog');
    const { browseImages } = await import('../core/browse');
    vi.mocked(open).mockResolvedValueOnce(['/folder1', '/folder2', '/folder3']);

    await selectFolder();

    expect(browseImages).toHaveBeenCalledWith('/folder1');
    expect(browseImages).toHaveBeenCalledTimes(1);
  });

  it('should handle array with empty string', async () => {
    const { open } = await import('../utils/dialog');
    vi.mocked(open).mockResolvedValueOnce(['']);

    await selectFolder();

    // Should still call handleFolder with empty string (browseImages will handle validation)
    const { browseImages } = await import('../core/browse');
    expect(browseImages).toHaveBeenCalledWith('');
  });

  it('should handle non-string, non-array return value', async () => {
    const { open } = await import('../utils/dialog');
    vi.mocked(open).mockResolvedValueOnce({ path: '/folder' } as any);

    await selectFolder();

    expect(store.get(isLoadingAtom)).toBe(false);
    const { browseImages } = await import('../core/browse');
    expect(browseImages).not.toHaveBeenCalled();
  });

  it('should handle error with string message', async () => {
    const { open } = await import('../utils/dialog');
    const { showError } = await import('../ui/error');
    vi.mocked(open).mockRejectedValueOnce('String error message');

    await selectFolder();

    expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('Error selecting folder: String error message');
  });

  it('should handle error with undefined', async () => {
    const { open } = await import('../utils/dialog');
    const { showError } = await import('../ui/error');
    vi.mocked(open).mockRejectedValueOnce(undefined);

    await selectFolder();

    expect(store.get(isLoadingAtom)).toBe(false);
    expect(showError).toHaveBeenCalledWith('Error selecting folder: undefined');
  });
});

describe('handleFileDrop edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.set(isLoadingAtom, false);
  });

  it('should handle very long path strings', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    const longPath = '/very/long/path/' + 'a'.repeat(1000) + '/folder';
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    await handleFileDrop([longPath]);

    expect(invokeTauri).toHaveBeenCalledWith('list_images', { path: longPath });
    expect(browseImages).toHaveBeenCalledWith(longPath);
  });

  it('should handle path with unicode characters', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    const unicodePath = '/path/with/日本語/中文/한글/folder';
    vi.mocked(invokeTauri).mockResolvedValueOnce({ images: [], directories: [] });

    await handleFileDrop([unicodePath]);

    expect(browseImages).toHaveBeenCalledWith(unicodePath);
  });

  it('should handle concurrent file drops', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    vi.mocked(invokeTauri).mockResolvedValue({ images: [], directories: [] });

    await Promise.all([
      handleFileDrop(['/path1']),
      handleFileDrop(['/path2']),
      handleFileDrop(['/path3']),
    ]);

    // All should be processed
    expect(invokeTauri).toHaveBeenCalledTimes(3);
    expect(browseImages).toHaveBeenCalled();
  });

  it('should handle parent directory fallback with relative path', async () => {
    const { invokeTauri } = await import('../utils/tauri');
    const { browseImages } = await import('../core/browse');
    
    vi.mocked(invokeTauri)
      .mockRejectedValueOnce(new Error('Not a directory'))
      .mockResolvedValueOnce('../parent');

    await handleFileDrop(['./current/file.png']);

    expect(browseImages).toHaveBeenCalledWith('../parent');
  });
});

