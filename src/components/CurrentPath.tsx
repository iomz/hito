import React from "react";

export function CurrentPath() {
  // Render once and let vanilla JS populate it
  // Do NOT re-render or it will clear the breadcrumbs
  return (
    <div id="current-path" className="current-path" style={{ display: "none" }}>
      {/* Breadcrumb navigation will be added by vanilla JS */}
    </div>
  );
}

