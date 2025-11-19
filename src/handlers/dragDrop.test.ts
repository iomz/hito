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
import { state } from '../state';

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
    state.isLoading = false;
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
    expect(state.isLoading).toBe(false);
    expect(showError).toHaveBeenCalledWith('No file paths detected in drop event.');
  });

  it('should show error when Tauri invoke API is not available', async () => {
    const { isTauriInvokeAvailable } = await import('../utils/tauri');
    const { showError } = await import('../ui/error');
    vi.mocked(isTauriInvokeAvailable).mockReturnValueOnce(false);

    await handleFileDrop(['/test/path']);

    expect(state.isLoading).toBe(false);
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

    expect(state.isLoading).toBe(false);
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
});

describe('setupTauriDragEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isLoading = false;
    (window as any).__TAURI__ = {
      event: {
        listen: vi.fn().mockResolvedValue(() => {}),
      },
    };
  });

  afterEach(() => {
    delete (window as any).__TAURI__;
    state.isLoading = false;
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

    expect(state.isLoading).toBe(true);
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
    state.isLoading = true; // Set loading state first
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

    expect(state.isLoading).toBe(false);
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
    // Check that state.isLoading was set to false and showError was called (the important side effects)
    expect(state.isLoading).toBe(false);
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
});

describe('selectFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isLoading = false;
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

    expect(state.isLoading).toBe(false);
    expect(browseImages).not.toHaveBeenCalled();
  });

  it('should hide spinner when selection is empty array', async () => {
    const { open } = await import('../utils/dialog');
    vi.mocked(open).mockResolvedValueOnce([]);

    await selectFolder();

    expect(state.isLoading).toBe(false);
  });

  it('should handle errors and show error message', async () => {
    const { open } = await import('../utils/dialog');
    const { showError } = await import('../ui/error');
    vi.mocked(open).mockRejectedValueOnce(new Error('Dialog error'));

    await selectFolder();

    expect(state.isLoading).toBe(false);
    expect(showError).toHaveBeenCalledWith('Error selecting folder: Error: Dialog error');
  });
});

