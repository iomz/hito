import React, { useEffect, useState } from "react";
import { state } from "../state";
import { toggleHotkeySidebar, closeHotkeySidebar } from "../ui/hotkeys";
import { showCategoryDialog } from "../ui/categories";
import { showHotkeyDialog } from "../ui/hotkeys";
import { CategoryList } from "./CategoryList";
import { CurrentImageCategories } from "./CurrentImageCategories";
import { HotkeyList } from "./HotkeyList";
import { ConfigFileInput } from "./ConfigFileInput";

export function HotkeySidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"categories" | "hotkeys" | "file">("categories");
  const [currentDirectory, setCurrentDirectory] = useState("");

  useEffect(() => {
    const unsubscribe = state.subscribe(() => {
      setIsOpen(state.isHotkeySidebarOpen);
      setCurrentDirectory(state.currentDirectory);
    });
    return unsubscribe;
  }, []);

  const handleToggle = () => {
    toggleHotkeySidebar();
  };

  const handleClose = () => {
    closeHotkeySidebar();
  };

  const handleTabClick = (tab: "categories" | "hotkeys" | "file") => {
    setActiveTab(tab);
  };

  return (
    <>
      <button
        id="hotkey-sidebar-toggle"
        className="hotkey-sidebar-toggle"
        aria-label="Toggle configuration sidebar"
        onClick={handleToggle}
        style={{ display: currentDirectory.length > 0 ? "flex" : "none" }}
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <div
        id="hotkey-sidebar"
        className={`hotkey-sidebar ${isOpen ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeHotkeySidebar();
          }
        }}
      >
        <div className="hotkey-sidebar-header">
          <h3>Configuration</h3>
          <button
            id="hotkey-sidebar-close"
            className="hotkey-sidebar-close"
            aria-label="Close sidebar"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>
        <div className="hotkey-sidebar-content">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === "categories" ? "active" : ""}`}
              onClick={() => handleTabClick("categories")}
            >
              Categories
            </button>
            <button
              className={`sidebar-tab ${activeTab === "hotkeys" ? "active" : ""}`}
              onClick={() => handleTabClick("hotkeys")}
            >
              Hotkeys
            </button>
            <button
              className={`sidebar-tab ${activeTab === "file" ? "active" : ""}`}
              onClick={() => handleTabClick("file")}
            >
              File
            </button>
          </div>

          <div
            id="categories-panel"
            className={`sidebar-panel ${activeTab === "categories" ? "active" : ""}`}
          >
            <div className="panel-header">
              <h4>Image Categories</h4>
              <button
                id="add-category-btn"
                className="add-category-btn"
                onClick={() => showCategoryDialog()}
              >
                + Add
              </button>
            </div>
            <CategoryList />
            <CurrentImageCategories />
          </div>

          <div
            id="hotkeys-panel"
            className={`sidebar-panel ${activeTab === "hotkeys" ? "active" : ""}`}
          >
            <HotkeyList />
            <button
              id="add-hotkey-btn"
              className="add-hotkey-btn"
              onClick={() => showHotkeyDialog()}
            >
              + Add Hotkey
            </button>
          </div>

          <div
            id="file-panel"
            className={`sidebar-panel ${activeTab === "file" ? "active" : ""}`}
          >
            <div className="panel-header">
              <h4>Configuration File</h4>
            </div>
            <ConfigFileInput />
          </div>
        </div>
      </div>
    </>
  );
}

