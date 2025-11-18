
/**
 * Remove an image tile from the grid by its image path.
 *
 * Finds the image-item element with the matching data-image-path attribute and removes it from the DOM.
 *
 * @param imagePath - The filesystem path of the image to remove from the grid
 */
export function removeImageFromGrid(imagePath: string): void {
  const imageGrid = document.querySelector("#image-grid") as HTMLElement | null;
  if (!imageGrid) return;
  
  const imageItems = imageGrid.querySelectorAll(".image-item");
  for (const item of imageItems) {
    const itemPath = item.getAttribute("data-image-path");
    if (itemPath === imagePath) {
      item.remove();
      break;
    }
  }
}

