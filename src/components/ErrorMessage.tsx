import React, { useEffect, useState } from "react";
import { state } from "../state";

export function ErrorMessage() {
  const [errorText, setErrorText] = useState(state.errorMessage);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      setErrorText(state.errorMessage);
    });

    // Initialize with current state
    setErrorText(state.errorMessage);

    return unsubscribe;
  }, []);

  if (!errorText) {
    return null;
  }

  return (
    <p id="error-msg" className="error" role="alert" aria-live="polite">
      {errorText}
    </p>
  );
}

