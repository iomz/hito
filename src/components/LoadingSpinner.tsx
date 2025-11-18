import React, { useEffect, useRef } from "react";
import { elements } from "../state";

export function LoadingSpinner() {
  const spinnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update elements reference when component mounts so vanilla JS can control it
    if (spinnerRef.current) {
      (elements as any).loadingSpinner = spinnerRef.current;
      console.log('[LoadingSpinner] Element reference stored in elements.loadingSpinner');
      // Set initial state
      spinnerRef.current.style.display = "none";
    }
  }, []);

  // Don't use React's style prop - let vanilla JS control it directly
  return (
    <div
      ref={spinnerRef}
      id="loading-spinner"
      className="loading-spinner"
    >
      <div className="spinner"></div>
      <p>Loading images...</p>
    </div>
  );
}

