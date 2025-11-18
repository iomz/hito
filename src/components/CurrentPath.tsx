import React, { useEffect, useState } from "react";
import { state } from "../state";
import { normalizePath } from "../utils/state";
import { handleFolder } from "../handlers/dragDrop";

export function CurrentPath() {
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // One-time initial sync
    setCurrentDirectory(state.currentDirectory);
    setIsVisible(state.currentDirectory.length > 0);
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      setCurrentDirectory(state.currentDirectory);
      setIsVisible(state.currentDirectory.length > 0);
    });
    return unsubscribe;
  }, [state]);

  if (!isVisible || !currentDirectory) {
    return (
      <div id="current-path" className="current-path" style={{ display: "none" }}></div>
    );
  }

  const normalized = normalizePath(currentDirectory);
  const segments = normalized.split("/").filter(segment => segment.length > 0);
  const isAbsolute = normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized);
  const isWindowsDrive = /^[A-Za-z]:\//.test(normalized);
  const startIndex = isWindowsDrive ? 1 : 0;

  const handleBreadcrumbClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    handleFolder(path);
  };

  // Build breadcrumb items with paths
  const breadcrumbItems = segments.slice(startIndex).map((segment, index) => {
    // Calculate path up to this segment
    const basePath = isWindowsDrive ? (segments[0] + "/") : (isAbsolute ? "/" : "");
    let pathUpToSegment = basePath;
    
    for (let i = 0; i <= index; i++) {
      const seg = segments.slice(startIndex)[i];
      pathUpToSegment += (pathUpToSegment === "" || pathUpToSegment === "/" || pathUpToSegment.endsWith("/") ? "" : "/") + seg;
    }
    
    const isLast = index === segments.slice(startIndex).length - 1;
    
    return {
      segment,
      path: pathUpToSegment,
      isLast,
    };
  });

  return (
    <div id="current-path" className="current-path" style={{ display: "block" }}>
      <nav className="breadcrumb">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <span className="breadcrumb-separator">/</span>
            <span className={`breadcrumb-item ${item.isLast ? "breadcrumb-item-active" : ""}`}>
              {item.isLast ? (
                item.segment
              ) : (
                <a
                  href="#"
                  className="breadcrumb-link"
                  onClick={(e) => handleBreadcrumbClick(e, item.path)}
                >
                  {item.segment}
                </a>
              )}
            </span>
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}

