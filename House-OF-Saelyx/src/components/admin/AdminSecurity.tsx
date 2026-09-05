import React, { useCallback, useEffect, useState } from 'react';
import { auth, getAppCheckRequestHeaders } from '../../lib/firebase';
import {
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server
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

export const AdminSecurity: React.FC<AdminSecurityProps> = ({
  onExportDatabase
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthError, setHealthError] = useState('');

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

      <div className="admin-card !p-4 text-[11px] text-stone-500 leading-relaxed">
        Configuration status is not a substitute for authorization, privacy, CSP, or end-to-end security testing. Those controls must be validated separately before declaring the production surface hardened.
      </div>
    </div>
  );
};
