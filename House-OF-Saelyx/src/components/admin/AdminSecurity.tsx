import React, { useCallback, useEffect, useState } from 'react';
import { auth, getAppCheckRequestHeaders } from '../../lib/firebase';
import { ShieldCheck, Download, RefreshCw, CheckCircle2, AlertTriangle, Server, Trash2 } from 'lucide-react';

export interface AdminSecurityProps {
  onExportDatabase: () => Promise<void>;
}

interface HealthStatus {
  firebaseAdminConfigured?: boolean;
  transactionalEmailConfigured?: boolean;
  mediaStorageConfigured?: boolean;
  appCheckEnforced?: boolean;
  abuseProtectionConfigured?: boolean;
  payPalServerConfigured?: boolean;
}

interface OperationalDataStatus {
  counts?: Record<string, number>;
  total?: number;
  resetCompleted?: boolean;
  completedAt?: string | null;
  legacyDemoCleanupCompleted?: boolean;
  legacyDemoDeletedTotal?: number;
  legacyTestProductCleanupCompleted?: boolean;
  legacyTestProductDeletedCount?: number;
}

async function readJson(response: Response) {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const text = await response.text();
  if (!contentType.includes('application/json')) {
    if (/^\s*(<!doctype html|<html)/i.test(text) || contentType.includes('text/html')) throw new Error('The admin API returned HTML instead of JSON. Check the API route.');
    throw new Error('The admin API returned an unexpected response.');
  }
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch { throw new Error('The admin API returned invalid JSON.'); }
}

