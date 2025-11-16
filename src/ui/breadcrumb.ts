import { createElement } from "../utils/dom.js";
import { browseImages } from "../core/browse.js";

/**
 * Create a breadcrumb list element from a file path.
 *
 * @param path - The filesystem path to convert to breadcrumbs
 * @returns A nav element containing the breadcrumb list
 */
export function createBreadcrumb(path: string): HTMLElement {
  const nav = createElement("nav", "breadcrumb");
  
  // Split path into segments
  const segments = path.split("/").filter(segment => segment.length > 0);
  const isAbsolute = path.startsWith("/");
  
  // Build path progressively for each segment
  let currentPath = isAbsolute ? "/" : "";
  segments.forEach((segment, index) => {
    const separator = createElement("span", "breadcrumb-separator");
    separator.textContent = "/";
    nav.appendChild(separator);
    
    currentPath += (isAbsolute && currentPath === "/" ? "" : "/") + segment;
    const isLast = index === segments.length - 1;
    
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
        browseImages(currentPath);
      };
      item.appendChild(link);
    }
    
    nav.appendChild(item);
  });
  
  return nav;
}

