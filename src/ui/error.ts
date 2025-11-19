import { state } from "../state";

/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
export function showError(message: string): void {
  state.errorMessage = message;
  state.notify();
}

/**
 * Clear any visible error message from the UI.
 */
export function clearError(): void {
  state.errorMessage = "";
  state.notify();
}

