import React from "react";
import { useSetAtom } from "jotai";
import { resetStateAtom } from "../state";

export function Logo() {
  const resetState = useSetAtom(resetStateAtom);
  
  const handleClick = () => {
    resetState();
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

