import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getContrastColor } from "./colors";

describe("getContrastColor", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("valid hex colors", () => {
    it("should accept hex colors with # prefix", () => {
      expect(getContrastColor("#ff0000")).toBe("#000000");
      expect(getContrastColor("#00ff00")).toBe("#000000");
      expect(getContrastColor("#0000ff")).toBe("#ffffff");
    });

    it("should accept hex colors without # prefix", () => {
      expect(getContrastColor("ff0000")).toBe("#000000");
      expect(getContrastColor("00ff00")).toBe("#000000");
      expect(getContrastColor("0000ff")).toBe("#ffffff");
    });

    it("should accept uppercase hex colors", () => {
      expect(getContrastColor("#FF0000")).toBe("#000000");
      expect(getContrastColor("#00FF00")).toBe("#000000");
      expect(getContrastColor("#0000FF")).toBe("#ffffff");
    });

    it("should accept mixed case hex colors", () => {
      expect(getContrastColor("#Ff0000")).toBe("#000000");
      expect(getContrastColor("#00Ff00")).toBe("#000000");
      expect(getContrastColor("#0000Ff")).toBe("#ffffff");
    });

    it("should return black for light colors", () => {
      // Light colors have high luminance, so black text has better contrast
      expect(getContrastColor("#ffffff")).toBe("#000000"); // Pure white
      expect(getContrastColor("#ffff00")).toBe("#000000"); // Yellow
      expect(getContrastColor("#ff00ff")).toBe("#000000"); // Magenta
      expect(getContrastColor("#00ffff")).toBe("#000000"); // Cyan
      expect(getContrastColor("#cccccc")).toBe("#000000"); // Light gray
      expect(getContrastColor("#ffcc00")).toBe("#000000"); // Orange
    });

    it("should return white for dark colors", () => {
      // Dark colors have low luminance, so white text has better contrast
      expect(getContrastColor("#000000")).toBe("#ffffff"); // Pure black
      expect(getContrastColor("#000080")).toBe("#ffffff"); // Navy blue
      expect(getContrastColor("#800000")).toBe("#ffffff"); // Maroon
      expect(getContrastColor("#008000")).toBe("#ffffff"); // Dark green
      expect(getContrastColor("#333333")).toBe("#ffffff"); // Dark gray
      expect(getContrastColor("#1a1a1a")).toBe("#ffffff"); // Very dark gray
    });

    it("should handle gray values around the threshold", () => {
      // Test various gray values to ensure the threshold is calculated correctly
      expect(getContrastColor("#808080")).toBe("#000000"); // Medium gray (50% gray)
      expect(getContrastColor("#7f7f7f")).toBe("#000000"); // Slightly lighter than 50%
      expect(getContrastColor("#808081")).toBe("#000000"); // Slightly lighter than 50%
    });

    it("should handle primary colors correctly", () => {
      expect(getContrastColor("#ff0000")).toBe("#000000"); // Red (light)
      expect(getContrastColor("#00ff00")).toBe("#000000"); // Green (light)
      expect(getContrastColor("#0000ff")).toBe("#ffffff"); // Blue (dark)
    });

    it("should handle edge case colors", () => {
      expect(getContrastColor("#000001")).toBe("#ffffff"); // Almost black
      expect(getContrastColor("#fffffe")).toBe("#000000"); // Almost white
      expect(getContrastColor("#010101")).toBe("#ffffff"); // Very dark
      expect(getContrastColor("#fefefe")).toBe("#000000"); // Very light
    });
  });

  describe("invalid hex colors", () => {
    it("should return black and warn for empty string", () => {
      const result = getContrastColor("");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: ");
    });

    it("should return black and warn for invalid format (too short)", () => {
      const result = getContrastColor("#ff00");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #ff00");
    });

    it("should return black and warn for invalid format (too long)", () => {
      const result = getContrastColor("#ff00000");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #ff00000");
    });

    it("should return black and warn for invalid characters", () => {
      const result = getContrastColor("#gggggg");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #gggggg");
    });

    it("should return black and warn for invalid characters (numbers and letters)", () => {
      const result = getContrastColor("#ff00gg");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #ff00gg");
    });

    it("should return black and warn for special characters", () => {
      const result = getContrastColor("#ff-000");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #ff-000");
    });

    it("should return black and warn for non-hex characters", () => {
      const result = getContrastColor("#xyzabc");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #xyzabc");
    });

    it("should return black and warn for invalid format without #", () => {
      const result = getContrastColor("ff00");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: ff00");
    });

    it("should return black and warn for string with only #", () => {
      const result = getContrastColor("#");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #");
    });

    it("should return black and warn for 3-character hex (not supported)", () => {
      const result = getContrastColor("#fff");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #fff");
    });

    it("should return black and warn for 8-character hex (with alpha, not supported)", () => {
      const result = getContrastColor("#ff0000ff");
      expect(result).toBe("#000000");
      expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid hex color: #ff0000ff");
    });
  });

  describe("WCAG 2.0 formula correctness", () => {
    it("should calculate correct contrast for pure white", () => {
      // Pure white (#ffffff) has luminance of 1.0
      // Contrast with black: (1.0 + 0.05) / (0 + 0.05) = 21.0
      // Contrast with white: (1.0 + 0.05) / (1.0 + 0.05) = 1.0
      // Black has better contrast, so should return black
      expect(getContrastColor("#ffffff")).toBe("#000000");
    });

    it("should calculate correct contrast for pure black", () => {
      // Pure black (#000000) has luminance of 0.0
      // Contrast with black: (0.0 + 0.05) / (0 + 0.05) = 1.0
      // Contrast with white: (1.0 + 0.05) / (0.0 + 0.05) = 21.0
      // White has better contrast, so should return white
      expect(getContrastColor("#000000")).toBe("#ffffff");
    });

    it("should handle colors with low RGB values (gamma correction path)", () => {
      // Colors with normalized values <= 0.03928 use the linear path
      // 0.03928 * 255 = 10.0164, so values <= 10 use linear path
      expect(getContrastColor("#0a0a0a")).toBe("#ffffff"); // All channels = 10
      expect(getContrastColor("#050505")).toBe("#ffffff"); // All channels = 5
    });

    it("should handle colors with high RGB values (gamma correction path)", () => {
      // Colors with normalized values > 0.03928 use the gamma correction path
      // 0.03928 * 255 = 10.0164, so values > 10 use gamma path
      expect(getContrastColor("#0b0b0b")).toBe("#ffffff"); // All channels = 11
      expect(getContrastColor("#ffffff")).toBe("#000000"); // All channels = 255
    });

    it("should handle mixed RGB values (some low, some high)", () => {
      // Test colors where some channels use linear path and some use gamma path
      expect(getContrastColor("#0aff00")).toBe("#000000"); // R=10 (linear), G=255 (gamma), B=0 (linear)
      expect(getContrastColor("#ff0a00")).toBe("#000000"); // R=255 (gamma), G=10 (linear), B=0 (linear)
      expect(getContrastColor("#000aff")).toBe("#ffffff"); // R=0 (linear), G=10 (linear), B=255 (gamma)
    });
  });

  describe("real-world color examples", () => {
    it("should handle common UI colors", () => {
      // Test various real-world colors to ensure the function works correctly
      // Note: These assertions are based on actual WCAG calculations
      expect(getContrastColor("#3b82f6")).toBe("#000000"); // Blue-500 (actually light enough for black)
      expect(getContrastColor("#10b981")).toBe("#000000"); // Green-500 (light)
      expect(getContrastColor("#f59e0b")).toBe("#000000"); // Amber-500 (light)
      expect(getContrastColor("#ef4444")).toBe("#000000"); // Red-500 (light)
      expect(getContrastColor("#8b5cf6")).toBe("#000000"); // Purple-500 (light)
      expect(getContrastColor("#1f2937")).toBe("#ffffff"); // Gray-800 (dark)
      expect(getContrastColor("#f3f4f6")).toBe("#000000"); // Gray-100 (light)
    });

    it("should handle category colors from the app", () => {
      // Test some example category colors that might be used
      expect(getContrastColor("#ff0000")).toBe("#000000"); // Red category
      expect(getContrastColor("#00ff00")).toBe("#000000"); // Green category
      expect(getContrastColor("#0000ff")).toBe("#ffffff"); // Blue category
      expect(getContrastColor("#ffff00")).toBe("#000000"); // Yellow category
      expect(getContrastColor("#ff00ff")).toBe("#000000"); // Magenta category
      expect(getContrastColor("#00ffff")).toBe("#000000"); // Cyan category
    });
  });
});

