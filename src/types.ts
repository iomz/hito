// Type imports are fine - they're removed during compilation
import type { Event } from "@tauri-apps/api/event";

// Type definitions
export interface ImagePath {
  path: string;
  size?: number; // File size in bytes
  created_at?: string; // ISO 8601 datetime string
}

export interface DirectoryPath {
  path: string;
}

export interface DirectoryContents {
  directories: DirectoryPath[];
  images: ImagePath[];
}

export interface DragDropEvent {
  payload?: {
    paths?: string[];
    position?: { x: number; y: number };
  };
  paths?: string[];
}

export interface HotkeyConfig {
  id: string;
  key: string;
  modifiers: string[]; // e.g., ['Ctrl', 'Shift']
  action: string; // Action identifier (to be wired later)
}

export interface Category {
  id: string;
  name: string;
  color: string; // Hex color for visual distinction
}

export interface CategoryAssignment {
  category_id: string;
  assigned_at: string; // ISO 8601 datetime string
}

// Type augmentation for window.__TAURI__
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
      dialog?: {
        open: (options?: { directory?: boolean; multiple?: boolean; title?: string }) => Promise<string | string[] | null>;
      };
      event: {
        listen: <T = unknown>(event: string, handler: (event: Event<T>) => void) => Promise<() => void>;
      };
    };
  }
}

