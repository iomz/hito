import { elements } from "../state";
import { querySelector } from "./dom";

/**
 * Element selector configuration for initialization.
 */
interface ElementConfig {
  key: keyof typeof elements;
  selector: string;
  type?: "input";
}

/**
 * Configuration for all elements to initialize.
 */
const ELEMENT_CONFIGS: ElementConfig[] = [
  { key: "dropZone", selector: "#drop-zone" },
  { key: "currentPath", selector: "#current-path" },
  { key: "errorMsg", selector: "#error-msg" },
  { key: "imageGrid", selector: "#image-grid" },
  { key: "loadingSpinner", selector: "#loading-spinner" },
  { key: "modal", selector: "#image-modal" },
  { key: "modalImage", selector: "#modal-image" },
  { key: "modalCaption", selector: "#modal-caption" },
  { key: "modalCaptionText", selector: "#modal-caption-text" },
  { key: "closeBtn", selector: ".close" },
  { key: "modalPrevBtn", selector: "#modal-prev" },
  { key: "modalNextBtn", selector: "#modal-next" },
  { key: "shortcutsOverlay", selector: "#keyboard-shortcuts-overlay" },
  { key: "shortcutsList", selector: "#shortcuts-list" },
  { key: "hotkeySidebar", selector: "#hotkey-sidebar" },
  { key: "hotkeySidebarToggle", selector: "#hotkey-sidebar-toggle" },
  { key: "hotkeySidebarClose", selector: "#hotkey-sidebar-close" },
  { key: "hotkeyList", selector: "#hotkey-list" },
  { key: "addHotkeyBtn", selector: "#add-hotkey-btn" },
  { key: "categoryList", selector: "#category-list" },
  { key: "addCategoryBtn", selector: "#add-category-btn" },
  { key: "currentImageCategories", selector: "#current-image-categories" },
  { key: "modalCategories", selector: "#modal-categories" },
  { key: "configFilePathInput", selector: "#config-file-path", type: "input" },
];

/**
 * Initialize all DOM elements from configuration.
 */
export function initializeElements(): void {
  for (const config of ELEMENT_CONFIGS) {
    const element = config.type === "input"
      ? querySelector<HTMLInputElement>(config.selector)
      : config.key === "modalImage"
      ? querySelector<HTMLImageElement>(config.selector)
      : querySelector(config.selector);
    
    // Type-safe assignment based on key
    (elements as any)[config.key] = element;
  }
}

