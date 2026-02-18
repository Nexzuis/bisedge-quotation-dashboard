import { useState } from 'react';
import { Trash2, ArrowRight, UserCheck, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/Toast';
import { useCompanies } from '../../../hooks/useCompanies';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { PIPELINE_STAGES } from '../shared/stageConfig';
import type { PipelineStage } from '../../../types/crm';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BulkActionsBar({ selectedCount, selectedIds, onClearSelection, onRefresh }: BulkActionsBarProps) {
  const [stageTarget, setStageTarget] = useState<PipelineStage | ''>('');
  const { updateStage, deleteCompany } = useCompanies();
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  if (selectedCount === 0) return null;

  const handleBulkStageUpdate = async () => {
    if (!stageTarget) return;
    const confirmed = await confirm({
      title: 'Bulk Update Stage',
      message: `Move ${selectedCount} ${selectedCount === 1 ? 'company' : 'companies'} to "${stageTarget}" stage?`,
      variant: 'info',
      confirmText: 'Update',
    });
    if (!confirmed) return;

    let success = 0;
    for (const id of selectedIds) {
      try {
        await updateStage(id, stageTarget);
        success++;
      } catch {
        // continue with others
      }
    }
    toast.success(`Updated ${success} ${success === 1 ? 'company' : 'companies'}`);
    setStageTarget('');
    onClearSelection();
    onRefresh();
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Bulk Delete',
      message: `Are you sure you want to delete ${selectedCount} ${selectedCount === 1 ? 'company' : 'companies'}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete All',
    });
    if (!confirmed) return;

    let success = 0;
    for (const id of selectedIds) {
      try {
        await deleteCompany(id);
        success++;
      } catch {
        // continue with others
      }
    }
    toast.success(`Deleted ${success} ${success === 1 ? 'company' : 'companies'}`);
    onClearSelection();
    onRefresh();
  };

  return (
    <>
      <div className="glass rounded-xl p-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-2">
        <div className="text-sm text-surface-200 font-medium">
          {selectedCount} selected
        </div>
        <button
          onClick={onClearSelection}
          className="text-surface-400 hover:text-surface-200 transition-colors"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-surface-700" />

        {/* Bulk stage update */}
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-surface-400" />
          <select
            value={stageTarget}
            onChange={(e) => setStageTarget(e.target.value as PipelineStage | '')}
            className="input text-sm py-1.5"
          >
            <option value="">Move to stage...</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          {stageTarget && (
            <Button variant="secondary" onClick={handleBulkStageUpdate}>
              Apply
            </Button>
          )}
        </div>

        <div className="h-5 w-px bg-surface-700" />

        {/* Bulk delete */}
        <Button variant="danger" icon={Trash2} onClick={handleBulkDelete}>
          Delete
        </Button>
      </div>
      {ConfirmDialogElement}
    </>
  );
}
