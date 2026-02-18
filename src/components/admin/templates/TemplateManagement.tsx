import { useState, useEffect } from 'react';
import { toast } from '../../ui/Toast';
import { Plus, Eye, Copy, Edit, Trash2 } from 'lucide-react';
import DataTable from '../shared/DataTable';
import EditModal from '../shared/EditModal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { getTemplateRepository, getAuditRepository } from '../../../db/repositories';
import { useAuth } from '../../auth/AuthContext';
import { Badge } from '../../ui/Badge';
import type { StoredTemplate } from '../../../db/interfaces';

interface TemplateFormData {
  name: string;
  type: StoredTemplate['type'];
  content: any;
  isDefault: boolean;
}

const TemplateManagement = () => {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StoredTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    type: 'terms-and-conditions',
    content: '',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<StoredTemplate['type']>('terms-and-conditions');

  const { user: currentUser } = useAuth();
  const templateRepo = getTemplateRepository();
  const auditRepo = getAuditRepository();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // Load all templates and group by type
      const tcTemplates = await templateRepo.getByType('terms-and-conditions');
      const coverTemplates = await templateRepo.getByType('cover-letter');
      const emailTemplates = await templateRepo.getByType('email');
      const headerTemplates = await templateRepo.getByType('quote-header');

      const allTemplates = [
        ...tcTemplates,
        ...coverTemplates,
        ...emailTemplates,
        ...headerTemplates,
      ];

      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Template name is required';
    }

    if (!formData.content || (typeof formData.content === 'string' && !formData.content.trim())) {
      errors.content = 'Template content is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = (type: StoredTemplate['type']) => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      type,
      content: type === 'terms-and-conditions'
        ? getDefaultTCContent()
        : type === 'cover-letter'
        ? getDefaultCoverLetterContent()
        : '',
      isDefault: false,
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleEdit = (template: StoredTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      isDefault: template.isDefault,
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleDuplicate = async (template: StoredTemplate) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      type: template.type,
      content: template.content,
      isDefault: false, // Copy is never default
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      if (selectedTemplate) {
        // Update existing template
        const updates = {
          name: formData.name,
          content: formData.content,
          isDefault: formData.isDefault,
        };

        // If setting as default, unset other defaults of same type
        if (formData.isDefault) {
          const otherTemplates = templates.filter(
            t => t.type === selectedTemplate.type && t.id !== selectedTemplate.id
          );
          for (const t of otherTemplates) {
            await templateRepo.save({
              ...t,
              isDefault: false,
            });
          }
        }

        const updatedTemplate = {
          ...selectedTemplate,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await templateRepo.save(updatedTemplate);

        // Audit log
        await auditRepo.log({
          userId: currentUser!.id,
          action: 'update',
          entityType: 'template',
          entityId: selectedTemplate.id,
          changes: updates,
          oldValues: selectedTemplate,
          newValues: updatedTemplate,
        });
      } else {
        // Create new template
        // If setting as default, unset other defaults of same type
        if (formData.isDefault) {
          const otherTemplates = templates.filter(t => t.type === formData.type);
          for (const t of otherTemplates) {
            await templateRepo.save({
              ...t,
              isDefault: false,
            });
          }
        }

        const newTemplateId = await templateRepo.save({
          name: formData.name,
          type: formData.type,
          content: formData.content,
          isDefault: formData.isDefault,
        });

        // Audit log
        await auditRepo.log({
          userId: currentUser!.id,
          action: 'create',
          entityType: 'template',
          entityId: newTemplateId,
          changes: { created: true },
          newValues: formData,
        });
      }

      setShowEditModal(false);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (template: StoredTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    try {
      await templateRepo.delete(selectedTemplate.id);

      // Audit log
      await auditRepo.log({
        userId: currentUser!.id,
        action: 'delete',
        entityType: 'template',
        entityId: selectedTemplate.id,
        changes: { deleted: true },
        oldValues: selectedTemplate,
      });

      setShowDeleteDialog(false);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handlePreview = (template: StoredTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const getDefaultTCContent = () => {
    return {
      sections: [
        {
          number: 1,
          title: 'Quotation Validity',
          content: [
            'This quotation is valid for 30 days from the date of issue.',
            'Prices are subject to change without notice after the validity period.',
          ],
        },
        {
          number: 2,
          title: 'Payment Terms',
          content: [
            'Payment terms are net 30 days from invoice date.',
            'Late payments may incur interest charges at 2% per month.',
          ],
        },
      ],
      footer: 'All prices exclude VAT unless otherwise stated.',
    };
  };

  const getDefaultCoverLetterContent = () => {
    return `Dear {customerName},

Thank you for your interest in our products. We are pleased to provide you with quotation {quoteRef}.

This quotation includes all the equipment and services discussed during our recent meeting. Please review the attached specifications and pricing details.

Should you have any questions or require further information, please do not hesitate to contact us.

We look forward to working with you.

Best regards,
{signatoryName}
{signatoryTitle}`;
  };

  const filteredTemplates = templates.filter(t => t.type === activeTab);

  const columns = [
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (type: string) => (
        <span className="text-surface-100/80 capitalize">
          {type.replace(/-/g, ' ')}
        </span>
      ),
    },
    {
      key: 'isDefault',
      label: 'Default',
      sortable: true,
      render: (isDefault: boolean) => (
        <Badge variant={isDefault ? 'success' : 'info'}>
          {isDefault ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Modified',
      sortable: true,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: StoredTemplate) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePreview(row)}
            className="p-1 hover:bg-surface-700/50 rounded text-surface-100/60 hover:text-surface-100"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDuplicate(row)}
            className="p-1 hover:bg-surface-700/50 rounded text-surface-100/60 hover:text-surface-100"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-surface-700/50 rounded text-surface-100/60 hover:text-surface-100"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-1 hover:bg-red-500/20 rounded text-surface-100/60 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-surface-100 mb-1">Template Management</h2>
          <p className="text-surface-100/60">Manage document templates for quotes and communications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-surface-700/50">
        <button
          onClick={() => setActiveTab('terms-and-conditions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'terms-and-conditions'
              ? 'text-surface-100 border-b-2 border-teal-500'
              : 'text-surface-100/60 hover:text-surface-100'
          }`}
        >
          Terms & Conditions
        </button>
        <button
          onClick={() => setActiveTab('cover-letter')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'cover-letter'
              ? 'text-surface-100 border-b-2 border-teal-500'
              : 'text-surface-100/60 hover:text-surface-100'
          }`}
        >
          Cover Letters
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'email'
              ? 'text-surface-100 border-b-2 border-teal-500'
              : 'text-surface-100/60 hover:text-surface-100'
          }`}
        >
          Email Templates
        </button>
        <button
          onClick={() => setActiveTab('quote-header')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'quote-header'
              ? 'text-surface-100 border-b-2 border-teal-500'
              : 'text-surface-100/60 hover:text-surface-100'
          }`}
        >
          Quote Headers
        </button>
        <div className="flex-1" />
        <button
          onClick={() => handleAdd(activeTab)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        emptyMessage={`No ${activeTab.replace(/-/g, ' ')} templates found`}
      />

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedTemplate ? 'Edit Template' : 'Add Template'}
        onSave={handleSave}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter template name"
            />
            {validationErrors.name && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as StoredTemplate['type'] })}
              disabled={!!selectedTemplate}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
              <option value="terms-and-conditions">Terms & Conditions</option>
              <option value="cover-letter">Cover Letter</option>
              <option value="email">Email Template</option>
              <option value="quote-header">Quote Header</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={typeof formData.content === 'string' ? formData.content : JSON.stringify(formData.content, null, 2)}
              onChange={(e) => {
                try {
                  // Try to parse as JSON
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, content: parsed });
                } catch {
                  // If not valid JSON, store as string
                  setFormData({ ...formData, content: e.target.value });
                }
              }}
              rows={12}
              className="w-full px-4 py-2 bg-surface-800/40 border border-surface-700/50 rounded-lg text-surface-100 placeholder:text-surface-100/30 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
              placeholder={formData.type === 'terms-and-conditions'
                ? 'Enter JSON content or use default structure'
                : 'Enter template content (supports placeholders like {customerName}, {quoteRef})'}
            />
            {validationErrors.content && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.content}</p>
            )}
            <p className="text-surface-100/40 text-xs mt-1">
              Available placeholders: {'{customerName}'}, {'{quoteRef}'}, {'{date}'}, {'{signatoryName}'}, {'{signatoryTitle}'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4 bg-surface-800/40 border border-surface-700/50 rounded focus:ring-2 focus:ring-teal-500"
            />
            <label htmlFor="isDefault" className="text-sm text-surface-100">
              Set as default template for this type
            </label>
          </div>
        </div>
      </EditModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete template "${selectedTemplate?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-preview-modal-title"
          onKeyDown={(e) => e.key === 'Escape' && setShowPreviewModal(false)}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreviewModal(false)}
            aria-hidden="true"
          />
          <div className="relative bg-slate-900 border border-surface-600/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
              <h2 id="template-preview-modal-title" className="text-2xl font-bold text-surface-100">Template Preview: {selectedTemplate.name}</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-surface-700/50 rounded-lg text-surface-100/60 hover:text-surface-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="bg-surface-800/40 border border-surface-700/50 rounded-lg p-6">
                <pre className="text-surface-100/80 text-sm whitespace-pre-wrap font-mono">
                  {typeof selectedTemplate.content === 'string'
                    ? selectedTemplate.content
                    : JSON.stringify(selectedTemplate.content, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;
