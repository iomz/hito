import { elements } from "../state";

/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
export function showError(message: string): void {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = message;
  }
}

/**
 * Clear any visible error message from the UI.
 *
 * Removes the text content of the configured error message element if it exists.
 */
export function clearError(): void {
  if (elements.errorMsg) {
    elements.errorMsg.textContent = "";
  }
}

