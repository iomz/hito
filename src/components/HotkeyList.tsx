import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { HotkeyConfig } from "../types";
import { updateShortcutsOverlay } from "../ui/modal";

// Format a hotkey combination for display
function formatHotkeyDisplay(config: HotkeyConfig): string {
  const parts = [...config.modifiers, config.key];
  return parts.join(" + ");
}

export function HotkeyList() {
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>([]);

  useEffect(() => {
    // Poll for changes to hotkeys
    const interval = setInterval(() => {
      const currentHotkeys = Array.isArray(state.hotkeys) ? state.hotkeys : [];

      // Check if hotkeys changed
      if (
        currentHotkeys.length !== hotkeys.length ||
        currentHotkeys.some(
          (hotkey, idx) =>
            !hotkeys[idx] ||
            hotkey.id !== hotkeys[idx].id ||
            hotkey.key !== hotkeys[idx].key ||
            hotkey.modifiers.length !== hotkeys[idx].modifiers.length ||
            !hotkey.modifiers.every((mod, i) => mod === hotkeys[idx].modifiers[i]) ||
            hotkey.action !== hotkeys[idx].action
        )
      ) {
        setHotkeys([...currentHotkeys]);
        // Update shortcuts overlay when hotkeys change
        updateShortcutsOverlay();
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [hotkeys]);

  const handleEdit = async (hotkeyId: string) => {
    const { editHotkey } = await import("../ui/hotkeys");
    editHotkey(hotkeyId);
  };

  const handleDelete = async (hotkeyId: string) => {
    const { deleteHotkey } = await import("../ui/hotkeys");
    await deleteHotkey(hotkeyId);
    
    // Trigger re-render after deletion
    setHotkeys([...state.hotkeys]);
  };

  if (hotkeys.length === 0) {
    return (
      <div id="hotkey-list" className="hotkey-list">
        <div className="hotkey-empty-state">
          No hotkeys configured. Click 'Add Hotkey' to create one.
        </div>
      </div>
    );
  }

  return (
    <div id="hotkey-list" className="hotkey-list">
      {hotkeys.map((hotkey) => (
        <div key={hotkey.id} className="hotkey-item">
          <div className="hotkey-info">
            <div className="hotkey-key">{formatHotkeyDisplay(hotkey)}</div>
          </div>
          <div className="hotkey-actions">
            <button
              className="hotkey-edit-btn"
              aria-label={`Edit hotkey ${hotkey.id}`}
              onClick={() => handleEdit(hotkey.id)}
            >
              Edit
            </button>
            <button
              className="hotkey-delete-btn"
              aria-label={`Delete hotkey ${hotkey.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(hotkey.id).catch((error) => {
                  console.error("Failed to delete hotkey:", error);
                });
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

