import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { FileSearch, Clock, Shield, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit-logs');
      if (res.data?.success) setLogs(res.data.data.logs || []);
    } catch (err) {
      setAlert({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident logs of clinical record access, verifications, logins, and status alterations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <Spinner size="lg" label="Retrieving security audit stream..." className="py-16" />
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500">No audit log entries recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor / Principal</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Target Resource</th>
                  <th className="px-6 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3 text-slate-500 font-sans whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {log.actor?.name || 'System Principal'}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-800">
                      {log.action}
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-sans">
                      {log.resourceType}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={log.outcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
