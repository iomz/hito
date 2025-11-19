import React from "react";
import { useAtomValue } from "jotai";
import { hotkeysAtom } from "../state";
import type { HotkeyConfig } from "../types";

// Format a hotkey combination for display
function formatHotkeyDisplay(config: HotkeyConfig): string {
  const parts = [...config.modifiers, config.key];
  return parts.join(" + ");
}

export function HotkeyList() {
  const hotkeys = useAtomValue(hotkeysAtom);

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

