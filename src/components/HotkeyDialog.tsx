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

  // Poll for dialog state changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.hotkeyDialogVisible !== isVisible) {
        setIsVisible(state.hotkeyDialogVisible);
        
        if (state.hotkeyDialogVisible) {
          // Dialog opening
          const hotkey = state.hotkeyDialogHotkey;
          setEditingHotkey(hotkey);
          
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
          
          // Set action state
          setAction(hotkey?.action || "");
          
          // Populate action dropdown after a short delay to ensure DOM is ready
          setTimeout(() => {
            if (actionSelectRef.current) {
              populateActionDropdown(actionSelectRef.current, hotkey?.action);
            }
          }, 0);
          
          // Auto-start capture for new hotkeys
          if (!hotkey) {
            setTimeout(() => {
              keyDisplayRef.current?.focus();
              setIsCapturing(true);
            }, 100);
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
      }
      
      // Update categories
      if (state.categories !== categories) {
        setCategories([...state.categories]);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [isVisible, categories]);

  // Update action dropdown when categories change
  useEffect(() => {
    if (isVisible && actionSelectRef.current) {
      const currentValue = actionSelectRef.current.value || action;
      populateActionDropdown(actionSelectRef.current, editingHotkey?.action || currentValue || undefined);
      // Restore the selected value after repopulating
      if (action) {
        actionSelectRef.current.value = action;
      }
    }
  }, [categories, isVisible, editingHotkey, action]);

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
    
    // Note: HotkeyList component handles rendering via polling
    await saveHitoConfig().catch((error: unknown) => {
      console.error("Failed to save hotkeys:", error);
    });
    
    // Close dialog
    state.hotkeyDialogVisible = false;
    state.hotkeyDialogHotkey = undefined;
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDownOverlay = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
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

