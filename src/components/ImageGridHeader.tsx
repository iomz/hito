import React from "react";
import { ImageGridSelection } from "./ImageGridSelection";
import { ImageGridSortFilter } from "./ImageGridSortFilter";

export function ImageGridHeader() {
  return (
    <div className="image-grid-header-container">
      <ImageGridSelection />
      <div className="image-grid-header-row">
        <ImageGridSortFilter />
      </div>
    </div>
  );
}

