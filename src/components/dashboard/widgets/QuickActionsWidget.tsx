import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, FolderOpen, ClipboardCheck, Users, Settings, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '../../ui/Button';
import { LoadQuoteModal } from '../../shared/LoadQuoteModal';
import { staggerContainer, fadeInUp } from '../../crm/shared/motionVariants';
import { ROLE_HIERARCHY, type Role } from '../../../auth/permissions';
import { useQuoteDB } from '../../../hooks/useQuoteDB';
import { useQuoteStore } from '../../../store/useQuoteStore';
import { logger } from '../../../utils/logger';

interface QuickActionsWidgetProps {
  role: Role;
}

export function QuickActionsWidget({ role }: QuickActionsWidgetProps) {
  const navigate = useNavigate();
  const { createNewQuote } = useQuoteDB();
  const [showLoadModal, setShowLoadModal] = useState(false);
  const isManager = (ROLE_HIERARCHY[role] || 0) >= 2;
  const isAdmin = role === 'system_admin';

  const handleNewQuote = async () => {
    try {
      await createNewQuote();
      navigate('/builder');
    } catch (error) {
      logger.error('Failed to create new quote from dashboard quick action:', error);
      toast.error('Failed to start a new quote');
    }
  };

  return (
    <>
      <motion.div
        className="flex flex-wrap gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="primary" icon={FilePlus} onClick={handleNewQuote}>
            New Quote
          </Button>
        </motion.div>
        <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="secondary" icon={FolderOpen} onClick={() => setShowLoadModal(true)}>
            Load Quote
          </Button>
        </motion.div>
        <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="secondary" icon={Users} onClick={() => navigate('/customers')}>
            Customers
          </Button>
        </motion.div>
        {isManager && (
          <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="feature" icon={ClipboardCheck} onClick={() => navigate('/admin/approvals')}>
              Approvals
            </Button>
          </motion.div>
        )}
        {isManager && (
          <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="secondary" icon={Shield} onClick={() => navigate('/quotes')}>
              All Quotes
            </Button>
          </motion.div>
        )}
        {isAdmin && (
          <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" icon={Settings} onClick={() => navigate('/admin')}>
              Admin Panel
            </Button>
          </motion.div>
        )}
      </motion.div>

      <LoadQuoteModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onQuoteLoaded={() => {
          const quoteId = useQuoteStore.getState().id;
          navigate(quoteId ? `/quote?id=${quoteId}` : '/quote');
        }}
      />
    </>
  );
}
