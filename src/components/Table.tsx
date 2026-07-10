import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'Không có dữ liệu hiển thị.',
  loading = false
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-outline-variant/30 shadow-soft bg-white">
      <table className="w-full border-collapse text-left text-sm text-on-surface">
        <thead className="bg-surface-container-low/50 border-b border-outline-variant/30 text-on-surface font-label-md">
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className={`py-4 px-6 font-semibold select-none ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-on-surface-variant">
                <div className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang tải dữ liệu...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-on-surface-variant font-body-md">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr 
                key={row.id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                  transition-colors hover:bg-surface-container-low/30
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`py-4 px-6 text-body-md ${col.className || ''}`}>
                    {typeof col.accessor === 'function' 
                      ? col.accessor(row) 
                      : (row[col.accessor] as React.ReactNode)
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
