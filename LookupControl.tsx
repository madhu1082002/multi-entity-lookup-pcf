import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  DataverseSearchService,
  SearchResult,
  EntityConfig,
} from "../services/dataverseSearch";
import { SelectedItems, SelectedRecord } from "./SelectedItems";
import { SearchResults } from "./SearchResults";

interface LookupControlProps {
  webApi: ComponentFramework.WebApi;
  entityConfigs: EntityConfig[];
  maxResultsPerEntity: number;
  allowMultiple: boolean;
  initialValue: SelectedRecord[];
  disabled: boolean;
  onChange: (selected: SelectedRecord[]) => void;
}

/**
 * Main PCF lookup control component.
 *
 * Behaviour:
 *  - Debounces user input (350 ms) before firing parallel Dataverse queries.
 *  - Groups results by entity type in the dropdown.
 *  - Supports single or multi-select modes.
 *  - Stores selected records as SelectedRecord[].
 *  - Closes dropdown on outside click or Escape key.
 */
export const LookupControl: React.FC<LookupControlProps> = ({
  webApi,
  entityConfigs,
  maxResultsPerEntity,
  allowMultiple,
  initialValue,
  disabled,
  onChange,
}) => {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SelectedRecord[]>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep one stable service instance per webApi reference
  const searchService = useRef(new DataverseSearchService(webApi));
  useEffect(() => {
    searchService.current = new DataverseSearchService(webApi);
  }, [webApi]);

  // ─── Search ───────────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (term: string) => {
      setSearchText(term);
      clearTimeout(debounceRef.current);

      if (term.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        const found = await searchService.current.searchAllEntities(
          term,
          entityConfigs,
          maxResultsPerEntity
        );
        setResults(found);
        setIsOpen(true);
        setIsLoading(false);
      }, 350);
    },
    [entityConfigs, maxResultsPerEntity]
  );

  // ─── Selection ────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (result: SearchResult) => {
      const record: SelectedRecord = {
        id: result.id,
        entityType: result.entityType,
        displayName: result.displayName,
        icon: result.icon,
      };

      let updated: SelectedRecord[];
      if (allowMultiple) {
        const exists = selected.some(s => s.id === record.id);
        updated = exists ? selected : [...selected, record];
      } else {
        updated = [record];
      }

      setSelected(updated);
      onChange(updated);
      setSearchText("");
      setResults([]);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [allowMultiple, selected, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const updated = selected.filter(s => s.id !== id);
      setSelected(updated);
      onChange(updated);
    },
    [selected, onChange]
  );

  // ─── Outside click / Escape ───────────────────────────────────────────────

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  const showInput = !disabled && (allowMultiple || selected.length === 0);

  return (
    <div className="mel-container" ref={containerRef}>
      {/* Selected tag chips */}
      <SelectedItems
        items={selected}
        disabled={disabled}
        onRemove={handleRemove}
      />

      {/* Search input */}
      {showInput && (
        <div className="mel-input-wrapper">
          <input
            ref={inputRef}
            className="mel-input"
            type="text"
            placeholder="Search accounts, contacts, leads…"
            value={searchText}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            aria-label="Multi-entity search"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
            autoComplete="off"
          />
          {isLoading && (
            <span className="mel-spinner" aria-label="Searching…" role="status" />
          )}
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && (
        <SearchResults
          results={results}
          entityConfigs={entityConfigs}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};
