import { useState, useEffect } from 'react';
import { toast } from '../../ui/Toast';
import { Eye, Download } from 'lucide-react';
import { getDb } from '../../../db/DatabaseAdapter';
import type { AuditLogEntry } from '../../../db/interfaces';
import { Badge } from '../../ui/Badge';
import * as XLSX from 'xlsx';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Available users for filter
  const [users, setUsers] = useState<string[]>([]);
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadLogs();
    loadUsers();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const allLogs = await getDb().listAuditLog();
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await getDb().listUsers();
      const ids = allUsers.map(u => u.id).filter((id): id is string => !!id);
      setUsers(ids);
      const map = new Map<string, string>();
      allUsers.forEach(u => { if (u.id) map.set(u.id, u.fullName || u.email || u.id); });
      setUserNameMap(map);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleExport = () => {
    // Filter logs first
    const filteredLogs = getFilteredLogs();

    // Prepare data for Excel
    const exportData = filteredLogs.map(log => ({
      Timestamp: new Date(log.timestamp).toLocaleString(),
      User: userNameMap.get(log.userId) || log.userId,
      Action: log.action,
      EntityType: log.entityType,
      EntityID: log.entityId,
      Changes: JSON.stringify(log.changes),
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');

    // Download
    const filename = `audit_log_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      // User filter
      if (userFilter && log.userId !== userFilter) return false;

      // Action filter
      if (actionFilter && log.action !== actionFilter) return false;

      // Entity type filter
      if (entityTypeFilter && log.entityType !== entityTypeFilter) return false;

      // Date from filter
      if (dateFromFilter) {
        const logDate = new Date(log.timestamp);
        const fromDate = new Date(dateFromFilter);
        if (logDate < fromDate) return false;
      }

      // Date to filter
      if (dateToFilter) {
        const logDate = new Date(log.timestamp);
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (logDate > toDate) return false;
      }

      // Search filter
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const matchesUserId = log.userId.toLowerCase().includes(search);
        const matchesEntityId = log.entityId.toLowerCase().includes(search);
        const matchesChanges = JSON.stringify(log.changes).toLowerCase().includes(search);
        if (!matchesUserId && !matchesEntityId && !matchesChanges) return false;
      }

      return true;
    });
  };

  const filteredLogs = getFilteredLogs();

  // Paginate
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionBadgeVariant = (action: AuditLogEntry['action']): 'danger' | 'warning' | 'info' | 'success' | 'brand' => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'danger';
      case 'approve':
        return 'success';
      case 'reject':
        return 'danger';
      case 'submit':
        return 'warning';
      case 'escalate':
        return 'brand';
      case 'return':
        return 'warning';
      case 'comment':
        return 'info';
      case 'edit_review':
        return 'info';
      case 'login':
        return 'info';
      case 'logout':
        return 'info';
      default:
        return 'info';
    }
  };

  const renderDiff = (oldValues: any, newValues: any) => {
    if (!oldValues && !newValues) return null;

    const oldKeys = oldValues ? Object.keys(oldValues) : [];
    const newKeys = newValues ? Object.keys(newValues) : [];
    const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

    return (
      <div className="space-y-2">
        {allKeys.map(key => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          if (!hasChanged) return null;

          return (
            <div key={key} className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
              <div className="text-sm font-medium text-surface-100/80 mb-2">{key}</div>
              {oldVal !== undefined && (
                <div className="mb-1">
                  <span className="text-xs text-red-400 font-medium">Old: </span>
                  <span className="text-xs text-surface-100/60">
                    {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)}
                  </span>
                </div>
              )}
              {newVal !== undefined && (
                <div>
                  <span className="text-xs text-green-400 font-medium">New: </span>
                  <span className="text-xs text-surface-100/60">
                    {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueEntityTypes = Array.from(new Set(logs.map(l => l.entityType)));

  if (loading) {
    return (
      <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
        <div className="text-center py-8 text-surface-100/60">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-surface-100 mb-1">Audit Log</h2>
          <p className="text-surface-100/60">View system activity and changes</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded-lg text-surface-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-surface-100/80 mb-2">Search</label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search logs..."
            className="w-full px-3 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-100/80 mb-2">User</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            <option value="">All Users</option>
            {users.map(userId => (
              <option key={userId} value={userId}>{userId}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-100/80 mb-2">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-100/80 mb-2">Entity Type</label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            <option value="">All Types</option>
            {uniqueEntityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-100/80 mb-2">Date Range</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="flex-1 px-2 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="flex-1 px-2 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Results info */}
      <div className="text-sm text-surface-100/60 mb-4">
        Showing {paginatedLogs.length} of {filteredLogs.length} log entries
        {filteredLogs.length !== logs.length && ` (filtered from ${logs.length} total)`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">Timestamp</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">Action</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">Entity Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">Entity ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">Notes</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-surface-100/80">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-surface-100/60">
                  No audit logs found
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-white/5 hover:bg-surface-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-surface-100">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-100/80">
                    {userNameMap.get(log.userId) || log.userId}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-100/80">
                    {log.entityType}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-100/60 font-mono">
                    {log.entityId.length > 20 ? `${log.entityId.substring(0, 20)}...` : log.entityId}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-100/60 max-w-[200px] truncate" title={(log as any).notes || ''}>
                    {(log as any).notes || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetails(log)}
                      className="p-1 hover:bg-surface-700/50 rounded text-surface-100/60 hover:text-surface-100"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-surface-100/60">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded text-surface-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-surface-800/40 hover:bg-surface-700/50 border border-surface-700/50 rounded text-surface-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-details-modal-title"
          onKeyDown={(e) => e.key === 'Escape' && setShowDetailsModal(false)}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailsModal(false)}
            aria-hidden="true"
          />
          <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
              <h2 id="audit-details-modal-title" className="text-2xl font-bold text-surface-100">Audit Log Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-surface-700/50 rounded-lg text-surface-100/60 hover:text-surface-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-surface-100/60 mb-1">Timestamp</div>
                  <div className="text-surface-100">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-surface-100/60 mb-1">User</div>
                  <div className="text-surface-100">{(selectedLog as any).userName || selectedLog.userId}</div>
                  {(selectedLog as any).userName && (
                    <div className="text-xs text-surface-100/40">{selectedLog.userId}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-surface-100/60 mb-1">Action</div>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {selectedLog.action.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-surface-100/60 mb-1">Entity Type</div>
                  <div className="text-surface-100">{selectedLog.entityType}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-surface-100/60 mb-1">Entity ID</div>
                  <div className="text-surface-100 font-mono text-sm break-all">{selectedLog.entityId}</div>
                </div>
                {(selectedLog as any).notes && (
                  <div className="col-span-2">
                    <div className="text-sm text-surface-100/60 mb-1">Notes</div>
                    <div className="text-surface-100 text-sm bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                      {(selectedLog as any).notes}
                    </div>
                  </div>
                )}
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <div className="text-sm text-surface-100/60 mb-2">Changes Summary</div>
                  <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-4">
                    <pre className="text-xs text-surface-100/80 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {(selectedLog.oldValues || selectedLog.newValues) && (
                <div>
                  <div className="text-sm text-surface-100/60 mb-2">Detailed Changes</div>
                  {renderDiff(selectedLog.oldValues, selectedLog.newValues)}
                </div>
              )}

              {!selectedLog.changes && !selectedLog.oldValues && !selectedLog.newValues && (
                <div className="text-surface-100/60 text-center py-8">
                  No change details available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
