import React, { useEffect, useState } from "react";
import { setupDocumentDragHandlers, setupDragDropHandlers, setupHTML5DragDrop, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupKeyboardHandlers } from "./handlers/keyboard";
// Note: setupHotkeySidebar, setupCategories, updateShortcutsOverlay, setupModalHandlers removed - React components handle this now
import { state } from "./state";
import { DropZone } from "./components/DropZone";
import { CurrentPath } from "./components/CurrentPath";
import { ErrorMessage } from "./components/ErrorMessage";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ImageGrid } from "./components/ImageGrid";
import { NotificationBar } from "./components/NotificationBar";
import { ImageModal } from "./components/ImageModal";
import { CategoryDialog } from "./components/CategoryDialog";
import { HotkeyDialog } from "./components/HotkeyDialog";
import { HotkeySidebar } from "./components/HotkeySidebar";

function App() {
  const [hasContent, setHasContent] = useState(false);

  // Subscribe to state changes to reactively show/hide ImageGrid
  useEffect(() => {
    // One-time initial sync
    const imageCount = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
    const dirCount = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
    const shouldShow = imageCount > 0 || dirCount > 0;
    setHasContent(shouldShow);
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      const newImageCount = Array.isArray(state.allImagePaths) ? state.allImagePaths.length : 0;
      const newDirCount = Array.isArray(state.allDirectoryPaths) ? state.allDirectoryPaths.length : 0;
      const newShouldShow = newImageCount > 0 || newDirCount > 0;
      setHasContent(newShouldShow);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Setup all event handlers after DOM is ready
    setupDocumentDragHandlers();
    setupDragDropHandlers();
    setupHTML5DragDrop();
    setupKeyboardHandlers();
    // Note: HotkeySidebar React component handles its own event handlers now
    // Note: Categories setup handled by HotkeySidebar React component
    // Note: Shortcuts overlay handled by ShortcutsOverlay React component
    
    // Setup Tauri drag events
    setupTauriDragEvents()
      .catch((error) => {
        console.error('[App] Failed to setup Tauri drag events:', error);
      });
  }, []);

  const handleH1Click = () => {
    window.location.reload();
  };

  return (
    <>
      <NotificationBar />
      <HotkeySidebar />
      <main className="container">
        <h1 style={{ cursor: "pointer" }} onClick={handleH1Click}>
          Hito
        </h1>
        <div className={`path-input-container ${hasContent ? "collapsed" : ""}`}>
          <DropZone />
          <CurrentPath />
          <ErrorMessage />
        </div>
        <LoadingSpinner />
        {/* Conditionally render ImageGrid when content is available */}
        {hasContent && <ImageGrid />}
        <ImageModal />
        <CategoryDialog />
        <HotkeyDialog />
      </main>
    </>
  );
}

export default App;

