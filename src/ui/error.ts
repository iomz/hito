/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
export function showError(message: string): void {
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  if (errorMsg) {
    errorMsg.textContent = message;
  }
}

/**
 * Clear any visible error message from the UI.
 *
 * Removes the text content of the configured error message element if it exists.
 */
export function clearError(): void {
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  if (errorMsg) {
    errorMsg.textContent = "";
  }
}

