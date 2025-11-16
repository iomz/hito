import { querySelector } from "../utils/dom.js";

let notificationBar: HTMLElement | null = null;
let hideTimeout: number | null = null;

/**
 * Initialize the notification bar element.
 */
function getNotificationBar(): HTMLElement | null {
  if (!notificationBar) {
    notificationBar = querySelector("#notification-bar");
  }
  return notificationBar;
}

/**
 * Show a notification message in the top notification bar.
 *
 * @param message - The message to display
 * @param duration - How long to show the notification in milliseconds (default: 3000)
 */
export function showNotification(message: string, duration: number = 3000): void {
  const bar = getNotificationBar();
  if (!bar) return;
  
  // Clear any existing timeout
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  // Set message and show
  bar.textContent = message;
  bar.classList.add("show");
  
  // Auto-hide after duration
  hideTimeout = window.setTimeout(() => {
    hideNotification();
  }, duration);
}

/**
 * Hide the notification bar.
 */
export function hideNotification(): void {
  const bar = getNotificationBar();
  if (!bar) return;
  
  bar.classList.remove("show");
  
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

