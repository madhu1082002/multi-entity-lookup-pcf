import * as React from "react";

export interface SelectedRecord {
  id: string;
  entityType: string;
  displayName: string;
  icon: string;
}

interface Props {
  items: SelectedRecord[];
  disabled: boolean;
  onRemove: (id: string) => void;
}

/**
 * Renders selected records as dismissible tag chips.
 */
export const SelectedItems: React.FC<Props> = ({ items, disabled, onRemove }) => {
  if (items.length === 0) return null;

  return (
    <div className="mel-selected-tags" role="list" aria-label="Selected records">
      {items.map(item => (
        <span key={item.id} className="mel-tag" role="listitem">
          <span className="mel-tag-icon" aria-hidden="true">{item.icon}</span>
          <span className="mel-tag-name">{item.displayName}</span>
          {!disabled && (
            <button
              type="button"
              className="mel-tag-remove"
              aria-label={`Remove ${item.displayName}`}
              onClick={() => onRemove(item.id)}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
};
