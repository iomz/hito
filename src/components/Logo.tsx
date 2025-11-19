import React from "react";
import { state } from "../state";

export function Logo() {
  const handleClick = () => {
    state.reset();
  };

  return (
    <button 
      onClick={handleClick}
      style={{ 
        background: 'none', 
        border: 'none', 
        padding: 0,
        cursor: 'pointer'
      }}
    >
      <h1>Hito</h1>
    </button>
  );
}

