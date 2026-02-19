import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../store/useAuthStore';
import { getDb } from '../../../db/DatabaseAdapter';
import { Badge } from '../../ui/Badge';
import { fadeInUp } from '../../crm/shared/motionVariants';

interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  quoteCount: number;
  pendingCount: number;
  latestQuoteDate: string | null;
}

export function TeamOverviewWidget() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTeam();
  }, [user]);

  const loadTeam = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();

      // Get all active users
      const allUsers = await db.listUsers?.() || [];
      const activeUsers = (allUsers as any[]).filter((u: any) => u.isActive || u.is_active);

      // Get all quotes
      const quotesResult = await db.listQuotes(
        { page: 1, pageSize: 1000, sortBy: 'updatedAt', sortOrder: 'desc' },
        {}
      );

      // Build team stats
      const teamMap = new Map<string, TeamMember>();
      for (const u of activeUsers) {
        const uid = u.id;
        if (uid === user.id) continue; // Skip self
        teamMap.set(uid, {
          id: uid,
          fullName: u.fullName || u.full_name || u.username || u.email || 'Unknown',
          role: u.role,
          quoteCount: 0,
          pendingCount: 0,
          latestQuoteDate: null,
        });
      }

      for (const q of quotesResult.items) {
        const createdBy = (q as any).createdBy || (q as any).created_by;
        if (!createdBy || !teamMap.has(createdBy)) continue;
        const member = teamMap.get(createdBy)!;
        member.quoteCount++;
        if (q.status === 'pending-approval' || q.status === 'in-review') {
          member.pendingCount++;
        }
        if (!member.latestQuoteDate || q.updatedAt > member.latestQuoteDate) {
          member.latestQuoteDate = q.updatedAt;
        }
      }

      // Sort by quoteCount desc
      const sorted = Array.from(teamMap.values())
        .filter((m) => m.quoteCount > 0)
        .sort((a, b) => b.quoteCount - a.quoteCount);

      setTeam(sorted);
    } catch (err) {
      console.error('Error loading team overview:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={fadeInUp} className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2 mb-4">
        <Users className="w-4 h-4" />
        Team Overview
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : team.length === 0 ? (
        <div className="text-center py-4 text-surface-500 text-sm">
          No team activity yet
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {team.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-700/30 transition-colors"
            >
              <div className="w-8 h-8 bg-surface-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-surface-200">
                  {member.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-surface-200 truncate">{member.fullName}</div>
                <div className="text-xs text-surface-500">{member.role.replace(/_/g, ' ')}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-medium text-surface-200 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {member.quoteCount}
                  </div>
                </div>
                {member.pendingCount > 0 && (
                  <Badge variant="warning">{member.pendingCount} pending</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
