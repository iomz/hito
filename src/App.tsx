import React, { useEffect, useState } from "react";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupModalHandlers } from "./handlers/modal";
import { setupKeyboardHandlers } from "./handlers/keyboard";
import { setupHotkeySidebar } from "./ui/hotkeys";
import { setupCategories } from "./ui/categories";
import { updateShortcutsOverlay } from "./ui/modal";
import { state } from "./state";
import { DropZone } from "./components/DropZone";
import { CurrentPath } from "./components/CurrentPath";
import { ErrorMessage } from "./components/ErrorMessage";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ImageGrid } from "./components/ImageGrid";
import { NotificationBar } from "./components/NotificationBar";
import { CategoryList } from "./components/CategoryList";
import { HotkeyList } from "./components/HotkeyList";
import { ImageModal } from "./components/ImageModal";
import { CurrentImageCategories } from "./components/CurrentImageCategories";
import { CategoryDialog } from "./components/CategoryDialog";
import { HotkeyDialog } from "./components/HotkeyDialog";

function App() {
  console.log('[App] Component rendering...');
  const [hasContent, setHasContent] = useState(false);

  // Poll for state changes to show/hide ImageGrid
  useEffect(() => {
    const interval = setInterval(() => {
      const imageCount = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
      const dirCount = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
      const shouldShow = imageCount > 0 || dirCount > 0;
      
      if (shouldShow !== hasContent) {
        console.log('[App] hasContent changing to:', shouldShow, { imageCount, dirCount });
        setHasContent(shouldShow);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [hasContent]);

  useEffect(() => {
    console.log('[App] useEffect - initializing...');
    // Hide sidebar toggle button initially (home screen)
    const hotkeySidebarToggle = document.querySelector("#hotkey-sidebar-toggle") as HTMLElement | null;
    if (hotkeySidebarToggle) {
      hotkeySidebarToggle.style.display = "none";
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
    console.log('[App] About to setup Tauri drag events...');
    setupTauriDragEvents()
      .then(() => {
        console.log('[App] Tauri drag events setup complete');
      })
      .catch((error) => {
        console.error('[App] Failed to setup Tauri drag events:', error);
        console.error('[App] Error value:', error);
      });
    
    // Setup h1 click handler - reload page to reset to home screen
    const h1Element = document.querySelector("h1");
    if (h1Element) {
      h1Element.style.cursor = "pointer";
      h1Element.addEventListener("click", () => {
        window.location.reload();
      });
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
    const configFilePathInput = document.querySelector("#config-file-path-input") as HTMLInputElement | null;
    if (configFilePathInput) {
      configFilePathInput.placeholder = ".hito.json";
      configFilePathInput.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        state.configFilePath = target.value.trim();
      });
    }
  }, []);

  return (
    <>
      <NotificationBar />
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
          <DropZone />
          <CurrentPath />
          <ErrorMessage />
        </div>

        <LoadingSpinner />
        {/* Always render ImageGrid; it will be hidden when there's no content */}
        {hasContent && <ImageGrid />}

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
              <CategoryList />
              <CurrentImageCategories />
            </div>
            
            <div id="hotkeys-panel" className="sidebar-panel">
              <HotkeyList />
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

        <ImageModal />
        <CategoryDialog />
        <HotkeyDialog />
      </main>
    </>
  );
}

export default App;

