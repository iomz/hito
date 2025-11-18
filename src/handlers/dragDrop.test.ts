import { describe, it, expect } from 'vitest';
import type { Event } from '@tauri-apps/api/event';
import type { DragDropEvent } from '../types';
import { extractPathsFromEvent } from './dragDrop';

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

