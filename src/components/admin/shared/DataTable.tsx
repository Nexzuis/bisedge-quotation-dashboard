import { useState } from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2, Download } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onExport?: () => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onEdit,
  onDelete,
  onExport,
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter data
  const filteredData = data.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(filter.toLowerCase())
    )
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return aVal > bVal ? modifier : aVal < bVal ? -modifier : 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="text-center py-8 text-surface-100/60">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-medium text-surface-100/80"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 hover:text-surface-100"
                    >
                      {column.label}
                      {sortKey === column.key && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-4 py-8 text-center text-surface-100/60"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 hover:bg-surface-800/40 transition-colors"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-surface-100">
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1 hover:bg-surface-700/50 rounded text-surface-100/60 hover:text-surface-100"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1 hover:bg-red-500/20 rounded text-surface-100/60 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-surface-100/60">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, sortedData.length)} of{' '}
            {sortedData.length} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded text-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded text-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
