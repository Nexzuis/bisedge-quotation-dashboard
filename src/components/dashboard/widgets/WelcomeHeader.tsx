import { motion } from 'framer-motion';
import { fadeInUp } from '../../crm/shared/motionVariants';
import { Badge } from '../../ui/Badge';
import { ROLE_DISPLAY_NAMES, type Role } from '../../../auth/permissions';

interface WelcomeHeaderProps {
  user: {
    fullName: string;
    username: string;
    role: Role;
  } | null;
}

const ROLE_BADGE_VARIANT: Record<string, 'danger' | 'warning' | 'info' | 'brand' | 'success'> = {
  system_admin: 'danger',
  ceo: 'warning',
  local_leader: 'brand',
  sales_manager: 'success',
  key_account: 'info',
  sales_rep: 'info',
};

export function WelcomeHeader({ user }: WelcomeHeaderProps) {
  if (!user) return null;

  const greeting = getGreeting();
  const displayName = user.fullName || user.username;

  return (
    <motion.div variants={fadeInUp} className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">
          {greeting}, {displayName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={ROLE_BADGE_VARIANT[user.role] || 'info'}>
            {ROLE_DISPLAY_NAMES[user.role] || user.role}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
