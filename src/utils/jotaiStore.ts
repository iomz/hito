import { getDefaultStore } from "jotai";
import type { WritableAtom } from "jotai";

// Export a default store instance for use outside React components
// This allows utility functions, handlers, and other non-React code to access and update atoms
export const store = getDefaultStore();

/**
 * Helper function to update a Map atom with a new key-value pair.
 * 
 * This abstracts the read-clone-modify-write pattern for Map updates,
 * ensuring immutability and reducing boilerplate code.
 * 
 * @param atom - The Jotai atom containing a Map
 * @param key - The key to set in the Map
 * @param value - The value to set for the key
 */
export function updateAtomMap<K, V>(
  atom: WritableAtom<Map<K, V>, any, any>,
  key: K,
  value: V
): void {
  const current = store.get(atom);
  const updated = new Map(current);
  updated.set(key, value);
  store.set(atom, updated);
}

/**
 * Helper function to delete a key from a Map atom.
 * 
 * This abstracts the read-clone-modify-write pattern for Map deletions,
 * ensuring immutability and reducing boilerplate code.
 * 
 * @param atom - The Jotai atom containing a Map
 * @param key - The key to delete from the Map
 */
export function deleteFromAtomMap<K, V>(
  atom: WritableAtom<Map<K, V>, any, any>,
  key: K
): void {
  const current = store.get(atom);
  const updated = new Map(current);
  updated.delete(key);
  store.set(atom, updated);
}

