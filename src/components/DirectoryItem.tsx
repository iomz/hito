import React from "react";
import { handleFolder } from "../handlers/dragDrop";

interface DirectoryItemProps {
  path: string;
}

export function DirectoryItem({ path }: DirectoryItemProps) {
  // Extract directory name from path
  const normalized = path.replace(/\\/g, "/").replace(/\/$/, "");
  const dirName = normalized.split("/").pop() || path;

  const handleClick = () => {
    handleFolder(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
      <div
        className="image-item directory-item"
        data-directory-path={path}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        }}
      >
      <div style={{ color: "#22c55e", marginBottom: "8px" }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div
        className="directory-name"
        style={{
          fontSize: "0.9em",
          color: "#333",
          textAlign: "center",
          padding: "0 8px",
          wordBreak: "break-word",
        }}
      >
        {dirName}
      </div>
    </div>
  );
}

