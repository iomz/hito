import React, { useEffect, useRef } from "react";
import { elements } from "../state";

export function CurrentPath() {
  const pathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Bridge React breadcrumb container to vanilla JS state
    if (pathRef.current) {
      (elements as any).currentPath = pathRef.current;
      console.log("[CurrentPath] Element reference stored in elements.currentPath");
    }
  }, []);

  // Render once and let vanilla JS populate it
  // Do NOT re-render or it will clear the breadcrumbs
  return (
    <div ref={pathRef} id="current-path" className="current-path" style={{ display: "none" }}>
      {/* Breadcrumb navigation will be added by vanilla JS */}
    </div>
  );
}

