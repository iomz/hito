import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { configFilePathAtom } from "../state";

export function ConfigFileInput() {
  const value = useAtomValue(configFilePathAtom);
  const setConfigFilePath = useSetAtom(configFilePathAtom);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    setConfigFilePath(newValue);
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

