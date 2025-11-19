import { store } from "./jotaiStore";
import { allImagePathsAtom } from "../state";

/**
 * Ensures allImagePathsAtom is a valid array, resetting it if necessary.
 * 
 * @param context - Context string for error logging (e.g., function name)
 * @returns true if allImagePaths is valid, false otherwise
 */
export function ensureImagePathsArray(context: string): boolean {
  const allImagePaths = store.get(allImagePathsAtom);
  if (!Array.isArray(allImagePaths)) {
    console.error(`allImagePathsAtom is not an array in ${context}:`, allImagePaths);
    store.set(allImagePathsAtom, []);
    return false;
  }
  return true;
}

/**
 * Normalizes a file path by converting backslashes to forward slashes.
 * 
 * @param path - The path to normalize
 * @returns The normalized path
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Extracts the filename from a path.
 * 
 * @param path - The file path
 * @returns The filename or the original path if extraction fails
 */
export function getFilename(path: string): string {
  const normalized = normalizePath(path);
  return normalized.split("/").pop() || path;
}

