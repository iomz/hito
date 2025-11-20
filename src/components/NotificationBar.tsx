import React, { useEffect, useState } from "react";

type NotificationType = "success" | "error";

let notificationState: {
  message: string;
  isVisible: boolean;
  type: NotificationType;
  timeoutId: number | null;
} = {
  message: "",
  isVisible: false,
  type: "success",
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
  notificationState.type = "success";
  notificationState.isVisible = true;
  notifyListeners();

  // Auto-hide after duration
  notificationState.timeoutId = window.setTimeout(() => {
    hideNotification();
  }, duration);
}

export function showError(message: string, duration: number = 5000): void {
  // Clear any existing timeout
  if (notificationState.timeoutId !== null) {
    clearTimeout(notificationState.timeoutId);
    notificationState.timeoutId = null;
  }

  // Set message and show as error
  notificationState.message = message;
  notificationState.type = "error";
  notificationState.isVisible = true;
  notifyListeners();

  // Auto-hide after duration (longer for errors)
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
  const [type, setType] = useState<NotificationType>("success");

  useEffect(() => {
    // Subscribe to notification state changes
    const listener = () => {
      setMessage(notificationState.message);
      setIsVisible(notificationState.isVisible);
      setType(notificationState.type);
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
      className={`notification-bar ${isVisible ? "show" : ""} ${type === "error" ? "error" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

