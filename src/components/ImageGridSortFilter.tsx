import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { sortOptionAtom, sortDirectionAtom, filterOptionsAtom, categoriesAtom } from "../state";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type SortOption = "name" | "dateCreated" | "lastCategorized" | "size";
type NameFilterOperator = "contains" | "startsWith" | "endsWith" | "exact";
type SizeFilterOperator = "largerThan" | "lessThan" | "between";
type FilterType = "category" | "name" | "size";

interface FilterOptions {
  categoryId: string | "uncategorized" | "";
  namePattern: string;
  nameOperator: NameFilterOperator;
  sizeOperator: SizeFilterOperator;
  sizeValue: string;
  sizeValue2: string;
}

interface ActiveFilter {
  type: FilterType;
  label: string;
  value: string;
}

interface SortFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: "sort" | FilterType, config: any) => void;
  editingType?: "sort" | FilterType;
  currentSort: { option: SortOption; direction: "ascending" | "descending" };
  currentFilters?: FilterOptions;
  categories: Array<{ id: string; name: string; color: string }>;
}

function SortFilterModal({
  isOpen,
  onClose,
  onSave,
  editingType,
  currentSort,
  currentFilters,
  categories,
}: SortFilterModalProps) {
  const [filterType, setFilterType] = useState<"sort" | FilterType>(editingType || "sort");
  const [sortOption, setSortOption] = useState<SortOption>(currentSort.option);
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">(currentSort.direction);
  const [categoryId, setCategoryId] = useState<string>(currentFilters?.categoryId || "");
  const [nameOperator, setNameOperator] = useState<NameFilterOperator>(currentFilters?.nameOperator || "contains");
  const [namePattern, setNamePattern] = useState<string>(currentFilters?.namePattern || "");
  const [sizeOperator, setSizeOperator] = useState<SizeFilterOperator>(currentFilters?.sizeOperator || "largerThan");
  const [sizeValue, setSizeValue] = useState<string>(currentFilters?.sizeValue || "");
  const [sizeValue2, setSizeValue2] = useState<string>(currentFilters?.sizeValue2 || "");

  useEffect(() => {
    if (editingType) {
      setFilterType(editingType);
    }
  }, [editingType]);

  // Sync sort values when currentSort changes (e.g., when modal opens)
  useEffect(() => {
    setSortOption(currentSort.option);
    setSortDirection(currentSort.direction);
  }, [currentSort]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (filterType === "sort") {
      onSave("sort", { option: sortOption, direction: sortDirection });
    } else if (filterType === "category") {
      onSave("category", { categoryId });
    } else if (filterType === "name") {
      onSave("name", { operator: nameOperator, pattern: namePattern });
    } else if (filterType === "size") {
      onSave("size", { operator: sizeOperator, value: sizeValue, value2: sizeValue2 });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingType ? "Edit" : "Add"} {filterType === "sort" ? "Sort" : "Filter"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!editingType && (
            <div className="filter-type-selector">
              <label>Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "sort" | FilterType)}
                className="utility-select"
              >
                <option value="sort">Sort</option>
                <option value="category">Category</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>
          )}

          {filterType === "sort" && (
            <div className="filter-config">
              <div className="filter-field">
                <label>Sort by:</label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="utility-select"
                >
                  <option value="name">Name</option>
                  <option value="dateCreated">Date Created</option>
                  <option value="lastCategorized">Last Categorized</option>
                  <option value="size">Size</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Direction:</label>
                <select
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value as "ascending" | "descending")}
                  className="utility-select"
                >
                  <option value="ascending">↑ Ascending</option>
                  <option value="descending">↓ Descending</option>
                </select>
              </div>
            </div>
          )}

          {filterType === "category" && (
            <div className="filter-config">
              <div className="filter-field">
                <label>Category:</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="utility-select"
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
            </div>
          )}

          {filterType === "name" && (
            <div className="filter-config">
              <div className="filter-field">
                <label>Operator:</label>
                <select
                  value={nameOperator}
                  onChange={(e) => setNameOperator(e.target.value as NameFilterOperator)}
                  className="utility-select"
                >
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts with</option>
                  <option value="endsWith">Ends with</option>
                  <option value="exact">Exact</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Pattern:</label>
                <input
                  type="text"
                  value={namePattern}
                  onChange={(e) => setNamePattern(e.target.value)}
                  className="utility-input"
                  placeholder="Enter name pattern"
                />
              </div>
            </div>
          )}

          {filterType === "size" && (
            <div className="filter-config">
              <div className="filter-field">
                <label>Operator:</label>
                <select
                  value={sizeOperator}
                  onChange={(e) => setSizeOperator(e.target.value as SizeFilterOperator)}
                  className="utility-select"
                >
                  <option value="largerThan">Larger than</option>
                  <option value="lessThan">Less than</option>
                  <option value="between">Between</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Value (KB):</label>
                <input
                  type="text"
                  value={sizeValue}
                  onChange={(e) => setSizeValue(e.target.value)}
                  className="utility-input"
                  placeholder="KB"
                />
              </div>
              {sizeOperator === "between" && (
                <div className="filter-field">
                  <label>Value 2 (KB):</label>
                  <input
                    type="text"
                    value={sizeValue2}
                    onChange={(e) => setSizeValue2(e.target.value)}
                    className="utility-input"
                    placeholder="KB"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="utility-button utility-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="utility-button utility-button-action" onClick={handleSave}>
            {editingType ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImageGridSortFilter() {
  const globalSortOption = useAtomValue(sortOptionAtom);
  const globalSortDirection = useAtomValue(sortDirectionAtom);
  const globalFilters = useAtomValue(filterOptionsAtom);
  const categories = useAtomValue(categoriesAtom);
  const setSortOptionAtom = useSetAtom(sortOptionAtom);
  const setSortDirectionAtom = useSetAtom(sortDirectionAtom);
  const setFilterOptionsAtom = useSetAtom(filterOptionsAtom);
  
  const [filters, setFilters] = useState<FilterOptions>(globalFilters);
  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<"sort" | FilterType | undefined>();

  // Synchronize local state with global state changes
  useEffect(() => {
    setFilters(globalFilters);
  }, [globalFilters]);

  // Debounced filter updater
  const updateFilters = useCallback((newFilters: FilterOptions) => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      setFilterOptionsAtom(newFilters);
      filterTimeoutRef.current = null;
    }, 250);
  }, [setFilterOptionsAtom, filterTimeoutRef]);

  // Apply filters to state with debounce
  useEffect(() => {
    updateFilters(filters);
    
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = null;
      }
    };
  }, [filters, updateFilters]);

  const getActiveFilters = (): ActiveFilter[] => {
    const active: ActiveFilter[] = [];
    
    if (filters.categoryId) {
      if (filters.categoryId === "uncategorized") {
        active.push({ type: "category", label: "Uncategorized", value: filters.categoryId });
      } else {
        const category = categories.find(c => c.id === filters.categoryId);
        active.push({ type: "category", label: category?.name || "Category", value: filters.categoryId });
      }
    }
    
    if (filters.namePattern) {
      const operatorLabels: Record<NameFilterOperator, string> = {
        contains: "contains",
        startsWith: "starts with",
        endsWith: "ends with",
        exact: "is",
      };
      active.push({
        type: "name",
        label: `Name ${operatorLabels[filters.nameOperator]} "${filters.namePattern}"`,
        value: filters.namePattern,
      });
    }
    
    if (filters.sizeValue) {
      const operatorLabels: Record<SizeFilterOperator, string> = {
        largerThan: ">",
        lessThan: "<",
        between: "between",
      };
      let label = `Size ${operatorLabels[filters.sizeOperator]} ${filters.sizeValue} KB`;
      if (filters.sizeOperator === "between" && filters.sizeValue2) {
        label = `Size between ${filters.sizeValue} - ${filters.sizeValue2} KB`;
      }
      active.push({ type: "size", label, value: filters.sizeValue });
    }
    
    return active;
  };

  const getSortLabel = (): string => {
    const optionLabels: Record<SortOption, string> = {
      name: "Name",
      dateCreated: "Date Created",
      lastCategorized: "Last Categorized",
      size: "Size",
    };
    const directionIcon = globalSortDirection === "ascending" ? "↑" : "↓";
    return `${directionIcon} ${optionLabels[globalSortOption]}`;
  };

  const handleRemoveFilter = (type: FilterType) => {
    if (type === "category") {
      setFilters({ ...filters, categoryId: "" });
    } else if (type === "name") {
      setFilters({ ...filters, namePattern: "", nameOperator: "contains" });
    } else if (type === "size") {
      setFilters({ ...filters, sizeValue: "", sizeValue2: "", sizeOperator: "largerThan" });
    }
  };

  const handleRemoveSort = () => {
    setSortOptionAtom("name");
    setSortDirectionAtom("ascending");
  };

  const handleAddClick = () => {
    setEditingType(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (type: "sort" | FilterType) => {
    setEditingType(type);
    setIsModalOpen(true);
  };

  const handleModalSave = (type: "sort" | FilterType, config: any) => {
    if (type === "sort") {
      setSortOptionAtom(config.option);
      setSortDirectionAtom(config.direction);
    } else if (type === "category") {
      setFilters({ ...filters, categoryId: config.categoryId });
    } else if (type === "name") {
      setFilters({ ...filters, nameOperator: config.operator, namePattern: config.pattern });
    } else if (type === "size") {
      setFilters({
        ...filters,
        sizeOperator: config.operator,
        sizeValue: config.value,
        sizeValue2: config.value2 || "",
      });
    }
  };

  const activeFilters = getActiveFilters();
  const hasActiveSort = globalSortOption !== "name" || globalSortDirection !== "ascending";

  return (
    <div className="image-grid-sort-filter">
      <div className="filter-badges-container">
        {hasActiveSort && (
          <div className="filter-badge filter-badge-sort" onClick={() => handleEditClick("sort")}>
            <span className="filter-badge-label">Sort: {getSortLabel()}</span>
            <button
              className="filter-badge-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSort();
              }}
              title="Remove sort"
            >
              ×
            </button>
          </div>
        )}
        
        {activeFilters.map((filter, index) => (
          <div
            key={`${filter.type}-${index}`}
            className="filter-badge filter-badge-filter"
            onClick={() => handleEditClick(filter.type)}
          >
            <span className="filter-badge-label">{filter.label}</span>
            <button
              className="filter-badge-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFilter(filter.type);
              }}
              title="Remove filter"
            >
              ×
            </button>
          </div>
        ))}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="filter-badge filter-badge-add" onClick={handleAddClick}>
              +
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add sort or filter</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <SortFilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        editingType={editingType}
        currentSort={{ option: globalSortOption, direction: globalSortDirection }}
        currentFilters={filters}
        categories={categories}
      />
    </div>
  );
}
