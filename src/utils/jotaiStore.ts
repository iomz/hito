import { getDefaultStore } from "jotai";

// Export a default store instance for use outside React components
// This allows utility functions, handlers, and other non-React code to access and update atoms
export const store = getDefaultStore();

