import React, { useEffect, useRef, useState } from "react";
import { ERROR_MESSAGE_EVENT } from "../ui/error";

export function ErrorMessage() {
  const [errorText, setErrorText] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const errorElement = errorRef.current;
    if (!errorElement) return;

    // Listen for custom event dispatched by vanilla JS error functions
    const handleErrorUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      setErrorText(customEvent.detail.message);
    };

    errorElement.addEventListener(ERROR_MESSAGE_EVENT, handleErrorUpdate);

    return () => {
      errorElement.removeEventListener(ERROR_MESSAGE_EVENT, handleErrorUpdate);
    };
  }, []);

  return (
    <p ref={errorRef} id="error-msg" className="error" role="alert" aria-live="polite">
      {errorText}
    </p>
  );
}

