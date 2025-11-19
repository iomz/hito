import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";
import type { HotkeyConfig, Category } from "../types";
import { hideShortcutsOverlay } from "../ui/modal";

// Deep equality check for HotkeyConfig arrays
function hotkeysEqual(a: HotkeyConfig[], b: HotkeyConfig[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((hotkey, i) => {
    const other = b[i];
    return (
      hotkey.id === other.id &&
      hotkey.key === other.key &&
      hotkey.action === other.action &&
      hotkey.modifiers.length === other.modifiers.length &&
      hotkey.modifiers.every((mod, j) => mod === other.modifiers[j])
    );
  });
}

// Deep equality check for Category arrays
function categoriesEqual(a: Category[], b: Category[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((category, i) => {
    const other = b[i];
    return (
      category.id === other.id &&
      category.name === other.name &&
      category.color === other.color
    );
  });
}

export function ShortcutsOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Use refs to track previous values for deep equality checks
  const prevIsVisibleRef = useRef<boolean>(false);
  const prevHotkeysRef = useRef<HotkeyConfig[]>([]);
  const prevCategoriesRef = useRef<Category[]>([]);

  // Subscribe to state changes instead of polling
  useEffect(() => {
    // Initialize state
    setIsVisible(state.shortcutsOverlayVisible);
    setHotkeys([...state.hotkeys]);
    setCategories([...state.categories]);
    prevIsVisibleRef.current = state.shortcutsOverlayVisible;
    prevHotkeysRef.current = [...state.hotkeys];
    prevCategoriesRef.current = [...state.categories];
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      // Update visibility only if it actually changed
      if (state.shortcutsOverlayVisible !== prevIsVisibleRef.current) {
        setIsVisible(state.shortcutsOverlayVisible);
        prevIsVisibleRef.current = state.shortcutsOverlayVisible;
      }
      
      // Update hotkeys only if content actually differs
      if (!hotkeysEqual(state.hotkeys, prevHotkeysRef.current)) {
        const newHotkeys = [...state.hotkeys];
        setHotkeys(newHotkeys);
        prevHotkeysRef.current = newHotkeys;
      }
      
      // Update categories only if content actually differs
      if (!categoriesEqual(state.categories, prevCategoriesRef.current)) {
        const newCategories = [...state.categories];
        setCategories(newCategories);
        prevCategoriesRef.current = newCategories;
      }
    });
    
    return unsubscribe;
  }, []);

  if (!isVisible) {
    return null;
  }

  // Filter hotkeys with actions
  const activeHotkeys = hotkeys.filter(h => h.action);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay root (backdrop), not on children
    if (e.target === e.currentTarget) {
      hideShortcutsOverlay();
    }
  };

  return (
    <div
      id="keyboard-shortcuts-overlay"
      className="keyboard-shortcuts-overlay"
      style={{ display: "flex" }}
      onClick={handleBackdropClick}
    >
      <div 
        className="shortcuts-content"
        onClick={(e) => e.stopPropagation()}
      >
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
                  {activeHotkeys.map((hotkey) => {
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
                      <div key={hotkey.id} className="shortcut-item">
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

