import React, { useMemo } from "react";
import { useAtomValue } from "jotai";
import { currentDirectoryAtom } from "../state";
import { normalizePath } from "../utils/state";
import { handleFolder } from "../handlers/dragDrop";

interface CurrentPathProps {
  id?: string;
}

export function CurrentPath({ id = "current-path" }: CurrentPathProps = {}) {
  const currentDirectory = useAtomValue(currentDirectoryAtom);
  const isVisible = useMemo(() => currentDirectory.length > 0, [currentDirectory]);

  if (!isVisible || !currentDirectory) {
    return (
      <div id={id} className="current-path" style={{ display: "none" }}></div>
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
    <div id={id} className="current-path" style={{ display: "block" }}>
      <nav className="breadcrumb">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <span className="breadcrumb-separator">›</span>
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

