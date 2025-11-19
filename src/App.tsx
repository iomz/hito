import React, { useEffect, useState } from "react";
import { setupDocumentDragHandlers, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupKeyboardHandlers } from "./handlers/keyboard";
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
      if (cleanupTauriDragEvents) {
        cleanupTauriDragEvents();
      }
    };
  }, []);

  const handleH1Click = () => {
    state.reset();
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

