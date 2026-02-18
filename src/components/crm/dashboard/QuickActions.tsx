import { useNavigate } from 'react-router-dom';
import { UserPlus, FilePlus, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../ui/Button';
import { staggerContainer, fadeInUp } from '../shared/motionVariants';

export function QuickActions() {
  const navigate = useNavigate();
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
        <Button variant="feature" icon={FilePlus} onClick={() => navigate('/builder')}>
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
