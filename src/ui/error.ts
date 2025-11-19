import { store } from "../utils/jotaiStore";
import { errorMessageAtom } from "../state";

/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
export function showError(message: string): void {
  store.set(errorMessageAtom, message);
}

/**
 * Clear any visible error message from the UI.
 */
export function clearError(): void {
  store.set(errorMessageAtom, "");
}

