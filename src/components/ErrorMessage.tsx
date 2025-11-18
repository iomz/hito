import React, { useEffect, useState } from "react";
import { elements } from "../state";

export function ErrorMessage() {
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    // Poll for changes to error message
    const interval = setInterval(() => {
      if (elements.errorMsg) {
        const currentText = elements.errorMsg.textContent || "";
        if (currentText !== errorText) {
          setErrorText(currentText);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [errorText]);

  return (
    <p id="error-msg" className="error">
      {errorText}
    </p>
  );
}

