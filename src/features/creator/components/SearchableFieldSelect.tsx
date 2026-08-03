import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

export interface FieldOption {
  label: string;
  fieldId: string;
  joinAlias: string;
  group?: string;
}

interface SearchableFieldSelectProps {
  options: FieldOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

/**
 * A searchable dropdown select for field selection.
 * Groups options by table/schema and supports text search.
 */
export const SearchableFieldSelect: React.FC<SearchableFieldSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select a field...",
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Find the currently selected option's label
  const selectedOption = options.find(
    (opt) => `${opt.fieldId}|${opt.joinAlias}` === value
  );
  const displayLabel = selectedOption?.label || placeholder;

  // Filter options by search text
  const normalizedSearch = search.toLowerCase().trim();
  const filteredOptions = normalizedSearch
    ? options.filter((opt) => opt.label.toLowerCase().includes(normalizedSearch))
    : options;

  // Group options by their group (table name)
  const groups = new Map<string, FieldOption[]>();
  filteredOptions.forEach((opt) => {
    const groupName = opt.group || "Others";
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)!.push(opt);
  });

  const handleSelect = (opt: FieldOption) => {
    onChange(`${opt.fieldId}|${opt.joinAlias}`);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      {/* Trigger button */}
      <button
        type="button"
        className="form-input"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          cursor: "pointer",
          textAlign: "left",
          padding: "0.5rem 0.75rem",
          background: "var(--bg-input)",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: "var(--text-secondary)",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            minWidth: "280px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            maxHeight: "320px",
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div
            style={{
              padding: "0.5rem",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-secondary)",
                  pointerEvents: "none",
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search field..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "0.4rem 0.5rem 0.4rem 1.75rem",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                }}
              >
                No fields found.
              </div>
            ) : (
              Array.from(groups.entries()).map(([groupName, groupOptions]) => (
                <div key={groupName}>
                  {/* Group header */}
                  <div
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--primary-400)",
                      background: "var(--surface-color)",
                      borderBottom: "1px solid var(--border-color)",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    {groupName}
                  </div>
                  {/* Group items */}
                  {groupOptions.map((opt) => {
                    const optValue = `${opt.fieldId}|${opt.joinAlias}`;
                    const isSelected = optValue === value;
                    return (
                      <div
                        key={optValue}
                        onClick={() => handleSelect(opt)}
                        style={{
                          padding: "0.4rem 0.75rem 0.4rem 1.25rem",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          color: isSelected
                            ? "var(--primary-400)"
                            : "var(--text-primary)",
                          fontWeight: isSelected ? 600 : 400,
                          background: isSelected
                            ? "rgba(var(--primary-rgb, 99, 102, 241), 0.1)"
                            : "transparent",
                          transition: "background 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLDivElement).style.background =
                              "var(--surface-color)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            isSelected
                              ? "rgba(var(--primary-rgb, 99, 102, 241), 0.1)"
                              : "transparent";
                        }}
                      >
                        {/* Only show field name, not the full label with group */}
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {opt.label.replace(/ \(.*\)$/, "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
