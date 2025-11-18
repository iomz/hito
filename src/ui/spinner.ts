/**
 * Make the loading spinner visible.
 *
 * If the spinner element is not available in the DOM, this is a no-op.
 */
export function showSpinner(): void {
  const loadingSpinner = document.querySelector("#loading-spinner") as HTMLElement | null;
  if (!loadingSpinner) return;
  loadingSpinner.style.display = "flex";
  void loadingSpinner.offsetHeight; // Force reflow
}

/**
 * Hide the loading spinner element if present.
 *
 * Does nothing when the spinner element is not available.
 */
export function hideSpinner(): void {
  const loadingSpinner = document.querySelector("#loading-spinner") as HTMLElement | null;
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
}

