import React, { useEffect, useState } from "react";
import { state } from "../state";
import type { HotkeyConfig, Category } from "../types";

export function ShortcutsOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Poll for state changes
  useEffect(() => {
    const interval = setInterval(() => {
      // Update visibility
      if (state.shortcutsOverlayVisible !== isVisible) {
        setIsVisible(state.shortcutsOverlayVisible);
      }
      
      // Update hotkeys
      if (state.hotkeys !== hotkeys) {
        setHotkeys([...state.hotkeys]);
      }
      
      // Update categories
      if (state.categories !== categories) {
        setCategories([...state.categories]);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isVisible, hotkeys, categories]);

  if (!isVisible) {
    return null;
  }

  // Filter hotkeys with actions
  const activeHotkeys = hotkeys.filter(h => h.action);

  return (
    <div
      id="keyboard-shortcuts-overlay"
      className="keyboard-shortcuts-overlay"
      style={{ display: "flex" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shortcuts-content">
        <h2>Keyboard Shortcuts</h2>
        <div id="shortcuts-list">
          <div className="shortcuts-columns">
            {/* Left column: Default shortcuts */}
            <div className="shortcuts-column shortcuts-column-left">
              <div className="shortcuts-section">
                <h3 className="shortcuts-heading">Default Shortcuts</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">←</span>
                  <span className="shortcut-desc">Previous image</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">→</span>
                  <span className="shortcut-desc">Next image</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Esc</span>
                  <span className="shortcut-desc">Close modal</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">?</span>
                  <span className="shortcut-desc">Show/hide this help</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Delete</span>
                  <span className="shortcut-desc">Delete image and move to next</span>
                </div>
              </div>
            </div>

            {/* Right column: Custom hotkeys */}
            <div className="shortcuts-column shortcuts-column-right">
              {activeHotkeys.length > 0 ? (
                <div className="shortcuts-section">
                  <h3 className="shortcuts-heading">Custom Hotkeys</h3>
                  {activeHotkeys.map((hotkey, index) => {
                    // Format hotkey display
                    const keyParts = [...hotkey.modifiers, hotkey.key];
                    const keyDisplay = keyParts.join(" + ");
                    
                    // Format action description
                    let actionDesc = "Unknown action";
                    
                    if (hotkey.action === "next_image") {
                      actionDesc = "Next Image";
                    } else if (hotkey.action === "previous_image") {
                      actionDesc = "Previous Image";
                    } else if (hotkey.action === "delete_image_and_next") {
                      actionDesc = "Delete Image and move to next";
                    } else if (hotkey.action.startsWith("toggle_category_next_")) {
                      const categoryId = hotkey.action.replace("toggle_category_next_", "");
                      const category = categories.find((c) => c.id === categoryId);
                      actionDesc = category 
                        ? `Toggle "${category.name}" and move to next`
                        : "Toggle category and move to next";
                    } else if (hotkey.action.startsWith("toggle_category_")) {
                      const categoryId = hotkey.action.replace("toggle_category_", "");
                      const category = categories.find((c) => c.id === categoryId);
                      actionDesc = category 
                        ? `Toggle "${category.name}"`
                        : "Toggle category";
                    } else if (hotkey.action.startsWith("assign_category_")) {
                      const categoryId = hotkey.action.replace("assign_category_", "");
                      const category = categories.find((c) => c.id === categoryId);
                      actionDesc = category 
                        ? `Assign "${category.name}"`
                        : "Assign category";
                    }
                    
                    return (
                      <div key={index} className="shortcut-item">
                        <span className="shortcut-key">{keyDisplay}</span>
                        <span className="shortcut-desc">{actionDesc}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="shortcuts-empty">No custom hotkeys</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

