import { state } from "../state";

/**
 * Custom event name for error message updates.
 * @deprecated Use state.errorMessage and state.notify() instead. Kept for backward compatibility.
 */
export const ERROR_MESSAGE_EVENT = "error-message-update";

/**
 * Displays an error message in the designated error UI element.
 *
 * @param message - The error text to show to the user
 */
export function showError(message: string): void {
  // Update state for React components
  state.errorMessage = message;
  state.notify();
  
  // Legacy DOM manipulation (kept for backward compatibility)
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  if (errorMsg) {
    errorMsg.textContent = message;
  }
  // Dispatch custom event for React component to listen to (kept for backward compatibility)
  document.dispatchEvent(
    new CustomEvent(ERROR_MESSAGE_EVENT, {
      detail: { message },
      bubbles: true,
      composed: true,
    })
  );
}

/**
 * Clear any visible error message from the UI.
 *
 * Removes the text content of the configured error message element if it exists.
 */
export function clearError(): void {
  // Update state for React components
  state.errorMessage = "";
  state.notify();
  
  // Legacy DOM manipulation (kept for backward compatibility)
  const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
  if (errorMsg) {
    errorMsg.textContent = "";
  }
  // Dispatch custom event for React component to listen to (kept for backward compatibility)
  document.dispatchEvent(
    new CustomEvent(ERROR_MESSAGE_EVENT, {
      detail: { message: "" },
      bubbles: true,
      composed: true,
    })
  );
}

