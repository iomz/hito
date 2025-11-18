import React, { useEffect } from "react";

export function LoadingSpinner() {
  useEffect(() => {
    // Set initial state
    const spinner = document.querySelector("#loading-spinner") as HTMLElement | null;
    if (spinner) {
      spinner.style.display = "none";
    }
  }, []);

  // Don't use React's style prop - let vanilla JS control it directly
  return (
    <div
      id="loading-spinner"
      className="loading-spinner"
    >
      <div className="spinner"></div>
      <p>Loading images...</p>
    </div>
  );
}

