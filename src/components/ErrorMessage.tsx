import React from "react";
import { useAtomValue } from "jotai";
import { errorMessageAtom } from "../state";

export function ErrorMessage() {
  const errorText = useAtomValue(errorMessageAtom);

  if (!errorText) {
    return null;
  }

  return (
    <p id="error-msg" className="error" role="alert" aria-live="polite">
      {errorText}
    </p>
  );
}

