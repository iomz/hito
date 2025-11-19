/**
 * Calculate the appropriate contrast color (black or white) for a given hex color
 * using WCAG 2.0 relative luminance formula with gamma correction.
 * 
 * This ensures accessibility compliance with WCAG AA/AAA contrast ratio requirements.
 * 
 * @param hexColor - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns "#000000" for light colors (better contrast with black) or "#ffffff" for dark colors (better contrast with white)
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    console.warn(`Invalid hex color: ${hexColor}`);
    return "#000000"; // Default to black
  }

  // Convert to RGB (0-255)
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance with gamma correction (WCAG 2.0 formula)
  const getRelativeLuminance = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  const l1 = 0.2126 * getRelativeLuminance(r) + 
             0.7152 * getRelativeLuminance(g) + 
             0.0722 * getRelativeLuminance(b);

  // Relative luminances for black and white
  const blackLuminance = 0; // #000000
  const whiteLuminance = 1; // #ffffff

  // Calculate contrast ratios (WCAG formula: (L1 + 0.05) / (L2 + 0.05))
  const contrastWithBlack = (l1 + 0.05) / (blackLuminance + 0.05);
  const contrastWithWhite = (whiteLuminance + 0.05) / (l1 + 0.05);

  // Return the color with better contrast ratio
  return contrastWithBlack > contrastWithWhite ? "#000000" : "#ffffff";
}

