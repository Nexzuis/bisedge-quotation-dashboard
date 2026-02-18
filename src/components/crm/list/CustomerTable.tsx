import { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CustomerTableRow } from './CustomerTableRow';
import { staggerContainer } from '../shared/motionVariants';
import type { StoredCompany } from '../../../db/interfaces';

type SortField = 'name' | 'pipelineStage' | 'estimatedValue' | 'updatedAt' | 'createdAt';

const VIRTUALIZE_THRESHOLD = 100;
const ROW_HEIGHT = 48;

interface CustomerTableProps {
  companies: StoredCompany[];
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  userNameMap?: Record<string, string>;
}

export function CustomerTable({ companies, selectedIds, onSelectionChange, userNameMap }: CustomerTableProps) {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...companies].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'pipelineStage':
        cmp = a.pipelineStage.localeCompare(b.pipelineStage);
        break;
      case 'estimatedValue':
        cmp = (a.estimatedValue || 0) - (b.estimatedValue || 0);
        break;
      case 'updatedAt':
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const useVirtual = sorted.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: useVirtual,
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const selectable = !!onSelectionChange;
  const allSelected = selectable && sorted.length > 0 && sorted.every((c) => selectedIds?.has(c.id));

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sorted.map((c) => c.id)));
    }
  };

  const thClass = 'px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer hover:text-surface-200 transition-colors';
  const colSpanCount = selectable ? 7 : 6;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div ref={parentRef} className={`overflow-x-auto ${useVirtual ? 'max-h-[70vh] overflow-y-auto' : ''}`}>
        <table className="w-full">
          <thead className={useVirtual ? 'sticky top-0 z-10 bg-surface-900/95 backdrop-blur-sm' : ''}>
            <tr className="border-b border-surface-700/50">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-brand-500"
                  />
                </th>
              )}
              <th className={thClass} onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
              <th className={thClass} onClick={() => handleSort('pipelineStage')}>Stage <SortIcon field="pipelineStage" /></th>
              <th className={thClass} onClick={() => handleSort('estimatedValue')}>Value <SortIcon field="estimatedValue" /></th>
              <th className={thClass}>Assigned To</th>
              <th className={thClass} onClick={() => handleSort('updatedAt')}>Last Activity <SortIcon field="updatedAt" /></th>
              <th className={thClass} onClick={() => handleSort('createdAt')}>Created <SortIcon field="createdAt" /></th>
            </tr>
          </thead>
          {sorted.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={colSpanCount} className="px-4 py-12 text-center text-surface-500">
                  <div className="flex flex-col items-center">
                    <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                      <Building2 className="w-10 h-10 text-surface-600 mb-3" />
                    </motion.div>
                    <div className="text-sm font-medium text-surface-400">No companies found</div>
                    <div className="text-xs text-surface-600 mt-1">Try adjusting your search or filters</div>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : useVirtual ? (
            <tbody>
              {virtualizer.getVirtualItems().length > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={colSpanCount} style={{ height: virtualizer.getVirtualItems()[0].start, padding: 0 }} />
                </tr>
              )}
              {virtualizer.getVirtualItems().map((virtualRow) => (
                <CustomerTableRow
                  key={sorted[virtualRow.index].id}
                  company={sorted[virtualRow.index]}
                  selected={selectedIds?.has(sorted[virtualRow.index].id)}
                  onToggle={selectable ? toggleOne : undefined}
                  userNameMap={userNameMap}
                />
              ))}
              {virtualizer.getVirtualItems().length > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={colSpanCount}
                    style={{
                      height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                      padding: 0,
                    }}
                  />
                </tr>
              )}
            </tbody>
          ) : (
            <motion.tbody
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {sorted.map((company) => (
                <CustomerTableRow
                  key={company.id}
                  company={company}
                  selected={selectedIds?.has(company.id)}
                  onToggle={selectable ? toggleOne : undefined}
                  userNameMap={userNameMap}
                />
              ))}
            </motion.tbody>
          )}
        </table>
      </div>
    </div>
  );
}
