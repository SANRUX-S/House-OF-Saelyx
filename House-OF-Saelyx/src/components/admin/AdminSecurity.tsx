import React, { useCallback, useEffect, useState } from 'react';
import { auth, getAppCheckRequestHeaders } from '../../lib/firebase';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Trash2
} from 'lucide-react';

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
  counts?: {
    messages?: number;
    concierge_inquiries?: number;
    stock_notifications?: number;
    restock_dispatch_locks?: number;
    order_idempotency?: number;
    paypal_order_links?: number;
    orders?: number;
  };
  total?: number;
  resetCompleted?: boolean;
  completedAt?: string | null;
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({
  onExportDatabase
}) => {
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
    setIsRefreshing(true);
    setHealthError('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin session expired.');
      const token = await currentUser.getIdToken();
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const response = await fetch('/api/admin/health', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...appCheckHeaders
        },
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Production health endpoint is unavailable.');
      }
      const payload = await response.json();
      setHealth(payload);
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : 'Unable to load production health status.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const loadOperationalData = useCallback(async () => {
    setIsLoadingOperationalData(true);
    setResetError('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin session expired.');
      const token = await currentUser.getIdToken();
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const response = await fetch('/api/admin/maintenance/operational-data', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
          ...appCheckHeaders
        },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to inspect current operational records.');
      }
      setOperationalData(payload);
    } catch (error) {
      setOperationalData(null);
      setResetError(error instanceof Error ? error.message : 'Unable to inspect current operational records.');
    } finally {
      setIsLoadingOperationalData(false);
    }
  }, []);

  useEffect(() => {
    void loadOperationalData();
  }, [loadOperationalData]);

  const resetOperationalData = useCallback(async () => {
    if (resetPhrase !== 'RESET_OPERATIONS') {
      setResetError('Type RESET_OPERATIONS exactly before continuing.');
      return;
    }

    setIsResettingOperationalData(true);
    setResetError('');
    setResetMessage('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin session expired.');
      const token = await currentUser.getIdToken();
      const appCheckHeaders = await getAppCheckRequestHeaders();
      const response = await fetch('/api/admin/maintenance/reset-operational-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
          ...appCheckHeaders
        },
        body: JSON.stringify({ confirmation: 'RESET_OPERATIONS' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Operational data reset failed.');
      }

      setResetPhrase('');
      setResetMessage(
        'Reset complete. ' + Number(payload?.deletedTotal || 0).toLocaleString() +
        ' current test/legacy operational records were removed. Future customer records are now protected from this one-time reset.'
      );
      await loadOperationalData();
      window.setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Operational data reset failed.');
    } finally {
      setIsResettingOperationalData(false);
    }
  }, [loadOperationalData, resetPhrase]);

  const checks = [
    {
      id: 'firebase-admin',
      name: 'Firebase Admin',
      description: 'Server-side Firebase access required for protected order and admin operations.',
      configured: health?.firebaseAdminConfigured === true
    },
    {
      id: 'app-check',
      name: 'Firebase App Check',
      description: 'App-integrity enforcement for protected public mutation endpoints.',
      configured: health?.appCheckEnforced === true
    },
    {
      id: 'abuse-protection',
      name: 'Abuse Protection',
      description: 'Server-side throttling and abuse controls are enabled.',
      configured: health?.abuseProtectionConfigured === true
    },
    {
      id: 'transactional-email',
      name: 'Transactional Email',
      description: 'Server-side order and operational email configuration.',
      configured: health?.transactionalEmailConfigured === true
    },
    {
      id: 'media-storage',
      name: 'Media Storage',
      description: 'Authenticated Cloudinary media configuration for admin uploads.',
      configured: health?.mediaStorageConfigured === true
    },
    {
      id: 'paypal-server',
      name: 'PayPal Server',
      description: 'Server credentials are available for PayPal order creation and verification.',
      configured: health?.payPalServerConfigured === true
    }
  ];

  const operationalCounts = operationalData?.counts || {};
  const supportRecordCount = Number(operationalCounts.concierge_inquiries || 0);
  const restockRecordCount = Number(operationalCounts.stock_notifications || 0);
  const internalArtifactCount =
    Number(operationalCounts.messages || 0) +
    Number(operationalCounts.restock_dispatch_locks || 0) +
    Number(operationalCounts.order_idempotency || 0) +
    Number(operationalCounts.paypal_order_links || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="admin-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Production Security Configuration</span>
          </h3>
          <p className="text-xs text-stone-500 max-w-2xl mt-1">
            Live configuration status from the SAELYXE production health endpoint. This panel does not fabricate penetration-test or authorization results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void refreshHealth()}
            disabled={isRefreshing}
            className="btn-saelyxe-primary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'REFRESH STATUS'}</span>
          </button>

          <button
            onClick={() => void onExportDatabase()}
            className="btn-saelyxe-lime text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON BACKUP</span>
          </button>
        </div>
      </div>

      {healthError && (
        <div className="admin-card !p-4 border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold">Live status unavailable</p>
            <p className="text-[11px] mt-0.5">{healthError}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {checks.map((check, index) => {
          const loaded = health !== null;
          const ok = loaded && check.configured;
          return (
            <div key={check.id} className="admin-card !p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  ok ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                }`}>
                  {ok ? <CheckCircle2 className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-stone-400">0{index + 1}.</span>
                    <h4 className="text-sm font-bold text-stone-900">{check.name}</h4>
                    <span className={`status-pill !py-0.5 !text-[10px] ${ok ? 'status-paid' : ''}`}>
                      <span className="status-dot" />
                      {!loaded ? 'Loading' : ok ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">{check.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-card border-rose-200">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="max-w-3xl">
            <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>One-Time Production Test Data Reset</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Clears only the current order, concierge/support, restock/waitlist, PayPal-link and checkout-idempotency records created before the store has real customer operations. Products, product stock, settings, users, administrators, staff, newsletter subscribers and audit history are preserved.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOperationalData()}
            disabled={isLoadingOperationalData}
            className="btn-saelyxe-primary text-xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOperationalData ? 'animate-spin' : ''}`} />
            <span>{isLoadingOperationalData ? 'CHECKING...' : 'CHECK CURRENT RECORDS'}</span>
          </button>
        </div>

        {operationalData?.resetCompleted ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold">One-time reset completed</p>
                <p className="text-[11px] mt-1">
                  This reset cannot run again, so future real customer orders, support requests and restock requests are protected.
                  {operationalData.completedAt ? ' Completed ' + new Date(operationalData.completedAt).toLocaleString() + '.' : ''}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Orders</div>
                <div className="text-xl font-extrabold text-stone-900 mt-1">{Number(operationalCounts.orders || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Support</div>
                <div className="text-xl font-extrabold text-stone-900 mt-1">{supportRecordCount.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Restock</div>
                <div className="text-xl font-extrabold text-stone-900 mt-1">{restockRecordCount.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Internal artifacts</div>
                <div className="text-xl font-extrabold text-stone-900 mt-1">{internalArtifactCount.toLocaleString()}</div>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-bold text-rose-900">Permanent one-time action</p>
              <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                Confirm only while there are no genuine customer operations. After a successful reset, the server seals this maintenance action and refuses to run it again.
              </p>
              <div className="mt-3 flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={resetPhrase}
                  onChange={event => setResetPhrase(event.target.value)}
                  placeholder="Type RESET_OPERATIONS"
                  autoComplete="off"
                  className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={() => void resetOperationalData()}
                  disabled={
                    isResettingOperationalData ||
                    isLoadingOperationalData ||
                    !operationalData ||
                    resetPhrase !== 'RESET_OPERATIONS'
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isResettingOperationalData ? 'RESETTING...' : 'RESET CURRENT TEST OPERATIONS'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {resetError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            {resetError}
          </div>
        )}
        {resetMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
            {resetMessage}
          </div>
        )}
      </div>

      <div className="admin-card !p-4 text-[11px] text-stone-500 leading-relaxed">
        Configuration status is not a substitute for authorization, privacy, CSP, or end-to-end security testing. Those controls must be validated separately before declaring the production surface hardened.
      </div>
    </div>
  );
};
