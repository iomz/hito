import React, { useEffect, useState } from "react";
import { state } from "../state";

export function CurrentPath() {
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    // Poll for changes to state.currentDirectory
    const interval = setInterval(() => {
      if (state.currentDirectory !== currentPath) {
        setCurrentPath(state.currentDirectory);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentPath]);

  // Don't render if no path
  if (!currentPath) {
    return <div id="current-path" className="current-path" style={{ display: "none" }}></div>;
  }

  return (
    <div id="current-path" className="current-path">
      {/* Breadcrumb navigation will be added by vanilla JS */}
    </div>
  );
}

