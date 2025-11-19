import React, { useEffect, useState } from "react";
import { setupDocumentDragHandlers, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupKeyboardHandlers } from "./handlers/keyboard";
import { state } from "./state";
import { DropZone } from "./components/DropZone";
import { CurrentPath } from "./components/CurrentPath";
import { ErrorMessage } from "./components/ErrorMessage";
import { ImageGrid } from "./components/ImageGrid";
import { ImageGridHeader } from "./components/ImageGridHeader";
import { ImageGridStats } from "./components/ImageGridStats";
import { ScrollToTop } from "./components/ScrollToTop";
import { NotificationBar } from "./components/NotificationBar";
import { ImageModal } from "./components/ImageModal";
import { CategoryDialog } from "./components/CategoryDialog";
import { HotkeyDialog } from "./components/HotkeyDialog";
import { HotkeySidebar } from "./components/HotkeySidebar";
import { Logo } from "./components/Logo";
import { CUSTOM_DRAG_EVENTS } from "./constants";

function App() {
  const [hasContent, setHasContent] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Subscribe to state changes to reactively show/hide ImageGrid
  useEffect(() => {
    const hasContent = () => Boolean(
      Array.isArray(state.allImagePaths) && state.allImagePaths.length > 0 ||
      Array.isArray(state.allDirectoryPaths) && state.allDirectoryPaths.length > 0
    );
    
    // One-time initial sync
    setHasContent(hasContent());
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      setHasContent(hasContent());
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Setup all event handlers after DOM is ready
    setupDocumentDragHandlers();
    setupKeyboardHandlers();
    
    // Listen to Tauri drag events to uncollapse path-input-container when dragging
    const handleTauriDragEnter = () => setIsDragOver(true);
    const handleTauriDragLeave = () => setIsDragOver(false);
    
    window.addEventListener(CUSTOM_DRAG_EVENTS.ENTER, handleTauriDragEnter);
    window.addEventListener(CUSTOM_DRAG_EVENTS.OVER, handleTauriDragEnter);
    window.addEventListener(CUSTOM_DRAG_EVENTS.LEAVE, handleTauriDragLeave);
    window.addEventListener(CUSTOM_DRAG_EVENTS.DROP, handleTauriDragLeave);
    
    // Setup Tauri drag events and store cleanup function
    let cleanupTauriDragEvents: (() => void) | undefined;
    setupTauriDragEvents()
      .then((cleanup) => {
        cleanupTauriDragEvents = cleanup;
      })
      .catch((error) => {
        console.error('[App] Failed to setup Tauri drag events:', error);
      });
    
    // Return cleanup function that will be called on unmount
    return () => {
      window.removeEventListener(CUSTOM_DRAG_EVENTS.ENTER, handleTauriDragEnter);
      window.removeEventListener(CUSTOM_DRAG_EVENTS.OVER, handleTauriDragEnter);
      window.removeEventListener(CUSTOM_DRAG_EVENTS.LEAVE, handleTauriDragLeave);
      window.removeEventListener(CUSTOM_DRAG_EVENTS.DROP, handleTauriDragLeave);
      if (cleanupTauriDragEvents) {
        cleanupTauriDragEvents();
      }
    };
  }, []);

  return (
    <>
      <NotificationBar />
      <HotkeySidebar />
      <main className="container">
        <Logo />
        <div className={`path-input-container ${hasContent && !isDragOver ? "collapsed" : ""}`}>
          <DropZone />
          <CurrentPath />
          <ImageGridStats />
          <ErrorMessage />
        </div>
        {/* Conditionally render ImageGrid when content is available */}
        {hasContent && (
          <>
            <ImageGridHeader />
            <ImageGrid />
          </>
        )}
        <ImageModal />
        <CategoryDialog />
        <HotkeyDialog />
        {hasContent && <ScrollToTop />}
      </main>
    </>
  );
}

export default App;

