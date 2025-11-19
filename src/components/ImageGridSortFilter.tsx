import React, { useEffect, useState } from "react";
import { state } from "../state";

type SortOption = "name" | "dateCreated" | "lastCategorized" | "size";
type NameFilterOperator = "contains" | "startsWith" | "endsWith" | "exact";
type SizeFilterOperator = "largerThan" | "lessThan" | "between";

interface FilterOptions {
  categoryId: string | "uncategorized" | "";
  namePattern: string;
  nameOperator: NameFilterOperator;
  sizeOperator: SizeFilterOperator;
  sizeValue: string;
  sizeValue2: string;
}

export function ImageGridSortFilter() {
  const [sortBy, setSortBy] = useState<SortOption>(state.sortOption);
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">(state.sortDirection);
  const [filters, setFilters] = useState<FilterOptions>(state.filterOptions);

  // Apply sort and filter to state
  useEffect(() => {
    state.sortOption = sortBy;
    state.sortDirection = sortDirection;
    state.filterOptions = filters;
    state.notify();
  }, [sortBy, sortDirection, filters]);

  const clearFilters = () => {
    setFilters({
      categoryId: "",
      namePattern: "",
      nameOperator: "contains",
      sizeOperator: "largerThan",
      sizeValue: "",
      sizeValue2: "",
    });
  };

  const hasActiveFilters = Boolean(
    filters.categoryId ||
    filters.namePattern ||
    filters.sizeValue
  );

  return (
    <div className="image-grid-sort-filter">
      <div className="utility-row">
        {/* Sort */}
        <div className="utility-group">
          <label htmlFor="sort-select" className="utility-label">Sort by:</label>
          <select
            id="sort-select"
            className="utility-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="name">Name</option>
            <option value="dateCreated">Date Created</option>
            <option value="lastCategorized">Last Categorized</option>
            <option value="size">Size</option>
          </select>
          <select
            id="sort-direction-select"
            className="utility-select utility-select-small"
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as "ascending" | "descending")}
            title="Sort direction"
          >
            <option value="ascending">↑ Asc</option>
            <option value="descending">↓ Desc</option>
          </select>
        </div>

        {/* Filter: Category */}
        <div className="utility-group">
          <label htmlFor="category-filter" className="utility-label">Filter by Category:</label>
          <select
            id="category-filter"
            className="utility-select"
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
          >
            <option value="">All</option>
            <option value="uncategorized">Uncategorized</option>
            {state.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Name */}
        <div className="utility-group">
          <label htmlFor="name-filter-operator" className="utility-label">Name:</label>
          <select
            id="name-filter-operator"
            className="utility-select utility-select-small"
            value={filters.nameOperator}
            onChange={(e) => setFilters({ ...filters, nameOperator: e.target.value as NameFilterOperator })}
          >
            <option value="contains">Contains</option>
            <option value="startsWith">Starts with</option>
            <option value="endsWith">Ends with</option>
            <option value="exact">Exact</option>
          </select>
          <input
            type="text"
            className="utility-input"
            placeholder="Enter name pattern"
            value={filters.namePattern}
            onChange={(e) => setFilters({ ...filters, namePattern: e.target.value })}
          />
        </div>

        {/* Filter: Size */}
        <div className="utility-group">
          <label htmlFor="size-filter-operator" className="utility-label">Size:</label>
          <select
            id="size-filter-operator"
            className="utility-select utility-select-small"
            value={filters.sizeOperator}
            onChange={(e) => setFilters({ ...filters, sizeOperator: e.target.value as SizeFilterOperator })}
          >
            <option value="largerThan">Larger than</option>
            <option value="lessThan">Less than</option>
            <option value="between">Between</option>
          </select>
          <input
            type="text"
            className="utility-input utility-input-small"
            placeholder="KB"
            value={filters.sizeValue}
            onChange={(e) => setFilters({ ...filters, sizeValue: e.target.value })}
          />
          {filters.sizeOperator === "between" && (
            <input
              type="text"
              className="utility-input utility-input-small"
              placeholder="KB"
              value={filters.sizeValue2}
              onChange={(e) => setFilters({ ...filters, sizeValue2: e.target.value })}
            />
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button className="utility-button utility-button-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

