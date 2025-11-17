import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { state, elements } from "../state.js";

// Mock window.__TAURI__
const mockInvoke = vi.fn();

// Mock dependencies
vi.mock("./hotkeys.js", () => ({
  renderHotkeyList: vi.fn(),
}));

describe("categories config file location", () => {
  beforeEach(() => {
    // Setup window mock
    (globalThis as any).window = {
      __TAURI__: {
        core: {
          invoke: mockInvoke,
        },
      },
    };
    
    state.currentDirectory = "/test/directory";
    state.configFilePath = "";
    state.categories = [];
    state.imageCategories.clear();
    state.hotkeys = [];
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigFileDirectory (tested via loadHitoConfig)", () => {
    it("should use currentDirectory when configFilePath is empty", async () => {
      state.configFilePath = "";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });

    it("should extract directory from full path", async () => {
      state.configFilePath = "/custom/path/config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: "config.json",
      });
    });

    it("should handle Windows paths", async () => {
      state.configFilePath = "C:\\Users\\test\\config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "C:/Users/test",
        filename: "config.json",
      });
    });

    it("should use currentDirectory when path has no slash", async () => {
      state.configFilePath = "config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "config.json",
      });
    });

    it("should handle root path", async () => {
      state.configFilePath = "/config.json";
      state.currentDirectory = "/test/dir";

      // When directory is empty string, loadHitoConfig returns early
      // So we expect it not to be called
      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      // Empty directory causes early return, so invoke should not be called
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("getConfigFileName (tested via loadHitoConfig)", () => {
    it("should return undefined when configFilePath is empty", async () => {
      state.configFilePath = "";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: undefined,
      });
    });

    it("should extract filename from full path", async () => {
      state.configFilePath = "/custom/path/my-config.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: "my-config.json",
      });
    });

    it("should return filename when path has no slash", async () => {
      state.configFilePath = "custom.json";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/test/dir",
        filename: "custom.json",
      });
    });

    it("should handle empty filename after slash", async () => {
      state.configFilePath = "/custom/path/";
      state.currentDirectory = "/test/dir";

      mockInvoke.mockResolvedValue({
        categories: [],
        image_categories: [],
        hotkeys: [],
      });

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("load_hito_config", {
        directory: "/custom/path",
        filename: undefined,
      });
    });
  });

  describe("loadHitoConfig", () => {
    it("should return early when currentDirectory is empty", async () => {
      state.currentDirectory = "";
      state.configFilePath = "";

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      state.currentDirectory = "/test/dir";
      delete (globalThis as any).window.__TAURI__;

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should load categories from config", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [
          { id: "cat1", name: "Category 1", color: "#ff0000" },
        ],
        image_categories: [],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.categories).toEqual(mockData.categories);
    });

    it("should load image categories from config", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [],
        image_categories: [
          ["/path/to/image1.jpg", ["cat1", "cat2"]],
        ],
        hotkeys: [],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.imageCategories.get("/path/to/image1.jpg")).toEqual([
        "cat1",
        "cat2",
      ]);
    });

    it("should load hotkeys from config", async () => {
      state.currentDirectory = "/test/dir";
      
      // Mock renderHotkeyList to avoid import errors
      vi.doMock("./hotkeys.js", () => ({
        renderHotkeyList: vi.fn(),
      }));

      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [
          {
            id: "hotkey1",
            key: "K",
            modifiers: ["Ctrl"],
            action: "toggle_category_cat1",
          },
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toBe("hotkey1");
      expect(state.hotkeys[0].key).toBe("K");
    });

    it("should handle errors gracefully", async () => {
      state.currentDirectory = "/test/dir";
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockInvoke.mockRejectedValue(new Error("Failed to load"));

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("saveHitoConfig", () => {
    it("should return early when currentDirectory is empty", async () => {
      state.currentDirectory = "";
      state.configFilePath = "";

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should return early when Tauri API is unavailable", async () => {
      state.currentDirectory = "/test/dir";
      delete (globalThis as any).window.__TAURI__;

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should save categories with default filename", async () => {
      state.currentDirectory = "/test/dir";
      state.configFilePath = "";
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
      ];
      state.imageCategories.set("/path/to/image.jpg", ["cat1"]);
      state.hotkeys = [];

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/test/dir",
        categories: state.categories,
        imageCategories: [["/path/to/image.jpg", ["cat1"]]],
        hotkeys: [],
        filename: undefined,
      });
    });

    it("should save with custom filename", async () => {
      state.currentDirectory = "/test/dir";
      state.configFilePath = "/custom/path/my-config.json";
      state.categories = [];
      state.imageCategories.clear();
      state.hotkeys = [];

      mockInvoke.mockResolvedValue(undefined);

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(mockInvoke).toHaveBeenCalledWith("save_hito_config", {
        directory: "/custom/path",
        categories: [],
        imageCategories: [],
        hotkeys: [],
        filename: "my-config.json",
      });
    });

    it("should handle errors gracefully", async () => {
      state.currentDirectory = "/test/dir";
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockInvoke.mockRejectedValue(new Error("Failed to save"));

      const { saveHitoConfig } = await import("./categories.js");
      await saveHitoConfig();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe("categories UI and management", () => {
  beforeEach(() => {
    // Setup window mock
    (globalThis as any).window = {
      __TAURI__: {
        core: {
          invoke: mockInvoke,
        },
      },
      alert: vi.fn(),
      confirm: vi.fn(),
    };

    // Reset state
    state.categories = [];
    state.imageCategories.clear();
    state.currentModalIndex = -1;
    state.allImagePaths = [];
    state.currentDirectory = "/test/dir";
    state.configFilePath = "";

    // Setup DOM elements
    document.body.innerHTML = "";
    elements.categoryList = document.createElement("div");
    elements.modalCategories = document.createElement("div");
    elements.currentImageCategories = document.createElement("div");
    elements.addCategoryBtn = document.createElement("button");
    document.body.appendChild(elements.categoryList);
    document.body.appendChild(elements.modalCategories);
    document.body.appendChild(elements.currentImageCategories);
    document.body.appendChild(elements.addCategoryBtn);

    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("renderCategoryList", () => {
    it("should render empty state when no categories exist", async () => {
      state.categories = [];

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      expect(elements.categoryList?.innerHTML).toContain("No categories yet");
      expect(elements.categoryList?.querySelector(".category-empty-state")).toBeTruthy();
    });

    it("should render categories with correct structure", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      state.imageCategories.set("/image2.jpg", ["cat1", "cat2"]);

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      const items = elements.categoryList?.querySelectorAll(".category-item");
      expect(items).toHaveLength(2);

      const firstItem = items?.[0];
      expect(firstItem?.querySelector(".category-name")?.textContent).toBe("Category 1");
      expect(firstItem?.querySelector(".category-count")?.textContent).toBe("2 images");
      const colorElement = firstItem?.querySelector(".category-color") as HTMLElement;
      expect(colorElement?.style.backgroundColor).toBe("rgb(255, 0, 0)");
    });

    it("should display singular form for single image", async () => {
      state.categories = [{ id: "cat1", name: "Category 1", color: "#ff0000" }];
      state.imageCategories.set("/image1.jpg", ["cat1"]);

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      const count = elements.categoryList?.querySelector(".category-count");
      expect(count?.textContent).toBe("1 image");
    });

    it("should return early if categoryList element is missing", async () => {
      elements.categoryList = null;

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("renderModalCategories", () => {
    it("should return early if modalCategories element is missing", async () => {
      elements.modalCategories = null;

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      // Should not throw
      expect(true).toBe(true);
    });

    it("should return early if currentModalIndex is invalid", async () => {
      state.currentModalIndex = -1;
      state.allImagePaths = [];

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      expect(elements.modalCategories?.innerHTML).toBe("");
    });

    it("should return early if no categories assigned to current image", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [{ id: "cat1", name: "Category 1", color: "#ff0000" }];
      state.imageCategories.clear();

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      expect(elements.modalCategories?.innerHTML).toBe("");
    });

    it("should render category tags for assigned categories", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.imageCategories.set("/image1.jpg", ["cat1", "cat2"]);

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      const tags = elements.modalCategories?.querySelectorAll(".modal-category-tag");
      expect(tags).toHaveLength(2);
      expect(tags?.[0]?.textContent).toBe("Category 1");
      expect(tags?.[1]?.textContent).toBe("Category 2");
    });

    it("should apply correct contrast colors", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Light", color: "#ffffff" }, // Light color -> black text
        { id: "cat2", name: "Dark", color: "#000000" }, // Dark color -> white text
      ];
      state.imageCategories.set("/image1.jpg", ["cat1", "cat2"]);

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      const tags = elements.modalCategories?.querySelectorAll(".modal-category-tag");
      const lightTag = tags?.[0] as HTMLElement;
      const darkTag = tags?.[1] as HTMLElement;

      expect(lightTag?.style.color).toBe("rgb(0, 0, 0)"); // Black for light background
      expect(darkTag?.style.color).toBe("rgb(255, 255, 255)"); // White for dark background
    });
  });

  describe("getContrastColor", () => {
    it("should return black for light colors", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [{ id: "cat1", name: "Light", color: "#ffffff" }];
      state.imageCategories.set("/image1.jpg", ["cat1"]);

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      const tag = elements.modalCategories?.querySelector(".modal-category-tag") as HTMLElement;
      expect(tag?.style.color).toBe("rgb(0, 0, 0)");
    });

    it("should return white for dark colors", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [{ id: "cat1", name: "Dark", color: "#000000" }];
      state.imageCategories.set("/image1.jpg", ["cat1"]);

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      const tag = elements.modalCategories?.querySelector(".modal-category-tag") as HTMLElement;
      expect(tag?.style.color).toBe("rgb(255, 255, 255)");
    });

    it("should handle hex colors without #", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [{ id: "cat1", name: "Test", color: "ffffff" }];
      state.imageCategories.set("/image1.jpg", ["cat1"]);

      const { renderModalCategories } = await import("./categories.js");
      renderModalCategories();

      const tag = elements.modalCategories?.querySelector(".modal-category-tag") as HTMLElement;
      expect(tag?.style.color).toBe("rgb(0, 0, 0)");
    });
  });

  describe("renderCurrentImageCategories", () => {
    it("should return early if currentImageCategories element is missing", async () => {
      elements.currentImageCategories = null;

      const { renderCurrentImageCategories } = await import("./categories.js");
      renderCurrentImageCategories();

      expect(true).toBe(true);
    });

    it("should return early if currentModalIndex is invalid", async () => {
      state.currentModalIndex = -1;
      state.allImagePaths = [];

      const { renderCurrentImageCategories } = await import("./categories.js");
      renderCurrentImageCategories();

      expect(elements.currentImageCategories?.innerHTML).toBe("");
    });

    it("should show empty message when no categories exist", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [];

      const { renderCurrentImageCategories } = await import("./categories.js");
      renderCurrentImageCategories();

      expect(elements.currentImageCategories?.innerHTML).toContain("Create categories first");
    });

    it("should render checkboxes for all categories", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];
      state.imageCategories.set("/image1.jpg", ["cat1"]);

      const { renderCurrentImageCategories } = await import("./categories.js");
      renderCurrentImageCategories();

      const checkboxes = elements.currentImageCategories?.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);

      const cat1Checkbox = elements.currentImageCategories?.querySelector('#category-cat1') as HTMLInputElement;
      const cat2Checkbox = elements.currentImageCategories?.querySelector('#category-cat2') as HTMLInputElement;

      expect(cat1Checkbox?.checked).toBe(true);
      expect(cat2Checkbox?.checked).toBe(false);
    });
  });

  describe("toggleImageCategory", () => {
    it("should add category when not present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories.js");
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      await toggleCategoryForCurrentImage("cat2");

      expect(state.imageCategories.get("/image1.jpg")).toContain("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should remove category when present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1", "cat2"]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories.js");
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      await toggleCategoryForCurrentImage("cat1");

      expect(state.imageCategories.get("/image1.jpg")).not.toContain("cat1");
      expect(state.imageCategories.get("/image1.jpg")).toContain("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("assignImageCategory", () => {
    it("should add category when not present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockResolvedValue(undefined);

      const { assignImageCategory } = await import("./categories.js");
      await assignImageCategory("/image1.jpg", "cat2");

      expect(state.imageCategories.get("/image1.jpg")).toContain("cat2");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should not add category when already present", async () => {
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockClear();

      const { assignImageCategory } = await import("./categories.js");
      await assignImageCategory("/image1.jpg", "cat1");

      const categories = state.imageCategories.get("/image1.jpg");
      expect(categories).toEqual(["cat1"]);
      // assignImageCategory only saves if category was added, not if already present
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("assignCategoryToCurrentImage", () => {
    it("should assign category to current image", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.imageCategories.clear();
      mockInvoke.mockResolvedValue(undefined);

      const { assignCategoryToCurrentImage } = await import("./categories.js");
      await assignCategoryToCurrentImage("cat1");

      expect(state.imageCategories.get("/image1.jpg")).toContain("cat1");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalIndex is invalid", async () => {
      state.currentModalIndex = -1;
      mockInvoke.mockClear();

      const { assignCategoryToCurrentImage } = await import("./categories.js");
      await assignCategoryToCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("toggleCategoryForCurrentImage", () => {
    it("should toggle category for current image", async () => {
      state.currentModalIndex = 0;
      state.allImagePaths = [{ path: "/image1.jpg" }];
      state.imageCategories.set("/image1.jpg", ["cat1"]);
      mockInvoke.mockResolvedValue(undefined);

      const { toggleCategoryForCurrentImage } = await import("./categories.js");
      await toggleCategoryForCurrentImage("cat1");

      expect(state.imageCategories.get("/image1.jpg")).not.toContain("cat1");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should return early if currentModalIndex is invalid", async () => {
      state.currentModalIndex = -1;
      mockInvoke.mockClear();

      const { toggleCategoryForCurrentImage } = await import("./categories.js");
      await toggleCategoryForCurrentImage("cat1");

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("showCategoryDialog", () => {
    it("should create dialog for adding new category", async () => {
      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      // Trigger the dialog by clicking add button
      elements.addCategoryBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const overlay = document.querySelector(".category-dialog-overlay");
      expect(overlay).toBeTruthy();

      const title = overlay?.querySelector("h3");
      expect(title?.textContent).toBe("Add Category");

      const nameInput = overlay?.querySelector("#category-name-input") as HTMLInputElement;
      expect(nameInput).toBeTruthy();
      expect(nameInput?.type).toBe("text");

      const colorInput = overlay?.querySelector("#category-color-input") as HTMLInputElement;
      expect(colorInput).toBeTruthy();
      expect(colorInput?.type).toBe("color");
    });

    it("should create dialog for editing existing category", async () => {
      state.categories = [{ id: "cat1", name: "Category 1", color: "#ff0000" }];

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      const editBtn = elements.categoryList?.querySelector(".category-edit-btn") as HTMLButtonElement;
      editBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const overlay = document.querySelector(".category-dialog-overlay");
      expect(overlay).toBeTruthy();

      const title = overlay?.querySelector("h3");
      expect(title?.textContent).toBe("Edit Category");

      const nameInput = overlay?.querySelector("#category-name-input") as HTMLInputElement;
      expect(nameInput?.value).toBe("Category 1");

      const colorInput = overlay?.querySelector("#category-color-input") as HTMLInputElement;
      expect(colorInput?.value).toBe("#ff0000");
    });

    it("should close dialog when cancel button is clicked", async () => {
      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      elements.addCategoryBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const overlay = document.querySelector(".category-dialog-overlay");
      const cancelBtn = overlay?.querySelector(".category-dialog-cancel") as HTMLButtonElement;
      cancelBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(document.querySelector(".category-dialog-overlay")).toBeNull();
    });

    it("should close dialog when close button is clicked", async () => {
      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      elements.addCategoryBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const overlay = document.querySelector(".category-dialog-overlay");
      const closeBtn = overlay?.querySelector(".category-dialog-close") as HTMLButtonElement;
      closeBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(document.querySelector(".category-dialog-overlay")).toBeNull();
    });

    it("should have save button with validation logic", async () => {
      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      elements.addCategoryBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 200));

      const overlay = document.querySelector(".category-dialog-overlay");
      expect(overlay).toBeTruthy();
      
      const saveBtn = overlay?.querySelector(".category-dialog-save") as HTMLButtonElement;
      const nameInput = overlay?.querySelector("#category-name-input") as HTMLInputElement;
      
      expect(saveBtn).toBeTruthy();
      expect(nameInput).toBeTruthy();
      expect(saveBtn.onclick).toBeTruthy();
      // Verify the save button has validation logic (onclick handler exists)
    });

    it("should add new category when saved", async () => {
      const initialCount = state.categories.length;
      mockInvoke.mockResolvedValue(undefined);

      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      elements.addCategoryBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const overlay = document.querySelector(".category-dialog-overlay");
      const nameInput = overlay?.querySelector("#category-name-input") as HTMLInputElement;
      const saveBtn = overlay?.querySelector(".category-dialog-save") as HTMLButtonElement;

      nameInput.value = "New Category";
      saveBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(state.categories.length).toBe(initialCount + 1);
      expect(state.categories[state.categories.length - 1].name).toBe("New Category");
      expect(mockInvoke).toHaveBeenCalled();
    });

    it("should update existing category when saved", async () => {
      state.categories = [{ id: "cat1", name: "Old Name", color: "#ff0000" }];
      mockInvoke.mockResolvedValue(undefined);

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      const editBtn = elements.categoryList?.querySelector(".category-edit-btn") as HTMLButtonElement;
      editBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const overlay = document.querySelector(".category-dialog-overlay");
      const nameInput = overlay?.querySelector("#category-name-input") as HTMLInputElement;
      const saveBtn = overlay?.querySelector(".category-dialog-save") as HTMLButtonElement;

      nameInput.value = "Updated Name";
      saveBtn?.click();

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(state.categories[0].name).toBe("Updated Name");
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe("deleteCategory", () => {
    it("should render delete button for each category", async () => {
      state.categories = [
        { id: "cat1", name: "Category 1", color: "#ff0000" },
        { id: "cat2", name: "Category 2", color: "#00ff00" },
      ];

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      const deleteBtns = elements.categoryList?.querySelectorAll(".category-delete-btn");
      expect(deleteBtns).toHaveLength(2);
      expect(deleteBtns?.[0]?.textContent).toBe("Delete");
      expect(deleteBtns?.[1]?.textContent).toBe("Delete");
    });

    it("should have delete button with onclick handler", async () => {
      state.categories = [{ id: "cat1", name: "Category 1", color: "#ff0000" }];

      const { renderCategoryList } = await import("./categories.js");
      renderCategoryList();

      const deleteBtn = elements.categoryList?.querySelector(".category-delete-btn") as HTMLButtonElement;
      expect(deleteBtn).toBeTruthy();
      expect(deleteBtn.onclick).toBeTruthy();
    });
  });

  describe("setupCategories", () => {
    it("should initialize category list and add button", async () => {
      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      expect(elements.categoryList?.innerHTML).toContain("No categories yet");
      expect(elements.addCategoryBtn?.onclick).toBeTruthy();
    });

    it("should handle missing addCategoryBtn gracefully", async () => {
      elements.addCategoryBtn = null;

      const { setupCategories } = await import("./categories.js");
      await setupCategories();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("loadHitoConfig hotkey handling", () => {
    it("should handle hotkeys with missing fields", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [
          {
            id: undefined,
            key: undefined,
            modifiers: undefined,
            action: undefined,
          },
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.hotkeys).toHaveLength(1);
      expect(state.hotkeys[0].id).toContain("hotkey_");
      expect(state.hotkeys[0].key).toBe("");
      expect(state.hotkeys[0].modifiers).toEqual([]);
      expect(state.hotkeys[0].action).toBe("");
    });

    it("should handle hotkeys with non-array modifiers", async () => {
      state.currentDirectory = "/test/dir";
      const mockData = {
        categories: [],
        image_categories: [],
        hotkeys: [
          {
            id: "hotkey1",
            key: "K",
            modifiers: "Ctrl" as any,
            action: "toggle_category_cat1",
          },
        ],
      };

      mockInvoke.mockResolvedValue(mockData);

      const { loadHitoConfig } = await import("./categories.js");
      await loadHitoConfig();

      expect(state.hotkeys[0].modifiers).toEqual([]);
    });
  });
});

