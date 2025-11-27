import React, { useEffect, useMemo } from "react";
import { useAtomValue } from "jotai";
import { setupDocumentDragHandlers, setupTauriDragEvents } from "./handlers/dragDrop";
import { setupKeyboardHandlers } from "./handlers/keyboard";
import { allImagePathsAtom, allDirectoryPathsAtom } from "./state";
import { loadAppData } from "./ui/categories";
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
  const allImagePaths = useAtomValue(allImagePathsAtom);
  const allDirectoryPaths = useAtomValue(allDirectoryPathsAtom);
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Compute hasContent reactively from atoms
  const hasContent = useMemo(() => Boolean(
    Array.isArray(allImagePaths) && allImagePaths.length > 0 ||
    Array.isArray(allDirectoryPaths) && allDirectoryPaths.length > 0
  ), [allImagePaths, allDirectoryPaths]);

  useEffect(() => {
    // Categories and hotkeys are now loaded per-directory via loadHitoConfig
    // No need to load app data on startup
    
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
        <div className={`app-header ${hasContent ? "has-content" : ""}`}>
          <Logo />
          {hasContent && <CurrentPath id="current-path-header" />}
        </div>
        <div className={`path-input-container ${hasContent && !isDragOver ? "collapsed" : ""}`}>
          <DropZone />
          {!hasContent && <CurrentPath id="current-path-dropzone" />}
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

