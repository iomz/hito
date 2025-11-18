import React, { useEffect, useState } from "react";
import { state } from "../state";

export function DropZone() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const hasDirectory = state.currentDirectory.length > 0;
      if (hasDirectory !== isCollapsed) {
        setIsCollapsed(hasDirectory);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isCollapsed]);

  return (
    <div id="drop-zone" className={`drop-zone ${isCollapsed ? "collapsed" : ""}`}>
      <div className="drop-zone-content">
        <svg
          className="drop-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p className="drop-text">Drag and drop a folder here</p>
        <p className="drop-hint">or click to select a folder</p>
      </div>
    </div>
  );
}

