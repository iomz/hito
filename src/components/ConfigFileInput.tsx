import React, { useEffect, useState } from "react";
import { state } from "../state";

export function ConfigFileInput() {
  const [value, setValue] = useState("");

  useEffect(() => {
    // Sync with global state
    const interval = setInterval(() => {
      if (state.configFilePath !== value) {
        setValue(state.configFilePath);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setValue(newValue);
    state.configFilePath = newValue;
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

