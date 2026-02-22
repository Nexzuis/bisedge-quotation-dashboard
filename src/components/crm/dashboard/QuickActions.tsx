import { useNavigate } from 'react-router-dom';
import { UserPlus, FilePlus, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { staggerContainer, fadeInUp } from '../shared/motionVariants';
import { useQuoteDB } from '../../../hooks/useQuoteDB';
import { toast } from 'sonner';
import { logger } from '../../../utils/logger';

export function QuickActions() {
  const navigate = useNavigate();
  const { createNewQuote } = useQuoteDB();

  const handleNewQuote = async () => {
    try {
      await createNewQuote();
      navigate('/builder');
    } catch (error) {
      logger.error('Failed to create new quote from CRM quick action:', error);
      toast.error('Failed to start a new quote');
    }
  };

  return (
    <motion.div
      className="flex flex-wrap gap-3"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="primary" icon={UserPlus} onClick={() => navigate('/customers', { state: { openNewLead: true } })}>
          New Lead
        </Button>
      </motion.div>
      <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="feature" icon={FilePlus} onClick={handleNewQuote}>
          Quote Builder
        </Button>
      </motion.div>
      <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="secondary" icon={Users} onClick={() => navigate('/customers')}>
          All Customers
        </Button>
      </motion.div>
    </motion.div>
  );
}
