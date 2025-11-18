import React, { useEffect } from "react";
import { initializeElements } from "./utils/elements";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupModalHandlers } from "./handlers/modal";
import { setupKeyboardHandlers } from "./handlers/keyboard";
import { setupHotkeySidebar } from "./ui/hotkeys";
import { setupCategories } from "./ui/categories";
import { updateShortcutsOverlay } from "./ui/modal";
import { resetToHome } from "./utils/reset";
import { elements, state } from "./state";

function App() {
  useEffect(() => {
    // Initialize DOM element references first!
    initializeElements();
    
    // Verify elements were initialized
    if (!elements.dropZone) {
      console.error("Failed to initialize elements!");
      return;
    }
    
    // Hide sidebar toggle button initially (home screen)
    if (elements.hotkeySidebarToggle) {
      elements.hotkeySidebarToggle.style.display = "none";
    }
    
    // Setup all event handlers after DOM is ready
    setupDocumentDragHandlers();
    setupDragDropHandlers();
    setupHTML5DragDrop();
    setupModalHandlers();
    setupKeyboardHandlers();
    setupHotkeySidebar();
    
    // Setup categories (non-blocking)
    setupCategories().catch((error) => {
      console.error("Failed to setup categories:", error);
    });
    
    // Initialize shortcuts overlay
    updateShortcutsOverlay();
    
    // Setup Tauri drag events
    setupTauriDragEvents().catch((error) => {
      console.error("Failed to setup Tauri drag events:", error);
    });
    
    // Setup h1 click handler
    const h1Element = document.querySelector("h1");
    if (h1Element) {
      h1Element.style.cursor = "pointer";
      h1Element.addEventListener("click", resetToHome);
    }
    
    // Setup sidebar tabs
    const categoryTab = document.querySelector('[data-tab="categories"]');
    const hotkeyTab = document.querySelector('[data-tab="hotkeys"]');
    const fileTab = document.querySelector('[data-tab="file"]');
    const categoriesPanel = document.querySelector("#categories-panel");
    const hotkeysPanel = document.querySelector("#hotkeys-panel");
    const filePanel = document.querySelector("#file-panel");
    
    if (categoryTab && hotkeyTab && fileTab && categoriesPanel && hotkeysPanel && filePanel) {
      const switchToTab = (activeTab: Element, activePanel: Element) => {
        // Remove active from all tabs and panels
        [categoryTab, hotkeyTab, fileTab].forEach(tab => tab?.classList.remove("active"));
        [categoriesPanel, hotkeysPanel, filePanel].forEach(panel => panel?.classList.remove("active"));
        
        // Add active to selected tab and panel
        activeTab.classList.add("active");
        activePanel.classList.add("active");
      };
      
      categoryTab.addEventListener("click", () => switchToTab(categoryTab, categoriesPanel));
      hotkeyTab.addEventListener("click", () => switchToTab(hotkeyTab, hotkeysPanel));
      fileTab.addEventListener("click", () => switchToTab(fileTab, filePanel));
    }
    
    // Setup config file path input
    if (elements.configFilePathInput) {
      elements.configFilePathInput.placeholder = ".hito.json";
      elements.configFilePathInput.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        state.configFilePath = target.value.trim();
      });
    }
  }, []);

  return (
    <>
      <div id="notification-bar" className="notification-bar"></div>
      <button id="hotkey-sidebar-toggle" className="hotkey-sidebar-toggle" aria-label="Toggle configuration sidebar">
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <main className="container">
        <h1>Hito</h1>

        <div className="path-input-container">
          <div id="drop-zone" className="drop-zone">
            <div className="drop-zone-content">
              <svg className="drop-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="drop-text">Drag and drop a folder here</p>
              <p className="drop-hint">or click to select a folder</p>
            </div>
          </div>
          <div id="current-path" className="current-path"></div>
          <p id="error-msg" className="error"></p>
        </div>

        <div id="loading-spinner" className="loading-spinner" style={{ display: "none" }}>
          <div className="spinner"></div>
          <p>Loading images...</p>
        </div>

        <div id="image-grid" className="image-grid"></div>

        <div id="hotkey-sidebar" className="hotkey-sidebar">
          <div className="hotkey-sidebar-header">
            <h3>Configuration</h3>
            <button id="hotkey-sidebar-close" className="hotkey-sidebar-close" aria-label="Close sidebar">&times;</button>
          </div>
          <div className="hotkey-sidebar-content">
            <div className="sidebar-tabs">
              <button className="sidebar-tab active" data-tab="categories">Categories</button>
              <button className="sidebar-tab" data-tab="hotkeys">Hotkeys</button>
              <button className="sidebar-tab" data-tab="file">File</button>
            </div>
            
            <div id="categories-panel" className="sidebar-panel active">
              <div className="panel-header">
                <h4>Image Categories</h4>
                <button id="add-category-btn" className="add-category-btn">+ Add</button>
              </div>
              <div id="category-list" className="category-list"></div>
              <div id="current-image-categories" className="current-image-categories"></div>
            </div>
            
            <div id="hotkeys-panel" className="sidebar-panel">
              <div id="hotkey-list" className="hotkey-list"></div>
              <button id="add-hotkey-btn" className="add-hotkey-btn">+ Add Hotkey</button>
            </div>
            
            <div id="file-panel" className="sidebar-panel">
              <div className="panel-header">
                <h4>Configuration File</h4>
              </div>
              <div className="file-settings">
                <label htmlFor="config-file-path">Config File Path:</label>
                <input type="text" id="config-file-path" className="config-file-input" placeholder=".hito.json" />
                <p className="file-hint">Default: Current directory's .hito.json</p>
              </div>
            </div>
          </div>
        </div>

        <div id="image-modal" className="modal">
          <span className="close">&times;</span>
          <button className="modal-nav modal-nav-prev" id="modal-prev">&#10094;</button>
          <button className="modal-nav modal-nav-next" id="modal-next">&#10095;</button>
          <img id="modal-image" className="modal-content" />
          <div id="modal-caption" className="modal-caption">
            <span id="modal-caption-text"></span>
            <span id="modal-categories" className="modal-categories"></span>
          </div>
          <div id="keyboard-shortcuts-overlay" className="keyboard-shortcuts-overlay">
            <div className="shortcuts-content">
              <h2>Keyboard Shortcuts</h2>
              <div id="shortcuts-list"></div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;

