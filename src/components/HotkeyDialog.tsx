import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";
import type { HotkeyConfig, Category } from "../types";
import { formatHotkeyDisplay, isHotkeyDuplicate, populateActionDropdown } from "../ui/hotkeys";
import { saveHitoConfig } from "../ui/categories";

export function HotkeyDialog() {
  const [isVisible, setIsVisible] = useState(false);
  const [editingHotkey, setEditingHotkey] = useState<HotkeyConfig | undefined>(undefined);
  const [capturedModifiers, setCapturedModifiers] = useState<string[]>([]);
  const [capturedKey, setCapturedKey] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [action, setAction] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showError, setShowError] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const keyDisplayRef = useRef<HTMLDivElement>(null);
  const actionSelectRef = useRef<HTMLSelectElement>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRefs = useRef<number[]>([]);
  const previousCategoriesRef = useRef<string>("");

  // Subscribe to state changes for visibility and hotkey
  useEffect(() => {
    // Initial sync
    setIsVisible(state.hotkeyDialogVisible);
    setEditingHotkey(state.hotkeyDialogHotkey);
    setCategories([...state.categories]);
    
    // Subscribe to state changes
    const unsubscribe = state.subscribe(() => {
      setIsVisible(state.hotkeyDialogVisible);
      setEditingHotkey(state.hotkeyDialogHotkey);
      setCategories([...state.categories]);
    });
    
    return unsubscribe;
  }, []);

  // Initialize or reset state when visibility or hotkey changes
  useEffect(() => {
    // Clear any pending timeouts and animation frames
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
    rafRefs.current.forEach(rafId => cancelAnimationFrame(rafId));
    rafRefs.current = [];
    
    if (isVisible) {
      // Dialog opening
      const hotkey = editingHotkey;
      
      if (hotkey) {
        setCapturedModifiers([...hotkey.modifiers]);
        setCapturedKey(hotkey.key);
        setAction(hotkey.action || "");
      } else {
        setCapturedModifiers([]);
        setCapturedKey("");
        setAction("");
      }
      
      setErrorMessage("");
      setShowError(false);
      setIsCapturing(false);
      
      // Populate action dropdown - check if ref is available immediately, otherwise use requestAnimationFrame
      if (actionSelectRef.current) {
        populateActionDropdown(actionSelectRef.current, hotkey?.action);
      } else {
        const rafId = requestAnimationFrame(() => {
          if (actionSelectRef.current) {
            populateActionDropdown(actionSelectRef.current, hotkey?.action);
          }
        });
        rafRefs.current.push(rafId);
      }
      
      if (!hotkey) {
        const rafId = requestAnimationFrame(() => {
          keyDisplayRef.current?.focus();
          setIsCapturing(true);
        });
        rafRefs.current.push(rafId);
      }
    } else {
      // Dialog closing
      setCapturedModifiers([]);
      setCapturedKey("");
      setAction("");
      setErrorMessage("");
      setShowError(false);
      setIsCapturing(false);
    }
    
    return () => {
      // Cleanup timeouts and animation frames on unmount or dependency change
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current = [];
      rafRefs.current.forEach(rafId => cancelAnimationFrame(rafId));
      rafRefs.current = [];
    };
  }, [isVisible, editingHotkey]);

  // Update action dropdown when categories actually change (not when action selection changes)
  useEffect(() => {
    if (isVisible && actionSelectRef.current) {
      const categoriesJson = JSON.stringify(categories);
      const categoriesChanged = categoriesJson !== previousCategoriesRef.current;
      
      if (categoriesChanged) {
        previousCategoriesRef.current = categoriesJson;
        const currentValue = actionSelectRef.current.value;
        populateActionDropdown(actionSelectRef.current, editingHotkey?.action || currentValue || undefined);
        // Restore the selected value after repopulating
        if (currentValue) {
          actionSelectRef.current.value = currentValue;
        }
      }
    }
  }, [categories, isVisible, editingHotkey]);

  // Check for duplicate hotkey
  useEffect(() => {
    if (!capturedKey) {
      setShowError(false);
      return;
    }
    
    const excludeId = editingHotkey?.id;
    if (isHotkeyDuplicate(capturedKey, capturedModifiers, excludeId)) {
      const hotkeyDisplay = formatHotkeyDisplay({
        id: "",
        key: capturedKey,
        modifiers: capturedModifiers,
        action: ""
      });
      setErrorMessage(`This hotkey combination (${hotkeyDisplay}) is already in use.`);
      setShowError(true);
    } else {
      setShowError(false);
    }
  }, [capturedKey, capturedModifiers, editingHotkey]);

  const handleFocus = () => {
    setIsCapturing(true);
    setCapturedModifiers([]);
    setCapturedKey("");
    setShowError(false);
  };

  const handleBlur = () => {
    setIsCapturing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isCapturing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push(e.metaKey ? "Cmd" : "Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");
    
    setCapturedModifiers(modifiers);
    
    // Get the key, avoiding modifier keys
    if (!["Control", "Meta", "Alt", "Shift"].includes(e.key)) {
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      setCapturedKey(key);
      setIsCapturing(false);
      setShowError(false);
    }
  };

  const handleCancel = () => {
    state.hotkeyDialogVisible = false;
    state.hotkeyDialogHotkey = undefined;
    state.notify();
  };

  const handleSave = async () => {
    if (!capturedKey) {
      setErrorMessage("Please capture a key combination before saving.");
      setShowError(true);
      return;
    }
    
    // Check for duplicate hotkey combination
    const excludeId = editingHotkey?.id;
    if (isHotkeyDuplicate(capturedKey, capturedModifiers, excludeId)) {
      // Error message is already shown inline
      return;
    }
    
    setShowError(false);
    
    const selectedAction = actionSelectRef.current?.value || `action_${Date.now()}`;
    
    if (editingHotkey) {
      // Update existing hotkey
      const index = state.hotkeys.findIndex(h => h.id === editingHotkey.id);
      if (index >= 0) {
        state.hotkeys[index] = {
          ...editingHotkey,
          key: capturedKey,
          modifiers: [...capturedModifiers],
          action: selectedAction
        };
      }
    } else {
      // Add new hotkey
      const newHotkey: HotkeyConfig = {
        id: `hotkey_${Date.now()}`,
        key: capturedKey,
        modifiers: [...capturedModifiers],
        action: selectedAction
      };
      state.hotkeys.push(newHotkey);
    }
    
    try {
      await saveHitoConfig();
    } catch (error: unknown) {
      console.error("Failed to save hotkeys:", error);
      setErrorMessage("Failed to save hotkey. Please try again.");
      setShowError(true);
      return;
    }
    
    // Close dialog
    state.hotkeyDialogVisible = false;
    state.hotkeyDialogHotkey = undefined;
    state.notify();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDownOverlay = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      handleCancel();
    }
  };

  if (!isVisible) {
    return null;
  }

  const keyDisplayText = capturedKey
    ? formatHotkeyDisplay({
        id: "",
        key: capturedKey,
        modifiers: capturedModifiers,
        action: ""
      })
    : editingHotkey
    ? formatHotkeyDisplay(editingHotkey)
    : isCapturing
    ? "Press keys..."
    : "Press keys to capture...";

  return (
    <div
      className="hotkey-dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDownOverlay}
    >
      <div className="hotkey-dialog">
        <div className="hotkey-dialog-header">
          <h3>{editingHotkey ? "Edit Hotkey" : "Add Hotkey"}</h3>
          <button className="hotkey-dialog-close" onClick={handleCancel}>
            ×
          </button>
        </div>
        <div className="hotkey-dialog-body">
          <label htmlFor="hotkey-key-display">Key Combination:</label>
          <div
            ref={keyDisplayRef}
            id="hotkey-key-display"
            className={`hotkey-key-display ${isCapturing ? "capturing" : ""}`}
            tabIndex={0}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          >
            {keyDisplayText}
          </div>
          {showError && (
            <div className="hotkey-error-message" style={{
              display: "block",
              color: "#ef4444",
              fontSize: "0.85em",
              marginTop: "-8px",
            }}>
              {errorMessage}
            </div>
          )}
          <label htmlFor="hotkey-action-input">Action:</label>
          <select
            ref={actionSelectRef}
            id="hotkey-action-input"
            className="hotkey-input"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Select action...</option>
            {/* Options will be populated by populateActionDropdown */}
          </select>
        </div>
        <div className="hotkey-dialog-footer">
          <button
            className="hotkey-dialog-btn hotkey-dialog-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="hotkey-dialog-btn hotkey-dialog-save"
            onClick={handleSave}
          >
            {editingHotkey ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

