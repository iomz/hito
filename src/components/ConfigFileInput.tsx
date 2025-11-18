import React, { useEffect, useState, useRef } from "react";
import { state } from "../state";

export function ConfigFileInput() {
  // Initialize local state from global state once
  const [value, setValue] = useState(state.configFilePath);
  const valueRef = useRef(value);

  // Keep ref in sync with state
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    // Subscribe to state changes to sync when configFilePath changes externally
    const unsubscribe = state.subscribe(() => {
      // Only update if the change came from outside (not from our own handleChange)
      if (state.configFilePath !== valueRef.current) {
        setValue(state.configFilePath);
      }
    });

    return unsubscribe;
  }, []); // Empty deps - subscribe once and never recreate

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setValue(newValue);
    valueRef.current = newValue; // Update ref immediately to prevent subscription from triggering redundant update
    state.configFilePath = newValue;
    state.notify(); // Notify other subscribers of the change
  };

  return (
    <div className="file-settings">
      <label htmlFor="config-file-path">Config File Path:</label>
      <input
        type="text"
        id="config-file-path"
        className="config-file-input"
        placeholder=".hito.json"
        value={value}
        onChange={handleChange}
      />
      <p className="file-hint">Default: Current directory's .hito.json</p>
    </div>
  );
}

