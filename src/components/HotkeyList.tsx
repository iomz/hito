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
    hotkeysRef.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      const currentHotkeys = Array.isArray(state.hotkeys) ? state.hotkeys : [];
      const prevHotkeys = hotkeysRef.current;

      // Check if hotkeys changed
      if (
        currentHotkeys.length !== prevHotkeys.length ||
        currentHotkeys.some(
          (hotkey, idx) =>
            !prevHotkeys[idx] ||
            hotkey.id !== prevHotkeys[idx].id ||
            hotkey.key !== prevHotkeys[idx].key ||
            hotkey.modifiers.length !== prevHotkeys[idx].modifiers.length ||
            !hotkey.modifiers.every((mod, i) => mod === prevHotkeys[idx].modifiers[i]) ||
            hotkey.action !== prevHotkeys[idx].action
        )
      ) {
        setHotkeys([...currentHotkeys]);
      }
    });

    // Initialize with current state
    const currentHotkeys = Array.isArray(state.hotkeys) ? state.hotkeys : [];
    setHotkeys([...currentHotkeys]);

    return unsubscribe;
  }, []);

  const handleEdit = async (hotkeyId: string) => {
    const { editHotkey } = await import("../ui/hotkeys");
    editHotkey(hotkeyId);
  };

  const handleDelete = async (hotkeyId: string) => {
    const { deleteHotkey } = await import("../ui/hotkeys");
    await deleteHotkey(hotkeyId);
    
    // Trigger re-render after deletion with type-safety check
    if (Array.isArray(state.hotkeys)) {
      setHotkeys([...state.hotkeys]);
    } else {
      // Fallback to previous hotkeys if state.hotkeys is not an array
      setHotkeys(hotkeys);
    }
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

