import React, { useEffect, useRef, useState } from "react";
import { elements } from "../state";

export function ErrorMessage() {
  const [errorText, setErrorText] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Bridge React error element to vanilla JS state
    if (errorRef.current) {
      (elements as any).errorMsg = errorRef.current;
      console.log("[ErrorMessage] Element reference stored in elements.errorMsg");
    }
  }, []);

  useEffect(() => {
    // Poll for changes to error message (written by vanilla JS)
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
    <p ref={errorRef} id="error-msg" className="error">
      {errorText}
    </p>
  );
}

