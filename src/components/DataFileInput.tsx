import React, { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { dataFilePathAtom, currentDirectoryAtom } from "../state";
import { invokeTauri, isTauriInvokeAvailable } from "../utils/tauri";
import { showNotification, showError } from "../ui/notification";
import { loadHitoConfig } from "../ui/categories";

export function DataFileInput() {
  const value = useAtomValue(dataFilePathAtom);
  const currentDirectory = useAtomValue(currentDirectoryAtom);
  const setDataFilePath = useSetAtom(dataFilePathAtom);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSaving) return;
    setDataFilePath(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim();
    setDataFilePath(trimmedValue);
  };

  const handleSave = async () => {
    const trimmedValue = (value || "").trim();
    if (trimmedValue !== (value || "")) {
      setDataFilePath(trimmedValue);
    }

    if (!currentDirectory || currentDirectory.trim() === "") {
      showError("No directory is currently open.");
      return;
    }

    if (!isTauriInvokeAvailable()) {
      showError("Tauri API not available.");
      return;
    }

    setIsSaving(true);
    try {
      await invokeTauri("save_data_file_path", {
        directory: currentDirectory,
        dataFilePath: trimmedValue,
      });
      showNotification("Data file path saved successfully.");
    } catch (error) {
      console.error("Failed to save data file path:", error);
      showError(`Failed to save data file path: ${error}`);
      setIsSaving(false);
      return;
    }
    
    // Reload category assignments from the new file path
    // loadHitoConfig will clear assignments if the file doesn't exist
    try {
      await loadHitoConfig();
    } catch (error) {
      console.error("Failed to reload configuration:", error);
      showError(`Failed to reload configuration: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="file-settings">
      <label htmlFor="data-file-path">Data File:</label>
      <div className="data-file-input-container">
        <input
          type="text"
          id="data-file-path"
          className="data-file-input"
          placeholder=".hito.json"
          value={value || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSaving}
        />
        <button
          className="save-data-file-btn"
          onClick={handleSave}
          disabled={isSaving || !currentDirectory}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      <p className="file-hint">Default: Current directory's .hito.json</p>
    </div>
  );
}

