/**
 * Selects the first DOM element that matches the provided CSS selector.
 *
 * @returns The first matching element, or `null` if no match is found.
 */
export function querySelector<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

/**
 * Create an HTMLElement of the given tag with an optional CSS class and text content.
 *
 * @returns The created `HTMLElement`, with the provided `className` and `textContent` applied when given.
 */
export function createElement(tag: string, className?: string, textContent?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

