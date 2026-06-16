import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  DataverseSearchService,
  SearchResult,
  EntityConfig,
} from "../services/dataverseSearch";
import { SelectedItems, SelectedRecord } from "./SelectedItems";
import { SearchResults } from "./SearchResults";

interface Props {
  webApi: ComponentFramework.WebApi;
  entityConfigs: EntityConfig[];
  maxResultsPerEntity: number;
  allowMultiple: boolean;
  placeholder: string;
  initialValue: SelectedRecord[];
  disabled: boolean;
  onChange: (selected: SelectedRecord[]) => void;
}

/**
 * Main PCF lookup component.
 * - Debounces search input (350ms)
 * - Fires parallel Dataverse queries via DataverseSearchService
 * - Groups results by entity type
 * - Supports single and multi-select
 * - Stores selected records as SelectedRecord[]
 */
export const LookupControl: React.FC<Props> = ({
  webApi,
  entityConfigs,
  maxResultsPerEntity,
  allowMultiple,
  placeholder,
  initialValue,
  disabled,
  onChange,
}) => {
  const [searchText, setSearchText]     = useState("");
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [selected, setSelected]         = useState<SelectedRecord[]>(initialValue);
  const [isLoading, setIsLoading]       = useState(false);
  const [isOpen, setIsOpen]             = useState(false);

  const debounceRef    = useRef<ReturnType<typeof setTimeout>>();
  const containerRef   = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const serviceRef     = useRef(new DataverseSearchService(webApi));

  // Rebuild service if webApi reference changes
  useEffect(() => {
    serviceRef.current = new DataverseSearchService(webApi);
  }, [webApi]);

  // ── Search ────────────────────────────────────────────────
  const handleSearch = useCallback((term: string) => {
    setSearchText(term);
    clearTimeout(debounceRef.current);

    if (!term || term.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      const found = await serviceRef.current.searchAllEntities(
        term,
        entityConfigs,
        maxResultsPerEntity
      );
      setResults(found);
      setIsOpen(true);
      setIsLoading(false);
    }, 350);
  }, [entityConfigs, maxResultsPerEntity]);

  // ── Select ────────────────────────────────────────────────
  const handleSelect = useCallback((result: SearchResult) => {
    const record: SelectedRecord = {
      id:          result.id,
      entityType:  result.entityType,
      displayName: result.displayName,
      icon:        result.icon,
    };

    const updated = allowMultiple
      ? (selected.some(s => s.id === record.id) ? selected : [...selected, record])
      : [record];

    setSelected(updated);
    onChange(updated);
    setSearchText("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, [allowMultiple, selected, onChange]);

  // ── Remove ────────────────────────────────────────────────
  const handleRemove = useCallback((id: string) => {
    const updated = selected.filter(s => s.id !== id);
    setSelected(updated);
    onChange(updated);
  }, [selected, onChange]);

  // ── Close on outside click or Escape ─────────────────────
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const showInput = !disabled && (allowMultiple || selected.length === 0);

  return (
    <div className="mel-container" ref={containerRef}>

      {/* Selected tag chips */}
      <SelectedItems items={selected} disabled={disabled} onRemove={handleRemove} />

      {/* Search input */}
      {showInput && (
        <div className="mel-input-wrapper">
          <input
            ref={inputRef}
            className="mel-input"
            type="text"
            placeholder={placeholder}
            value={searchText}
            autoComplete="off"
            role="combobox"
            aria-label="Search records"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          />
          {isLoading
            ? <span className="mel-spinner" role="status" aria-label="Searching" />
            : <span className="mel-search-icon" aria-hidden="true">🔍</span>
          }
        </div>
      )}

      {/* Dropdown results */}
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
