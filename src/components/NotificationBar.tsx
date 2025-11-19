import React, { useEffect, useState } from "react";

let notificationState: {
  message: string;
  isVisible: boolean;
  timeoutId: number | null;
} = {
  message: "",
  isVisible: false,
  timeoutId: null,
};

let notificationListeners: Set<() => void> = new Set();

function notifyListeners() {
  notificationListeners.forEach((listener) => listener());
}

export function showNotification(message: string, duration: number = 3000): void {
  // Clear any existing timeout
  if (notificationState.timeoutId !== null) {
    clearTimeout(notificationState.timeoutId);
    notificationState.timeoutId = null;
  }

  // Set message and show
  notificationState.message = message;
  notificationState.isVisible = true;
  notifyListeners();

  // Auto-hide after duration
  notificationState.timeoutId = window.setTimeout(() => {
    hideNotification();
  }, duration);
}

export function hideNotification(): void {
  notificationState.isVisible = false;
  if (notificationState.timeoutId !== null) {
    clearTimeout(notificationState.timeoutId);
    notificationState.timeoutId = null;
  }
  notifyListeners();
}

export function NotificationBar(): React.JSX.Element {
  const [message, setMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to notification state changes
    const listener = () => {
      setMessage(notificationState.message);
      setIsVisible(notificationState.isVisible);
    };
    notificationListeners.add(listener);

    // Initialize state
    listener();

    return () => {
      notificationListeners.delete(listener);
    };
  }, []);

  return (
    <div
      id="notification-bar"
      data-testid="notification-bar"
      className={`notification-bar ${isVisible ? "show" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

