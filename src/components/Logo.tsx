import React from "react";
import { state } from "../state";

export function Logo() {
  const handleClick = () => {
    state.reset();
  };

  return (
    <h1 style={{ cursor: "pointer" }} onClick={handleClick}>
      Hito
    </h1>
  );
}

