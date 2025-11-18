import React, { useEffect, useState } from "react";
import { elements } from "../state";

export function LoadingSpinner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check initial state
    if (elements.loadingSpinner) {
      setIsVisible(elements.loadingSpinner.style.display !== "none");
    }

    // Poll for changes (since vanilla JS modifies the element directly)
    const interval = setInterval(() => {
      if (elements.loadingSpinner) {
        const visible = elements.loadingSpinner.style.display !== "none";
        setIsVisible(visible);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="loading-spinner"
      className="loading-spinner"
      style={{ display: isVisible ? "flex" : "none" }}
    >
      <div className="spinner"></div>
      <p>Loading images...</p>
    </div>
  );
}

