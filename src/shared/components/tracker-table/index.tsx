import { CSSProperties, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import './tracker-table.css';

type Align = 'left' | 'center' | 'right';
type SortDirection = 'asc' | 'desc';

export interface TrackerTableColumn<T> {
  key: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  align?: Align;
  sortable?: boolean;
  sticky?: boolean;
  resizable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  value?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
}

export interface TrackerTableHeaderGroupCell {
  label?: ReactNode;
  colSpan: number;
  className?: string;
}

interface TrackerTableProps<T> {
  columns: TrackerTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  className?: string;
  emptyMessage?: string;
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
  stickyFirstNColumns?: number;
  defaultSort?: {
    key: string;
    direction?: SortDirection;
  };
  onRowClick?: (row: T) => void;
  tableId?: string;
  resizable?: boolean;
  headerGroupRows?: TrackerTableHeaderGroupCell[][];
  serverSort?: {
    key: string;
    direction: SortDirection;
  } | null;
  onServerSortChange?: (sort: { key: string; direction: SortDirection } | null) => void;
  serverFilters?: Record<string, string>;
  onServerFilterChange?: (filters: Record<string, string>) => void;
  rowClassName?: (row: T, index: number) => string;
  rowStyle?: (row: T, index: number) => CSSProperties | undefined;
}

function toSortableValue(value: unknown): string | number {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  return String(value).toLowerCase();
}

function toFilterableValue(value: unknown): string {
  if (value == null) return '';
  return String(value).toLowerCase();
}

function widthToPixels(width?: number | string, fallback = 180): number {
  if (typeof width === 'number') return width;
  if (typeof width === 'string') {
    const px = Number.parseFloat(width.replace('px', '').trim());
    return Number.isFinite(px) ? px : fallback;
  }
  return fallback;
}

/**
 * Get storage key for persisting column widths
 */
function getStorageKey(tableId?: string): string {
  return `tracker-table-widths-${tableId || 'default'}`;
}

/**
 * Get storage key for persisting locked columns
 */
function getLockStorageKey(tableId?: string): string {
  return `tracker-table-locked-${tableId || 'default'}`;
}

/**
 * Load column widths from local storage
 */
function loadColumnWidths(tableId?: string): Record<string, number> {
  try {
    const key = getStorageKey(tableId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save column widths to local storage
 */
function saveColumnWidths(widths: Record<string, number>, tableId?: string): void {
  try {
    const key = getStorageKey(tableId);
    localStorage.setItem(key, JSON.stringify(widths));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Load locked columns from local storage
 */
function loadLockedColumns(tableId?: string): Set<string> | null {
  try {
    const key = getLockStorageKey(tableId);
    const data = localStorage.getItem(key);
    if (data == null) return null;
    return new Set(JSON.parse(data));
  } catch {
    return null;
  }
}

/**
 * Save locked columns to local storage
 */
function saveLockedColumns(locked: Set<string>, tableId?: string): void {
  try {
    const key = getLockStorageKey(tableId);
    localStorage.setItem(key, JSON.stringify([...locked]));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function TrackerTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  className = '',
  emptyMessage = 'No tracker rows available.',
  stickyHeader = true,
  stickyFirstColumn = false,
  stickyFirstNColumns = 0,
  defaultSort,
  onRowClick,
  tableId,
  resizable = true,
  headerGroupRows = [],
  serverSort = null,
  onServerSortChange,
  serverFilters,
  onServerFilterChange,
  rowClassName,
  rowStyle,
}: TrackerTableProps<T>) {
  const useServerMode = Boolean(onServerSortChange || onServerFilterChange);
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort ? { key: defaultSort.key, direction: defaultSort.direction ?? 'asc' } : null
  );
  const [searchDraft, setSearchDraft] = useState<Record<string, string>>({});
  const [searchApplied, setSearchApplied] = useState<Record<string, string>>({});

  // Track custom column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  // Track which columns are locked
  const [lockedColumns, setLockedColumns] = useState<Set<string>>(new Set());
  const resizeRef = useRef<{ columnKey: string; startX: number; startWidth: number } | null>(null);
  const isResizing = useRef(false);

  const defaultLockedColumns = useMemo(() => {
    const numInitiallyLocked = Math.max(stickyFirstNColumns, stickyFirstColumn ? 1 : 0);
    return new Set(
      columns
        .slice(0, numInitiallyLocked)
        .map((col) => col.key)
        .concat(columns.filter((col) => col.sticky).map((col) => col.key))
    );
  }, [columns, stickyFirstColumn, stickyFirstNColumns]);

  // Load persisted column widths and locked state on mount
  useEffect(() => {
    const saved = loadColumnWidths(tableId);
    setColumnWidths(saved);
    const savedLocked = loadLockedColumns(tableId);
    if (savedLocked === null) {
      setLockedColumns(defaultLockedColumns);
      saveLockedColumns(defaultLockedColumns, tableId);
      return;
    }

    // Drop keys that no longer exist in current columns.
    const validKeys = new Set(columns.map((col) => col.key));
    const sanitized = new Set([...savedLocked].filter((key) => validKeys.has(key)));
    setLockedColumns(sanitized);
  }, [tableId, defaultLockedColumns, columns]);

  // Determine which columns should be sticky
  const getStickyColumns = useMemo(() => {
    return new Set(lockedColumns);
  }, [lockedColumns]);

  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let left = 0;

    columns.forEach((column) => {
      if (!getStickyColumns.has(column.key)) return;
      
      offsets[column.key] = left;
      const width = columnWidths[column.key] ?? widthToPixels(column.width, column.minWidth ?? 180);
      left += width;
    });

    return offsets;
  }, [columns, getStickyColumns, columnWidths]);

  const getSearchValue = (row: T, column: TrackerTableColumn<T>): string => {
    if (column.value) return toFilterableValue(column.value(row));
    const raw = (row as Record<string, unknown>)[column.key];
    return toFilterableValue(raw);
  };

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(searchApplied)
      .map(([key, value]) => [key, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value.length > 0);

    if (activeFilters.length === 0) return rows;

    return rows.filter((row) => {
      return activeFilters.every(([columnKey, query]) => {
        const column = columns.find((col) => col.key === columnKey);
        if (!column) return true;
        return getSearchValue(row, column).includes(query);
      });
    });
  }, [rows, columns, searchApplied]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;

    const column = columns.find((col) => col.key === sort.key);
    if (!column) return filteredRows;

    const getValue = (row: T) => {
      if (column.value) return column.value(row);
      return (row as Record<string, unknown>)[column.key] as string | number | null | undefined;
    };

    return [...filteredRows].sort((a, b) => {
      const av = toSortableValue(getValue(a));
      const bv = toSortableValue(getValue(b));

      if (av < bv) return sort.direction === 'asc' ? -1 : 1;
      if (av > bv) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sort, columns]);

  const activeSort = useServerMode ? serverSort : sort;
  const visibleRows = useServerMode ? rows : sortedRows;

  useEffect(() => {
    if (!serverFilters) return;
    setSearchDraft(serverFilters);
    setSearchApplied(serverFilters);
  }, [serverFilters]);

  const handleSort = (column: TrackerTableColumn<T>) => {
    if (!column.sortable) return;

    if (useServerMode) {
      const prev = serverSort;
      if (!prev || prev.key !== column.key) {
        onServerSortChange?.({ key: column.key, direction: 'asc' });
        return;
      }
      onServerSortChange?.({
        key: column.key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc',
      });
      return;
    }

    setSort((prev) => {
      if (!prev || prev.key !== column.key) {
        return { key: column.key, direction: 'asc' };
      }

      return {
        key: column.key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  const getColumnWidth = (column: TrackerTableColumn<T>): number => {
    return columnWidths[column.key] ?? widthToPixels(column.width, column.minWidth ?? 180);
  };

  const groupRowHeight = 40;
  const baseHeaderTop = headerGroupRows.length * groupRowHeight;

  const handleSearchDraftChange = (columnKey: string, value: string) => {
    setSearchDraft((prev) => ({ ...prev, [columnKey]: value }));
  };

  const clearSearchForColumn = (columnKey: string) => {
    const nextFilters = {
      ...searchApplied,
      [columnKey]: '',
    };

    setSearchDraft((prev) => ({ ...prev, [columnKey]: '' }));
    setSearchApplied(nextFilters);
    if (useServerMode) {
      onServerFilterChange?.(nextFilters);
    }
  };

  const applySearchForColumn = (columnKey: string) => {
    const nextFilters = {
      ...searchApplied,
      [columnKey]: (searchDraft[columnKey] ?? '').trim(),
    };

    setSearchApplied(nextFilters);
    if (useServerMode) {
      onServerFilterChange?.(nextFilters);
    }
  };

  const toggleLockColumn = (columnKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLockedColumns((prev) => {
      const updated = new Set(prev);
      if (updated.has(columnKey)) {
        updated.delete(columnKey);
      } else {
        updated.add(columnKey);
      }
      saveLockedColumns(updated, tableId);
      return updated;
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = getColumnWidth(
      columns.find((col) => col.key === columnKey) || { key: columnKey, label: '' }
    );
    
    isResizing.current = true;
    resizeRef.current = {
      columnKey,
      startX: e.clientX,
      startWidth: currentWidth,
    };
  };

  // Handle mouse move for resizing - attach listeners that check isResizing flag
  useEffect(() => {
    if (!resizable) return;

    const handleMouseMove = (e: MouseEvent) => {
      const resizeState = resizeRef.current;
      if (!isResizing.current || !resizeState) return;

      const delta = e.clientX - resizeState.startX;
      const newWidth = Math.max(80, resizeState.startWidth + delta);

      setColumnWidths((prev) => ({
        ...prev,
        [resizeState.columnKey]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      if (isResizing.current && resizeRef.current) {
        // Save to local storage when resize ends - use current columnWidths
        setColumnWidths((prev) => {
          saveColumnWidths(prev, tableId);
          return prev;
        });
      }
      isResizing.current = false;
      resizeRef.current = null;
    };

    // Always attach listeners - they check isResizing flag internally
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizable, tableId]);

  return (
    <div className={`tracker-table-shell ${className}`}>
      <div className="tracker-table-wrap">
        <table className="tracker-table">
          <thead>
            {headerGroupRows.map((groupRow, rowIndex) => (
              <tr key={`group-row-${rowIndex}`}>
                {groupRow.map((cell, cellIndex) => (
                  <th
                    key={`group-cell-${rowIndex}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    className={[
                      'tracker-th',
                      'tracker-group-th',
                      stickyHeader ? 'sticky-head' : '',
                      cell.className || '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={stickyHeader ? { top: rowIndex * groupRowHeight } : undefined}
                  >
                    {cell.label || ''}
                  </th>
                ))}
              </tr>
            ))}
            <tr>
              {columns.map((column) => {
                const isSticky = getStickyColumns.has(column.key);
                const isSorted = activeSort?.key === column.key;
                const width = getColumnWidth(column);
                const canResize = resizable && (column.resizable !== false);
                const isLocked = lockedColumns.has(column.key);

                return (
                  <th
                    key={column.key}
                    className={[
                      'tracker-th',
                      stickyHeader ? 'sticky-head' : '',
                      isSticky ? 'sticky-col' : '',
                      column.align ? `align-${column.align}` : '',
                      column.sortable ? 'is-sortable' : '',
                      column.className || '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      width,
                      minWidth: width,
                      maxWidth: width,
                      ...(stickyHeader ? { top: baseHeaderTop } : {}),
                      ...(isSticky ? { left: stickyOffsets[column.key] ?? 0 } : {}),
                    }}
                  >
                    <span className="tracker-th-content">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <button
                          type="button"
                          className="tracker-sort-btn"
                          onClick={() => handleSort(column)}
                          title={`Sort by ${column.label}`}
                          aria-label={`Sort by ${column.label}`}
                        >
                          <span className="tracker-sort-indicator">
                            {isSorted ? (activeSort?.direction === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={`tracker-lock-btn ${isLocked ? 'locked' : ''}`}
                        onClick={(e) => toggleLockColumn(column.key, e)}
                        title={isLocked ? 'Click to unlock column' : 'Click to lock column'}
                        aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${column.label}`}
                      >
                        <span className="tracker-lock-icon">{isLocked ? '🔒' : '🔓'}</span>
                      </button>
                    </span>
                    {canResize && (
                      <div
                        className="tracker-resize-handle"
                        title="Drag to resize column"
                        onMouseDown={(e) => handleResizeMouseDown(e, column.key)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
            <tr>
              {columns.map((column) => {
                const isSticky = getStickyColumns.has(column.key);
                const width = getColumnWidth(column);
                const draftValue = searchDraft[column.key] ?? '';

                return (
                  <th
                    key={`${column.key}-search`}
                    className={[
                      'tracker-th',
                      'tracker-search-th',
                      stickyHeader ? 'sticky-head' : '',
                      isSticky ? 'sticky-col' : '',
                      column.align ? `align-${column.align}` : '',
                      column.className || '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      width,
                      minWidth: width,
                      maxWidth: width,
                      ...(stickyHeader ? { top: baseHeaderTop + groupRowHeight } : {}),
                      ...(isSticky ? { left: stickyOffsets[column.key] ?? 0 } : {}),
                    }}
                  >
                    {column.searchable ? (
                      <div className="tracker-search-input-wrap">
                        <input
                          type="text"
                          className="tracker-search-input"
                          value={draftValue}
                          placeholder={column.searchPlaceholder || `Search ${column.label}`}
                          onChange={(e) => handleSearchDraftChange(column.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              applySearchForColumn(column.key);
                            }
                            if (e.key === 'Escape' && draftValue) {
                              clearSearchForColumn(column.key);
                            }
                          }}
                          title={`Press Enter to filter ${column.label}`}
                        />
                        {draftValue ? (
                          <button
                            type="button"
                            className="tracker-search-clear-btn"
                            onClick={() => clearSearchForColumn(column.key)}
                            aria-label={`Clear ${column.label} search`}
                            title={`Clear ${column.label} search`}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="tracker-search-placeholder" />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="tracker-empty-cell">
                  Loading tracker data...
                </td>
              </tr>
            )}

            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="tracker-empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading &&
              visibleRows.map((row, rowIndex) => (
                <tr
                  key={rowKey(row, rowIndex)}
                  className={`tracker-tr ${onRowClick ? 'tracker-clickable' : ''} ${rowClassName?.(row, rowIndex) || ''}`}
                  style={rowStyle?.(row, rowIndex)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => {
                    const isSticky = getStickyColumns.has(column.key);
                    const width = getColumnWidth(column);
                    const rawValue = (row as Record<string, unknown>)[column.key];
                    const content: ReactNode = column.render
                      ? column.render(row)
                      : rawValue == null
                      ? '-'
                      : typeof rawValue === 'string' || typeof rawValue === 'number'
                      ? rawValue
                      : String(rawValue);

                    return (
                      <td
                        key={column.key}
                        className={[
                          'tracker-td',
                          isSticky ? 'sticky-col' : '',
                          column.align ? `align-${column.align}` : '',
                          column.className || '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          width,
                          minWidth: width,
                          maxWidth: width,
                          ...(isSticky ? { left: stickyOffsets[column.key] ?? 0 } : {}),
                        }}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
