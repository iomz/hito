import { state } from "../state.js";
import { createElement } from "./dom.js";
import { openModal } from "../ui/modal.js";

/**
 * Load an image from disk, return its data URL, and cache it in the module's image cache.
 *
 * @param imagePath - The filesystem path of the image to load
 * @returns The image encoded as a data URL string
 * @throws If the Tauri invoke API is unavailable or the image cannot be loaded or decoded
 */
export async function loadImageData(imagePath: string): Promise<string> {
  try {
    if (!window.__TAURI__?.core?.invoke) {
      throw new Error("Tauri invoke API not available");
    }
    const dataUrl = await window.__TAURI__.core.invoke<string>("load_image", { imagePath });
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error(`Invalid data URL returned for ${imagePath}`);
    }
    state.loadedImages.set(imagePath, dataUrl);
    return dataUrl;
  } catch (error) {
    throw new Error(`Failed to load image: ${error}`);
  }
}

/**
 * Create an image element for a given image path and data URL, with lazy loading,
 * an inline error fallback, and a click handler that opens the image modal.
 *
 * @param imagePath - Original filesystem path used for the element's alt text and to locate the image in the gallery when opening the modal
 * @param dataUrl - Data URL or source string to assign to the image's `src`
 * @returns The constructed HTMLImageElement with lazy loading, an error fallback image, and a click handler that opens the modal at this image's index
 */
export function createImageElement(imagePath: string, dataUrl: string): HTMLImageElement {
  const img = createElement("img") as HTMLImageElement;
  img.src = dataUrl;
  // Normalize path: convert backslashes to forward slashes before extracting filename
  const normalized = imagePath.replace(/\\/g, "/");
  img.alt = normalized.split("/").pop() || imagePath;
  img.loading = "lazy";
  
  img.onerror = () => {
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EFailed to load%3C/text%3E%3C/svg%3E";
  };
  
  img.onclick = () => {
    if (!Array.isArray(state.allImagePaths)) {
      console.error("state.allImagePaths is not an array in createImageElement:", state.allImagePaths);
      return;
    }
    const imageIndex = state.allImagePaths.findIndex(img => img.path === imagePath);
    if (imageIndex >= 0) {
      openModal(imageIndex);
    }
  };
  
  return img;
}

/**
 * Creates a lightweight placeholder element displayed while an image is loading.
 *
 * @returns A DIV element with class `image-placeholder` and text content `"Loading..."` to show in image slots during load.
 */
export function createPlaceholder(): HTMLElement {
  const placeholder = createElement("div", "image-placeholder", "Loading...");
  placeholder.style.color = "#999";
  placeholder.style.fontSize = "0.9em";
  return placeholder;
}

/**
 * Create a visual placeholder used when an image fails to load.
 *
 * @returns An HTMLElement (a styled `div`) containing the text "Failed to load" and styled to indicate an error state.
 */
export function createErrorPlaceholder(): HTMLElement {
  const errorDiv = createElement("div", undefined, "Failed to load");
  errorDiv.style.backgroundColor = "#fee";
  errorDiv.style.color = "#c33";
  errorDiv.style.fontSize = "0.9em";
  errorDiv.style.padding = "10px";
  errorDiv.style.textAlign = "center";
  return errorDiv;
}

