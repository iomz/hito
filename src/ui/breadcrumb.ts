import { createElement } from "../utils/dom.js";
import { elements } from "../state.js";
import { handleFolder } from "../handlers/dragDrop.js";

/**
 * Create a breadcrumb list element from a file path.
 *
 * @param path - The filesystem path to convert to breadcrumbs
 * @returns A nav element containing the breadcrumb list
 */
export function createBreadcrumb(path: string): HTMLElement {
  const nav = createElement("nav", "breadcrumb");
  
  // Normalize path: convert backslashes to forward slashes
  const normalized = path.replace(/\\/g, "/");
  
  // Split path into segments
  const segments = normalized.split("/").filter(segment => segment.length > 0);
  // Check if absolute: Unix-style leading slash OR Windows drive letter (e.g., C:/)
  const isAbsolute = normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized);
  
  // Build path progressively for each segment
  // Handle Windows drive letter paths (e.g., C:/Users/...)
  const isWindowsDrive = /^[A-Za-z]:\//.test(normalized);
  let currentPath = isWindowsDrive ? (segments[0] + "/") : (isAbsolute ? "/" : "");
  const startIndex = isWindowsDrive ? 1 : 0;
  
  segments.slice(startIndex).forEach((segment, index) => {
    const separator = createElement("span", "breadcrumb-separator");
    separator.textContent = "/";
    nav.appendChild(separator);
    
    currentPath += (currentPath === "" || currentPath === "/" || currentPath.endsWith("/") ? "" : "/") + segment;
    const isLast = index === segments.slice(startIndex).length - 1;
    
    // Capture the current path value for this iteration
    const pathForThisSegment = currentPath;
    
    const item = createElement("span", `breadcrumb-item ${isLast ? "breadcrumb-item-active" : ""}`);
    
    if (isLast) {
      // Last item is not clickable, just shows the name
      item.textContent = segment;
    } else {
      // Other items are clickable links
      const link = createElement("a", "breadcrumb-link") as HTMLAnchorElement;
      link.textContent = segment;
      link.href = "#";
      link.onclick = (e) => {
        e.preventDefault();
        // Use handleFolder which updates breadcrumb and loads images
        // Use the captured path value, not the mutable currentPath variable
        handleFolder(pathForThisSegment);
      };
      item.appendChild(link);
    }
    
    nav.appendChild(item);
  });
  
  return nav;
}

