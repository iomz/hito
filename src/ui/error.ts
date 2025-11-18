/**
 * Custom event name for error message updates.
 */
export const ERROR_MESSAGE_EVENT = "error-message-update";

/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
export function showError(message: string): void {
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  if (errorMsg) {
    errorMsg.textContent = message;
    // Dispatch custom event for React component to listen to
    errorMsg.dispatchEvent(
      new CustomEvent(ERROR_MESSAGE_EVENT, { detail: { message } })
    );
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
    // Dispatch custom event for React component to listen to
    errorMsg.dispatchEvent(
      new CustomEvent(ERROR_MESSAGE_EVENT, { detail: { message: "" } })
    );
  }
}

