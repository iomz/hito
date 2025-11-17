// Dialog is provided via plugin, accessed through window.__TAURI__
export function open(options?: { directory?: boolean; multiple?: boolean; title?: string }): Promise<string | string[] | null> {
  if (!window.__TAURI__?.dialog?.open) {
    throw new Error("Dialog API not available");
  }
  return window.__TAURI__.dialog.open(options);
}

/**
 * Show a custom confirmation dialog matching the app's design.
 * @param message - The message to display
 * @param options - Optional configuration (title)
 * @returns Promise that resolves to true if user confirmed, false if canceled
 */
export async function confirm(
  message: string,
  options?: { title?: string }
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "confirm-dialog-overlay";
    
    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    
    // Create header
    const header = document.createElement("div");
    header.className = "confirm-dialog-header";
    
    const title = document.createElement("h3");
    title.textContent = options?.title || "Confirm";
    header.appendChild(title);
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "confirm-dialog-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.onclick = () => {
      overlay.remove();
      resolve(false);
    };
    header.appendChild(closeBtn);
    
    // Create body
    const body = document.createElement("div");
    body.className = "confirm-dialog-body";
    body.textContent = message;
    
    // Create footer
    const footer = document.createElement("div");
    footer.className = "confirm-dialog-footer";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "confirm-dialog-btn confirm-dialog-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      overlay.remove();
      resolve(false);
    };
    
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "confirm-dialog-btn confirm-dialog-confirm";
    confirmBtn.textContent = "OK";
    confirmBtn.onclick = () => {
      overlay.remove();
      resolve(true);
    };
    
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    };
    
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", handleEscape);
        resolve(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    
    // Focus confirm button
    setTimeout(() => confirmBtn.focus(), 100);
  });
}

