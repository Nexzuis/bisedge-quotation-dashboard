import { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../../../db/schema';
import ConfirmDialog from '../shared/ConfirmDialog';
import { toast } from '../../ui/Toast';

interface BackupData {
  version: string;
  timestamp: string;
  tables: {
    quotes: any[];
    customers: any[];
    companies: any[];
    contacts: any[];
    activities: any[];
    templates: any[];
    auditLog: any[];
    approvalTiers: any[];
    commissionTiers: any[];
    residualCurves: any[];
    configurationMatrices: any[];
    users: any[];
    settings: any[];
  };
}

interface ImportPreview {
  quotes: number;
  customers: number;
  companies: number;
  contacts: number;
  activities: number;
  templates: number;
  auditLog: number;
  approvalTiers: number;
  commissionTiers: number;
  residualCurves: number;
  configurationMatrices: number;
  users: number;
  settings: number;
}

const BackupRestore = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importData, setImportData] = useState<BackupData | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleExportBackup = async () => {
    setExporting(true);

    try {
      // Collect all data from database
      const quotes = await db.quotes.toArray();
      const customers = await db.customers.toArray();
      const companies = await db.companies.toArray();
      const contacts = await db.contacts.toArray();
      const activities = await db.activities.toArray();
      const templates = await db.templates.toArray();
      const auditLog = await db.auditLog.toArray();
      const approvalTiers = await db.approvalTiers.toArray();
      const commissionTiers = await db.commissionTiers.toArray();
      const residualCurves = await db.residualCurves.toArray();
      const configurationMatrices = await db.configurationMatrices.toArray();
      const settings = await db.settings.toArray();

      // Get users but exclude passwords
      const usersRaw = await db.users.toArray();
      const users = usersRaw.map(u => ({
        ...u,
        passwordHash: '[EXCLUDED]', // Don't export password hashes
      }));

      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tables: {
          quotes,
          customers,
          companies,
          contacts,
          activities,
          templates,
          auditLog,
          approvalTiers,
          commissionTiers,
          residualCurves,
          configurationMatrices,
          users,
          settings,
        },
      };

      // Convert to JSON
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                       new Date().toTimeString().split(':').slice(0, 2).join('');
      link.download = `bisedge_backup_${timestamp}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setImportStatus({
        type: 'success',
        message: 'Backup exported successfully',
      });
    } catch (error) {
      console.error('Export failed:', error);
      setImportStatus({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      // Validate structure
      if (!data.version || !data.timestamp || !data.tables) {
        throw new Error('Invalid backup file structure');
      }

      // Required tables
      const requiredTables = [
        'quotes', 'customers', 'templates',
        'commissionTiers', 'residualCurves'
      ];

      for (const table of requiredTables) {
        if (!data.tables[table as keyof BackupData['tables']]) {
          throw new Error(`Missing required table: ${table}`);
        }
      }

      // Create preview
      const preview: ImportPreview = {
        quotes: data.tables.quotes?.length || 0,
        customers: data.tables.customers?.length || 0,
        companies: data.tables.companies?.length || 0,
        contacts: data.tables.contacts?.length || 0,
        activities: data.tables.activities?.length || 0,
        templates: data.tables.templates?.length || 0,
        auditLog: data.tables.auditLog?.length || 0,
        approvalTiers: data.tables.approvalTiers?.length || 0,
        commissionTiers: data.tables.commissionTiers?.length || 0,
        residualCurves: data.tables.residualCurves?.length || 0,
        configurationMatrices: data.tables.configurationMatrices?.length || 0,
        users: data.tables.users?.length || 0,
        settings: data.tables.settings?.length || 0,
      };

      setImportData(data);
      setImportPreview(preview);
      setShowImportConfirm(true);
      setImportStatus({
        type: 'info',
        message: 'Backup file loaded. Review the preview and confirm to import.',
      });
    } catch (error) {
      console.error('Failed to parse backup file:', error);
      setImportStatus({
        type: 'error',
        message: `Failed to parse backup file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      // Reset file input
      event.target.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importData) return;

    setImporting(true);
    setShowImportConfirm(false);

    try {
      if (importMode === 'replace') {
        // Clear all tables first
        await db.quotes.clear();
        await db.customers.clear();
        await db.companies.clear();
        await db.contacts.clear();
        await db.activities.clear();
        await db.templates.clear();
        await db.auditLog.clear();
        await db.approvalTiers.clear();
        await db.commissionTiers.clear();
        await db.residualCurves.clear();
        await db.configurationMatrices.clear();
        await db.settings.clear();
        // Note: Don't clear users table in replace mode for safety
      }

      // Import data
      if (importData.tables.quotes?.length > 0) {
        await db.quotes.bulkPut(importData.tables.quotes);
      }
      if (importData.tables.customers?.length > 0) {
        await db.customers.bulkPut(importData.tables.customers);
      }
      if (importData.tables.companies?.length > 0) {
        await db.companies.bulkPut(importData.tables.companies);
      }
      if (importData.tables.contacts?.length > 0) {
        await db.contacts.bulkPut(importData.tables.contacts);
      }
      if (importData.tables.activities?.length > 0) {
        await db.activities.bulkPut(importData.tables.activities);
      }
      if (importData.tables.templates?.length > 0) {
        await db.templates.bulkPut(importData.tables.templates);
      }
      if (importData.tables.auditLog?.length > 0) {
        await db.auditLog.bulkPut(importData.tables.auditLog);
      }
      if (importData.tables.approvalTiers?.length > 0) {
        await db.approvalTiers.bulkPut(importData.tables.approvalTiers);
      }
      if (importData.tables.commissionTiers?.length > 0) {
        await db.commissionTiers.bulkPut(importData.tables.commissionTiers);
      }
      if (importData.tables.residualCurves?.length > 0) {
        await db.residualCurves.bulkPut(importData.tables.residualCurves);
      }
      if (importData.tables.configurationMatrices?.length > 0) {
        await db.configurationMatrices.bulkPut(importData.tables.configurationMatrices);
      }
      if (importData.tables.settings?.length > 0) {
        await db.settings.bulkPut(importData.tables.settings);
      }

      // Users are excluded from import for security
      // Passwords would need to be reset manually

      setImportStatus({
        type: 'success',
        message: `Backup imported successfully in ${importMode} mode. Please reload the page to see changes.`,
      });
      toast.success('Backup imported successfully');

      // Clear import data
      setImportData(null);
      setImportPreview(null);
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus({
        type: 'error',
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      toast.error('Backup import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-surface-100 mb-1">Backup & Restore</h2>
        <p className="text-surface-100/60">Export and import database backups</p>
      </div>

      {/* Status Messages */}
      {importStatus.type && (
        <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
          importStatus.type === 'success'
            ? 'bg-green-500/10 border-green-500/30'
            : importStatus.type === 'error'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          {importStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
          {importStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
          {importStatus.type === 'info' && <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className={`text-sm ${
              importStatus.type === 'success'
                ? 'text-green-300'
                : importStatus.type === 'error'
                ? 'text-red-300'
                : 'text-blue-300'
            }`}>
              {importStatus.message}
            </p>
          </div>
          <button
            onClick={() => setImportStatus({ type: null, message: '' })}
            className="text-surface-100/60 hover:text-surface-100"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-surface-800/40 border border-surface-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-500/20 rounded-lg">
              <Download className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-100">Export Backup</h3>
              <p className="text-sm text-surface-100/60">Download all database data</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <p className="text-sm text-surface-100/80">
              Creates a JSON file containing:
            </p>
            <ul className="text-sm text-surface-100/60 space-y-1 ml-4">
              <li>• All quotes and customer data</li>
              <li>• CRM companies, contacts & activities</li>
              <li>• Templates and settings</li>
              <li>• Catalog (models, batteries)</li>
              <li>• Configuration matrices</li>
              <li>• Pricing configuration</li>
              <li>• Audit logs</li>
              <li>• User accounts (passwords excluded)</li>
            </ul>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export Backup'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-surface-800/40 border border-surface-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Upload className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-100">Import Backup</h3>
              <p className="text-sm text-surface-100/60">Restore from backup file</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-surface-100 mb-2">
                Import Mode
              </label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                className="w-full px-3 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="merge">Merge - Keep existing data, add new</option>
                <option value="replace">Replace - Clear tables, restore from backup</option>
              </select>
            </div>

            {importMode === 'replace' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    <strong>Warning:</strong> Replace mode will delete all existing data before importing.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            )}
          </div>

          <label className="block w-full">
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              disabled={importing}
            />
            <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-surface-100 rounded-lg transition-colors cursor-pointer font-medium">
              <Upload className="w-5 h-5" />
              Select Backup File
            </div>
          </label>
        </div>
      </div>

      {/* Import Preview & Confirm Dialog */}
      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setImportData(null);
          setImportPreview(null);
        }}
        onConfirm={handleImportConfirm}
        title={`Confirm ${importMode === 'merge' ? 'Merge' : 'Replace'} Import`}
        message=""
        confirmText={importing ? 'Importing...' : 'Confirm Import'}
        variant={importMode === 'replace' ? 'danger' : 'warning'}
      >
        {importPreview && (
          <div className="space-y-4">
            <p className="text-surface-100/80 text-sm">
              The following data will be imported in <strong>{importMode}</strong> mode:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Quotes</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.quotes}</div>
              </div>
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Customers</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.customers}</div>
              </div>
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Companies (CRM)</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.companies}</div>
              </div>
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Contacts</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.contacts}</div>
              </div>
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Activities</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.activities}</div>
              </div>
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Templates</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.templates}</div>
              </div>
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-3">
                <div className="text-xs text-surface-100/60 mb-1">Audit Logs</div>
                <div className="text-lg font-bold text-surface-100">{importPreview.auditLog}</div>
              </div>
            </div>

            {importMode === 'replace' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    All existing data will be deleted before import. Make sure you have a current backup!
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300">
                <strong>Note:</strong> User passwords are excluded from backups for security.
                Users from backup will need password resets.
              </p>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default BackupRestore;
