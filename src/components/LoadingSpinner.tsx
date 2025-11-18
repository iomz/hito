import React, { useEffect, useState } from "react";
import { state } from "../state";

export function LoadingSpinner() {
  const [isLoading, setIsLoading] = useState(state.isLoading);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      setIsLoading(state.isLoading);
    });

    // Initialize with current state
    setIsLoading(state.isLoading);

    return unsubscribe;
  }, []);

  if (!isLoading) {
    return null;
  }

  return (
    <div
      id="loading-spinner"
      className="loading-spinner"
      style={{ display: "flex" }}
    >
      <div className="spinner"></div>
      <p>Loading images...</p>
    </div>
  );
}