async function adminHeaders(contentType = false) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin session expired. Sign in again.');
  const token = await currentUser.getIdToken();
  const appCheckHeaders = await getAppCheckRequestHeaders();
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...appCheckHeaders
  };
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({ onExportDatabase }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [operationalData, setOperationalData] = useState<OperationalDataStatus | null>(null);
  const [isLoadingOperationalData, setIsLoadingOperationalData] = useState(false);
  const [isResettingOperationalData, setIsResettingOperationalData] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const refreshHealth = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setHealthError('');
    try {
      const response = await fetch('/api/admin/health', { method: 'GET', headers: await adminHeaders(), cache: 'no-store' });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Production health endpoint is unavailable.');
      setHealth(payload);
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : 'Unable to load production health status.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const loadOperationalData = useCallback(async () => {
    if (isLoadingOperationalData) return;
    setIsLoadingOperationalData(true);
    setResetError('');
    try {
      const response = await fetch('/api/admin/maintenance/operational-data', { method: 'GET', headers: await adminHeaders(), cache: 'no-store' });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to inspect current operational records.');
      setOperationalData(payload);
    } catch (error) {
      setOperationalData(null);
      setResetError(error instanceof Error ? error.message : 'Unable to inspect current operational records.');
    } finally {
      setIsLoadingOperationalData(false);
    }
  }, [isLoadingOperationalData]);

  useEffect(() => { void refreshHealth(); }, []);
  useEffect(() => { void loadOperationalData(); }, []);

  const resetOperationalData = async () => {
    if (isResettingOperationalData) return;
    if (resetPhrase !== 'RESET_OPERATIONS') {
      setResetError('Type RESET_OPERATIONS exactly before continuing.');
      return;
    }
    setIsResettingOperationalData(true);
    setResetError('');
    setResetMessage('');
    try {
      const response = await fetch('/api/admin/maintenance/purge-legacy-demo-fixtures', {
        method: 'POST',
        headers: await adminHeaders(true),
        body: JSON.stringify({ confirmation: 'RESET_OPERATIONS' }),
        cache: 'no-store'
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Operational data reset failed.');
      setResetPhrase('');
      setResetMessage(`Legacy cleanup complete. ${Number(payload?.deletedTotal || 0).toLocaleString()} pre-launch demo/test operational records were removed.`);
      // Refresh in-place. Never hard reload the admin app after a destructive action.
      await loadOperationalData();
      await refreshHealth();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Operational data reset failed.');
    } finally {
      setIsResettingOperationalData(false);
    }
  };

  const checks = [
    ['firebase-admin', 'Firebase Admin', 'Server-side Firebase access for protected operations.', health?.firebaseAdminConfigured === true],
    ['app-check', 'Firebase App Check', 'App-integrity enforcement for protected endpoints.', health?.appCheckEnforced === true],
    ['abuse-protection', 'Abuse Protection', 'Server-side throttling and abuse controls.', health?.abuseProtectionConfigured === true],
    ['transactional-email', 'Transactional Email', 'Server-side order and operational email configuration.', health?.transactionalEmailConfigured === true],
    ['media-storage', 'Media Storage', 'Protected Vercel Blob storage for SAELYXE admin product and settings images.', health?.mediaStorageConfigured === true],
    ['paypal-server', 'PayPal Server', 'Server credentials for PayPal order verification.', health?.payPalServerConfigured === true]
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="admin-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div><h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /><span>Production Security Configuration</span></h3><p className="text-xs text-stone-500 max-w-2xl mt-1">Live configuration status from protected SAELYXE endpoints.</p></div>
        <div className="flex items-center gap-3"><button type="button" onClick={() => void refreshHealth()} disabled={isRefreshing} className="btn-saelyxe-primary text-xs"><RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /><span>{isRefreshing ? 'Refreshing...' : 'REFRESH STATUS'}</span></button><button type="button" onClick={() => void onExportDatabase()} className="btn-saelyxe-lime text-xs"><Download className="w-3.5 h-3.5" /><span>EXPORT JSON BACKUP</span></button></div>
      </div>

      {healthError && <div className="admin-card !p-4 border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><div><p className="text-xs font-semibold">Live status unavailable</p><p className="text-[11px] mt-0.5">{healthError}</p></div></div>}

      <div className="space-y-3">
        {checks.map(([id, name, description, configured], index) => {
          const loaded = health !== null;
          const ok = loaded && configured;
          return <div key={id} className="admin-card !p-5 flex items-start justify-between gap-4"><div className="flex items-start gap-3.5"><div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{ok ? <CheckCircle2 className="w-4 h-4" /> : <Server className="w-4 h-4" />}</div><div className="space-y-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-mono font-bold text-stone-400">0{index + 1}.</span><h4 className="text-sm font-bold text-stone-900">{name}</h4><span className={`status-pill !py-0.5 !text-[10px] ${ok ? 'status-paid' : ''}`}><span className="status-dot" />{!loaded ? 'Loading' : ok ? 'Configured' : 'Not configured'}</span></div><p className="text-xs text-stone-500">{description}</p></div></div></div>;
        })}
      </div>

      <div className="admin-card border-rose-200">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5"><div className="max-w-3xl"><h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2"><Trash2 className="w-5 h-5 text-rose-600" /><span>One-Time Production Test Data Reset</span></h3><p className="text-xs text-stone-500 mt-1 leading-relaxed">Protected cleanup for legacy pre-launch operational fixtures. Products, stock, settings, users, staff, subscribers, and audit history are preserved.</p></div><button type="button" onClick={() => void loadOperationalData()} disabled={isLoadingOperationalData} className="btn-saelyxe-primary text-xs shrink-0"><RefreshCw className={`w-3.5 h-3.5 ${isLoadingOperationalData ? 'animate-spin' : ''}`} /><span>{isLoadingOperationalData ? 'CHECKING...' : 'CHECK CURRENT RECORDS'}</span></button></div>

        {operationalData?.resetCompleted ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><div><p className="text-xs font-bold">One-time reset completed</p><p className="text-[11px] mt-1">Future real customer records are protected from this reset.{operationalData.completedAt ? ` Completed ${new Date(operationalData.completedAt).toLocaleString()}.` : ''}</p></div></div></div> : (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700">Current operational records: <strong>{Number(operationalData?.total || 0).toLocaleString()}</strong></div>
            <div className="flex flex-col sm:flex-row gap-3"><input type="text" value={resetPhrase} onChange={event => setResetPhrase(event.target.value)} placeholder="Type RESET_OPERATIONS" className="form-input-custom font-mono flex-1" disabled={isResettingOperationalData} /><button type="button" onClick={() => void resetOperationalData()} disabled={isResettingOperationalData || resetPhrase !== 'RESET_OPERATIONS'} className="btn-table-action text-rose-700! disabled:opacity-40">{isResettingOperationalData ? 'RESETTING...' : 'RUN ONE-TIME RESET'}</button></div>
          </div>
        )}
        {resetError && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{resetError}</div>}
        {resetMessage && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{resetMessage}</div>}
      </div>
    </div>
  );
};
