import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { db } from '../../../db/schema';
import type { StoredQuote } from '../../../db/interfaces';

interface LinkedQuotesProps {
  companyId: string;
}

export function LinkedQuotes({ companyId }: LinkedQuotesProps) {
  const [quotes, setQuotes] = useState<StoredQuote[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const data = await db.quotes.where('companyId').equals(companyId).toArray();
      setQuotes(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    load();
  }, [companyId]);

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-500" /> Linked Quotes
        <span className="text-xs text-surface-500 bg-surface-700/50 px-1.5 py-0.5 rounded-full">{quotes.length}</span>
      </h3>
      {quotes.length === 0 ? (
        <div className="text-center text-surface-500 py-4">No linked quotes</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-surface-400">Ref</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-surface-400">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-surface-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-surface-700/30 hover:bg-surface-700/20 transition-colors cursor-pointer"
                  onClick={() => navigate('/quote?id=' + q.id)}
                >
                  <td className="px-3 py-2 text-surface-200 font-medium">{q.quoteRef}</td>
                  <td className="px-3 py-2 text-surface-400">{new Date(q.createdAt).toLocaleDateString('en-ZA')}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-300">
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
