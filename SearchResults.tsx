import * as React from "react";
import { SearchResult, EntityConfig } from "../services/dataverseSearch";

interface Props {
  results: SearchResult[];
  entityConfigs: EntityConfig[];
  isLoading: boolean;
  onSelect: (result: SearchResult) => void;
}

/**
 * Renders search results grouped by entity type in a dropdown.
 */
export const SearchResults: React.FC<Props> = ({
  results,
  entityConfigs,
  isLoading,
  onSelect,
}) => {
  // Group results by entity
  const grouped = entityConfigs.reduce<Record<string, SearchResult[]>>(
    (acc, cfg) => {
      acc[cfg.entity] = results.filter(r => r.entityType === cfg.entity);
      return acc;
    },
    {}
  );

  return (
    <div className="mel-dropdown" role="listbox" aria-label="Search results">

      {/* Loading state */}
      {isLoading && (
        <div className="mel-loading-row" role="status" aria-live="polite">
          Searching…
        </div>
      )}

      {/* No results */}
      {!isLoading && results.length === 0 && (
        <div className="mel-no-results" role="status">
          No results found
        </div>
      )}

      {/* Grouped results */}
      {!isLoading && entityConfigs.map(cfg => {
        const group = grouped[cfg.entity] ?? [];
        if (group.length === 0) return null;

        return (
          <div key={cfg.entity} className="mel-group">
            <div className="mel-group-header" role="presentation">
              <span className="mel-group-icon" aria-hidden="true">{cfg.icon}</span>
              {cfg.displayLabel ?? cfg.entity}
            </div>

            {group.map(result => (
              <div
                key={result.id}
                className="mel-result-item"
                role="option"
                aria-selected="false"
                tabIndex={0}
                onClick={() => onSelect(result)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(result);
                  }
                }}
              >
                <span className="mel-result-name">{result.displayName}</span>
                {result.secondaryText && (
                  <span className="mel-result-secondary">{result.secondaryText}</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
