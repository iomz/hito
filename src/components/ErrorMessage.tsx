import React, { useEffect, useState } from "react";

export function ErrorMessage() {
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    // Poll for changes to error message (written by vanilla JS)
    const interval = setInterval(() => {
      const errorMsg = document.querySelector("#error-msg") as HTMLElement | null;
      if (errorMsg) {
        const currentText = errorMsg.textContent || "";
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

