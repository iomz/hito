import React, { useEffect, useRef, useState } from "react";
import { state } from "../state";
import type { HotkeyConfig } from "../types";

// Format a hotkey combination for display
function formatHotkeyDisplay(config: HotkeyConfig): string {
  const parts = [...config.modifiers, config.key];
  return parts.join(" + ");
}

export function HotkeyList() {
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>([]);
  const hotkeysRef = useRef<HotkeyConfig[]>([]);

  useEffect(() => {
    // Initialize with current state before subscribing
    const currentHotkeys = Array.isArray(state.hotkeys) ? state.hotkeys : [];
    hotkeysRef.current = [...currentHotkeys];
    setHotkeys([...currentHotkeys]);

    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      const currentHotkeys = Array.isArray(state.hotkeys) ? state.hotkeys : [];
      const prevHotkeys = hotkeysRef.current;

      // Deep equality check using JSON.stringify (objects have deterministic key order)
      if (JSON.stringify(currentHotkeys) !== JSON.stringify(prevHotkeys)) {
        hotkeysRef.current = [...currentHotkeys];
        setHotkeys([...currentHotkeys]);
      }
    });

    return unsubscribe;
  }, []);

  const handleEdit = async (hotkeyId: string) => {
    const { editHotkey } = await import("../ui/hotkeys");
    editHotkey(hotkeyId);
  };

  const handleDelete = async (hotkeyId: string) => {
    const { deleteHotkey } = await import("../ui/hotkeys");
    await deleteHotkey(hotkeyId);
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

