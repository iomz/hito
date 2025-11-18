import { state } from "../state";

/**
 * Make the loading spinner visible.
 *
 * Updates state to show the spinner. React LoadingSpinner component will react to this.
 */
export function showSpinner(): void {
  if (!state.isLoading) {
    state.isLoading = true;
    state.notify();
  }
}

/**
 * Hide the loading spinner element if present.
 *
 * Updates state to hide the spinner. React LoadingSpinner component will react to this.
 */
export function hideSpinner(): void {
  if (state.isLoading) {
    state.isLoading = false;
    state.notify();
  }
}

