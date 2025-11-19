import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { sortOptionAtom, sortDirectionAtom, filterOptionsAtom, categoriesAtom } from "../state";

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
  const globalSortOption = useAtomValue(sortOptionAtom);
  const globalSortDirection = useAtomValue(sortDirectionAtom);
  const globalFilters = useAtomValue(filterOptionsAtom);
  const categories = useAtomValue(categoriesAtom);
  const setSortOptionAtom = useSetAtom(sortOptionAtom);
  const setSortDirectionAtom = useSetAtom(sortDirectionAtom);
  const setFilterOptionsAtom = useSetAtom(filterOptionsAtom);
  
  const [sortBy, setSortBy] = useState<SortOption>(globalSortOption);
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">(globalSortDirection);
  const [filters, setFilters] = useState<FilterOptions>(globalFilters);
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize local state with global state changes
  useEffect(() => {
    setSortBy(globalSortOption);
    setSortDirection(globalSortDirection);
    setFilters(globalFilters);
  }, [globalSortOption, globalSortDirection, globalFilters]);

  // Apply sort to state immediately
  useEffect(() => {
    setSortOptionAtom(sortBy);
    setSortDirectionAtom(sortDirection);
  }, [sortBy, sortDirection, setSortOptionAtom, setSortDirectionAtom]);

  // Debounced filter updater
  const updateFilters = useCallback((newFilters: FilterOptions) => {
    // Clear any pending timeout
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    // Set a new timeout to update filters after 250ms
    filterTimeoutRef.current = setTimeout(() => {
      setFilterOptionsAtom(newFilters);
      filterTimeoutRef.current = null;
    }, 250);
  }, [setFilterOptionsAtom]);

  // Apply filters to state with debounce
  useEffect(() => {
    updateFilters(filters);
    
    // Cleanup timeout on unmount or when filters change before timeout fires
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = null;
      }
    };
  }, [filters, updateFilters]);

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
            {categories.map((cat) => (
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

