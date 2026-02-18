import React, { useState } from 'react';
import { toast } from '../../ui/Toast';
import { useAllConfigurationMatrices } from '../../../hooks/useConfigurationMatrix';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { configurationMatrixRepository } from '../../../db/ConfigurationMatrixRepository';
import { importConfigurationFromExcel, exportConfigurationToExcel } from '../../../utils/configurationImporter';
import { Download, Upload, Trash2 } from 'lucide-react';

const ConfigurationMatrixManagement: React.FC = () => {
  const matrices = useAllConfigurationMatrices();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus('Importing...');

    try {
      const result = await importConfigurationFromExcel(file);

      if (result.success && result.matrix) {
        await configurationMatrixRepository.saveMatrix(result.matrix);
        setImportStatus(
          `Success! Imported ${result.stats.variantsFound} variants, ` +
          `${result.stats.specGroupsFound} spec groups, ` +
          `${result.stats.optionsImported} options.`
        );

        if (result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }
      } else {
        setImportStatus(`Import failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      setImportStatus(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleExport = async (matrixId: string) => {
    try {
      const matrix = matrices?.find((m) => m.id === matrixId);
      if (!matrix) return;

      const blob = exportConfigurationToExcel(matrix);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configuration-matrix-${matrix.baseModelFamily}-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export configuration matrix');
    }
  };

  const handleDelete = async (matrixId: string) => {
    const confirmed = await confirm({
      title: 'Delete Configuration Matrix',
      message: 'Are you sure you want to delete this configuration matrix? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      await configurationMatrixRepository.delete(matrixId);
      setImportStatus('Configuration matrix deleted successfully');
      toast.success('Configuration matrix deleted');
    } catch (error) {
      toast.error('Failed to delete configuration matrix');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Configuration Matrices</h1>
          <p className="text-gray-400 mt-1">
            Manage Linde forklift configuration matrices and variant options
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Import Button */}
          <label className="btn btn-primary cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Import Status */}
      {importStatus && (
        <div
          className={`p-4 rounded-lg border ${
            importStatus.startsWith('Success')
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : importStatus.startsWith('Import failed') || importStatus.startsWith('Import error')
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          {importStatus}
        </div>
      )}

      {/* Matrices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!matrices || matrices.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400 text-lg">No configuration matrices found</p>
            <p className="text-gray-500 text-sm mt-2">
              Import an Excel file to create a new configuration matrix
            </p>
          </div>
        ) : (
          matrices.map((matrix) => (
            <div
              key={matrix.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-cyan-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-surface-100">
                    {matrix.baseModelFamily}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {matrix.variants.length} variant{matrix.variants.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Variants List */}
              <div className="space-y-2 mb-4">
                {matrix.variants.map((variant) => (
                  <div
                    key={variant.variantCode}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300">{variant.variantCode}</span>
                    <span className="text-gray-500">
                      {variant.specifications.length} specs
                    </span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="border-t border-gray-700 pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Spec Groups</p>
                    <p className="text-surface-100 font-semibold">
                      {Math.max(
                        ...matrix.variants.map((v) => v.specifications.length)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="text-surface-100 font-semibold">
                      {new Date(matrix.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(matrix.id)}
                  className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>

                <button
                  onClick={() => handleDelete(matrix.id)}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import Guide */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-3">
          Excel Import Format
        </h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>The Excel file should have the following structure:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Column A: Material Number (base model)</li>
            <li>Column B: Long Code (option identifier)</li>
            <li>Column C: Spec Code (1100, 1135, etc.)</li>
            <li>Column D: Description</li>
            <li>Columns E-I: INDX1-5 (availability levels: 0-3)</li>
          </ul>
          <p className="mt-3 text-gray-400">
            <strong>Availability Levels:</strong> 0 = Not Available, 1 = Standard,
            2 = Optional, 3 = Special Order
          </p>
        </div>
      </div>
      {ConfirmDialogElement}
    </div>
  );
};

export default ConfigurationMatrixManagement;
