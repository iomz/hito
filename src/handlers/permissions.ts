import { elements } from "../state.js";

/**
 * Checks whether the app has macOS Full Disk Access and, if not, displays a guidance message in the UI.
 *
 * If the permission check is unavailable or fails, the function silently returns without modifying the UI.
 */
export async function checkMacOSPermissions(): Promise<void> {
  try {
    if (!window.__TAURI__?.core?.invoke) {
      return;
    }
    const fullDiskAccess = await window.__TAURI__.core.invoke<boolean>("plugin:macos-permissions|check_full_disk_access_permission");
    if (!fullDiskAccess && elements.errorMsg) {
      elements.errorMsg.textContent = 
        "Note: Full Disk Access permission may be required for file drops. " +
        "If drops don't work, grant permission in System Settings > Privacy & Security > Full Disk Access.";
    }
  } catch (error) {
    // Permission check not available, continue anyway
  }
}

