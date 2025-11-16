// Dialog is provided via plugin, accessed through window.__TAURI__
export function open(options?: { directory?: boolean; multiple?: boolean; title?: string }): Promise<string | string[] | null> {
  if (!window.__TAURI__?.dialog?.open) {
    throw new Error("Dialog API not available");
  }
  return window.__TAURI__.dialog.open(options);
}

