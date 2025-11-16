// Type imports are fine - they're removed during compilation
import type { Event } from "@tauri-apps/api/event";

// Type definitions
export interface ImagePath {
  path: string;
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

