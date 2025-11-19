import React, { useEffect, useRef, useMemo } from "react";
import { useAtomValue } from "jotai";
import { currentDirectoryAtom, isLoadingAtom } from "../state";
import { handleFileDrop, selectFolder } from "../handlers/dragDrop";
import { showNotification } from "../ui/notification";
import { CUSTOM_DRAG_EVENTS } from "../constants";

export function DropZone() {
  const currentDirectory = useAtomValue(currentDirectoryAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isCollapsed = useMemo(() => currentDirectory.length > 0, [currentDirectory]);

  useEffect(() => {

    // Listen to Tauri drag events for visual feedback
    const handleTauriDragEnter = () => setIsDragOver(true);
    const handleTauriDragLeave = () => setIsDragOver(false);
    
    window.addEventListener(CUSTOM_DRAG_EVENTS.ENTER, handleTauriDragEnter);
    window.addEventListener(CUSTOM_DRAG_EVENTS.OVER, handleTauriDragEnter);
    window.addEventListener(CUSTOM_DRAG_EVENTS.LEAVE, handleTauriDragLeave);
    window.addEventListener(CUSTOM_DRAG_EVENTS.DROP, handleTauriDragLeave);

    return () => {
      window.removeEventListener(CUSTOM_DRAG_EVENTS.ENTER, handleTauriDragEnter);
      window.removeEventListener(CUSTOM_DRAG_EVENTS.OVER, handleTauriDragEnter);
      window.removeEventListener(CUSTOM_DRAG_EVENTS.LEAVE, handleTauriDragLeave);
      window.removeEventListener(CUSTOM_DRAG_EVENTS.DROP, handleTauriDragLeave);
    };
  }, []);

  const extractFilesFromDataTransfer = async (dataTransfer: DataTransfer): Promise<string[]> => {
    const paths: string[] = [];
    
    // Try using DataTransfer.items first (supports FileSystemEntry)
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];

        // Check if it's a file entry
        if (item.kind === 'file') {
          const entry =
            // Some browsers expose webkitGetAsEntry; others don’t.
            (item as any).webkitGetAsEntry?.() ?? null;
          if (entry) {
            // For directories, try to get the path
            if (entry.isDirectory) {
              // In browser context, we can't get actual file system paths from FileSystemEntry
              // Tauri's native drag-and-drop should be used for this
              // For HTML5 drag-drop, we'll need to fall back to file input
              continue;
            } else if (entry.isFile) {
              // For files, try to get the file and extract path
              try {
                const file = await new Promise<File>((resolve, reject) => {
                  (entry as FileSystemFileEntry).file(resolve, reject);
                });
                // Try to get path from file (Tauri might add this property)
                const path = (file as any).path;
                if (path) {
                  paths.push(path);
                }
              } catch (err) {
                console.warn('Failed to get file from entry:', err);
              }
            }
          }
        }
      }
    }
    
    // Fallback to DataTransfer.files
    if (paths.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files[i];
        // Try to get path from file (Tauri might add this property)
        const path = (file as any).path;
        if (path) {
          paths.push(path);
        }
      }
    }
    
    return paths;
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) return;
    
    // Extract files/folders from the drop event
    const paths = await extractFilesFromDataTransfer(dataTransfer);
    
    // If we got paths, pass them to handleFileDrop
    if (paths.length > 0) {
      await handleFileDrop(paths);
    } else {
      // If we couldn't extract paths (browser limitation), show notification and open file picker
      console.warn('Could not extract file paths from drop event. Opening file picker instead.');
      showNotification('Drag-and-drop not supported. Opening file picker...');
      try {
        await selectFolder();
      } catch (error) {
        console.error('Error opening file picker:', error);
        showNotification(`Failed to open file picker: ${error}`);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure drag-over state is set when dragging over
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only remove drag-over state if we're actually leaving the drop zone
    // (not just moving between child elements)
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    
    if (!currentTarget.contains(relatedTarget)) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = '';
      return;
    }
    
    // Extract a representative path from selected files
    // With webkitdirectory, files might have a `path` property (Tauri might add this)
    let rootDirPath: string | null = null;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Try to get path from file (Tauri might add this property)
      const path = (file as any).path;
      if (path) {
        // If we have an absolute path, use it
        // For webkitdirectory, if the path is a file path, we'll need to get its parent
        // But handleFileDrop can handle that
        if (!rootDirPath) {
          rootDirPath = path;
        }
        break; // We only need one path to get the directory
      }
    }
    
    // Clear the input value after selection
    e.target.value = '';
    
    // If we got a path, pass it to handleFileDrop
    // handleFileDrop will handle getting the parent directory if needed
    if (rootDirPath) {
      await handleFileDrop([rootDirPath]);
    } else {
      // Fallback: HTML5 file input with webkitdirectory doesn't provide absolute paths
      // in browser context, so fall back to Tauri's native dialog
      console.warn('Could not extract file paths from file input. Falling back to Tauri dialog.');
      await selectFolder();
    }
  };

  return (
    <div 
      id="drop-zone" 
      className={`drop-zone ${isCollapsed && !isDragOver ? "collapsed" : ""} ${isDragOver ? "drag-over" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        {...({ webkitdirectory: true, directory: true } as any)}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <div className="drop-zone-content">
        {isLoading && !isCollapsed ? (
          <>
            <div className="spinner"></div>
            <p className="drop-text">Loading images...</p>
          </>
        ) : (
          <>
            <svg
              className="drop-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p className="drop-text">Drag and drop a folder here</p>
            <p className="drop-hint">or click to select a folder</p>
          </>
        )}
      </div>
    </div>
  );
}

