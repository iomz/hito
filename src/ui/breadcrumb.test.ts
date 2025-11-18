import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBreadcrumb } from "./breadcrumb";
import { browseImages } from "../core/browse";

// Mock the browseImages function to avoid actual navigation during tests
vi.mock("../core/browse", () => ({
  browseImages: vi.fn(),
}));

describe("createBreadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create breadcrumb for Unix absolute path", () => {
    const path = "/Users/iomz/Pictures";
    const breadcrumb = createBreadcrumb(path);

    expect(breadcrumb.tagName).toBe("NAV");
    expect(breadcrumb.className).toBe("breadcrumb");

    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(3); // Users, iomz, Pictures

    const separators = breadcrumb.querySelectorAll(".breadcrumb-separator");
    expect(separators.length).toBe(3); // Three separators
  });

  it("should create breadcrumb for Windows path", () => {
    const path = "C:\\Users\\iomz\\Pictures";
    const breadcrumb = createBreadcrumb(path);

    expect(breadcrumb.tagName).toBe("NAV");
    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(3); // Users, iomz, Pictures (C: drive letter is in path but not rendered as item)
  });

  it("should create breadcrumb for relative path", () => {
    const path = "folder/subfolder/file";
    const breadcrumb = createBreadcrumb(path);

    expect(breadcrumb.tagName).toBe("NAV");
    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(3);
  });

  it("should mark last item as active", () => {
    const path = "/Users/iomz";
    const breadcrumb = createBreadcrumb(path);

    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    const lastItem = items[items.length - 1];
    expect(lastItem.className).toContain("breadcrumb-item-active");
  });

  it("should make non-last items clickable", () => {
    const path = "/Users/iomz/Pictures";
    const breadcrumb = createBreadcrumb(path);

    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    // First two items should have links
    const firstLink = items[0].querySelector("a");
    const secondLink = items[1].querySelector("a");
    expect(firstLink).not.toBeNull();
    expect(secondLink).not.toBeNull();

    // Last item should not have a link
    const lastLink = items[items.length - 1].querySelector("a");
    expect(lastLink).toBeNull();
  });

  it("should handle root path", () => {
    const path = "/";
    const breadcrumb = createBreadcrumb(path);

    expect(breadcrumb.tagName).toBe("NAV");
    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(0); // No segments for root
  });

  it("should handle Windows drive root", () => {
    const path = "C:\\";
    const breadcrumb = createBreadcrumb(path);

    expect(breadcrumb.tagName).toBe("NAV");
    // For C:\, after normalization and splitting, we get segments = ["C:"]
    // Since it's a Windows drive, startIndex = 1, so segments.slice(1) is empty
    // So there are no breadcrumb items, only the drive letter is in currentPath
    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(0); // No segments after drive letter
  });

  it("should normalize backslashes to forward slashes", () => {
    const path = "C:\\Users\\iomz";
    const breadcrumb = createBreadcrumb(path);

    // Should handle Windows paths correctly
    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(2); // Users, iomz (C: drive letter skipped)
    expect(items[0].textContent).toBe("Users");
    expect(items[1].textContent).toBe("iomz");
  });

  it("should handle single segment path", () => {
    const path = "/Users";
    const breadcrumb = createBreadcrumb(path);

    const items = breadcrumb.querySelectorAll(".breadcrumb-item");
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe("Users");
    expect(items[0].className).toContain("breadcrumb-item-active");
  });
});
