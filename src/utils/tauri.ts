/**
 * Checks if the Tauri invoke API is available.
 * 
 * @returns true if available, false otherwise
 */
export function isTauriInvokeAvailable(): boolean {
  return !!window.__TAURI__?.core?.invoke;
}

/**
 * Safely invokes a Tauri command.
 * 
 * @param cmd - The command name
 * @param args - Optional arguments
 * @returns Promise resolving to the result
 * @throws Error if Tauri API is not available
 */
export async function invokeTauri<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauriInvokeAvailable()) {
    throw new Error("Tauri invoke API not available");
  }
  return window.__TAURI__!.core.invoke<T>(cmd, args);
}

